/**
 * Auth helpers — all user data lives in the Python FastAPI backend (Railway).
 * No local storage needed. We proxy register/login/status through the backend.
 */

import { BACKEND_URL } from './_proxy.js';

export interface BackendUser {
  email: string;
  tier: 'free' | 'pro';
  searchesRemaining: number;
  createdAt: string;
  token: string;        // JWT from backend
  username: string;
}

/** Register a new user via the Python backend POST /users endpoint. */
export async function registerUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: BackendUser; error?: string }> {
  // username = email (backend uses username field)
  const username = email.trim().toLowerCase();

  try {
    const res = await fetch(`${BACKEND_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Backend requires an admin token to create users — we use a default
      // admin account seeded at startup, or open registration if no auth required.
      body: JSON.stringify({
        username,
        password,
        full_name: '',
        email: username,
        role: 'technician',
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: data?.detail || data?.message || 'Registration failed' };
    }

    // Now login to get a token
    return loginUser(email, password);
  } catch (err: any) {
    return { success: false, error: err?.message || 'Backend unreachable' };
  }
}

/** Login via the Python backend POST /login endpoint. */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: BackendUser; error?: string }> {
  const username = email.trim().toLowerCase();

  try {
    const res = await fetch(`${BACKEND_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.success) {
      return { success: false, error: data?.message || data?.detail || 'Invalid email or password' };
    }

    return {
      success: true,
      user: {
        email: username,
        tier: 'free',
        searchesRemaining: 3,
        createdAt: new Date().toISOString(),
        token: data.token,
        username: data.username,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Backend unreachable' };
  }
}
