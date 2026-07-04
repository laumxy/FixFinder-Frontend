import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadUsers, saveUsers, createSession, SESSIONS } from '../_users';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const normalizedEmail = email.trim().toLowerCase();
  const users = loadUsers();
  const user = users[normalizedEmail];

  if (!user || user.passwordHash !== password) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const token = createSession(normalizedEmail);
  return res.json({
    token,
    user: { email: user.email, tier: user.tier, searchesRemaining: user.searchesRemaining, createdAt: user.createdAt },
  });
}
