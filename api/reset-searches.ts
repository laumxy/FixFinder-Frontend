import type { VercelRequest, VercelResponse } from '@vercel/node';

// Stateless reset — returns fresh counts without touching any store.
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return res.json({
      success: true,
      user: {
        email: payload.username || payload.sub || '',
        tier: 'free',
        searchesRemaining: 3,
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    return res.status(401).json({ error: 'Invalid token.' });
  }
}
