import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyToBackend } from './_proxy.js';

/**
 * GET /api/search?q=...
 *
 * Routes strictly through the /v2 AI engine — every result comes from the
 * versioned SQLite knowledge base.  No Gemini, no guessing.
 *
 * Pipeline:
 *   1. POST /v2/{1,2,3}/analyze  — find symptom matches in all 3 DBs
 *   2. Apply domain boosting so the right domain wins on tied scores
 *   3. POST /v2/{v}/plan for best PRB-* matches → full repair plan
 *   4. Return ranked results
 */

const VERSION_LABELS: Record<number, string> = {
  1: 'Home Maintenance',
  2: 'Electronics',
  3: 'Industrial / Automotive',
};

// Domain keyword lists for score boosting
const DOMAIN_KEYWORDS: Record<number, string[]> = {
  1: ['roof','leak','shingle','plumb','faucet','toilet','pipe','water','hvac',
      'furnace','fridge','refrigerator','propane','gas','stove','oven','dryer',
      'washer','outlet','breaker','electrical','circuit','gutter','basement',
      'sump','window','door','garage','heater','boiler','drain','sewer','appliance'],
  2: ['phone','iphone','samsung','laptop','macbook','screen','battery','charger',
      'computer','pc','monitor','tv','television','tablet','ipad','keyboard',
      'mouse','speaker','headphone','wifi','router','network','printer',
      'gaming','console','ps5','xbox','nintendo','camera','drone','device'],
  3: ['car','truck','vehicle','engine','brake','tire','transmission',
      'oil','alternator','radiator','muffler','exhaust','motor',
      'generator','excavator','tractor','forklift','hydraulic','diesel',
      'motorcycle','rv','boat','marine','industrial','compressor'],
};

function domainBoost(text: string, version: number): number {
  const lower = text.toLowerCase();
  const hits = (DOMAIN_KEYWORDS[version] || []).filter(k => lower.includes(k)).length;
  return hits * 0.06;
}

// Prefer PRB-* codes — they link to JSON repair procedures
function bestPlanCode(matches: any[]): string | null {
  for (const m of matches) {
    if ((m.symptom_code as string)?.startsWith('PRB-')) return m.symptom_code;
  }
  return matches[0]?.symptom_code ?? null;
}

function planToSolutionItem(
  plan: any, match: any, version: number, query: string
): Record<string, any> {
  const primary   = plan.primary_repair || {};
  const partsAvail = primary.parts_availability || {};
  const steps: string[]   = Array.isArray(plan.plan_steps) ? plan.plan_steps : [];
  const tools: string[]   = Array.isArray(primary.tools_required) ? primary.tools_required : [];
  const parts: string[]   = ((partsAvail.parts || []) as any[])
                              .map((p: any) => p.part_name).filter(Boolean);
  const safety: string[]  = Array.isArray(primary.warnings) ? [...primary.warnings] : [];
  if (primary.safety_notes) safety.unshift(primary.safety_notes);

  const severityPriority: Record<string,string> = {
    Critical:'Emergency', High:'High', Medium:'Medium', Low:'Low', Variable:'Medium',
  };
  const urgencyPriority: Record<string,string> = {
    Immediate:'Emergency', Urgent:'High', Normal:'Medium', Routine:'Low',
  };

  return {
    id: `v2-${version}-${match.symptom_id || Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    category: `${plan.category || match.category || VERSION_LABELS[version]}`,
    problem:  match.symptom_name || query,
    solution: primary.overview || plan.diagnosis_summary || match.description || '',
    steps,
    keywords: (match.causes || []).concat([match.symptom_name || '']).filter(Boolean),
    observedSymptoms:  match.description ? [match.description] : undefined,
    inspectionSteps:   Array.isArray(primary.pre_repair_checks) ? primary.pre_repair_checks : undefined,
    difficultyRating:  plan.difficulty || primary.difficulty || undefined,
    estimatedTime:     plan.total_estimated_time_minutes
                         ? `${plan.total_estimated_time_minutes} minutes` : primary.estimated_time,
    estimatedCost:     plan.total_parts_cost != null
                         ? `$${(plan.total_parts_cost as number).toFixed(2)}` : undefined,
    requiredTools:     tools.length ? tools : undefined,
    replacementParts:  parts.length ? parts : undefined,
    safetyPrecautions: safety.length ? safety : undefined,
    maintenanceTips:   Array.isArray(primary.post_repair_checks) ? primary.post_repair_checks : undefined,
    preventionAdvice:  Array.isArray(plan.alternative_repairs)
                         ? (plan.alternative_repairs as any[]).map((a:any) =>
                             `Alternative: ${a.name} (${a.difficulty})`)
                         : undefined,
    repairPriority:    urgencyPriority[plan.urgency] ?? severityPriority[match.severity] ?? 'Medium',
    whenToCallProfessional:
      (plan.difficulty === 'Expert' || primary.difficulty === 'Expert')
        ? 'This repair is rated Expert. Consider hiring a licensed professional.'
        : undefined,
    confidenceLevels: primary.relevance_score != null
      ? [{ factor: 'Knowledge Base Match',
           score: `${Math.round((primary.relevance_score as number) * 100)}%`,
           reason: primary.match_reason || 'Matched from FixFinder knowledge base' }]
      : undefined,
    _raw: { plan, match, version },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authentication required.' });

  const query = ((req.query.q as string) || '').trim();
  if (!query) return res.json({ results: [], reasoningSteps: [], searchesRemaining: 99 });

  const reasoningSteps: string[] = [
    `[KB] Searching knowledge base for: "${query}"`,
    `[KB] Checking all 3 domains (Home, Electronics, Industrial)...`,
  ];

  // ── Step 1: Analyze symptoms across all 3 versions ──────────────────────
  // Run RQU first to get a version hint and detect safety risks
  let rquVersionHint = 0;
  try {
    const { status: rs, data: ruo } = await proxyToBackend(
      '/v2/understand', 'POST', { query }, authHeader
    );
    if (rs === 200 && ruo) {
      const catMap: Record<string, number> = {
        'Home Maintenance': 1, 'Electronics': 2, 'Industrial / Automotive': 3,
      };
      rquVersionHint = catMap[ruo.equipment_category as string] || 0;
    }
  } catch { /* optional */ }

  const analyzeSettled = await Promise.allSettled(
    [1, 2, 3].map(async (version) => {
      const { status, data } = await proxyToBackend(
        `/v2/${version}/analyze`, 'POST', { text: query, top_k: 5 }, authHeader
      );
      if (status !== 200 || !data?.matches?.length) return null;
      return { version, matches: data.matches as any[] };
    })
  );

  // ── Step 2: Rank with domain boosting ───────────────────────────────────
  type Ranked = { version: number; match: any; score: number };
  const ranked: Ranked[] = [];

  for (const r of analyzeSettled) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const { version, matches } = r.value;
    for (const m of matches) {
      const boost = domainBoost(query, version);
      ranked.push({ version, match: m, score: (m.score || 0) + boost });
    }
  }
  ranked.sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    reasoningSteps.push('[KB] No matching symptoms found.');
    return res.json({ results: [], reasoningSteps, searchesRemaining: 99 });
  }

  reasoningSteps.push(
    `[KB] Best match: "${ranked[0].match.symptom_name}" ` +
    `(v${ranked[0].version} ${VERSION_LABELS[ranked[0].version]}, ` +
    `score=${(ranked[0].score * 100).toFixed(0)}%)`
  );

  // ── Step 3: Get repair plans for top distinct matches ───────────────────
  const seen = new Set<string>();
  const topDistinct = ranked.filter(r => {
    const key = `${r.version}:${r.match.symptom_code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);

  const planSettled = await Promise.allSettled(
    topDistinct.map(async ({ version, match }) => {
      // Prefer PRB-* code; fall back to whatever code was returned
      const planCode = match.symptom_code?.startsWith('PRB-')
        ? match.symptom_code
        : bestPlanCode(
            ranked.filter(r => r.version === version).map(r => r.match)
          );
      if (!planCode) return null;
      const { status, data } = await proxyToBackend(
        `/v2/${version}/plan`, 'POST', { symptom_code: planCode, top_k: 3 }, authHeader
      );
      if (status !== 200 || !data?.primary_repair) return null;
      return { version, match, plan: data };
    })
  );

  const results: Array<{ item: any; score: number }> = [];

  for (const r of planSettled) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const { version, match, plan } = r.value;
    reasoningSteps.push(`[KB] Plan: "${plan.summary}"`);
    results.push({
      item: planToSolutionItem(plan, match, version, query),
      score: Math.min(99, Math.round(60 + (match.score || 0) * 39)),
    });
  }

  // ── Step 4: Backfill with symptom-only entries if plans failed ──────────
  if (results.length < 3) {
    for (const { version, match, score } of ranked.slice(0, 6)) {
      if (results.some(r => r.item._raw?.match?.symptom_code === match.symptom_code)) continue;
      const priorityMap: Record<string,string> = {
        Critical:'Emergency', High:'High', Medium:'Medium', Low:'Low', Variable:'Medium',
      };
      results.push({
        item: {
          id: `v2-sym-${version}-${match.symptom_id || Date.now()}`,
          category: `${match.category || VERSION_LABELS[version]}`,
          problem:  match.symptom_name || query,
          solution: match.description || `${match.symptom_name} — severity: ${match.severity}`,
          steps: (match.causes || []).map((c: string, i: number) =>
            `Step ${i + 1}: Check for — ${c}`),
          keywords: (match.causes || []).concat([match.symptom_name]).filter(Boolean),
          observedSymptoms: [match.description || match.symptom_name],
          repairPriority: priorityMap[match.severity] ?? 'Medium',
          _raw: { match, version },
        },
        score: Math.min(99, Math.round(45 + score * 39)),
      });
      if (results.length >= 3) break;
    }
  }

  reasoningSteps.push(`[KB] Returning ${results.length} result(s) from knowledge base.`);

  return res.json({ results, reasoningSteps, searchesRemaining: 99, tier: 'pro' });
}
