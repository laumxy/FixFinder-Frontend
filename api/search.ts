import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadUsers, saveUsers, SESSIONS } from './_users';
import { proxyToBackend } from './_proxy';
import { backendResultToSolutionItem } from '../src/solutionsData';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  const email = token ? SESSIONS[token] : undefined;
  if (!email) return res.status(401).json({ error: 'Authentication required. Please sign in.' });

  const query = req.query.q as string;
  if (!query?.trim()) return res.json({ results: [] });

  const users = loadUsers();
  const user = users[email];
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.tier === 'free') {
    if (user.searchesRemaining <= 0) return res.status(403).json({ error: 'Search limit reached', limitReached: true });
    user.searchesRemaining--;
    users[email] = user;
    saveUsers(users);
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
