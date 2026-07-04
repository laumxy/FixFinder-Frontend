import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUser, getSessionEmail } from '../_users.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.json({ loggedIn: false, user: null });

  const email = await getSessionEmail(token);
  if (!email) return res.json({ loggedIn: false, user: null });

  const user = await getUser(email);
  if (!user) return res.json({ loggedIn: false, user: null });

  return res.json({
    loggedIn: true,
    user: { email: user.email, tier: user.tier, searchesRemaining: user.searchesRemaining, createdAt: user.createdAt },
  });
}
