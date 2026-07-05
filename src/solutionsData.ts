/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SolutionItem — the canonical frontend display model.
 *
 * backendResultToSolutionItem() maps BOTH:
 *   a) the original Python /diagnose response  (DiagnoseResult.to_report())
 *   b) the v2 knowledge-base plan response     (/v2/{v}/plan)
 *
 * The UI never needs to know which source produced the data.
 */

export interface SolutionItem {
  id: string;
  category: string;
  problem: string;
  solution: string;     // maps to final_answer / first repair step overview
  steps: string[];      // maps to repair_steps
  keywords: string[];   // derived from ranked_causes + category

  // Extended fields — populated from backend when present
  observedSymptoms?: string[];
  followUpQuestions?: string[];
  possibleCauses?: Array<{ cause: string; probability: string; reason?: string }>;
  confidenceLevels?: Array<{ factor: string; score: string; reason?: string }>;
  inspectionSteps?: string[];
  difficultyRating?: string;
  estimatedTime?: string;
  estimatedCost?: string;
  requiredTools?: string[];
  replacementParts?: string[];
  safetyPrecautions?: string[];
  testingProcedure?: string;
  maintenanceTips?: string[];
  preventionAdvice?: string[];
  whenToCallProfessional?: string;
  repairPriority?: 'Emergency' | 'High' | 'Medium' | 'Low';

  // Raw backend fields preserved for advanced use
  _raw?: Record<string, unknown>;
}

/**
 * Map either a Python /diagnose response OR a v2 /plan response to SolutionItem.
 *
 * v2 /plan shape (from /v2/{version}/plan):
 * {
 *   symptom_code, category, diagnosis_summary, summary,
 *   primary_repair: { name, overview, tools_required, materials_required,
 *                     procedure_steps, pre_repair_checks, post_repair_checks,
 *                     warnings, safety_notes, difficulty, estimated_time_minutes,
 *                     relevance_score, parts_availability },
 *   alternative_repairs, total_estimated_time_minutes, total_parts_cost,
 *   all_parts_available, difficulty, urgency, plan_steps
 * }
 *
 * Original /diagnose shape (DiagnoseResult.to_report()):
 * {
 *   category, problem, ranked_causes, confidence_scores,
 *   follow_up_questions, inspection_steps, repair_steps,
 *   tools, safety, prevention, final_answer, risk_level,
 *   estimated_time, estimated_cost
 * }
 */
export function backendResultToSolutionItem(
  raw: Record<string, any>,
  queryText: string = ''
): SolutionItem {
  const id = `diagnose-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // ── Detect v2 plan shape ──────────────────────────────────────────────────
  const isV2Plan = Boolean(raw.primary_repair || raw.plan_steps);

  if (isV2Plan) {
    const primary  = (raw.primary_repair  || {}) as Record<string, any>;
    const partsAvail = (primary.parts_availability || {}) as Record<string, any>;

    const steps: string[] = Array.isArray(raw.plan_steps) ? raw.plan_steps : [];
    const requiredTools: string[] = Array.isArray(primary.tools_required)
      ? primary.tools_required : [];
    const replacementParts: string[] = ((partsAvail.parts || []) as any[])
      .map((p: any) => p.part_name).filter(Boolean);

    const safety: string[] = Array.isArray(primary.warnings) ? [...primary.warnings] : [];
    if (primary.safety_notes) safety.unshift(primary.safety_notes);

    const riskMap: Record<string, SolutionItem['repairPriority']> = {
      Immediate: 'Emergency', Urgent: 'High', Normal: 'Medium', Routine: 'Low',
    };

    return {
      id,
      category:  raw.category || 'General',
      problem:   queryText || raw.symptom_code || 'Repair needed',
      solution:  primary.overview || raw.diagnosis_summary || raw.summary || '',
      steps,
      keywords:  (Array.isArray(primary.materials_required) ? primary.materials_required : [])
                   .concat([raw.category || '']).filter(Boolean),

      observedSymptoms: raw.diagnosis_summary ? [raw.diagnosis_summary] : undefined,
      inspectionSteps:  Array.isArray(primary.pre_repair_checks)
                          ? primary.pre_repair_checks : undefined,
      difficultyRating: raw.difficulty || primary.difficulty || undefined,
      estimatedTime:    raw.total_estimated_time_minutes
                          ? `${raw.total_estimated_time_minutes} minutes`
                          : primary.estimated_time || undefined,
      estimatedCost: raw.total_parts_cost != null
                       ? `$${(raw.total_parts_cost as number).toFixed(2)}`
                       : undefined,
      requiredTools,
      replacementParts: replacementParts.length ? replacementParts : undefined,
      safetyPrecautions: safety.length ? safety : undefined,
      maintenanceTips:   Array.isArray(primary.post_repair_checks)
                           ? primary.post_repair_checks : undefined,
      preventionAdvice:  Array.isArray(raw.alternative_repairs)
                           ? (raw.alternative_repairs as any[]).map((a: any) =>
                               `Alternative: ${a.name} (${a.difficulty})`)
                           : undefined,
      repairPriority: riskMap[raw.urgency] ?? 'Medium',
      whenToCallProfessional:
        raw.difficulty === 'Expert' || primary.difficulty === 'Expert'
          ? 'This repair is rated Expert difficulty. Consider hiring a licensed professional.'
          : undefined,
      confidenceLevels: primary.relevance_score != null
        ? [{ factor: 'Knowledge Base Match',
             score:  `${Math.round((primary.relevance_score as number) * 100)}%`,
             reason: primary.match_reason || 'Matched from FixFinder knowledge base' }]
        : undefined,
      _raw: raw,
    };
  }

  // ── Original /diagnose shape ──────────────────────────────────────────────
  const solution: string =
    raw.final_answer ||
    (Array.isArray(raw.repair_steps) && raw.repair_steps.length > 0
      ? raw.repair_steps[0]
      : 'See repair steps below for detailed instructions.');

  const keywords: string[] = [
    raw.category,
    ...(Array.isArray(raw.ranked_causes) ? raw.ranked_causes : []),
  ]
    .filter(Boolean)
    .map((k: string) => k.toLowerCase().split(/\s+/))
    .flat()
    .filter((w: string) => w.length > 3);

  const possibleCauses = Array.isArray(raw.confidence_scores)
    ? raw.confidence_scores.map((cs: any) => ({
        cause: cs.cause ?? '',
        probability: cs.confidence ?? '0%',
        reason: Array.isArray(cs.evidence) ? cs.evidence.join('; ') : undefined,
      }))
    : undefined;

  const confidenceLevels =
    possibleCauses && possibleCauses.length > 0
      ? [{ factor: 'Diagnostic Match', score: possibleCauses[0].probability,
           reason: `Best match: ${raw.problem}` }]
      : undefined;

  const riskMap2: Record<string, SolutionItem['repairPriority']> = {
    critical: 'Emergency', high: 'High', medium: 'Medium', low: 'Low',
  };

  return {
    id,
    category: raw.category ?? 'General',
    problem:  raw.problem ?? queryText,
    solution,
    steps: Array.isArray(raw.repair_steps) ? raw.repair_steps : [],
    keywords,
    observedSymptoms:  Array.isArray(raw.symptoms) ? raw.symptoms : undefined,
    followUpQuestions: Array.isArray(raw.follow_up_questions)
                         ? raw.follow_up_questions : undefined,
    possibleCauses,
    confidenceLevels,
    inspectionSteps: Array.isArray(raw.inspection_steps)
                       ? raw.inspection_steps : undefined,
    difficultyRating: raw.difficulty ? _difficultyToStars(raw.difficulty) : undefined,
    estimatedTime:    raw.estimated_time ?? undefined,
    estimatedCost:    raw.estimated_cost ?? undefined,
    requiredTools:    Array.isArray(raw.tools) ? raw.tools : undefined,
    safetyPrecautions: Array.isArray(raw.safety) ? raw.safety : undefined,
    maintenanceTips:   Array.isArray(raw.maintenance) ? raw.maintenance : undefined,
    preventionAdvice:  Array.isArray(raw.prevention) ? raw.prevention : undefined,
    repairPriority: riskMap2[(raw.risk_level ?? '').toLowerCase()] ?? 'Medium',
    _raw: raw,
  };
}

function _difficultyToStars(difficulty: string): string {
  const map: Record<string, string> = {
    easy: '⭐☆☆☆☆',
    simple: '⭐☆☆☆☆',
    moderate: '⭐⭐⭐☆☆',
    difficult: '⭐⭐⭐⭐☆',
    hard: '⭐⭐⭐⭐☆',
    expert: '⭐⭐⭐⭐⭐',
  };
  return map[difficulty.toLowerCase()] ?? '⭐⭐⭐☆☆';
}

// Empty dataset — all knowledge comes from the Python backend at runtime.
// Kept as a typed constant so existing imports don't break.
export const solutionsDataset: SolutionItem[] = [];
