/**
 * Persistent user + session store backed by Vercel Blob.
 * Stores two JSON blobs: "users.json" and "sessions.json".
 * No external database needed — Blob is available on all Vercel plans.
 *
 * Requires env var: BLOB_READ_WRITE_TOKEN
 * (auto-injected when you connect a Blob store in Vercel → Storage → Blob)
 */

import { put, head, getDownloadUrl } from '@vercel/blob';

export interface User {
  email: string;
  passwordHash: string;
  tier: 'free' | 'pro';
  searchesRemaining: number;
  createdAt: string;
}

type UserStore = Record<string, User>;
type SessionStore = Record<string, { email: string; expiresAt: number }>;

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Blob helpers ──────────────────────────────────────────────────────────────

async function readBlob<T>(filename: string, fallback: T): Promise<T> {
  try {
    const result = await head(filename);
    if (!result?.url) return fallback;
    const res = await fetch(result.url);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

async function writeBlob(filename: string, data: unknown): Promise<void> {
  await put(filename, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUser(email: string): Promise<User | null> {
  const store = await readBlob<UserStore>('fixfinder-users.json', {});
  return store[email.toLowerCase()] ?? null;
}

export async function setUser(user: User): Promise<void> {
  const store = await readBlob<UserStore>('fixfinder-users.json', {});
  store[user.email.toLowerCase()] = user;
  await writeBlob('fixfinder-users.json', store);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(email: string): Promise<string> {
  const store = await readBlob<SessionStore>('fixfinder-sessions.json', {});
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  store[token] = { email: email.toLowerCase(), expiresAt: Date.now() + SESSION_TTL_MS };
  await writeBlob('fixfinder-sessions.json', store);
  return token;
}

export async function getSessionEmail(token: string): Promise<string | null> {
  const store = await readBlob<SessionStore>('fixfinder-sessions.json', {});
  const session = store[token];
  if (!session) return null;
  if (session.expiresAt < Date.now()) return null;
  return session.email;
}

export async function deleteSession(token: string): Promise<void> {
  const store = await readBlob<SessionStore>('fixfinder-sessions.json', {});
  delete store[token];
  await writeBlob('fixfinder-sessions.json', store);
}
