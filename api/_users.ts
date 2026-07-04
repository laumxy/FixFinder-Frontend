/**
 * In-memory user store for Vercel serverless functions.
 * NOTE: Vercel functions are stateless — sessions reset on cold starts.
 * For production, replace with a DB (e.g. Vercel KV / PlanetScale).
 */

interface User {
  email: string;
  passwordHash: string;
  tier: 'free' | 'pro';
  searchesRemaining: number;
  createdAt: string;
}

// In-memory stores (persist within a warm function instance)
export const SESSIONS: Record<string, string> = {}; // token → email
const USERS: Record<string, User> = {};

export function loadUsers(): Record<string, User> {
  return USERS;
}

export function saveUsers(users: Record<string, User>): void {
  Object.assign(USERS, users);
}

export function createSession(email: string): string {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  SESSIONS[token] = email;
  return token;
}
