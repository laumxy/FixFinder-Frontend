import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyToBackend } from './_proxy.js';

/**
 * POST /api/search?q=...
 *
 * Routes through the v2 AI engine pipeline — NO guessing, NO Gemini.
 * Every result comes strictly from the versioned SQLite knowledge base.
 *
 * Strategy:
 *   1. Call POST /v2/{version}/analyze  → ranked symptom matches from DB
 *   2. If a confident match is found, call POST /v2/{version}/plan → full
 *      repair plan (recommendations + parts + ordered steps)
 *   3. Try all 3 versions and return the best-scoring result.
 */

const VERSIONS = [1, 2, 3] as const;
const VERSION_LABELS: Record<number, string> = {
  1: 'Home Maintenance',
  2: 'Electronics',
  3: 'Industrial / Automotive',
};

// Map a v2 repair plan + symptom match into the SolutionItem shape the UI expects
function planToSolutionItem(
  plan: Record<string, any>,
  match: Record<string, any>,
  version: number,
  query: string
): Record<string, any> {
  const primary = plan.primary_repair || {};
  const parts = primary.parts_availability || {};

  // Build steps array from plan_steps (already ordered strings)
  const steps: string[] = Array.isArray(plan.plan_steps) ? plan.plan_steps : [];

  // Build tools list from primary repair
  const requiredTools: string[] = Array.isArray(primary.tools_required)
    ? primary.tools_required
    : [];

  // Build materials/parts list
  const replacementParts: string[] = (parts.parts || [])
    .map((p: any) => p.part_name)
    .filter(Boolean);

  // Warnings from primary repair
  const safetyPrecautions: string[] = Array.isArray(primary.warnings)
    ? primary.warnings
    : [];

  if (primary.safety_notes) safetyPrecautions.unshift(primary.safety_notes);

  // Possible causes from symptom match
  const possibleCauses = Array.isArray(match.causes)
    ? match.causes.map((c: string, i: number) => ({
        cause: c,
        probability: `${Math.max(20, 80 - i * 15)}%`,
      }))
    : undefined;

  // Confidence levels from plan
  const confidenceLevels = primary.relevance_score != null
    ? [
        {
          factor: 'Knowledge Base Match',
          score: `${Math.round((primary.relevance_score as number) * 100)}%`,
          reason: `Matched via: ${primary.match_reason || 'category + keyword'}`,
        },
      ]
    : undefined;

  // Repair priority from symptom severity
  const severityMap: Record<string, string> = {
    Critical: 'Emergency',
    High:     'High',
    Medium:   'Medium',
    Low:      'Low',
    Variable: 'Medium',
  };

  return {
    id: `v2-${version}-${match.symptom_id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: `${plan.category || match.category || 'General'} (v${version}: ${VERSION_LABELS[version]})`,
    problem: match.symptom_name || query,
    solution: primary.overview || plan.diagnosis_summary || match.description || '',

    steps,
    keywords: (match.causes || []).concat([match.symptom_name || '']).filter(Boolean),

    // Extended fields
    observedSymptoms: match.description ? [match.description] : undefined,
    possibleCauses,
    confidenceLevels,
    inspectionSteps: Array.isArray(primary.pre_repair_checks)
      ? primary.pre_repair_checks
      : undefined,
    difficultyRating: plan.difficulty || primary.difficulty || undefined,
    estimatedTime: plan.total_estimated_time_minutes
      ? `${plan.total_estimated_time_minutes} minutes`
      : primary.estimated_time || undefined,
    estimatedCost: plan.total_parts_cost != null
      ? `$${(plan.total_parts_cost as number).toFixed(2)}`
      : undefined,
    requiredTools,
    replacementParts,
    safetyPrecautions: safetyPrecautions.length > 0 ? safetyPrecautions : undefined,

    // Post-repair checks as maintenance tips
    maintenanceTips: Array.isArray(primary.post_repair_checks)
      ? primary.post_repair_checks
      : undefined,

    repairPriority: severityMap[match.severity] ?? 'Medium',
    whenToCallProfessional:
      primary.difficulty === 'Expert'
        ? `This repair is rated Expert difficulty. Consider a licensed technician if you are not experienced with ${plan.category || 'this system'}.`
        : undefined,

    _raw: { plan, match, version },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authentication required.' });

  const query = (req.query.q as string || '').trim();
  if (!query) return res.json({ results: [], reasoningSteps: [], searchesRemaining: 99 });

  const reasoningSteps: string[] = [
    `[KB-SEARCH] Querying knowledge base for: "${query}"`,
    `[KB-SEARCH] Searching v1 (Home Maintenance), v2 (Electronics), v3 (Industrial)...`,
  ];

  // ── Step 1: Analyze symptoms across all 3 versions in parallel ──────────
  const analyzeResults = await Promise.allSettled(
    VERSIONS.map(async (version) => {
      const { status, data } = await proxyToBackend(
        `/v2/${version}/analyze`,
        'POST',
        { text: query, top_k: 5 },
        authHeader
      );
      if (status !== 200 || !data?.matches?.length) return null;
      return { version, matches: data.matches as Record<string, any>[] };
    })
  );

  // Collect all matches sorted by score
  type MatchEntry = {
    version: number;
    match: Record<string, any>;
    score: number;
  };

  const allMatches: MatchEntry[] = [];

  for (const result of analyzeResults) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    const { version, matches } = result.value;
    for (const m of matches) {
      allMatches.push({ version, match: m, score: m.score as number ?? 0 });
    }
  }

  allMatches.sort((a, b) => b.score - a.score);

  if (allMatches.length === 0) {
    reasoningSteps.push('[KB-SEARCH] No matching symptoms found in knowledge base.');
    return res.json({
      results: [],
      reasoningSteps,
      searchesRemaining: 99,
    });
  }

  reasoningSteps.push(
    `[KB-SEARCH] Found ${allMatches.length} symptom matches across all versions.`,
    `[KB-MATCH]  Best match: "${allMatches[0].match.symptom_name}" ` +
    `(v${allMatches[0].version}: ${VERSION_LABELS[allMatches[0].version]}, ` +
    `score=${(allMatches[0].score * 100).toFixed(1)}%)`
  );

  // ── Step 2: Generate repair plans for top matches (up to 3) ─────────────
  const topMatches = allMatches.slice(0, 3);

  const planResults = await Promise.allSettled(
    topMatches.map(async ({ version, match }) => {
      const { status, data } = await proxyToBackend(
        `/v2/${version}/plan`,
        'POST',
        {
          symptom_code: match.symptom_code,
          top_k: 3,
        },
        authHeader
      );
      if (status !== 200 || !data?.primary_repair) return null;
      return { version, match, plan: data as Record<string, any> };
    })
  );

  const solutionItems: Array<{ item: Record<string, any>; score: number }> = [];

  for (const result of planResults) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    const { version, match, plan } = result.value;

    reasoningSteps.push(
      `[KB-PLAN]  Repair plan: "${plan.summary}" ` +
      `(${plan.difficulty}, ${plan.total_estimated_time_minutes} min, ` +
      `$${(plan.total_parts_cost as number)?.toFixed(2) ?? '?'})`
    );

    const item = planToSolutionItem(plan, match, version, query);
    const displayScore = Math.round(
      Math.min(99, 60 + (match.score as number) * 39)
    );
    solutionItems.push({ item, score: displayScore });
  }

  // ── Step 3: Fill any remaining slots with symptom-only matches ──────────
  if (solutionItems.length < 3) {
    for (const { version, match, score } of allMatches.slice(0, 5)) {
      if (solutionItems.some(s => s.item._raw?.match?.symptom_code === match.symptom_code)) continue;

      solutionItems.push({
        item: {
          id: `v2-sym-${version}-${match.symptom_id || Date.now()}`,
          category: `${match.category || 'General'} (v${version}: ${VERSION_LABELS[version]})`,
          problem:  match.symptom_name || query,
          solution: match.description || `${match.symptom_name} — severity: ${match.severity}`,
          steps: Array.isArray(match.causes)
            ? match.causes.map((c: string, i: number) =>
                `Step ${i + 1}: Check for "${c}"`)
            : [],
          keywords: (match.causes || []).concat([match.symptom_name || '']).filter(Boolean),
          observedSymptoms: [match.description || match.symptom_name],
          repairPriority: ({ Critical: 'Emergency', High: 'High', Medium: 'Medium', Low: 'Low', Variable: 'Medium' } as Record<string,string>)[match.severity] ?? 'Medium',
          _raw: { match, version },
        },
        score: Math.round(Math.min(99, 45 + score * 39)),
      });

      if (solutionItems.length >= 3) break;
    }
  }

  reasoningSteps.push(
    `[KB-DONE]  Returning ${solutionItems.length} solution(s) from knowledge base.`
  );

  return res.json({
    results: solutionItems,
    reasoningSteps,
    searchesRemaining: 99,
    tier: 'pro',
  });
}
