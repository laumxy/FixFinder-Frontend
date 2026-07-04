import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUser, setUser, getSessionEmail } from './_users.js';
import { proxyToBackend } from './_proxy.js';

function backendResultToSolutionItem(raw: any, query: string): any {
  return {
    id: `diag-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category: raw.category || 'general',
    problem: raw.problem || query,
    solution: raw.final_answer || '',
    steps: Array.isArray(raw.repair_steps) ? raw.repair_steps : [],
    keywords: Array.isArray(raw.ranked_causes) ? raw.ranked_causes : [],
    observedSymptoms: Array.isArray(raw.symptoms) ? raw.symptoms : [],
    requiredTools: Array.isArray(raw.tools) ? raw.tools : [],
    safetyPrecautions: Array.isArray(raw.safety) ? raw.safety : [],
    inspectionSteps: Array.isArray(raw.inspection_steps) ? raw.inspection_steps : [],
    preventionAdvice: Array.isArray(raw.prevention) ? raw.prevention : [],
    repairPriority: raw.risk_level === 'high' ? 'High' : raw.risk_level === 'low' ? 'Low' : 'Medium',
    estimatedTime: raw.estimated_time || 'unknown',
    estimatedCost: raw.estimated_cost || 'unknown',
    confidenceLevels: Array.isArray(raw.confidence_scores) ? raw.confidence_scores : [],
    _raw: raw,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  const email = token ? await getSessionEmail(token) : null;
  if (!email) return res.status(401).json({ error: 'Authentication required. Please sign in.' });

  const query = req.query.q as string;
  if (!query?.trim()) return res.json({ results: [] });

  const user = await getUser(email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.tier === 'free') {
    if (user.searchesRemaining <= 0) {
      return res.status(403).json({ error: 'Search limit reached', limitReached: true });
    }
    user.searchesRemaining--;
    await setUser(user);
  }

  const { status, data: raw } = await proxyToBackend(
    '/diagnose',
    'POST',
    { problem: query },
    token ? `Bearer ${token}` : undefined
  );

  if (status !== 200 || !raw) {
    return res.status(status).json({
      results: [],
      reasoningSteps: ['[ERROR] Diagnostic engine returned an error. Please try again.'],
      searchesRemaining: user.searchesRemaining,
      tier: user.tier,
    });
  }

  const solutionItem = backendResultToSolutionItem(raw, query);
  const reasoningSteps: string[] = [];
  if (raw._engine?.ai_reasoning) reasoningSteps.push(`[ENGINE] ${raw._engine.ai_reasoning}`);
  reasoningSteps.push(`[DIAGNOSE] Category identified: ${raw.category || 'General'}`);
  if (Array.isArray(raw.ranked_causes) && raw.ranked_causes.length > 0) {
    reasoningSteps.push(`[ISOLATE] Top causes: ${raw.ranked_causes.slice(0, 3).join(', ')}`);
  }
  reasoningSteps.push('[COMPILE] Diagnostic report compiled successfully.');

  return res.json({
    results: [{ item: solutionItem, score: 98 }],
    reasoningSteps,
    searchesRemaining: user.searchesRemaining,
    tier: user.tier,
  });
}
