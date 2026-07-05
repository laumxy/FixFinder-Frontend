/**
 * Catch-all proxy: /api/engine/* → Python FastAPI backend
 * e.g. POST /api/engine/diagnose → POST https://backend/diagnose
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyToBackend, BACKEND_URL } from '../_proxy.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract path from req.url since req.query.path may not work correctly
  // req.url is like /api/engine/converse?path=converse
  const urlPath = req.url?.split('?')[0] || '';
  const segments = urlPath.split('/').filter(Boolean);
  // segments = ['api', 'engine', 'converse'] -> we want ['converse']
  const backendSegments = segments.slice(2); // skip 'api' and 'engine'
  const backendPath = '/' + backendSegments.join('/');

  const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const method = req.method || 'GET';
  const fullUrl = `${BACKEND_URL}${backendPath}${qs}`;
  
  console.log(`[engine-proxy] ${method} ${fullUrl}`);
  console.log(`[engine-proxy] Body: ${JSON.stringify(req.body)}`);
  
  const { status, data } = await proxyToBackend(
    backendPath,
    method,
    req.body,
    req.headers.authorization
  );
  
  console.log(`[engine-proxy] Response: ${status}`, JSON.stringify(data).substring(0, 200));
  return res.status(status).json(data);
}
