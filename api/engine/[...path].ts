/**
 * Catch-all proxy: /api/engine/* → Python FastAPI backend
 *
 * Special routing:
 *   POST /api/engine/converse → v2 diagnostic pipeline (knowledge-base only)
 *   All other paths           → original backend endpoint (unchanged)
 *
 * The /converse route now goes through:
 *   1. POST /v2/1/analyze  — find best symptom match
 *   2. POST /v2/{v}/diagnose — run diagnostic tree
 *   3. POST /v2/{v}/plan    — generate repair plan
 * This ensures every answer comes from the versioned SQLite knowledge base,
 * not from Gemini or any AI that can hallucinate/guess.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyToBackend, BACKEND_URL } from '../_proxy.js';

const VERSION_LABELS: Record<number, string> = {
  1: 'Home Maintenance',
  2: 'Electronics',
  3: 'Industrial / Automotive',
};

// ── v2 converse handler ──────────────────────────────────────────────────────

async function handleConverseV2(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { message, session_id } = req.body || {};
  const authHeader = req.headers.authorization;
  const text = (message || '').trim();

  if (!text) {
    res.json({
      message: 'Please describe your problem so I can search the knowledge base.',
      questions: [],
      session_id: session_id || '',
      type: 'question',
      confidence: 0,
    });
    return;
  }

  // Step 1 — search all 3 versions for symptom matches
  const analyzeResults = await Promise.allSettled(
    [1, 2, 3].map(async (version) => {
      const { status, data } = await proxyToBackend(
        `/v2/${version}/analyze`,
        'POST',
        { text, top_k: 3 },
        authHeader
      );
      if (status !== 200 || !data?.matches?.length) return null;
      return { version, matches: data.matches as any[] };
    })
  );

  // Collect best match across all versions
  let bestVersion = 1;
  let bestMatch: any = null;
  let bestScore = 0;

  for (const r of analyzeResults) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const { version, matches } = r.value;
    if (matches[0]?.score > bestScore) {
      bestScore = matches[0].score;
      bestMatch = matches[0];
      bestVersion = version;
    }
  }

  // If confidence too low, ask a clarifying question
  if (!bestMatch || bestScore < 0.08) {
    res.json({
      message:
        `I searched the FixFinder knowledge base but couldn't find an exact match for **"${text}"**.\n\n` +
        `Could you provide more detail? For example:\n` +
        `• What category? (Home system, Electronic device, Vehicle/Industrial)\n` +
        `• What specific symptom? (e.g. "won't start", "leaking", "no power")\n` +
        `• Any error codes or sounds?`,
      questions: [
        'Is this a home maintenance issue?',
        'Is this an electronics device?',
        'Is this a vehicle or industrial system?',
      ],
      session_id: session_id || '',
      type: 'question',
      confidence: 0,
    });
    return;
  }

  // Step 2 — run the diagnostic tree
  const { status: diagStatus, data: diagData } = await proxyToBackend(
    `/v2/${bestVersion}/diagnose`,
    'POST',
    { symptom_code: bestMatch.symptom_code, responses: [] },
    authHeader
  );

  // Step 3 — generate repair plan
  const { status: planStatus, data: planData } = await proxyToBackend(
    `/v2/${bestVersion}/plan`,
    'POST',
    { symptom_code: bestMatch.symptom_code, top_k: 3 },
    authHeader
  );

  const hasPlan = planStatus === 200 && planData?.primary_repair;
  const hasDiag = diagStatus === 200 && diagData?.recommended_action;

  // Build the response message from real KB data
  const parts: string[] = [];

  parts.push(
    `**Identified issue:** ${bestMatch.symptom_name}` +
    ` *(${VERSION_LABELS[bestVersion]}, severity: ${bestMatch.severity})*`
  );

  if (bestMatch.causes?.length) {
    parts.push(`\n**Common causes:** ${bestMatch.causes.slice(0, 3).join(', ')}`);
  }

  if (hasDiag && diagData.recommended_action) {
    parts.push(`\n**Recommended action:** ${diagData.recommended_action}`);
    if (diagData.repair_code) {
      parts.push(`**Repair code:** ${diagData.repair_code}`);
    }
  }

  if (hasPlan) {
    parts.push(`\n**Repair plan:** ${planData.summary}`);
    parts.push(
      `• Difficulty: ${planData.difficulty}` +
      ` | Time: ${planData.total_estimated_time_minutes} min` +
      ` | Parts cost: $${(planData.total_parts_cost as number)?.toFixed(2) ?? '?'}`
    );
    parts.push(`• Urgency: ${planData.urgency}`);

    const steps = (planData.plan_steps as string[]) || [];
    if (steps.length > 0) {
      parts.push(`\n**First steps:**`);
      steps.slice(0, 4).forEach((s: string) => parts.push(`  ${s}`));
      if (steps.length > 4) parts.push(`  … +${steps.length - 4} more steps`);
    }

    if (!(planData.all_parts_available as boolean) && (planData.primary_repair as any)?.parts_availability?.missing_parts?.length) {
      const missing = (planData.primary_repair as any).parts_availability.missing_parts.slice(0, 2);
      parts.push(`\n⚠️ Note: Some parts may need ordering: ${missing.join(', ')}`);
    }
  }

  // Build follow-up questions from alternative repairs
  const questions: string[] = [];
  if (hasPlan && Array.isArray(planData.alternative_repairs)) {
    const alts = planData.alternative_repairs as any[];
    alts.slice(0, 2).forEach((alt: any) => {
      questions.push(`Would you like details on "${alt.name}" (${alt.difficulty})?`);
    });
  }
  if (!questions.length) {
    questions.push('Show me the full step-by-step guide');
    questions.push('What tools do I need?');
    if (hasPlan && !(planData.all_parts_available as boolean)) {
      questions.push('Which parts are out of stock?');
    }
  }

  // Build diagnostic payload to populate the solution detail view
  const diagnostic = hasPlan
    ? {
        category:     planData.category || VERSION_LABELS[bestVersion],
        problem:      bestMatch.symptom_name,
        final_answer: hasPlan ? planData.summary : diagData?.recommended_action || '',
        repair_steps: planData.plan_steps || [],
        tools:        (planData.primary_repair as any)?.tools_required || [],
        safety:       (planData.primary_repair as any)?.warnings || [],
        estimated_time: planData.total_estimated_time_minutes
          ? `${planData.total_estimated_time_minutes} min`
          : undefined,
        estimated_cost: planData.total_parts_cost != null
          ? `$${(planData.total_parts_cost as number).toFixed(2)}`
          : undefined,
        risk_level: ({
          Emergency: 'critical', High: 'high', Medium: 'medium', Low: 'low', Normal: 'medium',
        } as Record<string,string>)[planData.urgency] || 'medium',
        ranked_causes: bestMatch.causes || [],
        symptoms:      [bestMatch.symptom_name],
        inspection_steps: (planData.primary_repair as any)?.pre_repair_checks || [],
        prevention:    (planData.primary_repair as any)?.post_repair_checks || [],
        confidence_scores: [
          {
            cause:      bestMatch.symptom_name,
            confidence: `${Math.round(bestScore * 100)}%`,
            evidence:   bestMatch.causes || [],
          },
        ],
      }
    : null;

  res.json({
    message:    parts.join('\n'),
    questions,
    session_id: session_id || `v2-${Date.now()}`,
    type:       hasPlan ? 'diagnosis' : 'analysis',
    confidence: bestScore,
    diagnostic,
    searchesRemaining: 99,
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const urlPath = req.url?.split('?')[0] || '';
  const segments = urlPath.split('/').filter(Boolean);
  const backendSegments = segments.slice(2); // skip 'api' and 'engine'
  const backendPath = '/' + backendSegments.join('/');
  const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const method = req.method || 'GET';

  // Route /converse through the v2 knowledge-base pipeline
  if (backendPath === '/converse' && method === 'POST') {
    return handleConverseV2(req, res);
  }

  // All other engine routes pass through to the original backend unchanged
  const fullUrl = `${BACKEND_URL}${backendPath}${qs}`;
  console.log(`[engine-proxy] ${method} ${fullUrl}`);

  const { status, data } = await proxyToBackend(
    backendPath,
    method,
    req.body,
    req.headers.authorization
  );

  return res.status(status).json(data);
}
