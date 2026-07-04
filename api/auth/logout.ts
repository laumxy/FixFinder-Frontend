import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteSession } from '../_users.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) await deleteSession(token);
  return res.json({ success: true });
}
