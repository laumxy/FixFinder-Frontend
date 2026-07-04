/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { backendResultToSolutionItem, SolutionItem } from './src/solutionsData.ts';

dotenv.config();

const port = 3000;
const USERS_FILE = path.resolve('users.json');

// Interface for user
interface User {
  email: string;
  passwordHash: string;
  tier: 'free' | 'pro';
  searchesRemaining: number;
  createdAt: string;
}

function loadUsers(): Record<string, User> {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load users database, falling back to empty', err);
  }
  return {};
}

function saveUsers(users: Record<string, User>) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save users database', err);
  }
}

// Simple session store
const SESSIONS: Record<string, string> = {}; // sessionID -> email

// ── Python FastAPI backend proxy ──────────────────────────────────────────────
const PYTHON_BACKEND_URL = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

/**
 * Forward a request to the Python FastAPI backend and pipe the response back.
 * @param backendPath  Path on the Python backend, e.g. "/diagnose"
 * @param req          Incoming Express request
 * @param res          Outgoing Express response
 */
async function proxyToBackend(
  backendPath: string,
  req: express.Request,
  res: express.Response
): Promise<void> {
  const url = `${PYTHON_BACKEND_URL}${backendPath}`;

  // Build headers — forward Authorization if present, always set Content-Type
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }

  // Build fetch options
  const options: RequestInit = {
    method: req.method,
    headers,
  };

  // Attach body for non-GET/HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    options.body = JSON.stringify(req.body);
  }

  try {
    const backendRes = await fetch(url, options);
    const data = await backendRes.json().catch(() => ({
      error: 'Backend returned non-JSON response',
      status: backendRes.status,
    }));
    res.status(backendRes.status).json(data);
  } catch (err: any) {
    console.error(`[PROXY] Failed to reach Python backend at ${url}:`, err?.message);
    res.status(502).json({
      error: 'Python backend unavailable',
      detail: 'Make sure the FastAPI server is running: uvicorn main:app --reload --port 8000',
      backend_url: PYTHON_BACKEND_URL,
    });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Simple session lookup middleware
  app.use((req, res, next) => {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (sessionToken && SESSIONS[sessionToken]) {
      (req as any).userEmail = SESSIONS[sessionToken];
    }
    next();
  });

  // GET user status
  app.get('/api/user/status', (req, res) => {
    const email = (req as any).userEmail;
    if (!email) {
      return res.json({ loggedIn: false, user: null });
    }

    const users = loadUsers();
    const user = users[email];
    if (!user) {
      return res.json({ loggedIn: false, user: null });
    }

    return res.json({
      loggedIn: true,
      user: {
        email: user.email,
        tier: user.tier,
        searchesRemaining: user.searchesRemaining,
        createdAt: user.createdAt
      }
    });
  });

  // POST auth register
  app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = loadUsers();

    if (users[normalizedEmail]) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Create user with standard free tier parameters
    const newUser: User = {
      email: normalizedEmail,
      passwordHash: password, // Store password simply for mock auth purposes
      tier: 'free',
      searchesRemaining: 3,
      createdAt: new Date().toISOString()
    };

    users[normalizedEmail] = newUser;
    saveUsers(users);

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    SESSIONS[token] = normalizedEmail;

    return res.json({
      token,
      user: {
        email: newUser.email,
        tier: newUser.tier,
        searchesRemaining: newUser.searchesRemaining,
        createdAt: newUser.createdAt
      }
    });
  });

  // POST auth login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = loadUsers();
    const user = users[normalizedEmail];

    if (!user || user.passwordHash !== password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    SESSIONS[token] = normalizedEmail;

    return res.json({
      token,
      user: {
        email: user.email,
        tier: user.tier,
        searchesRemaining: user.searchesRemaining,
        createdAt: user.createdAt
      }
    });
  });

  // POST auth logout
  app.post('/api/auth/logout', (req, res) => {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (sessionToken && SESSIONS[sessionToken]) {
      delete SESSIONS[sessionToken];
    }
    return res.json({ success: true });
  });

  // GET search endpoint — proxies to Python backend /diagnose
  app.get('/api/search', async (req, res) => {
    const email = (req as any).userEmail;
    if (!email) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    const query = req.query.q as string;
    if (!query || query.trim() === '') {
      return res.json({ results: [] });
    }

    const users = loadUsers();
    const user = users[email];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check search tier limit
    if (user.tier === 'free') {
      if (user.searchesRemaining <= 0) {
        return res.status(403).json({
          error: 'Search limit reached',
          limitReached: true
        });
      }
      user.searchesRemaining--;
      users[email] = user;
      saveUsers(users);
    }

    console.log(`Diagnosing via Python backend: "${query}" (User: ${email}, Tier: ${user.tier}, Remaining: ${user.searchesRemaining})`);

    // Proxy to the Python FastAPI backend /diagnose endpoint
    const url = `${PYTHON_BACKEND_URL}/diagnose`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    try {
      const backendRes = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ problem: query }),
      });

      const raw = await backendRes.json().catch(() => null);

      if (!backendRes.ok || !raw) {
        console.error(`[DIAGNOSE] Backend returned error: ${backendRes.status}`);
        return res.status(backendRes.status).json({
          results: [],
          reasoningSteps: ['[ERROR] Diagnostic engine returned an error. Please try again.'],
          searchesRemaining: user.searchesRemaining,
          tier: user.tier,
        });
      }

      // Convert backend response to frontend SolutionItem format
      const solutionItem = backendResultToSolutionItem(raw, query);
      const results = [{ item: solutionItem, score: 98 }];

      // Build reasoning steps from backend data
      const reasoningSteps: string[] = [];
      if (raw._engine?.ai_reasoning) {
        reasoningSteps.push(`[ENGINE] ${raw._engine.ai_reasoning}`);
      }
      reasoningSteps.push(`[DIAGNOSE] Category identified: ${raw.category || 'General'}`);
      if (Array.isArray(raw.ranked_causes) && raw.ranked_causes.length > 0) {
        reasoningSteps.push(`[ISOLATE] Top probable causes: ${raw.ranked_causes.slice(0, 3).join(', ')}`);
      }
      reasoningSteps.push(`[COMPILE] Diagnostic report compiled successfully.`);

      return res.json({
        results,
        reasoningSteps,
        searchesRemaining: user.searchesRemaining,
        tier: user.tier,
      });
    } catch (err: any) {
      console.error(`[DIAGNOSE] Failed to reach Python backend at ${url}:`, err?.message);
      return res.status(502).json({
        results: [],
        reasoningSteps: ['[ERROR] Diagnostic engine unavailable. Ensure the backend is running.'],
        searchesRemaining: user.searchesRemaining,
        tier: user.tier,
        detail: 'Make sure the FastAPI server is running: uvicorn main:app --reload --port 8000',
      });
    }
  });

  // POST simulate-pro upgrades user to PRO
  app.post('/api/simulate-pro', (req, res) => {
    const email = (req as any).userEmail;
    if (!email) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const users = loadUsers();
    const user = users[email];
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.tier = 'pro';
    users[email] = user;
    saveUsers(users);

    return res.json({
      success: true,
      user: {
        email: user.email,
        tier: user.tier,
        searchesRemaining: user.searchesRemaining,
        createdAt: user.createdAt
      }
    });
  });

  // POST reset searches back to 3
  app.post('/api/reset-searches', (req, res) => {
    const email = (req as any).userEmail;
    if (!email) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const users = loadUsers();
    const user = users[email];
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.tier = 'free';
    user.searchesRemaining = 3;
    users[email] = user;
    saveUsers(users);

    return res.json({
      success: true,
      user: {
        email: user.email,
        tier: user.tier,
        searchesRemaining: user.searchesRemaining,
        createdAt: user.createdAt
      }
    });
  });

  // POST create checkout session
  app.post('/api/create-checkout-session', (req, res) => {
    const email = (req as any).userEmail;
    if (!email) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    // Simulate a successful checkout response with checkout URL
    return res.json({
      checkoutUrl: '#simulate-payment-success',
      simulated: true
    });
  });

  // ── Python FastAPI backend proxy routes (/api/engine/*) ─────────────────────
  //
  // These routes forward requests to the Python FastAPI backend so the React
  // app can call the real AI diagnosis engine, analytics, licensing, etc.
  // Prefix used: /api/engine  (maps to root on the Python backend)
  //
  // Examples:
  //   GET  /api/engine/health            → GET  http://127.0.0.1:8000/health
  //   POST /api/engine/diagnose          → POST http://127.0.0.1:8000/diagnose
  //   POST /api/engine/learn             → POST http://127.0.0.1:8000/learn
  //   GET  /api/engine/knowledge/version → GET  http://127.0.0.1:8000/knowledge/version
  //   GET  /api/engine/analytics         → GET  http://127.0.0.1:8000/analytics
  //   POST /api/engine/login             → POST http://127.0.0.1:8000/login
  //   GET  /api/engine/users             → GET  http://127.0.0.1:8000/users
  //   GET  /api/engine/reports           → GET  http://127.0.0.1:8000/reports
  //   POST /api/engine/activate-license  → POST http://127.0.0.1:8000/activate-license
  //   GET  /api/engine/knowledge-packs   → GET  http://127.0.0.1:8000/knowledge-packs

  // Health / status — also used by the frontend to check if Python backend is up
  app.get('/api/engine/health', async (req, res) => {
    await proxyToBackend('/health', req, res);
  });

  // Root info endpoint
  app.get('/api/engine', async (req, res) => {
    await proxyToBackend('/', req, res);
  });

  // Core: AI Diagnosis
  app.post('/api/engine/diagnose', async (req, res) => {
    await proxyToBackend('/diagnose', req, res);
  });

  // Core: Conversational Diagnosis (multi-turn chat)
  app.post('/api/engine/converse', async (req, res) => {
    await proxyToBackend('/converse', req, res);
  });

  // Core: Learn / ingest new knowledge
  app.post('/api/engine/learn', async (req, res) => {
    await proxyToBackend('/learn', req, res);
  });

  // Knowledge: version + record count
  app.get('/api/engine/knowledge/version', async (req, res) => {
    await proxyToBackend('/knowledge/version', req, res);
  });

  // Knowledge packs: list, build, install
  app.get('/api/engine/knowledge-packs', async (req, res) => {
    await proxyToBackend('/knowledge-packs', req, res);
  });
  app.post('/api/engine/build-pack', async (req, res) => {
    await proxyToBackend('/build-pack', req, res);
  });
  app.post('/api/engine/install-pack', async (req, res) => {
    await proxyToBackend('/install-pack', req, res);
  });

  // Auth: login
  app.post('/api/engine/login', async (req, res) => {
    await proxyToBackend('/login', req, res);
  });

  // Users
  app.post('/api/engine/users', async (req, res) => {
    await proxyToBackend('/users', req, res);
  });
  app.get('/api/engine/users', async (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    await proxyToBackend(`/users${qs}`, req, res);
  });
  app.get('/api/engine/users/:userId', async (req, res) => {
    await proxyToBackend(`/users/${req.params.userId}`, req, res);
  });

  // Licensing
  app.post('/api/engine/activate-license', async (req, res) => {
    await proxyToBackend('/activate-license', req, res);
  });

  // Analytics
  app.get('/api/engine/analytics', async (req, res) => {
    await proxyToBackend('/analytics', req, res);
  });

  // Reports
  app.get('/api/engine/reports', async (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    await proxyToBackend(`/reports${qs}`, req, res);
  });
  app.post('/api/engine/reports', async (req, res) => {
    await proxyToBackend('/reports', req, res);
  });
  app.get('/api/engine/reports/analytics', async (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    await proxyToBackend(`/reports/analytics${qs}`, req, res);
  });

  // Enterprise: Organizations
  app.post('/api/engine/orgs', async (req, res) => {
    await proxyToBackend('/orgs', req, res);
  });
  app.get('/api/engine/orgs', async (req, res) => {
    await proxyToBackend('/orgs', req, res);
  });
  app.get('/api/engine/orgs/:orgId', async (req, res) => {
    await proxyToBackend(`/orgs/${req.params.orgId}`, req, res);
  });
  app.post('/api/engine/orgs/:orgId/departments', async (req, res) => {
    await proxyToBackend(`/orgs/${req.params.orgId}/departments`, req, res);
  });
  app.get('/api/engine/orgs/:orgId/departments', async (req, res) => {
    await proxyToBackend(`/orgs/${req.params.orgId}/departments`, req, res);
  });

  // Workshop: Customers
  app.post('/api/engine/workshop/customers', async (req, res) => {
    await proxyToBackend('/workshop/customers', req, res);
  });
  app.get('/api/engine/workshop/customers', async (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    await proxyToBackend(`/workshop/customers${qs}`, req, res);
  });
  app.get('/api/engine/workshop/customers/:customerId', async (req, res) => {
    await proxyToBackend(`/workshop/customers/${req.params.customerId}`, req, res);
  });
  app.post('/api/engine/workshop/customers/:customerId/equipment', async (req, res) => {
    await proxyToBackend(`/workshop/customers/${req.params.customerId}/equipment`, req, res);
  });
  app.get('/api/engine/workshop/customers/:customerId/equipment', async (req, res) => {
    await proxyToBackend(`/workshop/customers/${req.params.customerId}/equipment`, req, res);
  });

  // Workshop: Jobs
  app.post('/api/engine/workshop/jobs', async (req, res) => {
    await proxyToBackend('/workshop/jobs', req, res);
  });
  app.get('/api/engine/workshop/jobs', async (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    await proxyToBackend(`/workshop/jobs${qs}`, req, res);
  });
  app.get('/api/engine/workshop/jobs/:jobId', async (req, res) => {
    await proxyToBackend(`/workshop/jobs/${req.params.jobId}`, req, res);
  });
  app.patch('/api/engine/workshop/jobs/:jobId', async (req, res) => {
    await proxyToBackend(`/workshop/jobs/${req.params.jobId}`, req, res);
  });
  app.get('/api/engine/workshop/summary', async (req, res) => {
    await proxyToBackend('/workshop/summary', req, res);
  });
  app.get('/api/engine/workshop/report', async (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    await proxyToBackend(`/workshop/report${qs}`, req, res);
  });

  // Workshop: Equipment
  app.post('/api/engine/workshop/equipment', async (req, res) => {
    await proxyToBackend('/workshop/equipment', req, res);
  });

  // Localization
  app.get('/api/engine/localization/languages', async (req, res) => {
    await proxyToBackend('/localization/languages', req, res);
  });
  app.post('/api/engine/localization/translations', async (req, res) => {
    await proxyToBackend('/localization/translations', req, res);
  });

  // ── End of Python backend proxy routes ────────────────────────────────────

  // Integrate Vite dev middleware
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '127.0.0.1', () => {
    console.log(`FixFinder Offline server listening at http://localhost:${port}`);
  });
}

startServer();
