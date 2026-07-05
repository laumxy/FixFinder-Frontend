/**
 * Catch-all proxy: /api/engine/* → Python FastAPI backend
 *
 * Special routing:
 *   POST /api/engine/converse → v2 diagnostic pipeline (knowledge-base only)
 *   All other paths           → original backend endpoint (unchanged)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyToBackend, BACKEND_URL } from '../_proxy.js';

const VERSION_LABELS: Record<number, string> = {
  1: 'Home Maintenance',
  2: 'Electronics',
  3: 'Industrial / Automotive',
};

// ── UI follow-up action chips — these are button labels not new queries ──────
const UI_ACTION_PHRASES = [
  'show me the full step-by-step guide',
  'what tools do i need',
  'which parts are out of stock',
  'would you like details on',
  'is this a home maintenance issue',
  'is this an electronics device',
  'is this a vehicle or industrial system',
];

function isUIAction(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return UI_ACTION_PHRASES.some(p => lower.startsWith(p));
}

// ── Score all matches across versions and pick the best one ─────────────────
// Applies domain boosting so the right version wins on tied scores:
//   - propane / fridge / hvac / stove / furnace → v1
//   - phone / laptop / screen / battery / computer → v2
//   - car / engine / truck / generator / excavator → v3

const DOMAIN_KEYWORDS: Record<number, string[]> = {
  1: ['roof', 'leak', 'shingle', 'plumb', 'faucet', 'toilet', 'pipe', 'water', 'hvac',
      'furnace', 'fridge', 'refrigerator', 'propane', 'gas', 'stove', 'oven', 'dryer',
      'washer', 'outlet', 'breaker', 'electrical', 'circuit', 'gutter', 'basement',
      'sump', 'window', 'door', 'garage', 'heater', 'boiler', 'drain', 'sewer'],
  2: ['phone', 'iphone', 'samsung', 'laptop', 'macbook', 'screen', 'battery', 'charger',
      'computer', 'pc', 'monitor', 'tv', 'television', 'tablet', 'ipad', 'keyboard',
      'mouse', 'speaker', 'headphone', 'wifi', 'router', 'network', 'printer',
      'gaming', 'console', 'ps5', 'xbox', 'nintendo', 'camera', 'drone'],
  3: ['car', 'truck', 'vehicle', 'engine', 'brake', 'tire', 'transmission',
      'oil', 'battery', 'alternator', 'radiator', 'muffler', 'exhaust', 'motor',
      'generator', 'excavator', 'tractor', 'forklift', 'hydraulic', 'diesel',
      'motorcycle', 'rv', 'boat', 'marine', 'industrial', 'compressor'],
};

function domainBoost(text: string, version: number): number {
  const lower = text.toLowerCase();
  const keywords = DOMAIN_KEYWORDS[version] || [];
  const hits = keywords.filter(k => lower.includes(k)).length;
  return hits * 0.05; // +5% per domain keyword hit
}

// Given a symptom_code that may be sym_* (DB-native), find the best PRB-*
// equivalent by looking at what the analyze endpoint actually returned
function resolvePlanCode(
  symptomCode: string,
  allMatches: Array<{ version: number; match: any }>
): { code: string; version: number } | null {
  // Prefer PRB-* codes directly if available
  for (const { version, match } of allMatches) {
    if (match.symptom_code && match.symptom_code.startsWith('PRB-')) {
      return { code: match.symptom_code, version };
    }
  }
  // Fall back to whichever code was best
  if (allMatches.length > 0) {
    return { code: allMatches[0].match.symptom_code, version: allMatches[0].version };
  }
  return null;
}

// ── Main v2 converse handler ─────────────────────────────────────────────────

async function handleConverseV2(
  req: VercelRequest,
  res: VercelResponse,
  sessionCache: Map<string, any>
): Promise<void> {
  const { message, session_id } = req.body || {};
  const authHeader = req.headers.authorization;
  const text = (message || '').trim();
  const sid = session_id || `v2-${Date.now()}`;

  if (!text) {
    res.json({
      message: 'Please describe your problem so I can search the knowledge base.',
      questions: [], session_id: sid, type: 'question', confidence: 0,
    });
    return;
  }

  // ── Detect UI action chips — don't treat them as new searches ────────────
  if (isUIAction(text)) {
    const prev = sessionCache.get(sid);
    if (prev) {
      // Re-send the last real answer with more detail
      res.json({
        ...prev,
        message: prev.fullMessage || prev.message,
        questions: [],
        session_id: sid,
      });
    } else {
      res.json({
        message: 'Please describe your problem first, then I can show you the details.',
        questions: ['What is the problem you are experiencing?'],
        session_id: sid,
        type: 'question',
        confidence: 0,
      });
    }
    return;
  }

  // ── RQU: Parse query into structured understanding → drive version + safety ─
  let rquVersion  = 0;
  let rquSafety   = '';

  try {
    const { status: rs, data: ruo } = await proxyToBackend(
      '/v2/understand', 'POST', { query: text }, authHeader
    );
    if (rs === 200 && ruo) {
      rquSafety = ruo.safety_risk || '';
      const catMap: Record<string, number> = {
        'Home Maintenance': 1, 'Electronics': 2, 'Industrial / Automotive': 3,
      };
      rquVersion = catMap[ruo.equipment_category as string] || 0;

      // Immediate safety escalation — short-circuit before DB search
      if (rquSafety && rquSafety !== 'none detected') {
        const safetySteps: Record<string, string[]> = {
          'gas leak': [
            '  1. Shut OFF propane at the tank valve — turn clockwise until tight.',
            '  2. Open all windows and doors. Do NOT use switches or open flames.',
            '  3. Exit the RV / building immediately.',
            '  4. Do NOT re-enter until a certified gas technician clears the area.',
            '  5. Call your RV dealer, a certified gas tech, or 911.',
          ],
          'electrical hazard': [
            '  1. Turn OFF the main circuit breaker or disconnect shore power NOW.',
            '  2. Do NOT touch any wiring, panels, or outlets.',
            '  3. Call a licensed electrician before restoring power.',
          ],
          'carbon monoxide': [
            '  1. Evacuate everyone immediately.',
            '  2. Call 911.',
            '  3. Do NOT re-enter until cleared by emergency services.',
          ],
          'fire risk': [
            '  1. Evacuate immediately.',
            '  2. Call 911.',
            '  3. Do NOT attempt to fight the fire yourself.',
          ],
        };
        const steps = safetySteps[rquSafety] || [
          '  1. Stop using the affected equipment immediately.',
          '  2. Consult a certified technician before proceeding.',
        ];
        const safetyMsg = [
          `⚠️ **Safety alert: ${rquSafety.toUpperCase()} DETECTED**`,
          '',
          '**Take these steps immediately:**',
          ...steps,
          '',
          'Once the area is safe, describe the specific repair and I will guide you.',
        ].join('\n');

        sessionCache.set(sid, { message: safetyMsg, fullMessage: safetyMsg });
        res.json({
          message: safetyMsg,
          questions: ['Area is safe — help me with the repair now'],
          session_id: sid,
          type: 'safety_alert',
          confidence: 1.0,
          safety_risk: rquSafety,
        });
        return;
      }
    }
  } catch { /* RQU optional — continue without it */ }

  // ── Analyze symptoms across all 3 versions in parallel ──────────────────
  // RQU version hint boosts domain matching accuracy when available
  const analyzeResults = await Promise.allSettled(
    [1, 2, 3].map(async (version) => {
      const { status, data } = await proxyToBackend(
        `/v2/${version}/analyze`,
        'POST',
        { text, top_k: 5 },
        authHeader
      );
      if (status !== 200 || !data?.matches?.length) return null;
      return { version, matches: data.matches as any[] };
    })
  );

  // Collect all matches with domain boosting applied
  type RankedMatch = { version: number; match: any; adjustedScore: number };
  const ranked: RankedMatch[] = [];

  for (const r of analyzeResults) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const { version, matches } = r.value;
    for (const m of matches) {
      const boost = domainBoost(text, version);
      // Extra +0.15 when RQU confirmed this version
      const rquBoost = (rquVersion === version) ? 0.15 : 0;
      ranked.push({ version, match: m, adjustedScore: (m.score || 0) + boost + rquBoost });
    }
  }

  // Sort by adjusted score DESC
  ranked.sort((a, b) => b.adjustedScore - a.adjustedScore);

  // Low confidence — ask clarifying question
  if (!ranked.length || ranked[0].adjustedScore < 0.08) {
    res.json({
      message:
        `I couldn't find a close match for **"${text}"** in the knowledge base.\n\n` +
        `Try being more specific. For example:\n` +
        `• **Home:** "refrigerator not cooling", "toilet running", "circuit breaker tripping"\n` +
        `• **Electronics:** "laptop won't turn on", "phone battery drains fast"\n` +
        `• **Automotive:** "car won't start", "check engine light on"`,
      questions: [
        'Refrigerator not cooling or not lighting on propane',
        'Car or truck won\'t start',
        'Laptop or phone has no power',
      ],
      session_id: sid, type: 'question', confidence: 0,
    });
    return;
  }

  const best = ranked[0];

  // ── Try to get a repair plan ─────────────────────────────────────────────
  // Prefer PRB-* codes for plan matching (they link to JSON repair procedures)
  const topMatches = ranked.slice(0, 5);
  const planTarget = resolvePlanCode(
    best.match.symptom_code,
    topMatches.map(r => ({ version: r.version, match: r.match }))
  );

  let planData: any = null;
  let planVersion = planTarget?.version ?? best.version;

  if (planTarget) {
    const { status, data } = await proxyToBackend(
      `/v2/${planVersion}/plan`,
      'POST',
      { symptom_code: planTarget.code, top_k: 3 },
      authHeader
    );
    if (status === 200 && data?.primary_repair) {
      planData = data;
    }
  }

  // If plan failed with PRB code, also try the sym_* code
  if (!planData && best.match.symptom_code !== planTarget?.code) {
    const { status, data } = await proxyToBackend(
      `/v2/${best.version}/plan`,
      'POST',
      { symptom_code: best.match.symptom_code, top_k: 3 },
      authHeader
    );
    if (status === 200 && data?.primary_repair) {
      planData = data;
      planVersion = best.version;
    }
  }

  // ── Run diagnostic tree ──────────────────────────────────────────────────
  const { status: diagStatus, data: diagData } = await proxyToBackend(
    `/v2/${best.version}/diagnose`,
    'POST',
    { symptom_code: best.match.symptom_code, responses: [] },
    authHeader
  );
  const hasDiag = diagStatus === 200 &&
                  diagData?.recommended_action &&
                  !diagData.recommended_action.includes('No diagnostic tree found');

  // ── Build response message ───────────────────────────────────────────────
  const lines: string[] = [];

  lines.push(
    `**Identified problem:** ${best.match.symptom_name}` +
    ` *(${VERSION_LABELS[best.version]}, severity: ${best.match.severity})*`
  );

  if (best.match.causes?.length) {
    lines.push(`\n**Common causes:**`);
    (best.match.causes as string[]).forEach((c: string) => lines.push(`  • ${c}`));
  }

  if (hasDiag) {
    lines.push(`\n**Diagnostic result:** ${diagData.recommended_action}`);
  }

  if (planData) {
    const primary = planData.primary_repair || {};
    const partsAvail = primary.parts_availability || {};

    lines.push(`\n**Repair plan:** ${planData.summary}`);
    lines.push(
      `  • Difficulty: **${planData.difficulty}**` +
      ` | Est. time: **${planData.total_estimated_time_minutes} min**` +
      ` | Parts cost: **$${(planData.total_parts_cost as number)?.toFixed(2)}**`
    );
    lines.push(`  • Urgency: **${planData.urgency}**`);

    // Show pre-checks
    if (Array.isArray(primary.pre_repair_checks) && primary.pre_repair_checks.length) {
      lines.push(`\n**Before you start:**`);
      (primary.pre_repair_checks as string[]).forEach((c: string) => lines.push(`  • ${c}`));
    }

    // Show tools
    if (Array.isArray(primary.tools_required) && primary.tools_required.length) {
      const tools = (primary.tools_required as string[]).slice(0, 5).join(', ');
      const extra = primary.tools_required.length > 5
        ? ` +${primary.tools_required.length - 5} more` : '';
      lines.push(`\n**Tools needed:** ${tools}${extra}`);
    }

    // Show steps
    const steps = (planData.plan_steps as string[]) || [];
    if (steps.length) {
      lines.push(`\n**Repair steps:**`);
      steps.slice(0, 6).forEach((s: string) => lines.push(`  ${s}`));
      if (steps.length > 6) lines.push(`  … +${steps.length - 6} more steps`);
    }

    // Parts availability note
    if (!(planData.all_parts_available as boolean) &&
        partsAvail.missing_parts?.length) {
      const missing = (partsAvail.missing_parts as string[]).slice(0, 3).join(', ');
      lines.push(`\n⚠️ **Parts to order:** ${missing}`);
    }

    if (primary.safety_notes) {
      lines.push(`\n⚠️ **Safety note:** ${primary.safety_notes}`);
    }
  } else {
    // No plan — show inspection guidance from symptom data
    if (best.match.description) {
      lines.push(`\n**About this issue:** ${best.match.description}`);
    }
    if (best.match.causes?.length) {
      lines.push(`\nStart by checking these most likely causes in order:`);
      (best.match.causes as string[]).forEach((c: string, i: number) => {
        lines.push(`  ${i + 1}. ${c}`);
      });
    }
    lines.push(
      `\n*Note: A step-by-step repair guide for this specific issue is being ` +
      `developed. The above causes will help you narrow it down.*`
    );
  }

  // ── Follow-up questions ──────────────────────────────────────────────────
  const questions: string[] = [];
  if (planData && Array.isArray(planData.alternative_repairs)) {
    const alts = (planData.alternative_repairs as any[]).slice(0, 2);
    alts.forEach((a: any) => {
      questions.push(`Tell me about "${a.name}" (${a.difficulty})`);
    });
  }
  if (!questions.length || questions.length < 2) {
    if (planData) questions.push('What are the safety precautions?');
    questions.push('Show me what parts I need to order');
  }

  // ── Build diagnostic payload for the solution detail view ────────────────
  const primary = planData?.primary_repair || {};
  const diagnostic = {
    category:      planData?.category || VERSION_LABELS[best.version],
    problem:       best.match.symptom_name,
    final_answer:  planData?.summary || (hasDiag ? diagData.recommended_action : ''),
    repair_steps:  planData?.plan_steps || [],
    tools:         primary.tools_required || [],
    safety:        primary.warnings || (primary.safety_notes ? [primary.safety_notes] : []),
    estimated_time: planData?.total_estimated_time_minutes
                     ? `${planData.total_estimated_time_minutes} min` : undefined,
    estimated_cost: planData?.total_parts_cost != null
                     ? `$${(planData.total_parts_cost as number).toFixed(2)}` : undefined,
    risk_level: ({
      Emergency: 'critical', Immediate: 'critical',
      High: 'high', Urgent: 'high',
      Medium: 'medium', Normal: 'medium',
      Low: 'low', Routine: 'low',
    } as Record<string,string>)[planData?.urgency || best.match.severity] || 'medium',
    ranked_causes:   best.match.causes || [],
    symptoms:        [best.match.symptom_name],
    inspection_steps: primary.pre_repair_checks || [],
    prevention:      primary.post_repair_checks || [],
    confidence_scores: [{
      cause:      best.match.symptom_name,
      confidence: `${Math.round(best.adjustedScore * 100)}%`,
      evidence:   best.match.causes || [],
    }],
  };

  const fullMessage = lines.join('\n');

  // Cache for follow-up action handling
  sessionCache.set(sid, { message: fullMessage, fullMessage, diagnostic });

  res.json({
    message:    fullMessage,
    questions,
    session_id: sid,
    type:       planData ? 'diagnosis' : 'analysis',
    confidence: best.adjustedScore,
    diagnostic: planData ? diagnostic : null,
    searchesRemaining: 99,
  });
}

// ── Session cache (in-process, resets on cold start) ────────────────────────
const sessionCache = new Map<string, any>();

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const urlPath = req.url?.split('?')[0] || '';
  const segments = urlPath.split('/').filter(Boolean);
  const backendSegments = segments.slice(2);
  const backendPath = '/' + backendSegments.join('/');
  const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const method = req.method || 'GET';

  // Route /converse through the v2 knowledge-base pipeline
  if (backendPath === '/converse' && method === 'POST') {
    return handleConverseV2(req, res, sessionCache);
  }

  // All other engine routes proxy to original backend unchanged
  console.log(`[engine-proxy] ${method} ${BACKEND_URL}${backendPath}${qs}`);
  const { status, data } = await proxyToBackend(
    backendPath, method, req.body, req.headers.authorization
  );
  return res.status(status).json(data);
}
