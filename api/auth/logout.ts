import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SESSIONS } from '../_users.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && SESSIONS[token]) delete SESSIONS[token];
  return res.json({ success: true });
}
