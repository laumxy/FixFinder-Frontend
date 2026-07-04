import type { VercelRequest, VercelResponse } from '@vercel/node';

// JWT is stateless — logout is handled client-side by dropping the token.
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  return res.json({ success: true });
}
