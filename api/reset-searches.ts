import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadUsers, saveUsers, SESSIONS } from './_users';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  const email = token ? SESSIONS[token] : undefined;
  if (!email) return res.status(401).json({ error: 'Authentication required.' });

  const users = loadUsers();
  const user = users[email];
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.tier = 'free';
  user.searchesRemaining = 3;
  users[email] = user;
  saveUsers(users);
  return res.json({ success: true, user: { email: user.email, tier: user.tier, searchesRemaining: user.searchesRemaining, createdAt: user.createdAt } });
}
