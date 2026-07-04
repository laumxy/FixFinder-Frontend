import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUser, setUser, createSession } from '../_users.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password security threshold is 6 characters.' });

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await getUser(normalizedEmail);
  if (existing) return res.status(400).json({ error: 'An account with this email already exists' });

  const newUser = {
    email: normalizedEmail,
    passwordHash: password,
    tier: 'free' as const,
    searchesRemaining: 3,
    createdAt: new Date().toISOString(),
  };
  await setUser(newUser);

  const token = await createSession(normalizedEmail);
  return res.json({
    token,
    user: { email: newUser.email, tier: newUser.tier, searchesRemaining: newUser.searchesRemaining, createdAt: newUser.createdAt },
  });
}
