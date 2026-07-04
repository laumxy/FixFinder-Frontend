import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUser, createSession } from '../_users.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const normalizedEmail = email.trim().toLowerCase();
  const user = await getUser(normalizedEmail);

  if (!user || user.passwordHash !== password) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const token = await createSession(normalizedEmail);
  return res.json({
    token,
    user: { email: user.email, tier: user.tier, searchesRemaining: user.searchesRemaining, createdAt: user.createdAt },
  });
}
