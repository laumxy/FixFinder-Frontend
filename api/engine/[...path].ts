/**
 * Catch-all proxy: /api/engine/* → Python FastAPI backend
 * e.g. POST /api/engine/diagnose → POST https://backend/diagnose
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyToBackend } from '../_proxy.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // req.query.path is an array of path segments from [...path]
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const backendPath = '/' + segments.join('/');

  const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const method = req.method || 'GET';
  
  console.log(`[engine-proxy] ${method} ${backendPath}${qs}`);
  
  const { status, data } = await proxyToBackend(
    backendPath + qs,
    method,
    req.body,
    req.headers.authorization
  );
  
  console.log(`[engine-proxy] Response: ${status}`);
  return res.status(status).json(data);
}
