import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadUsers, SESSIONS } from '../_users';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const email = token ? SESSIONS[token] : undefined;

  if (!email) return res.json({ loggedIn: false, user: null });

  const users = loadUsers();
  const user = users[email];
  if (!user) return res.json({ loggedIn: false, user: null });

  return res.json({
    loggedIn: true,
    user: { email: user.email, tier: user.tier, searchesRemaining: user.searchesRemaining, createdAt: user.createdAt },
  });
}
