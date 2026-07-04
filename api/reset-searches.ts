import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUser, setUser, getSessionEmail } from './_users.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  const email = token ? await getSessionEmail(token) : null;
  if (!email) return res.status(401).json({ error: 'Authentication required.' });

  const user = await getUser(email);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.tier = 'free';
  user.searchesRemaining = 3;
  await setUser(user);
  return res.json({ success: true, user: { email: user.email, tier: user.tier, searchesRemaining: user.searchesRemaining, createdAt: user.createdAt } });
}
