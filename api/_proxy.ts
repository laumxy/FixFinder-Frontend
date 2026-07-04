/**
 * Shared proxy helper — forwards a request to the Python FastAPI backend.
 */
export const BACKEND_URL = (process.env.PYTHON_BACKEND_URL || 'https://fixfinder-offline-production.up.railway.app').replace(/\/$/, '');

export async function proxyToBackend(
  backendPath: string,
  method: string,
  body: any,
  authHeader: string | undefined
): Promise<{ status: number; data: any }> {
  const url = `${BACKEND_URL}${backendPath}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  const options: RequestInit = { method, headers };
  if (method !== 'GET' && method !== 'HEAD' && body !== undefined) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({ error: 'Non-JSON response', status: res.status }));
    return { status: res.status, data };
  } catch (err: any) {
    return {
      status: 502,
      data: {
        error: 'Python backend unavailable',
        detail: err?.message,
        backend_url: BACKEND_URL,
      },
    };
  }
}
