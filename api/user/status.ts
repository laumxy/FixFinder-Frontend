import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BACKEND_URL } from '../_proxy.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.json({ loggedIn: false, user: null });

  try {
    // Verify token with the backend by hitting a protected endpoint
    const backendRes = await fetch(`${BACKEND_URL}/users`, {
      headers: { Authorization: authHeader },
    });

    if (!backendRes.ok) return res.json({ loggedIn: false, user: null });

    // Token is valid — decode email from JWT payload (base64 middle segment)
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    return res.json({
      loggedIn: true,
      user: {
        email: payload.username || payload.sub || '',
        tier: 'free',
        searchesRemaining: 3,
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    return res.json({ loggedIn: false, user: null });
  }
}
