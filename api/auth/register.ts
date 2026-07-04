import type { VercelRequest, VercelResponse } from '@vercel/node';
import { registerUser } from '../_users.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const result = await registerUser(email, password);
  if (!result.success) return res.status(400).json({ error: result.error });

  const { user } = result;
  return res.json({
    token: user!.token,
    user: { email: user!.email, tier: user!.tier, searchesRemaining: user!.searchesRemaining, createdAt: user!.createdAt },
  });
}
