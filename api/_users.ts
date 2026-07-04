/**
 * Persistent user + session store backed by Vercel Blob.
 * Uses two public JSON blobs: fixfinder-users.json / fixfinder-sessions.json
 * BLOB_READ_WRITE_TOKEN is auto-injected by Vercel when Blob store is connected.
 */

import { put, list } from '@vercel/blob';

export interface User {
  email: string;
  passwordHash: string;
  tier: 'free' | 'pro';
  searchesRemaining: number;
  createdAt: string;
}

type UserStore    = Record<string, User>;
type SessionStore = Record<string, { email: string; expiresAt: number }>;

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USERS_FILE    = 'fixfinder-users.json';
const SESSIONS_FILE = 'fixfinder-sessions.json';

// ── Blob read/write ───────────────────────────────────────────────────────────

async function readBlob<T>(filename: string, fallback: T): Promise<T> {
  try {
    // list() finds the blob by prefix — works reliably unlike head()
    const { blobs } = await list({ prefix: filename });
    const blob = blobs.find(b => b.pathname === filename);
    if (!blob?.url) return fallback;
    const res = await fetch(blob.url, { cache: 'no-store' });
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
  const store = await readBlob<UserStore>(USERS_FILE, {});
  return store[email.toLowerCase()] ?? null;
}

export async function setUser(user: User): Promise<void> {
  const store = await readBlob<UserStore>(USERS_FILE, {});
  store[user.email.toLowerCase()] = user;
  await writeBlob(USERS_FILE, store);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(email: string): Promise<string> {
  const store = await readBlob<SessionStore>(SESSIONS_FILE, {});
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  store[token] = { email: email.toLowerCase(), expiresAt: Date.now() + SESSION_TTL_MS };
  await writeBlob(SESSIONS_FILE, store);
  return token;
}

export async function getSessionEmail(token: string): Promise<string | null> {
  const store = await readBlob<SessionStore>(SESSIONS_FILE, {});
  const session = store[token];
  if (!session || session.expiresAt < Date.now()) return null;
  return session.email;
}

export async function deleteSession(token: string): Promise<void> {
  const store = await readBlob<SessionStore>(SESSIONS_FILE, {});
  delete store[token];
  await writeBlob(SESSIONS_FILE, store);
}
