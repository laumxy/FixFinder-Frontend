/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SolutionItem — the canonical frontend display model.
 * backendResultToSolutionItem() bridges the Python backend's POST /diagnose
 * response (DiagnoseResult.to_report()) into this shape so the UI never
 * needs to know about the backend field names.
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
 * Map the Python backend POST /diagnose response to a SolutionItem.
 *
 * Backend shape (DiagnoseResult.to_report()):
 * {
 *   category, problem,
 *   ranked_causes: string[],
 *   confidence_scores: [{ cause, confidence, evidence }],
 *   follow_up_questions: string[],
 *   inspection_steps: string[],
 *   repair_steps: string[],
 *   tools: string[],
 *   safety: string[],
 *   prevention: string[],
 *   final_answer: string,
 *   _engine: { ai_reasoning, ollama_error }
 * }
 */
export function backendResultToSolutionItem(
  raw: Record<string, any>,
  queryText: string = ''
): SolutionItem {
  const id = `diagnose-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Build a human-readable solution summary: prefer final_answer, fall back to
  // the first repair step, or a generic message.
  const solution: string =
    raw.final_answer ||
    (Array.isArray(raw.repair_steps) && raw.repair_steps.length > 0
      ? raw.repair_steps[0]
      : 'See repair steps below for detailed instructions.');

  // Derive keywords from ranked causes + category text
  const keywords: string[] = [
    raw.category,
    ...(Array.isArray(raw.ranked_causes) ? raw.ranked_causes : []),
  ]
    .filter(Boolean)
    .map((k: string) => k.toLowerCase().split(/\s+/))
    .flat()
    .filter((w: string) => w.length > 3);

  // Map confidence_scores to possibleCauses display format
  const possibleCauses = Array.isArray(raw.confidence_scores)
    ? raw.confidence_scores.map((cs: any) => ({
        cause: cs.cause ?? '',
        probability: cs.confidence ?? '0%',
        reason: Array.isArray(cs.evidence) ? cs.evidence.join('; ') : undefined,
      }))
    : undefined;

  // Build a single confidenceLevels entry from the top-level confidence
  const confidenceLevels =
    possibleCauses && possibleCauses.length > 0
      ? [
          {
            factor: 'Diagnostic Match',
            score: possibleCauses[0].probability,
            reason: `Best match: ${raw.problem}`,
          },
        ]
      : undefined;

  // Risk level → repair priority
  const riskMap: Record<string, SolutionItem['repairPriority']> = {
    critical: 'Emergency',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  const repairPriority: SolutionItem['repairPriority'] =
    riskMap[(raw.risk_level ?? '').toLowerCase()] ?? 'Medium';

  return {
    id,
    category: raw.category ?? 'General',
    problem: raw.problem ?? queryText,
    solution,
    steps: Array.isArray(raw.repair_steps) ? raw.repair_steps : [],
    keywords,

    observedSymptoms: Array.isArray(raw.symptoms) ? raw.symptoms : undefined,
    followUpQuestions: Array.isArray(raw.follow_up_questions)
      ? raw.follow_up_questions
      : undefined,
    possibleCauses,
    confidenceLevels,
    inspectionSteps: Array.isArray(raw.inspection_steps)
      ? raw.inspection_steps
      : undefined,
    difficultyRating: raw.difficulty
      ? _difficultyToStars(raw.difficulty)
      : undefined,
    estimatedTime: raw.estimated_time ?? undefined,
    estimatedCost: raw.estimated_cost ?? undefined,
    requiredTools: Array.isArray(raw.tools) ? raw.tools : undefined,
    safetyPrecautions: Array.isArray(raw.safety) ? raw.safety : undefined,
    maintenanceTips: Array.isArray(raw.maintenance) ? raw.maintenance : undefined,
    preventionAdvice: Array.isArray(raw.prevention) ? raw.prevention : undefined,
    repairPriority,

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
