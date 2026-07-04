/**
 * Persistent user + session store backed by Vercel KV (Redis).
 * This replaces the broken in-memory store — each serverless function
 * invocation is its own process, so in-memory state never survives
 * across register → login calls.
 *
 * Setup (one-time, free):
 *   Vercel Dashboard → Storage → Create KV database → Connect to this project.
 *   Vercel auto-injects KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN env vars.
 */

import { kv } from '@vercel/kv';

export interface User {
  email: string;
  passwordHash: string;
  tier: 'free' | 'pro';
  searchesRemaining: number;
  createdAt: string;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUser(email: string): Promise<User | null> {
  return kv.get<User>(`user:${email.toLowerCase()}`);
}

export async function setUser(user: User): Promise<void> {
  await kv.set(`user:${user.email.toLowerCase()}`, user);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

// Sessions expire after 7 days
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function createSession(email: string): Promise<string> {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  await kv.set(`session:${token}`, email.toLowerCase(), { ex: SESSION_TTL_SECONDS });
  return token;
}

export async function getSessionEmail(token: string): Promise<string | null> {
  return kv.get<string>(`session:${token}`);
}

export async function deleteSession(token: string): Promise<void> {
  await kv.del(`session:${token}`);
}
