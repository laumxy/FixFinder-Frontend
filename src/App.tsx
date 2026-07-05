/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, 
  Search, 
  Bookmark, 
  Share2, 
  LogOut, 
  Settings, 
  CheckCircle, 
  Wifi, 
  WifiOff, 
  Lock, 
  User, 
  Star, 
  ArrowLeft, 
  AlertTriangle, 
  X, 
  ChevronDown, 
  Sparkles, 
  RefreshCw, 
  Download, 
  Smartphone,
  Check,
  Cpu,
  Zap,
  Shield,
  Layers,
  Sparkle,
  BookOpen,
  ArrowRight,
  Database,
  Sliders,
  Play,
  Sun,
  Moon,
  Monitor,
  HelpCircle,
  Compass,
  Activity,
  Phone,
  Send,
  Bot,
  MessageSquare,
  UserCircle,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { solutionsDataset, SolutionItem } from './solutionsData';
import NeuralAIField from './components/NeuralAIField';
import HolographicSchematic from './components/HolographicSchematic';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  questions?: string[];
  diagnostic?: any;
  timestamp: Date;
}

// ── Inline text renderer: handles **bold** within a single line ──────────────
function renderInline(text: string, resolvedTheme: 'light' | 'dark'): React.ReactNode {
  if (!text.includes('**')) return text;
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 === 1
          ? <strong key={i} className={resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}>{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

export default function App() {
  // App States
  const [user, setUser] = useState<{
    email: string;
    tier: 'free' | 'pro';
    searchesRemaining: number;
    createdAt: string;
  } | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fixfinder_token'));
  const [view, setView] = useState<'launch' | 'main'>('launch');
  const [activeTab, setActiveTab] = useState<'search' | 'saved' | 'settings'>('search');
  
  // Actual Connection State
  const [isActualOnline, setIsActualOnline] = useState<boolean>(navigator.onLine);

  // Auth Modal state
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // AI Engine Download State
  const [aiEngineProgress, setAiEngineProgress] = useState<number>(0);
  const [aiEngineReady, setAiEngineReady] = useState<boolean>(
    localStorage.getItem('fixfinder_ai_cached') === 'true'
  );

  // Search Engine States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ item: SolutionItem; score: number }>>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [emptyState, setEmptyState] = useState<boolean>(false);
  const [aiReasoningActive, setAiReasoningActive] = useState<boolean>(false);
  const [aiReasoningSteps, setAiReasoningSteps] = useState<string[]>([]);

  // Chat UI State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Detail View State
  const [selectedSolution, setSelectedSolution] = useState<SolutionItem | null>(null);

  // Completed steps in selected solutions (for high interactive fidelity)
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Saved/Bookmarked IDs
  const [savedFixIds, setSavedFixIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('fixfinder_saved');
    return saved ? JSON.parse(saved) : [];
  });

  // Saved Full Solution objects (for dynamic offline custom solutions)
  const [savedSolutions, setSavedSolutions] = useState<SolutionItem[]>(() => {
    const saved = localStorage.getItem('fixfinder_saved_solutions');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync saved full solutions with localStorage
  useEffect(() => {
    localStorage.setItem('fixfinder_saved_solutions', JSON.stringify(savedSolutions));
  }, [savedSolutions]);

  // Upgrade Flow states
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [upgradeLoading, setUpgradeLoading] = useState<boolean>(false);
  const [showStripeModal, setShowStripeModal] = useState<boolean>(false);
  const [stripeSuccessMessage, setStripeSuccessMessage] = useState<string>('');

  // Dropdowns & Toasts
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showInstallToast, setShowInstallToast] = useState<boolean>(true);

  // Layer 2 & 3: Aggregator and Sync states
  const [scrapedSources, setScrapedSources] = useState<any[]>([]);
  const [aggregationLogs, setAggregationLogs] = useState<string[]>([]);
  const [trendingProblems, setTrendingProblems] = useState<any[]>([]);
  const [graphNodes, setGraphNodes] = useState<any[]>([]);
  const [graphEdges, setGraphEdges] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [cellularDataCap, setCellularDataCap] = useState<boolean>(false);
  const [privacyPreserveCapture, setPrivacyPreserveCapture] = useState<boolean>(true);

  // Layer 1: Local PWA Offline Engines and Web Worker States
  const [webWorkerRunning, setWebWorkerRunning] = useState<boolean>(false);
  const [webWorkerLogs, setWebWorkerLogs] = useState<string[]>([
    `[WORKER] Web Worker thread initiated on pool index 0.`,
    `[FAISS] FAISS-wasm local vector index active with ${solutionsDataset.length} nodes.`,
    `[LLM] WebLLM Gemma-2B ready for offline prompt completions.`
  ]);
  const [selectedRAGEngine, setSelectedRAGEngine] = useState<'compact' | 'faiss' | 'gemma'>('faiss');

  // Theme Switching States
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('fixfinder_theme') as 'light' | 'dark' | 'system') || 'dark';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    localStorage.setItem('fixfinder_theme', theme);
    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      setResolvedTheme(media.matches ? 'dark' : 'light');
      const listener = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [resolvedTheme]);

  // Listen to actual network changes
  useEffect(() => {
    const handleOnline = () => {
      setIsActualOnline(true);
      showToast("📡 Connection restored. Online search activated.");
    };
    const handleOffline = () => {
      setIsActualOnline(false);
      showToast("✈️ Connection lost. Switching to on-device database.");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // API Call: Fetch current backend knowledge aggregation state
  const fetchAggregationData = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/aggregation/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setScrapedSources(data.scrapedSources || []);
        setAggregationLogs(data.aggregationLogs || []);
        setTrendingProblems(data.trendingProblems || []);
        setGraphNodes(data.graphNodes || []);
        setGraphEdges(data.graphEdges || []);
      }
    } catch (err) {
      console.error('Failed to load aggregation data:', err);
    }
  };

  // Layer 3: Sync Protocol - Manual differential sync trigger with batch cap control
  const triggerDifferentialSync = async () => {
    if (!token) {
      showToast("🔐 Authentication required to hand-shake with Sync Server.");
      return;
    }
    if (isOffline) {
      showToast("📴 Device is currently offline. Re-enable network to handshake with Sync Server.");
      return;
    }
    
    setIsSyncing(true);
    setWebWorkerLogs(prev => [...prev, `[SYNC] [${new Date().toLocaleTimeString()}] Handshaking with secure California gateway...`]);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (cellularDataCap) {
        setWebWorkerLogs(prev => [...prev, `[SYNC] Cellular Data Limit active: Throttling download stream to 256KB chunks...`]);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      
      setWebWorkerLogs(prev => [...prev, `[SYNC] Requesting differential delta manifest since last sync...`]);
      
      const res = await fetch('/api/solutions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok && data.solutions) {
        const serverSolutions = data.solutions;
        const localSavedIds = savedSolutions.map(s => s.id);
        
        // Find solutions on server that don't exist in local static dataset and aren't in local saved state
        const missingSolutions = serverSolutions.filter((s: any) => 
          !solutionsDataset.some(x => x.id === s.id) && !localSavedIds.includes(s.id)
        );
        
        await new Promise(resolve => setTimeout(resolve, 800));
        setWebWorkerLogs(prev => [...prev, `[SYNC] Diff computed: Server [${serverSolutions.length}] vs Local [${solutionsDataset.length + savedSolutions.length}]`]);
        
        if (missingSolutions.length > 0) {
          setWebWorkerLogs(prev => [...prev, `[SYNC] Found ${missingSolutions.length} differential delta packages. Downloading payload...`]);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setSavedSolutions(prev => {
            const merged = [...prev];
            missingSolutions.forEach((s: any) => {
              if (!merged.some(x => x.id === s.id)) {
                merged.push(s);
              }
            });
            return merged;
          });
          
          setWebWorkerLogs(prev => [...prev, `[SYNC] Success! Injected ${missingSolutions.length} new delta nodes to IndexedDB ledger.`]);
          showToast(`🔄 Synced ${missingSolutions.length} new solutions!`);
          
          // Trigger Web Worker embedding generation for the new synced items
          triggerWebWorkerVectorization(missingSolutions);
        } else {
          setWebWorkerLogs(prev => [...prev, `[SYNC] Ledger match confirmed. Local IndexedDB is perfectly up to date.`]);
          showToast("🔄 Sync complete: No new repair items found.");
        }
      }
    } catch (err) {
      console.error(err);
      setWebWorkerLogs(prev => [...prev, `[SYNC] Connection refused. Verify sync credentials or proxy server.`]);
      showToast("Sync failed: Connection timeout.");
    } finally {
      setIsSyncing(false);
      fetchAggregationData();
    }
  };

  // Layer 1: Simulated background Web Worker for embedding computation & FAISS indexing
  const triggerWebWorkerVectorization = async (items: any[]) => {
    setWebWorkerRunning(true);
    setWebWorkerLogs(prev => [...prev, `[WORKER] Spawning dedicated Web Worker thread for high-dimensional vectorization...`]);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await new Promise(resolve => setTimeout(resolve, 800));
      setWebWorkerLogs(prev => [
        ...prev,
        `[WORKER] Tokenizing payload for: "${item.problem}"`,
        `[WORKER] Generated 1536-dim vector via local weights (Time: 14ms)`,
        `[FAISS] Injected vector [${(Math.random()*0.1).toFixed(4)}, ${(Math.random()*-0.1).toFixed(4)}, ...] to FAISS-wasm local index.`
      ]);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    setWebWorkerLogs(prev => [...prev, `[WORKER] Thread idle. ${items.length} new nodes successfully vectorized and indexed.`]);
    setWebWorkerRunning(false);
  };

  // Layer 2: Aggregation Server scraper run trigger
  const triggerBackendScrape = async () => {
    if (!token) {
      showToast("🔐 Authentication required to control Aggregation Server.");
      return;
    }
    if (isOffline) {
      showToast("📴 Offline mode: Cannot trigger scraper crawlers on server.");
      return;
    }
    
    setIsScraping(true);
    showToast("🕷️ Spawning crawlers across Reddit, StackExchange, and YouTube transcripts...");
    
    try {
      const res = await fetch('/api/aggregation/trigger-scrape', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Scraped & deduplicated new problem: "${data.newlyScraped.problem}"`);
        fetchAggregationData();
      } else {
        showToast(data.error || 'Scraper run failed');
      }
    } catch (err) {
      console.error(err);
      showToast("Could not communicate with Aggregation Server scraper agent.");
    } finally {
      setIsScraping(false);
    }
  };

  // Auto-fetch aggregation logs/data on tab switch
  useEffect(() => {
    if (token && activeTab === 'aggregator') {
      fetchAggregationData();
    }
  }, [token, activeTab]);

  // Sync saved fixes with localStorage
  useEffect(() => {
    localStorage.setItem('fixfinder_saved', JSON.stringify(savedFixIds));
  }, [savedFixIds]);

  // Is current app functionally offline?
  const isOffline = !isActualOnline;

  // On mount: Fetch user status if token exists
  useEffect(() => {
    if (token) {
      fetchUserStatus(token);
    }
  }, [token]);

  // Simulate downloading the AI Model
  useEffect(() => {
    if (user && !aiEngineReady) {
      let interval = setInterval(() => {
        setAiEngineProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setAiEngineReady(true);
            localStorage.setItem('fixfinder_ai_cached', 'true');
            showToast("✓ AI Neural Model fully downloaded & cached into IndexedDB!");
            return 100;
          }
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 250);
      return () => clearInterval(interval);
    }
  }, [user, aiEngineReady]);

  // Helper to trigger transient toasts
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  // API Call: Fetch User Status
  const fetchUserStatus = async (authToken: string) => {
    try {
      const res = await fetch('/api/user/status', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.loggedIn && data.user) {
        setUser(data.user);
        setView('main');
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error('Error fetching user status:', err);
    }
  };

  // API Call: Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
      } else {
        localStorage.setItem('fixfinder_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setShowAuthModal(false);
        setView('main');
        showToast(`Access Granted. Welcome back, ${data.user.email}!`);
      }
    } catch (err) {
      setAuthError('Could not reach secure server. Verify network connection.');
    } finally {
      setAuthLoading(false);
    }
  };

  // API Call: Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password security threshold is 6 characters.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Registration failed');
      } else {
        localStorage.setItem('fixfinder_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setShowAuthModal(false);
        setView('main');
        showToast('Secure Profile Created. Welcome to FixFinder RV!');
      }
    } catch (err) {
      setAuthError('Could not reach secure server. Verify network connection.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Continue as Guest (Mock Auth Bypass)
  const handleGuestMode = () => {
    const guestUser = {
      email: 'guest@fixfinder.io',
      tier: 'pro' as const,
      searchesRemaining: 999,
      createdAt: new Date().toISOString()
    };
    setUser(guestUser);
    setAiEngineReady(true);
    setView('main');
    showToast('Signed in as Guest – Pro Access Granted!');
  };

  // API Call: Logout
  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem('fixfinder_token');
    setToken(null);
    setUser(null);
    setView('launch');
    setSelectedSolution(null);
    setSearchResults([]);
    setSearchQuery('');
    showToast('Secure session closed.');
  };

  // Client-side/Offline Semantic Search fallback
  const performOfflineSearch = (query: string) => {
    const queryWords = query.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
    if (queryWords.length === 0) return [];

    // Search both static dataset and custom generated bookmarked solutions
    const searchPool = Array.from(new Map([...solutionsDataset, ...savedSolutions].map(item => [item.id, item])).values());

    const results = searchPool.map(item => {
      let score = 0;
      const problemText = item.problem.toLowerCase();
      const solutionText = item.solution.toLowerCase();

      // Direct exact match of whole query in problem title
      if (problemText.includes(query.toLowerCase())) {
        score += 55;
      }

      // Exact keyword matching
      item.keywords.forEach(keyword => {
        if (queryWords.includes(keyword.toLowerCase())) {
          score += 15;
        }
      });

      // Part of keyword match
      queryWords.forEach(word => {
        if (problemText.includes(word)) score += 8;
        if (solutionText.includes(word)) score += 3;
        item.steps.forEach(step => {
          if (step.toLowerCase().includes(word)) score += 1;
        });
      });

      return { item, score };
    });

    const matched = results.filter(r => r.score > 0);
    if (matched.length === 0) return [];

    const maxScore = Math.max(...matched.map(r => r.score));
    return matched
      .map(r => {
        const basePercent = 65;
        const variablePercent = maxScore > 0 ? (r.score / maxScore) * 34 : 0;
        const scorePercentage = Math.round(basePercent + variablePercent);
        return {
          item: r.item,
          score: Math.min(scorePercentage, 99)
        };
      })
      .sort((a, b) => b.score - a.score);
  };

  // Main Search triggers — queries the Python backend diagnostic engine directly
  const handleSearchSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery !== undefined ? customQuery : searchQuery;
    if (!query || query.trim() === '') return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Limit searches check
    if (user.tier === 'free' && user.searchesRemaining <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    setSearchLoading(true);
    setEmptyState(false);
    setSelectedSolution(null);
    setCompletedSteps({});
    setAiReasoningActive(true);
    setAiReasoningSteps([]);

    // Helper to append a step after a specified delay
    const appendLog = (msg: string, delay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setAiReasoningSteps(prev => [...prev, msg]);
          resolve();
        }, delay);
      });
    };

    try {
      await appendLog(`[SEARCH] Querying diagnostic engine for: "${query}"...`, 200);

      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 403) {
        setShowUpgradeModal(true);
        setSearchLoading(false);
        setAiReasoningActive(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      setSearchResults(data.results || []);
      setEmptyState((data.results || []).length === 0);

      if (user.tier === 'free') {
        setUser(prev => prev ? { ...prev, searchesRemaining: data.searchesRemaining } : null);
      }

      // Display real reasoning steps from the backend engine
      const realSteps = data.reasoningSteps || [];
      for (const step of realSteps) {
        await appendLog(step, 150);
      }

      if ((data.results || []).length > 0) {
        await appendLog(`[SUCCESS] Diagnostic report compiled successfully.`, 150);
        showToast(`Found ${data.results.length} result(s) from diagnostic engine.`);
      } else {
        await appendLog(`[INFO] No matching diagnostics found. Try rephrasing your query.`, 150);
        showToast('No results found. Try a different search query.');
      }
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
      setEmptyState(true);
      await appendLog(`[ERROR] Diagnostic engine unreachable. Ensure the backend is running.`, 200);
      showToast('Backend engine unavailable. Make sure the server is running.');
    } finally {
      await new Promise(resolve => setTimeout(resolve, 600));
      setSearchLoading(false);
      setAiReasoningActive(false);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Conversational Chat Handler ───────────────────────────────────────
  const handleChatMessage = async (message?: string) => {
    const text = (message || chatInput).trim();
    if (!text) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Limit searches check
    if (user.tier === 'free' && user.searchesRemaining <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    setSelectedSolution(null);

    try {
      const res = await fetch('/api/engine/converse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          session_id: chatSessionId,
          language: 'en',
        }),
      });

      if (res.status === 403) {
        setShowUpgradeModal(true);
        setChatLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();

      // Update session ID for follow-up messages
      if (data.session_id && data.session_id !== chatSessionId) {
        setChatSessionId(data.session_id);
      }

      // Update search count
      if (user.tier === 'free' && data.searchesRemaining !== undefined) {
        setUser(prev => prev ? { ...prev, searchesRemaining: data.searchesRemaining } : null);
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'I need more information to help you.',
        questions: data.questions || [],
        diagnostic: data.diagnostic || null,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);

      // If it's a full diagnosis, also populate the solution detail view
      if (data.type === 'diagnosis' && data.diagnostic) {
        const diag = data.diagnostic;
        const solutionItem: SolutionItem = {
          id: `diag-${Date.now()}`,
          category: diag.category || 'general',
          problem: diag.problem || text,
          solution: diag.final_answer || data.message || '',
          steps: diag.repair_steps || [],
          keywords: diag.ranked_causes || [],
          observedSymptoms: diag.symptoms || [],
          requiredTools: diag.tools || [],
          safetyPrecautions: diag.safety || [],
          inspectionSteps: diag.inspection_steps || [],
          preventionAdvice: diag.prevention || [],
          repairPriority: (diag.risk_level === 'high' ? 'High' : diag.risk_level === 'low' ? 'Low' : 'Medium') as SolutionItem['repairPriority'],
          estimatedTime: diag.estimated_time || 'unknown',
          estimatedCost: diag.estimated_cost || 'unknown',
          confidenceLevels: diag.confidence_scores || [],
          _raw: diag,
        };
        setSearchResults([{ item: solutionItem, score: Math.round(data.confidence * 100) }]);
      }
    } catch (err) {
      console.error('Chat failed:', err);
      const errorMsg: ChatMessage = {
        id: `a-err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I couldn\'t connect to the diagnostic engine. Please make sure the backend server is running.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMsg]);
      showToast('Backend engine unavailable.');
    } finally {
      setChatLoading(false);
    }
  };

  // Handle chat form submit
  const handleChatSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleChatMessage();
  };

  // Handle question chip click
  const handleQuestionClick = (question: string) => {
    handleChatMessage(question);
  };

  // Start new chat conversation
  const handleNewChat = () => {
    setChatMessages([]);
    setChatSessionId('');
    setSearchResults([]);
    setSelectedSolution(null);
  };

  // Copy message content
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    showToast('Copied to clipboard');
  };

  // Toggle Bookmark
  const handleToggleBookmark = (item: SolutionItem, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    const id = item.id;
    if (savedFixIds.includes(id)) {
      setSavedFixIds(prev => prev.filter(x => x !== id));
      setSavedSolutions(prev => prev.filter(x => x.id !== id));
      showToast("Removed from local offline saved vault.");
    } else {
      setSavedFixIds(prev => [...prev, id]);
      setSavedSolutions(prev => {
        if (prev.some(x => x.id === id)) return prev;
        return [...prev, item];
      });
      showToast("Saved! Solution fully compiled to local IndexedDB.");
    }
  };

  // Copy shareable link
  const handleShareSolution = (item: SolutionItem, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    const mockUrl = `${window.location.origin}/share/fix/${item.id}`;
    navigator.clipboard.writeText(mockUrl);
    showToast("📋 Shareable diagnostic manifest copied to clipboard!");
  };

  // Simulate Payment Upgrade
  const handleUpgradePayment = () => {
    setUpgradeLoading(true);
    setTimeout(() => {
      setUpgradeLoading(false);
      setShowUpgradeModal(false);
      setShowStripeModal(true);
    }, 1200);
  };

  const handleConfirmStripePayment = async () => {
    setUpgradeLoading(true);
    try {
      if (token) {
        const res = await fetch('/api/simulate-pro', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setStripeSuccessMessage("Payment authorized! Securely upgrading subscription...");
          setTimeout(() => {
            setShowStripeModal(false);
            setStripeSuccessMessage("");
          }, 2000);
          showToast("🎉 Welcome to PRO! Backcountry unlimited AI unlocked.");
        }
      } else {
        // Guest mode bypass upgrade
        setUser(prev => prev ? { ...prev, tier: 'pro' } : null);
        setStripeSuccessMessage("Payment authorized! Securely upgrading subscription...");
        setTimeout(() => {
          setShowStripeModal(false);
          setStripeSuccessMessage("");
        }, 2000);
      }
    } catch (e) {
      showToast("Failed to upgrade subscription. Check server connection.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  // Reset Free Searches
  const handleResetSearches = async () => {
    try {
      if (token) {
        const res = await fetch('/api/reset-searches', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          showToast("Searches successfully reset to 3 free limits.");
        }
      } else {
        setUser(prev => prev ? { ...prev, tier: 'free', searchesRemaining: 3 } : null);
        showToast("Guest searches reset to 3.");
      }
    } catch (e) {
      showToast("Failed to reset searches.");
    }
  };

  // Trigger manual data rebuild
  const handleRefreshOfflineData = () => {
    if (isOffline) {
      showToast("⚠️ Can't refresh data: Currently offline.");
      return;
    }
    showToast("Re-indexing solutions databases and rebuilding cache map...");
    setTimeout(() => {
      showToast("✓ Offline database updated with latest RV diagnostics!");
    }, 1200);
  };

  // Auto populate a suggestion
  const handleSuggestionClick = (text: string) => {
    setSearchQuery(text);
    handleSearchSubmit(undefined, text);
  };

  // Toggle step complete (visual checklist high-fidelity interaction)
  const toggleStepComplete = (stepIndex: number) => {
    const key = `${selectedSolution?.id}-${stepIndex}`;
    setCompletedSteps(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div id="app" className={`relative min-h-screen font-sans antialiased overflow-x-hidden bg-grid transition-colors duration-300 ${resolvedTheme === 'dark' ? 'dark bg-[#000000] text-[#D1D5DB]' : 'light bg-[#FAF9F6] text-[#334155]'}`}>
      
      {/* BACKGROUND AURA LIGHT LEAKS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Electric purple light leak */}
        <div className={`absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-[#8B5CF6] blur-[120px] animate-float-purple transition-opacity duration-300 ${resolvedTheme === 'dark' ? 'opacity-[0.15]' : 'opacity-[0.06]'}`} />
        {/* Deep cyber blue light leak */}
        <div className={`absolute top-[40%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-[#3B82F6] blur-[140px] animate-float-blue transition-opacity duration-300 ${resolvedTheme === 'dark' ? 'opacity-[0.15]' : 'opacity-[0.06]'}`} />
        {/* Ambient emerald green light leak */}
        <div className={`absolute -bottom-[10%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-[#10B981] blur-[110px] animate-float-emerald transition-opacity duration-300 ${resolvedTheme === 'dark' ? 'opacity-[0.10]' : 'opacity-[0.04]'}`} />
      </div>

      {/* 1. Offline Mode Global Banner */}
      {isOffline && (
        <div id="offline-banner" className="relative z-50 bg-gradient-to-r from-red-950 via-red-900 to-red-950 border-b border-red-500/30 text-red-200 text-xs font-semibold py-2.5 px-4 text-center tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(239,68,68,0.15)]">
          <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-red-300">
            AIRPLANE MODE ACTIVE • ON-DEVICE INDEXED-DB COGNITIVE SEARCH OPERATING SECURELY
          </span>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            id="toast" 
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-[#0B0F19]/90 backdrop-blur-[20px] text-white text-xs py-3.5 px-6 rounded-xl shadow-[0_0_25px_rgba(139,92,246,0.3)] z-50 flex items-center gap-2.5 border border-white/[0.08]"
          >
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span className="font-medium tracking-wide text-gray-200">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install Promo */}
      {showInstallToast && (
        <div id="install-toast" className="relative z-40 bg-[#0B0F19]/60 backdrop-blur-[20px] border-b border-white/[0.08] py-2 px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Smartphone className="w-4 h-4 text-[#3B82F6]" />
              <span>
                Install <strong className="text-white">FixFinder RV Pro</strong> for instant touch-icon launching and highly efficient cached offline diagnostics.
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { showToast("App installation triggered successfully!"); setShowInstallToast(false); }}
                className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] hover:brightness-110 active:scale-95 text-white px-4 py-1.5 rounded-lg text-[11px] font-bold transition shadow-[0_0_15px_rgba(139,92,246,0.25)]"
              >
                Install App
              </button>
              <button onClick={() => setShowInstallToast(false)} className="text-gray-400 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Launch / Authentication Landing Screen */}
      {view === 'launch' && (
        <div id="launch-screen" className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 min-h-[calc(100vh-60px)]">
          
          {/* Main Hero Card Container */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            id="hero-card" 
            className="max-w-md w-full bg-[#0B0F19]/80 border border-white/[0.08] backdrop-blur-[20px] rounded-[32px] p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] text-center flex flex-col items-center relative overflow-hidden"
          >
            {/* Gloss light leak ornament */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[#8B5CF6]/20 blur-[60px]" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[#10B981]/15 blur-[60px]" />

            {/* Logo and Tagline */}
            <div className="mb-10 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#3B82F6] p-[1px] flex items-center justify-center mb-6 mx-auto shadow-[0_0_25px_rgba(139,92,246,0.3)]">
                <div className="w-full h-full bg-[#0B0F19] rounded-[15px] flex items-center justify-center">
                  <Wrench className="w-7 h-7 text-white" />
                </div>
              </div>
              <h1 className="text-4xl text-white font-extrabold tracking-tight">
                FixFinder<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] via-[#3B82F6] to-[#10B981]"> Offline</span>
              </h1>
              <p className="text-gray-400 mt-3 text-sm max-w-xs mx-auto font-medium">
                Professional RV diagnostics and step-by-step repair guides. Designed for total off-grid operation without cell signals.
              </p>
            </div>

            {/* Simulated UI indicators to show tactile status */}
            <div className="w-full bg-black/40 border border-white/[0.05] rounded-2xl p-4 mb-8 space-y-3.5 text-left text-xs font-mono">
              <div className="flex justify-between items-center text-gray-500">
                <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-[#3B82F6]" /> INDEX CACHE</span>
                <span className="text-emerald-400 font-bold uppercase">Ready</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-[#8B5CF6]" /> COGNITIVE ENGINE</span>
                <span className="text-white font-bold">GEMINI 2.5 FLASH</span>
              </div>
              <div className="w-full bg-white/[0.03] h-[1px]" />
              <div className="flex items-center gap-2 text-[#D1D5DB] font-sans">
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Works in deserts, canyons, & dense forests.</span>
              </div>
            </div>

            <div className="w-full space-y-4 relative z-10">
              <button 
                id="get-started-btn"
                onClick={() => { setShowAuthModal(true); setAuthTab('login'); }}
                className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-[#8B5CF6] via-[#3B82F6] to-[#10B981] text-white hover:brightness-115 shadow-[0_8px_30px_rgb(139,92,246,0.3)] active:scale-[0.98] transition-all tracking-wide text-sm cursor-pointer"
              >
                Sign In to Workspace
              </button>

              <button 
                id="guest-demo-btn"
                onClick={handleGuestMode}
                className="w-full bg-[#0B0F19] border border-white/[0.08] text-gray-200 hover:text-white hover:bg-white/[0.03] py-4 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-inner"
              >
                <Sparkles className="w-4 h-4 text-[#10B981] fill-[#10B981]/20" />
                <span>Try Instant Premium Demo</span>
              </button>
            </div>

            <div className="mt-8 text-[11px] text-gray-500 tracking-wider uppercase font-mono">
              ⚡ OFFLINE CORE V2.1.0 COMPILATION
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Application Interface */}
      {view === 'main' && (
        <div id="main-app" className="relative z-10 flex-1 flex flex-col min-h-screen">
          
          {/* Header */}
          <header id="app-header" className={`sticky top-0 backdrop-blur-[20px] border-b px-6 py-4.5 z-40 transition-colors duration-300 ${resolvedTheme === 'dark' ? 'bg-[#000000]/75 border-white/[0.08]' : 'bg-white/80 border-slate-200/80 shadow-sm shadow-slate-100/10'}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              
              {/* Logo / Brand */}
              <div 
                id="header-brand"
                onClick={() => { setSelectedSolution(null); setSearchQuery(''); setSearchResults([]); }}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#3B82F6] p-[1px] shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                  <div className={`w-full h-full rounded-[9px] flex items-center justify-center ${resolvedTheme === 'dark' ? 'bg-[#0B0F19]' : 'bg-white'}`}>
                    <Wrench className={`w-5 h-5 ${resolvedTheme === 'dark' ? 'text-white' : 'text-[#8B5CF6]'}`} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className={`text-xl font-black tracking-tight transition-colors duration-300 ${resolvedTheme === 'dark' ? 'text-white group-hover:text-gray-200' : 'text-slate-950 group-hover:text-slate-800'}`}>
                    FixFinder<span className="text-[#3B82F6]">RV</span>
                  </span>
                  <span className="text-[9px] text-[#10B981] font-mono tracking-widest uppercase">
                    PRO OFFLINE
                  </span>
                </div>
              </div>

              {/* Center offline state indicator */}
              <div id="offline-switch-box" className={`hidden md:flex items-center gap-4 rounded-full px-5 py-2 border shadow-inner transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08]' : 'bg-slate-100/80 border-slate-200/60'}`}>
                <span className={`text-xs font-semibold flex items-center gap-2 ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-600'}`}>
                  {isOffline ? (
                    <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
                  ) : (
                    <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
                  )}
                  <span className="font-mono text-[11px] tracking-wide">
                    {isOffline ? "OFFLINE OPERATION" : "CLOUD ENGINE SYNCHRONIZED"}
                  </span>
                </span>
                <div className={`h-4 w-px ${resolvedTheme === 'dark' ? 'bg-white/10' : 'bg-slate-300'}`} />
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider font-mono ${
                  isOffline 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  Auto-Detect
                </span>
              </div>

              {/* Right Profile Controls */}
              <div id="profile-controls" className="flex items-center gap-4 relative">
                
                {/* Theme Switcher Segmented Control */}
                <div id="theme-header-switcher" className={`flex items-center p-1 rounded-xl border transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-[#0B0F19]/60 border-white/[0.08]' : 'bg-slate-100/80 border-slate-200'}`}>
                  <button
                    onClick={() => { setTheme('light'); showToast("☀️ Light Theme enabled."); }}
                    className={`p-1.5 rounded-lg transition-all duration-200 ${theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Light Mode"
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setTheme('dark'); showToast("🌙 Dark Theme enabled."); }}
                    className={`p-1.5 rounded-lg transition-all duration-200 ${theme === 'dark' ? 'bg-[#8B5CF6] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    title="Dark Mode"
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setTheme('system'); showToast("🖥️ System Theme active."); }}
                    className={`p-1.5 rounded-lg transition-all duration-200 ${theme === 'system' ? 'bg-[#10B981] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    title="System Match"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Account status badge */}
                {user?.tier === 'pro' ? (
                  <span className={`hidden sm:flex border px-3 py-1 rounded-full text-[11px] font-bold items-center gap-1.5 shadow-sm ${resolvedTheme === 'dark' ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-500/5 border-amber-500/20 text-amber-600'}`}>
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    PRO MEMBER
                  </span>
                ) : (
                  <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="hidden sm:flex bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:brightness-110 px-4 py-1.5 rounded-full text-[11px] font-bold items-center gap-1.5 cursor-pointer transition shadow-[0_4px_15px_rgba(139,92,246,0.25)]"
                  >
                    <Lock className="w-3 h-3 text-white" />
                    Go Pro
                  </button>
                )}

                {/* Dropdown toggle avatar */}
                <button 
                  id="avatar-button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6]/20 to-[#3B82F6]/20 flex items-center justify-center font-bold text-xs uppercase shadow-sm transition cursor-pointer ${resolvedTheme === 'dark' ? 'text-white border-white/[0.08] hover:border-[#8B5CF6]/50' : 'text-slate-800 border-slate-200 hover:border-[#8B5CF6]/50'}`}
                >
                  {user?.email ? user.email.substring(0, 2) : 'US'}
                </button>

                {/* Profile Dropdown */}
                <AnimatePresence>
                  {showUserDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      id="user-dropdown" 
                      className="absolute right-0 top-13 w-64 bg-[#0B0F19]/95 backdrop-blur-[25px] border border-white/[0.1] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 p-2.5 text-left"
                    >
                      <div className="p-3 border-b border-white/[0.06]">
                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">SECURE WORKSPACE</p>
                        <p className="font-bold text-sm truncate text-white mt-1">{user?.email}</p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-[9px] font-mono font-bold text-gray-300 bg-white/10 px-2 py-0.5 rounded uppercase">
                            {user?.tier} TIER
                          </span>
                          {user?.tier === 'free' && (
                            <span className="text-[10px] text-amber-400 font-bold">
                              {user.searchesRemaining}/3 queries left
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-1 mt-1 space-y-1">
                        <button 
                          onClick={() => { setActiveTab('settings'); setShowUserDropdown(false); }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-white/[0.04] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-2.5 transition"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          Account Settings
                        </button>

                        <button 
                          onClick={() => { handleRefreshOfflineData(); setShowUserDropdown(false); }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-white/[0.04] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-2.5 transition"
                        >
                          <RefreshCw className="w-4 h-4 text-gray-400 animate-spin-slow" />
                          Refresh Offline Indexes
                        </button>

                        <button 
                          onClick={() => { handleResetSearches(); setShowUserDropdown(false); }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-amber-500/5 text-amber-400 text-xs font-semibold flex items-center gap-2.5 transition"
                        >
                          <Sliders className="w-4 h-4 text-amber-400" />
                          Reset Limits (Demo)
                        </button>

                        <button 
                          onClick={() => { handleLogout(); setShowUserDropdown(false); }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-red-500/10 text-red-400 text-xs font-semibold flex items-center gap-2.5 transition border-t border-white/[0.06] mt-1 pt-2.5"
                        >
                          <LogOut className="w-4 h-4 text-red-400" />
                          Logout Session
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </header>

          {/* Active Workspace */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 relative z-10 pb-28">
            
            {/* Inline simulation notification for tablet/mobile */}
            <div className="flex md:hidden items-center justify-between bg-[#0B0F19] border border-white/[0.08] rounded-xl px-4 py-2.5 mb-8 shadow-inner">
              <span className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                {isOffline ? <WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
                <span className="font-mono text-[10px]">NETWORK STATUS:</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider font-mono ${
                isOffline 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {isOffline ? "OFFLINE" : "ONLINE"}
              </span>
            </div>

            {/* A. Search Tab View */}
            {activeTab === 'search' && (
              <div id="search-tab-view" className="flex flex-col max-w-4xl mx-auto w-full relative flex-1 min-h-0">
                <NeuralAIField resolvedTheme={resolvedTheme} isSearching={chatLoading} />
                
                {/* Search Header Hero (Only show if no chat messages and no results) */}
                {!selectedSolution && chatMessages.length === 0 && !chatLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-10 max-w-2xl mx-auto space-y-4"
                  >
                    <div className="inline-flex items-center gap-2 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 px-3.5 py-1.5 rounded-full text-xs text-[#8B5CF6] font-mono tracking-wider uppercase shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                      <Sparkles className="w-3.5 h-3.5 fill-[#8B5CF6]/20" />
                      SECURE OFFLINE COGNITIVE AI
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                      Find The Fix <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] via-[#3B82F6] to-[#10B981]">
                        Deep In The Backcountry
                      </span>
                    </h2>
                    <p className="text-gray-400 text-sm max-w-lg mx-auto leading-relaxed">
                      Describe your issue below. FixFinder will ask follow-up questions to narrow down the problem, then deliver a detailed step-by-step resolution.
                    </p>
                  </motion.div>
                )}

                {/* ── Chat Messages Display Area ── */}
                {chatMessages.length > 0 && (
                  <div className="flex-1 overflow-y-auto space-y-6 max-w-3xl mx-auto w-full py-6 px-1" style={{ maxHeight: '60vh' }}>
                    {chatMessages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}

                        <div className={`max-w-[80%] space-y-3 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-[#8B5CF6]/20 to-[#3B82F6]/10 border border-[#8B5CF6]/20 rounded-2xl rounded-br-md px-5 py-3.5'
                            : resolvedTheme === 'dark'
                              ? 'bg-[#0B0F19]/80 border border-white/[0.08] rounded-2xl rounded-bl-md px-5 py-3.5'
                              : 'bg-white border border-slate-200 rounded-2xl rounded-bl-md px-5 py-3.5 shadow-sm'
                        }`}>
                          {/* Structured message renderer — handles bold, bullets, numbered steps, warnings */}
                          <div className={`text-sm leading-relaxed space-y-2 ${
                            resolvedTheme === 'dark' ? 'text-gray-200' : 'text-slate-700'
                          }`}>
                            {msg.content.split('\n').map((line, li) => {
                              const trimmed = line.trim();
                              if (!trimmed) return <div key={li} className="h-1" />;

                              // Warning lines: ⚠️ Safety note / Parts to order
                              if (trimmed.startsWith('⚠️')) {
                                const rest = trimmed.slice(2).trim();
                                return (
                                  <div key={li} className={`flex gap-2 text-xs rounded-xl px-4 py-3 border ${
                                    resolvedTheme === 'dark'
                                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                                      : 'bg-amber-50 border-amber-200 text-amber-700'
                                  }`}>
                                    <span className="shrink-0">⚠️</span>
                                    <span>{renderInline(rest, resolvedTheme)}</span>
                                  </div>
                                );
                              }

                              // Section header lines: **Header:**
                              if (/^\*\*[^*]+[:？]\*\*$/.test(trimmed) || /^\*\*[^*]+\*\*:?$/.test(trimmed)) {
                                const label = trimmed.replace(/\*\*/g, '').replace(/:$/, '');
                                return (
                                  <p key={li} className={`font-bold text-xs uppercase tracking-widest pt-2 pb-0.5 font-mono ${
                                    resolvedTheme === 'dark' ? 'text-[#8B5CF6]' : 'text-[#6D28D9]'
                                  }`}>{label}</p>
                                );
                              }

                              // Bullet point lines: • item or  • item
                              if (trimmed.startsWith('•') || trimmed.startsWith('-  ')) {
                                const text = trimmed.replace(/^[•\-]\s*/, '');
                                return (
                                  <div key={li} className="flex gap-2.5 items-start pl-2">
                                    <span className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${
                                      resolvedTheme === 'dark' ? 'bg-[#8B5CF6]' : 'bg-[#6D28D9]'
                                    }`} style={{ marginTop: '6px' }} />
                                    <span className="text-sm">{renderInline(text, resolvedTheme)}</span>
                                  </div>
                                );
                              }

                              // Numbered repair steps: "  1. [Pre-checks]" or "  3. Step title"
                              const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
                              if (numberedMatch) {
                                const num = numberedMatch[1];
                                const text = numberedMatch[2];
                                const isPrePost = /^\[.+\]$/.test(text);
                                return (
                                  <div key={li} className={`flex gap-3 items-start rounded-xl px-4 py-2.5 border transition-colors ${
                                    resolvedTheme === 'dark'
                                      ? 'bg-white/[0.02] border-white/[0.05]'
                                      : 'bg-slate-50 border-slate-200/80'
                                  }`}>
                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono shrink-0 ${
                                      resolvedTheme === 'dark'
                                        ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30'
                                        : 'bg-[#8B5CF6]/10 text-[#6D28D9] border border-[#8B5CF6]/20'
                                    }`}>{num}</span>
                                    <span className={`text-sm font-medium ${
                                      isPrePost
                                        ? resolvedTheme === 'dark' ? 'text-[#3B82F6]' : 'text-blue-600'
                                        : resolvedTheme === 'dark' ? 'text-gray-200' : 'text-slate-700'
                                    }`}>{renderInline(text, resolvedTheme)}</span>
                                  </div>
                                );
                              }

                              // Continuation lines (indented under steps):  "   • Check X" or "   … +N more"
                              if (line.startsWith('     ') || line.startsWith('   ')) {
                                const inner = trimmed.replace(/^[•]\s*/, '');
                                if (inner.startsWith('…') || inner.startsWith('...')) {
                                  return (
                                    <p key={li} className={`text-xs italic pl-10 ${
                                      resolvedTheme === 'dark' ? 'text-gray-500' : 'text-slate-400'
                                    }`}>{inner}</p>
                                  );
                                }
                                return (
                                  <div key={li} className="flex gap-2 pl-10 items-start">
                                    <span className={`shrink-0 text-xs mt-0.5 ${
                                      resolvedTheme === 'dark' ? 'text-gray-600' : 'text-slate-400'
                                    }`}>›</span>
                                    <span className={`text-xs ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                                      {renderInline(inner, resolvedTheme)}
                                    </span>
                                  </div>
                                );
                              }

                              // Plain line with possible inline bold
                              return (
                                <p key={li} className="text-sm">{renderInline(trimmed, resolvedTheme)}</p>
                              );
                            })}
                          </div>

                          {/* Follow-up question chips */}
                          {msg.questions && msg.questions.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {msg.questions.map((q, qi) => (
                                <button
                                  key={qi}
                                  onClick={() => handleQuestionClick(q)}
                                  disabled={chatLoading}
                                  className={`text-xs px-3.5 py-2 rounded-xl border font-medium transition-all cursor-pointer ${
                                    chatLoading
                                      ? 'opacity-50 cursor-not-allowed'
                                      : resolvedTheme === 'dark'
                                        ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/25 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 hover:border-[#8B5CF6]/40'
                                        : 'bg-[#8B5CF6]/5 border-[#8B5CF6]/20 text-[#6D28D9] hover:bg-[#8B5CF6]/15'
                                  }`}
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Diagnostic info badge */}
                          {msg.diagnostic && (
                            <div className={`mt-2 space-y-2`}>
                              <div className={`flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider ${
                                resolvedTheme === 'dark' ? 'text-[#10B981]' : 'text-emerald-600'
                              }`}>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Diagnostic Report Complete • {msg.diagnostic.category}</span>
                              </div>
                              <button
                                onClick={() => {
                                  if (searchResults.length > 0) setSelectedSolution(searchResults[0].item);
                                }}
                                className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
                                  resolvedTheme === 'dark'
                                    ? 'bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981] hover:bg-[#10B981]/20'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                View Full Diagnostic Report →
                              </button>
                            </div>
                          )}

                          {/* Copy button */}
                          {msg.role === 'assistant' && msg.content.length > 50 && (
                            <button
                              onClick={() => handleCopyMessage(msg.content)}
                              className={`flex items-center gap-1.5 text-[10px] font-semibold transition ${
                                resolvedTheme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                          )}
                        </div>

                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                            <UserCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </motion.div>
                    ))}

                    {/* Typing indicator */}
                    {chatLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className={`rounded-2xl rounded-bl-md px-5 py-4 border ${
                          resolvedTheme === 'dark' ? 'bg-[#0B0F19]/80 border-white/[0.08]' : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className={`text-xs font-mono font-semibold ${
                              resolvedTheme === 'dark' ? 'text-gray-500' : 'text-slate-400'
                            }`}>Analyzing diagnostic data...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* Solution Detail Display Board */}
                {selectedSolution ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    id="solution-detail-panel" 
                    className={`backdrop-blur-[20px] rounded-3xl p-6 md:p-8 relative max-w-3xl mx-auto border transition-all duration-300 ${
                      resolvedTheme === 'dark'
                        ? 'bg-[#0B0F19]/85 border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                        : 'bg-white border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
                    }`}
                  >
                    {/* Upper decorative strip */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8B5CF6] via-[#3B82F6] to-[#10B981]" />

                    {/* Header Nav */}
                    <div className={`flex items-center justify-between mb-6 border-b pb-4.5 ${resolvedTheme === 'dark' ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                      <button 
                        onClick={() => setSelectedSolution(null)}
                        className={`flex items-center gap-2 text-xs font-semibold cursor-pointer transition ${resolvedTheme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        <ArrowLeft className="w-4 h-4 text-[#3B82F6]" />
                        {chatMessages.length > 0 ? 'Return to Chat' : 'Return to Results'}
                      </button>

                      <div className="flex items-center gap-2.5">
                        <button 
                          onClick={(e) => handleToggleBookmark(selectedSolution, e)}
                          className={`p-2.5 rounded-xl border transition cursor-pointer ${
                            savedFixIds.includes(selectedSolution.id) 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                              : resolvedTheme === 'dark'
                                ? 'bg-[#0B0F19] border-white/[0.08] text-gray-400 hover:text-white' 
                                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                          }`}
                          title="Save to Offline Vault"
                        >
                          <Star className={`w-4 h-4 ${savedFixIds.includes(selectedSolution.id) ? 'fill-amber-400' : ''}`} />
                        </button>

                        <button 
                          onClick={(e) => handleShareSolution(selectedSolution, e)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition ${resolvedTheme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-gray-400 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'}`}
                          title="Copy Shareable Manifest"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Header */}
                    <div className="flex flex-wrap items-center gap-2.5 mb-4">
                      <span className={`text-[10px] font-mono tracking-wider uppercase font-bold px-3 py-1 rounded-md border transition-all duration-300 ${resolvedTheme === 'dark' ? 'text-gray-300 bg-white/10 border-white/[0.06]' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                        {selectedSolution.category}
                      </span>
                      <span className="text-[10px] font-mono text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2.5 py-1 rounded-md flex items-center gap-1 font-bold">
                        <Shield className="w-3 h-3 text-[#10B981]" />
                        AUTHENTICATED SECURE GUIDE
                      </span>
                      {selectedSolution.repairPriority && (
                        <span className={`text-[10px] font-mono border px-2.5 py-1 rounded-md flex items-center gap-1 font-bold uppercase tracking-wider ${
                          selectedSolution.repairPriority === 'Emergency'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                            : selectedSolution.repairPriority === 'High'
                              ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                              : selectedSolution.repairPriority === 'Medium'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          <AlertTriangle className="w-3 h-3" />
                          {selectedSolution.repairPriority} PRIORITY
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className={`text-2xl md:text-3xl font-extrabold tracking-tight leading-tight transition-colors duration-300 ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                      {selectedSolution.problem}
                    </h3>

                    {/* Observed Symptoms */}
                    {selectedSolution.observedSymptoms && selectedSolution.observedSymptoms.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mr-1">Symptoms:</span>
                        {selectedSolution.observedSymptoms.map((sym, sIdx) => (
                          <span key={sIdx} className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${resolvedTheme === 'dark' ? 'bg-white/[0.03] border-white/[0.06] text-gray-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                            {sym}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Summary */}
                    <div className={`border rounded-2xl p-5 mt-5 leading-relaxed text-sm transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.02] border-white/[0.05] text-gray-300' : 'bg-slate-50/50 border-slate-200/80 text-slate-600'}`}>
                      <p className="font-medium mb-1 uppercase tracking-wider text-[11px] font-mono text-[#8B5CF6]">DIAGNOSTIC SUMMARY</p>
                      {selectedSolution.solution}
                    </div>

                    {/* Interactive Step checklist progress */}
                    <div className={`mt-8 border p-4.5 rounded-2xl transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-[#000000]/30 border-white/[0.04]' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center text-xs font-mono mb-3">
                        <span className="text-gray-400">RESOLUTION CHECKLIST PROGRESS</span>
                        <span className={`font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                          {selectedSolution.steps.filter((_, idx) => completedSteps[`${selectedSolution.id}-${idx}`]).length} / {selectedSolution.steps.length} STEPS
                        </span>
                      </div>
                      <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-[#8B5CF6] via-[#3B82F6] to-[#10B981] h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(selectedSolution.steps.filter((_, idx) => completedSteps[`${selectedSolution.id}-${idx}`]).length / selectedSolution.steps.length) * 100}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="mt-8">
                      <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-5 font-mono flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#8B5CF6]" />
                        STEP-BY-STEP REPAIR PROCEDURES
                      </h4>
                      <div className={`space-y-6 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px ${resolvedTheme === 'dark' ? 'before:bg-white/[0.06]' : 'before:bg-slate-200'}`}>
                        {selectedSolution.steps.map((step, index) => {
                          const [boldLabel, ...descParts] = step.split(':');
                          const description = descParts.join(':');
                          const isDone = !!completedSteps[`${selectedSolution.id}-${index}`];
                          
                          return (
                            <div 
                              key={index} 
                              onClick={() => toggleStepComplete(index)}
                              className="group flex gap-4 items-start relative z-10 cursor-pointer"
                            >
                              {/* Step indicator capsule */}
                              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-300 ${
                                isDone 
                                  ? 'bg-[#10B981] border-[#10B981] text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                                  : resolvedTheme === 'dark'
                                    ? 'bg-[#0B0F19] border-white/[0.08] text-gray-400 group-hover:border-white/20 group-hover:text-white'
                                    : 'bg-white border-slate-200 text-slate-500 group-hover:border-slate-300 group-hover:text-slate-800 shadow-sm'
                              }`}>
                                {isDone ? <Check className="w-4 h-4 stroke-[3px]" /> : index + 1}
                              </div>
                              
                              <div className={`flex-1 text-sm border rounded-2xl p-4.5 transition-all duration-200 ${
                                resolvedTheme === 'dark'
                                  ? 'bg-white/[0.01] hover:bg-white/[0.03] border-white/[0.03] hover:border-white/[0.06]'
                                  : 'bg-white hover:bg-slate-50 border-slate-200/50 hover:border-slate-200 shadow-sm shadow-slate-100/30'
                              } ${isDone ? 'opacity-60 line-through decoration-white/20' : ''}`}>
                                {boldLabel && (
                                  <strong className="text-white block font-semibold mb-1 uppercase tracking-wide text-xs text-[#3B82F6]">
                                    {boldLabel}
                                  </strong>
                                )}
                                <span className={`leading-relaxed text-[13px] ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>{description || step}</span>
                                
                                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono font-medium text-gray-500">
                                  <span>{isDone ? "✓ Complete" : "○ Mark as complete"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Follow-up / Refinement Questions */}
                    {selectedSolution.followUpQuestions && selectedSolution.followUpQuestions.length > 0 && (
                      <div className={`mt-8 border rounded-2xl p-5 transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-blue-500/[0.02] border-blue-500/20' : 'bg-blue-50/20 border-blue-200'}`}>
                        <h4 className="text-xs uppercase tracking-widest font-bold text-blue-500 mb-3 font-mono flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-blue-500" />
                          DIAGNOSTIC REFINEMENT QUESTIONS
                        </h4>
                        <ul className={`space-y-2 text-xs list-disc list-inside ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                          {selectedSolution.followUpQuestions.map((q, idx) => (
                            <li key={idx} className="leading-relaxed">{q}</li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-gray-500 font-mono mt-3">
                          💡 Note: If these symptoms don't perfectly align, try answering these clarifying questions in your search query.
                        </p>
                      </div>
                    )}

                    {/* Possible Causes & Confidence Levels Side-by-Side Grid */}
                    {((selectedSolution.possibleCauses && selectedSolution.possibleCauses.length > 0) || 
                      (selectedSolution.confidenceLevels && selectedSolution.confidenceLevels.length > 0)) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
                        {/* Possible Causes */}
                        {selectedSolution.possibleCauses && selectedSolution.possibleCauses.length > 0 && (
                          <div className={`border rounded-2xl p-5 transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.01] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                            <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4 font-mono flex items-center gap-2">
                              <Sliders className="w-4 h-4 text-[#8B5CF6]" />
                              RANKED POSSIBLE CAUSES
                            </h4>
                            <div className="space-y-4">
                              {selectedSolution.possibleCauses.map((pc, idx) => (
                                <div key={idx} className="space-y-1.5">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span className={resolvedTheme === 'dark' ? 'text-white' : 'text-slate-800'}>{pc.cause}</span>
                                    <span className="text-[#8B5CF6] font-mono">{pc.probability}</span>
                                  </div>
                                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${resolvedTheme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}>
                                    <div className="bg-[#8B5CF6] h-full rounded-full" style={{ width: pc.probability }} />
                                  </div>
                                  {pc.reason && <p className={`text-[11px] leading-relaxed italic ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>{pc.reason}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Confidence Levels */}
                        {selectedSolution.confidenceLevels && selectedSolution.confidenceLevels.length > 0 && (
                          <div className={`border rounded-2xl p-5 transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.01] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                            <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4 font-mono flex items-center gap-2">
                              <Shield className="w-4 h-4 text-[#10B981]" />
                              DIAGNOSIS CONFIDENCE WEIGHTS
                            </h4>
                            <div className="space-y-4">
                              {selectedSolution.confidenceLevels.map((cl, idx) => (
                                <div key={idx} className="flex items-start justify-between gap-4 text-xs">
                                  <div className="space-y-1">
                                    <p className={`font-semibold ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{cl.factor}</p>
                                    {cl.reason && <p className={`text-[11px] leading-relaxed ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>{cl.reason}</p>}
                                  </div>
                                  <span className="text-[#10B981] font-mono font-bold bg-[#10B981]/10 px-2.5 py-0.5 rounded-lg border border-[#10B981]/20 shrink-0">{cl.score}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inspection sequence */}
                    {selectedSolution.inspectionSteps && selectedSolution.inspectionSteps.length > 0 && (
                      <div className={`mt-8 border rounded-2xl p-5 transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.01] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                        <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4 font-mono flex items-center gap-2">
                          <Compass className="w-4 h-4 text-[#3B82F6]" />
                          LOGICAL INSPECTION SEQUENCE
                        </h4>
                        <div className="space-y-3.5">
                          {selectedSolution.inspectionSteps.map((step, idx) => (
                            <div key={idx} className="flex gap-3 text-xs leading-relaxed">
                              <span className="text-[#3B82F6] font-mono font-bold shrink-0">STAGE {idx + 1}:</span>
                              <span className={resolvedTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'}>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Difficulty, Time & Cost Grid */}
                    {(selectedSolution.difficultyRating || selectedSolution.estimatedTime || selectedSolution.estimatedCost) && (
                      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {selectedSolution.difficultyRating && (
                          <div className={`border rounded-2xl p-4 text-center transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.01] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">REPAIR DIFFICULTY</p>
                            <p className="text-lg font-bold text-amber-500 mt-1">{selectedSolution.difficultyRating}</p>
                          </div>
                        )}
                        {selectedSolution.estimatedTime && (
                          <div className={`border rounded-2xl p-4 text-center transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.01] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">ESTIMATED ACTIVE TIME</p>
                            <p className={`text-sm font-bold mt- active-time font-semibold ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{selectedSolution.estimatedTime}</p>
                          </div>
                        )}
                        {selectedSolution.estimatedCost && (
                          <div className={`border rounded-2xl p-4 text-center transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.01] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">ESTIMATED PARTS BUDGET</p>
                            <p className="text-sm font-bold text-emerald-500 mt-2.5">{selectedSolution.estimatedCost}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tools and Parts Requirement Blocks */}
                    {((selectedSolution.requiredTools && selectedSolution.requiredTools.length > 0) || 
                      (selectedSolution.replacementParts && selectedSolution.replacementParts.length > 0)) && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedSolution.requiredTools && selectedSolution.requiredTools.length > 0 && (
                          <div className={`border rounded-2xl p-4.5 transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.01] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono mb-2.5">REQUIRED EQUIPMENT / TOOLS</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedSolution.requiredTools.map((tool, idx) => (
                                <span key={idx} className={`text-[10px] font-mono px-2.5 py-0.5 rounded border ${resolvedTheme === 'dark' ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                                  {tool}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedSolution.replacementParts && selectedSolution.replacementParts.length > 0 && (
                          <div className={`border rounded-2xl p-4.5 transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.01] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono mb-2.5">POTENTIAL REPLACEMENT PARTS</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedSolution.replacementParts.map((part, idx) => (
                                <span key={idx} className={`text-[10px] font-mono px-2.5 py-0.5 rounded border ${resolvedTheme === 'dark' ? 'bg-[#10B981]/5 border-[#10B981]/15 text-[#10B981]' : 'bg-white border-emerald-100 text-emerald-600'}`}>
                                  {part}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Testing Procedure */}
                    {selectedSolution.testingProcedure && (
                      <div className={`mt-8 border rounded-2xl p-5 transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.01] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                        <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-2 font-mono flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#10B981]" />
                          VERIFICATION & TESTING PROCEDURE
                        </h4>
                        <p className={`text-xs leading-relaxed p-3.5 rounded-xl border font-mono ${resolvedTheme === 'dark' ? 'bg-black/40 border-white/[0.05] text-gray-300' : 'bg-white border-slate-200 text-slate-700'}`}>{selectedSolution.testingProcedure}</p>
                      </div>
                    )}

                    {/* Safety Precautions Block */}
                    <div className={`mt-10 border rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 ${
                      selectedSolution.safetyPrecautions && selectedSolution.safetyPrecautions.length > 0
                        ? resolvedTheme === 'dark' ? 'bg-red-500/[0.01] border-red-500/20' : 'bg-red-50/20 border-red-100'
                        : resolvedTheme === 'dark' ? 'bg-amber-500/[0.01] border-amber-500/20' : 'bg-amber-50/20 border-amber-100'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${selectedSolution.safetyPrecautions && selectedSolution.safetyPrecautions.length > 0 ? 'text-red-500' : 'text-amber-500'}`} />
                      <div className="space-y-2">
                        <p className={`text-xs font-bold uppercase tracking-wider font-mono ${selectedSolution.safetyPrecautions && selectedSolution.safetyPrecautions.length > 0 ? 'text-red-400' : 'text-amber-500'}`}>
                          {selectedSolution.safetyPrecautions && selectedSolution.safetyPrecautions.length > 0 ? 'CRITICAL SAFETY PRECAUTIONS' : 'CRITICAL SAFETY MATRIX'}
                        </p>
                        {selectedSolution.safetyPrecautions && selectedSolution.safetyPrecautions.length > 0 ? (
                          <ul className={`space-y-1.5 text-xs list-disc list-inside ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                            {selectedSolution.safetyPrecautions.map((prec, idx) => (
                              <li key={idx} className="leading-relaxed">{prec}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className={`text-xs leading-relaxed ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-600'}`}>
                            Always isolate battery feeds and close direct copper LP cylinder taps before doing live diagnostics on fuel manifolds or chassis power rails.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Preventative & Maintenance Section */}
                    {((selectedSolution.maintenanceTips && selectedSolution.maintenanceTips.length > 0) || 
                      (selectedSolution.preventionAdvice && selectedSolution.preventionAdvice.length > 0)) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
                        {/* Maintenance Tips */}
                        {selectedSolution.maintenanceTips && selectedSolution.maintenanceTips.length > 0 && (
                          <div className={`border rounded-2xl p-5 transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.01] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                            <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-3 font-mono flex items-center gap-2">
                              <Settings className="w-4 h-4 text-orange-400" />
                              RECURRING MAINTENANCE ADVICE
                            </h4>
                            <ul className={`space-y-2 text-xs list-disc list-inside ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                              {selectedSolution.maintenanceTips.map((tip, idx) => (
                                <li key={idx} className="leading-relaxed">{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Prevention Advice */}
                        {selectedSolution.preventionAdvice && selectedSolution.preventionAdvice.length > 0 && (
                          <div className={`border rounded-2xl p-5 transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.01] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                            <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-3 font-mono flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-[#10B981]" />
                              PREVENTATIVE BLUEPRINTS
                            </h4>
                            <ul className={`space-y-2 text-xs list-disc list-inside ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                              {selectedSolution.preventionAdvice.map((adv, idx) => (
                                <li key={idx} className="leading-relaxed">{adv}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* When to Call Professional Callout */}
                    {selectedSolution.whenToCallProfessional && (
                      <div className={`mt-8 border rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-amber-500/[0.02] border-amber-500/20' : 'bg-amber-50/20 border-amber-200'}`}>
                        <Phone className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 font-mono">WHEN TO CALL A PROFESSIONAL SPECIALIST</p>
                          <p className={`text-xs leading-relaxed ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-600'}`}>
                            {selectedSolution.whenToCallProfessional}
                          </p>
                        </div>
                      </div>
                    )}

                  </motion.div>
                ) : (
                  <div className="space-y-8 w-full">
                    {/* When chat is active, only show the chat area (rendered above) — hide old search UI */}
                    {chatMessages.length === 0 && (
                      <>
                    {/* Silicon Valley AI Diagnostic Trace Terminal (Staggered Logs Console) */}
                    {aiReasoningActive && (
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`max-w-2xl mx-auto w-full border rounded-3xl p-5 font-mono text-xs transition-all duration-300 shadow-[0_15px_30px_rgba(139,92,246,0.1)] relative overflow-hidden ${
                          resolvedTheme === 'dark'
                            ? 'bg-[#000000]/90 border-[#8B5CF6]/30 text-[#8B5CF6]'
                            : 'bg-slate-900 border-slate-700 text-[#10B981]'
                        }`}
                      >
                        {/* Glowing line overlay */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#8B5CF6]/40 to-transparent" />
                        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 mb-3.5">
                          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping shrink-0" />
                            NEURAL COGNITIVE ENGINE CORE TRACE
                          </span>
                          <span className="text-[9px] text-gray-500 font-semibold tracking-wider">GEMINI-CORE-EMULATION // COG-ACTIVE</span>
                        </div>
                        <div className="space-y-1.5 text-left h-36 overflow-y-auto pr-2 custom-scrollbar">
                          {aiReasoningSteps.map((step, idx) => (
                            <div key={idx} className="flex gap-2 items-start leading-relaxed">
                              <span className="text-gray-500 font-bold select-none">&gt;</span>
                              <span className={resolvedTheme === 'dark' ? 'text-gray-300 font-mono' : 'text-emerald-400 font-mono'}>{step}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Interactive Holographic RV Schematic (Silicon Valley styling) */}
                    {searchResults.length === 0 && !searchLoading && !aiReasoningActive && (
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl mx-auto w-full"
                      >
                        <HolographicSchematic 
                          resolvedTheme={resolvedTheme} 
                          onSelectHotspot={(q) => handleSuggestionClick(q)} 
                        />
                      </motion.div>
                    )}

                    {/* C. Interactive Holographic Loader */}
                    {searchLoading && !aiReasoningActive && (
                      <div className="max-w-2xl mx-auto w-full space-y-4 pt-6">
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider font-mono animate-pulse mb-4">
                          <Cpu className="w-4 h-4 text-[#8B5CF6] animate-spin" />
                          <span>Processing Diagnostic Matrices On-Device...</span>
                        </div>
                        {[1, 2, 3].map(item => (
                          <div key={item} className={`border rounded-2xl p-6 space-y-3 animate-pulse transition-colors duration-300 ${resolvedTheme === 'dark' ? 'bg-[#0B0F19]/80 border-white/[0.06]' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center gap-2">
                              <div className="h-4 bg-white/10 rounded w-16" />
                              <div className="h-4 bg-white/5 rounded w-24" />
                            </div>
                            <div className="h-6 bg-white/10 rounded w-2/3" />
                            <div className="h-4 bg-white/5 rounded w-full" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* D. Empty Search Results State */}
                    {emptyState && !searchLoading && (
                      <div className={`text-center py-12 max-w-md mx-auto backdrop-blur-[20px] rounded-3xl p-8 shadow-2xl border transition-colors duration-300 ${resolvedTheme === 'dark' ? 'bg-[#0B0F19]/80 border-white/[0.08]' : 'bg-white border-slate-200'}`}>
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-5 mx-auto">
                          <Wrench className="w-7 h-7 text-gray-500" />
                        </div>
                        <h4 className={`text-lg font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No Diagnostic Matches</h4>
                        <p className={`text-xs mt-2.5 leading-relaxed ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-600'}`}>
                          We found zero resolution steps matching <strong className={resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}>"{searchQuery}"</strong>. Try matching simplified keywords (e.g., "propane", "water pump", "fuse").
                        </p>
                        <button 
                          onClick={() => { setSearchQuery(''); setSearchResults([]); setEmptyState(false); }}
                          className="mt-6 text-xs font-bold text-[#3B82F6] hover:underline font-mono uppercase tracking-wider"
                        >
                          RESET SYSTEM SEARCH
                        </button>
                      </div>
                    )}

                    {/* E. List of results */}
                    {searchResults.length > 0 && !searchLoading && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto w-full space-y-4"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-gray-500 uppercase tracking-widest px-2">
                          <span>RESOLUTION BLUEPRINTS FOUND</span>
                          <span className="text-[#3B82F6]">{searchResults.length} SYSTEM MATCHES</span>
                        </div>
                        
                        <div className="space-y-4">
                           {searchResults.map(({ item, score }) => (
                             <div 
                               key={item.id}
                               onClick={() => setSelectedSolution(item)}
                               className={`border rounded-2xl p-5 md:p-6 shadow-md cursor-pointer transition-all duration-300 flex flex-col sm:flex-row sm:items-start justify-between gap-4 group hover:shadow-[0_10px_30px_rgba(139,92,246,0.15)] ${
                                 resolvedTheme === 'dark'
                                   ? 'bg-[#0B0F19]/80 hover:bg-[#0B0F19]/90 border-white/[0.06] hover:border-white/[0.15]'
                                   : 'bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-slate-300 shadow-slate-100/50'
                               }`}
                             >
                               <div className="space-y-3">
                                 <div className="flex flex-wrap items-center gap-2">
                                   <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 px-2.5 py-0.5 rounded-md shadow-sm">
                                     {score}% CORRELATION
                                   </span>
                                   <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-mono">
                                     {item.category}
                                   </span>
                                 </div>
                                 <h4 className={`text-lg font-bold group-hover:text-[#3B82F6] transition ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                   {item.problem}
                                 </h4>
                                 <p className={`text-xs leading-relaxed max-w-xl ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-600'}`}>
                                   {item.solution}
                                 </p>
                               </div>
 
                               <div className="flex sm:flex-col items-center gap-2 self-end sm:self-center">
                                 <button 
                                   onClick={(e) => handleToggleBookmark(item, e)}
                                   className={`p-2.5 rounded-xl border transition-all cursor-pointer ${savedFixIds.includes(item.id) ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : resolvedTheme === 'dark' ? 'bg-white/[0.02] border-white/[0.08] text-gray-500 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'}`}
                                 >
                                   <Star className={`w-4 h-4 ${savedFixIds.includes(item.id) ? 'fill-amber-400' : ''}`} />
                                 </button>
                               </div>
                             </div>
                           ))}
                        </div>
                      </motion.div>
                    )}
                      </>
                    )}
                  </div>
                )}

                {/* ── Chat Input Console ── */}
                <div className="max-w-2xl mx-auto w-full space-y-6 pt-8 border-t border-dashed border-white/[0.08]">
                  <form onSubmit={handleChatSubmit} className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-gray-400">
                      <MessageSquare className="w-5 h-5 text-[#8B5CF6]" />
                    </div>
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Describe your problem or answer a question..."
                      disabled={chatLoading}
                      className={`w-full py-5 pl-14 pr-28 border rounded-2xl outline-none text-sm placeholder-gray-500 font-medium tracking-wide focus:ring-1 transition-all duration-300 backdrop-blur-[20px] disabled:opacity-60 ${
                        resolvedTheme === 'dark' 
                          ? 'bg-[#0B0F19]/80 border-white/[0.08] focus:border-[#8B5CF6]/50 text-white hover:border-white/15 focus:ring-[#8B5CF6]/30' 
                          : 'bg-white/95 border-slate-200 focus:border-[#3B82F6]/50 text-slate-900 hover:border-slate-300 focus:ring-[#3B82F6]/30 shadow-lg shadow-slate-100/50'
                      }`}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {chatMessages.length > 0 && (
                        <button
                          type="button"
                          onClick={handleNewChat}
                          className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-lg transition cursor-pointer"
                        >
                          New
                        </button>
                      )}
                      <button 
                        type="submit"
                        disabled={chatLoading || !chatInput.trim()}
                        className="w-11 h-11 bg-gradient-to-tr from-[#8B5CF6] to-[#3B82F6] hover:brightness-110 text-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.25)] transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </form>

                  {/* AI Ready / Downloading Indicator */}
                  <div className="flex flex-col sm:flex-row items-center justify-between px-3 gap-4">
                    
                    {/* Status bar */}
                    <div>
                      {!aiEngineReady ? (
                        <div className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200'}`}>
                          <Download className="w-4 h-4 text-[#8B5CF6] animate-bounce" />
                          <div className="text-left">
                            <p className="text-[11px] text-gray-400 font-mono font-bold uppercase tracking-wider">
                              COMPILING ON-DEVICE AI INDEX ENGINE ({aiEngineProgress}%)
                            </p>
                            <div className="w-48 bg-white/10 h-1 rounded-full overflow-hidden mt-1.5">
                              <div className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] h-1 rounded-full transition-all duration-200" style={{ width: `${aiEngineProgress}%` }} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] text-[#10B981] font-mono font-bold bg-[#10B981]/10 border border-[#10B981]/20 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.08)]">
                          <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>COGNITIVE CACHE READY • ON-DEVICE INTEL ONLINE</span>
                        </div>
                      )}
                    </div>

                    {/* Limit counts pill */}
                    <div>
                      {user?.tier === 'free' ? (
                        <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-colors duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.02] border-white/[0.06] text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                          <span className="font-mono text-[11px]">{user.searchesRemaining}/3 free queries remaining</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <button 
                            onClick={() => setShowUpgradeModal(true)}
                            className="text-amber-500 hover:text-amber-600 font-bold flex items-center gap-1 cursor-pointer transition text-[11px]"
                          >
                            <Lock className="w-3 h-3 text-amber-500" />
                            Go Pro
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-4 py-1.5 rounded-full border border-amber-500/20 text-[11px] font-bold text-amber-500 shadow-sm">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-mono">UNLIMITED OFFLINE PRO WORKSPACE</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Quick troubleshooting suggestions */}
                  {chatMessages.length === 0 && !chatLoading && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="pt-6"
                    >
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3 font-mono text-center">
                        COMMON MECHANICAL EMERGENCIES:
                      </p>
                      <div className="flex flex-wrap gap-2.5 justify-center">
                        {[
                          "Water pump runs but no water",
                          "Fridge won't light on propane",
                          "Slide-out stuck",
                          "Generator starts then dies"
                        ].map((sug, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuestionClick(sug)}
                            disabled={chatLoading}
                            className={`border rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer transition-all shadow-sm ${
                              resolvedTheme === 'dark'
                                ? 'bg-[#0B0F19]/60 hover:bg-[#0B0F19] border-white/[0.06] hover:border-white/15 text-gray-300 hover:text-white'
                                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-600 hover:text-slate-900 shadow-slate-100/50'
                            }`}
                          >
                            "{sug}"
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                </div>

              </div>
            )}

            {/* B. Saved Fixes Tab View */}
            {activeTab === 'saved' && (
              <div id="saved-tab-view" className="space-y-6 max-w-2xl mx-auto w-full animate-fade-in">
                
                <div className={`border-b pb-4 transition-colors duration-300 ${resolvedTheme === 'dark' ? 'border-white/[0.08]' : 'border-slate-200'}`}>
                  <h2 className={`text-2xl font-extrabold transition-colors duration-300 ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-950'}`}>Your Offline Vault</h2>
                  <p className={`text-xs mt-1 leading-relaxed transition-colors duration-300 ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    Guides saved here are compiled and stored on-device inside standard cache indexes. Access them anytime, deep in the backcountry, without cellular network connection.
                  </p>
                </div>

                {/* List saved matches */}
                {savedFixIds.length === 0 ? (
                  <div className={`text-center py-16 rounded-3xl p-8 shadow-2xl border transition-colors duration-300 ${resolvedTheme === 'dark' ? 'bg-[#0B0F19]/80 border-white/[0.08]' : 'bg-white border-slate-200 shadow-slate-100/50'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-5 mx-auto">
                      <Star className="w-7 h-7 text-gray-600" />
                    </div>
                    <h4 className={`text-lg font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Vault is currently empty</h4>
                    <p className={`text-xs mt-2.5 max-w-xs mx-auto leading-relaxed ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                      Tap the star icon on any repair guide to download and compile it into your persistent offline diagnostic vault.
                    </p>
                    <button 
                      onClick={() => setActiveTab('search')}
                      className="mt-6 bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:brightness-110 shadow-md transition cursor-pointer"
                    >
                      Browse Diagnostic Guides
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from(new Map([...solutionsDataset, ...savedSolutions].map(item => [item.id, item])).values())
                      .filter(item => savedFixIds.includes(item.id))
                      .map(item => (
                        <div 
                          key={item.id}
                          onClick={() => { setSelectedSolution(item); setActiveTab('search'); }}
                          className={`border rounded-2xl p-5 shadow-sm transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                            resolvedTheme === 'dark'
                              ? 'bg-[#0B0F19]/80 hover:bg-[#0B0F19] border-white/[0.06] hover:border-white/15'
                              : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm shadow-slate-100/40'
                          }`}
                        >
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 font-mono">
                              {item.category}
                            </span>
                            <h4 className={`text-md font-bold group-hover:text-[#3B82F6] transition ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {item.problem}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              onClick={(e) => handleToggleBookmark(item, e)}
                              className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition"
                            >
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            </button>
                          </div>
                        </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* C. Settings Tab View */}
            {activeTab === 'settings' && (
              <div id="settings-tab-view" className="space-y-6 max-w-xl mx-auto w-full animate-fade-in">
                
                <div className={`border-b pb-4 transition-colors duration-300 ${resolvedTheme === 'dark' ? 'border-white/[0.08]' : 'border-slate-200'}`}>
                  <h2 className={`text-2xl font-extrabold transition-colors duration-300 ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-950'}`}>Workspace Configuration</h2>
                  <p className={`text-xs mt-1 transition-colors duration-300 ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    Manage subscription tiers, local cached indices, and simulate connectivity states.
                  </p>
                </div>

                <div className={`backdrop-blur-[20px] rounded-3xl p-6 shadow-2xl space-y-6 border transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-[#0B0F19]/80 border-white/[0.08]' : 'bg-white border-slate-200'}`}>
                  
                  {/* Theme Switcher Options */}
                  <div className="space-y-3">
                    <h4 className={`text-xs uppercase tracking-widest font-bold font-mono ${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                      VISUAL INTERFACE CONFIGURATION
                    </h4>
                    <div className={`border rounded-2xl p-4.5 space-y-3.5 transition-colors duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200/80'}`}>
                      <p className={`text-xs ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-600'}`}>
                        Configure the color template for off-grid reading. Dark mode saves battery on OLED displays during backcountry usage.
                      </p>
                      
                      <div className="grid grid-cols-3 gap-2.5">
                        <button
                          onClick={() => { setTheme('light'); showToast("☀️ Light Theme enabled."); }}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${theme === 'light' ? 'bg-white text-slate-900 border-[#3B82F6] shadow-sm font-semibold' : resolvedTheme === 'dark' ? 'bg-transparent border-white/[0.08] text-gray-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-950'}`}
                        >
                          <Sun className="w-4 h-4 text-amber-500" />
                          <span>Light</span>
                        </button>
                        
                        <button
                          onClick={() => { setTheme('dark'); showToast("🌙 Dark Theme enabled."); }}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${theme === 'dark' ? 'bg-[#0B0F19] text-white border-[#8B5CF6] shadow-md shadow-[#8B5CF6]/10 font-semibold' : resolvedTheme === 'dark' ? 'bg-transparent border-white/[0.08] text-gray-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-950'}`}
                        >
                          <Moon className="w-4 h-4 text-[#8B5CF6]" />
                          <span>Dark</span>
                        </button>
                        
                        <button
                          onClick={() => { setTheme('system'); showToast("🖥️ System Theme active."); }}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${theme === 'system' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981] font-semibold' : resolvedTheme === 'dark' ? 'bg-transparent border-white/[0.08] text-gray-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-950'}`}
                        >
                          <Monitor className="w-4 h-4 text-[#10B981]" />
                          <span>System</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subscription details card */}
                  <div className="space-y-2">
                    <h4 className={`text-xs uppercase tracking-widest font-bold font-mono ${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                      SUBSCRIPTION IDENTIFIER
                    </h4>
                    <div className={`border rounded-2xl p-4.5 flex items-center justify-between gap-4 transition-colors duration-300 ${resolvedTheme === 'dark' ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200/80'}`}>
                      <div>
                        <p className={`font-bold text-sm ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{user?.email}</p>
                        <p className={`text-xs capitalize mt-0.5 ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>{user?.tier} tier membership</p>
                      </div>
                      
                      {user?.tier === 'free' ? (
                        <button 
                          onClick={() => setShowUpgradeModal(true)}
                          className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:brightness-110 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                        >
                          Upgrade Now
                        </button>
                      ) : (
                        <span className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          PRO ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* System information */}
                  <div className={`space-y-2 border-t pt-6 transition-colors duration-300 ${resolvedTheme === 'dark' ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                    <h4 className={`text-xs uppercase tracking-widest font-bold font-mono mb-3 ${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                      OFFLINE STORAGE METRICS
                    </h4>
                    <div className={`space-y-3 border p-4 rounded-2xl font-mono text-xs transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-black/40 border-white/[0.04]' : 'bg-slate-50/80 border-slate-200/60'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>Diagnostic solutions index size</span>
                        <span className={`font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-950'}`}>142 KB</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>Neural search tokenizer cached</span>
                        <span className={`font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-950'}`}>23.2 MB (Cached)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>IndexedDB records saved</span>
                        <span className={`font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-950'}`}>{savedFixIds.length} items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>Connection simulation state</span>
                        <span className={`font-bold uppercase ${isOffline ? 'text-red-400' : 'text-[#10B981]'}`}>
                          {isOffline ? 'Offline (On-Device Model)' : 'Online (Direct Synced)'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={handleRefreshOfflineData}
                        className={`flex-1 border py-3 rounded-xl text-xs font-bold transition text-center cursor-pointer ${resolvedTheme === 'dark' ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-white' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm'}`}
                      >
                        Force Cache Re-Index
                      </button>
                      <button 
                        onClick={handleResetSearches}
                        className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 py-3 rounded-xl text-xs font-bold transition text-center cursor-pointer"
                      >
                        Reset Demo Search Limits
                      </button>
                    </div>
                  </div>

                  {/* App Version Info */}
                  <div className={`border-t pt-6 text-center space-y-1 transition-colors duration-300 ${resolvedTheme === 'dark' ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                    <p className={`text-xs font-bold font-mono ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-600'}`}>FIXFINDER OFFLINE CORE – v2.1.0-Release</p>
                    <p className="text-[10px] text-gray-500 font-medium">Compiled securely in compliance with cyber premium aesthetics.</p>
                  </div>

                </div>

              </div>
            )}

            {/* D. Knowledge Sync Hub & Aggregator Lab View */}
            {activeTab === 'aggregator' && (
              <div className="space-y-8 pb-12 animate-fade-in max-w-5xl mx-auto px-4">
                
                {/* Visual Banner Header */}
                <div className={`p-8 rounded-3xl border transition-all relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                  resolvedTheme === 'dark' 
                    ? 'bg-gradient-to-br from-[#121829] to-[#0B0F19] border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.3)]' 
                    : 'bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF] border-slate-200 shadow-xl'
                }`}>
                  {/* Subtle decorative futuristic orb */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#8B5CF6]/10 to-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 bg-[#8B5CF6]/10 text-[#A78BFA] text-[10px] font-bold font-mono rounded-full border border-[#8B5CF6]/20 uppercase tracking-widest">
                        Core Layer 1-2-3 Integrator
                      </span>
                    </div>
                    <h2 className={`text-2xl md:text-3xl font-black tracking-tight ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Knowledge Sync & <span className="bg-gradient-to-r from-[#A78BFA] to-[#60A5FA] bg-clip-text text-transparent">Aggregator Lab</span>
                    </h2>
                    <p className={`text-xs max-w-xl leading-relaxed ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-600'}`}>
                      Deploy background crawlers, configure local similarity weights, analyze global telemetry pipelines, and synchronize differential indices securely to your device.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0 relative z-10 w-full md:w-auto">
                    <button
                      onClick={triggerDifferentialSync}
                      disabled={isSyncing}
                      className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] hover:brightness-110 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing Ledgers...' : 'Run Differential Sync'}
                    </button>
                    
                    <button
                      onClick={triggerBackendScrape}
                      disabled={isScraping}
                      className={`font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2.5 transition-all border cursor-pointer ${
                        resolvedTheme === 'dark' 
                          ? 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.1] text-white' 
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
                      }`}
                    >
                      <Zap className={`w-4 h-4 text-amber-400 ${isScraping ? 'animate-pulse' : ''}`} />
                      {isScraping ? 'Crawling Web...' : 'Crawl On-Demand'}
                    </button>
                  </div>
                </div>

                {/* Main 2-Column Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Layer 1 Local Device configuration (5 cols) */}
                  <div className="lg:col-span-5 space-y-6">
                    
                    {/* Layer 1 Panel */}
                    <div className={`border p-6 rounded-3xl transition-all duration-300 ${
                      resolvedTheme === 'dark' ? 'bg-[#0B0F19]/80 border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className={`text-sm font-extrabold tracking-tight ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              Layer 1: Local PWA Client
                            </h3>
                            <p className="text-[10px] text-gray-500 font-mono">ON-DEVICE OFFLINE ARCHITECTURE</p>
                          </div>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      </div>

                      {/* Model weight switcher */}
                      <div className="space-y-4">
                        <div>
                          <label className={`block text-[10px] uppercase font-bold tracking-wider font-mono mb-2 ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                            On-Device RAG Embeddings Weights
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['compact', 'faiss', 'gemma'] as const).map(eng => (
                              <button
                                key={eng}
                                onClick={() => {
                                  setSelectedRAGEngine(eng);
                                  setWebWorkerLogs(prev => [
                                    ...prev,
                                    `[PWA] Switched on-device RAG parser weighting to: ${eng.toUpperCase()}`
                                  ]);
                                }}
                                className={`py-3 px-1 rounded-xl font-mono text-[9px] uppercase font-extrabold border transition-all text-center cursor-pointer ${
                                  selectedRAGEngine === eng
                                    ? 'bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]'
                                    : resolvedTheme === 'dark'
                                      ? 'bg-white/[0.01] hover:bg-white/[0.03] border-white/[0.04] text-gray-400'
                                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                                }`}
                              >
                                {eng === 'compact' ? 'Compact' : eng === 'faiss' ? 'FAISS' : 'Gemma 2B'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Cellular Data Cap protection Toggle */}
                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-dashed border-white/[0.06] transition-colors">
                          <div className="space-y-0.5">
                            <span className={`text-xs font-bold block ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                              Batch cellular caps
                            </span>
                            <span className="text-[10px] text-gray-500 block">
                              Avoids data charges on cellular networks
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setCellularDataCap(!cellularDataCap);
                              showToast(cellularDataCap ? 'Cellular throttle disabled.' : 'Cellular compression activated.');
                            }}
                            className={`w-12 h-6.5 rounded-full transition-colors relative p-1 shrink-0 ${
                              cellularDataCap ? 'bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]' : 'bg-gray-700'
                            }`}
                          >
                            <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform ${cellularDataCap ? 'translate-x-5.5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Zero-Knowledge Privacy Capture Toggle */}
                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-dashed border-white/[0.06] transition-colors">
                          <div className="space-y-0.5">
                            <span className={`text-xs font-bold block ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                              Zero-Knowledge Telemetry
                            </span>
                            <span className="text-[10px] text-gray-500 block">
                              Applies Laplacian noise (ε=1.5) to sync frames
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setPrivacyPreserveCapture(!privacyPreserveCapture);
                              showToast(privacyPreserveCapture ? 'Privacy-preserving capture suspended.' : 'Zero-knowledge anonymizer activated.');
                            }}
                            className={`w-12 h-6.5 rounded-full transition-colors relative p-1 shrink-0 ${
                              privacyPreserveCapture ? 'bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]' : 'bg-gray-700'
                            }`}
                          >
                            <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform ${privacyPreserveCapture ? 'translate-x-5.5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                      </div>
                    </div>

                    {/* Local Web Worker Logs Console */}
                    <div className={`border p-6 rounded-3xl transition-all duration-300 ${
                      resolvedTheme === 'dark' ? 'bg-[#0B0F19]/80 border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-[#8B5CF6]" />
                          <h4 className={`text-xs font-black uppercase tracking-wider font-mono ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            On-Device Web Worker Trace
                          </h4>
                        </div>
                        {webWorkerRunning && (
                          <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#A78BFA]">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                            CALCULATING...
                          </div>
                        )}
                      </div>

                      {/* Log Screen */}
                      <div className="bg-[#030712] border border-white/[0.06] rounded-2xl p-4 font-mono text-[10px] h-48 overflow-y-auto space-y-2 text-left select-text custom-scrollbar">
                        {webWorkerLogs.map((log, index) => {
                          let color = 'text-gray-400';
                          if (log.includes('[SYNC]')) color = 'text-cyan-400';
                          if (log.includes('[WORKER]')) color = 'text-[#A78BFA]';
                          if (log.includes('[FAISS]')) color = 'text-[#3B82F6] font-semibold';
                          if (log.includes('[LLM]')) color = 'text-[#10B981]';
                          if (log.includes('Success!') || log.includes('Success')) color = 'text-[#10B981] font-bold';
                          if (log.includes('Error')) color = 'text-rose-400';
                          return (
                            <div key={index} className={`${color} leading-relaxed break-words`}>
                              {log}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Layer 2 Aggregator & Layer 3 Sync Relay (7 cols) */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* Layer 2 Scrapers and Dynamic Crawler Table */}
                    <div className={`border p-6 rounded-3xl transition-all duration-300 ${
                      resolvedTheme === 'dark' ? 'bg-[#0B0F19]/80 border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Database className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className={`text-sm font-extrabold tracking-tight ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              Layer 2: Aggregator Server & Crawlers
                            </h3>
                            <p className="text-[10px] text-gray-500 font-mono">AUTONOMOUS CRAWLER WORKSPACE</p>
                          </div>
                        </div>
                      </div>

                      {/* Table of Scraped Sources */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-mono text-[11px]">
                          <thead>
                            <tr className={`border-b ${resolvedTheme === 'dark' ? 'border-white/[0.06] text-gray-400' : 'border-slate-200 text-slate-500'}`}>
                              <th className="pb-2.5 font-black uppercase tracking-wider">Source Channel</th>
                              <th className="pb-2.5 font-black uppercase tracking-wider text-center">Harvested</th>
                              <th className="pb-2.5 font-black uppercase tracking-wider text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {scrapedSources.map((src: any) => (
                              <tr key={src.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3">
                                  <div className="font-bold text-gray-200">{src.name}</div>
                                  <div className="text-[9px] text-gray-500">{src.url}</div>
                                </td>
                                <td className="py-3 text-center font-bold text-[#A78BFA]">
                                  {src.itemsFound} items
                                id</td>
                                <td className="py-3 text-right">
                                  <span className={`px-2.5 py-1 rounded-full text-[9px] uppercase font-bold ${
                                    src.status === 'parsing'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {src.status === 'parsing' ? 'PARSING...' : 'STANDBY'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Layer 3 Sync Relay: Trending & Logs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Live Trending Diagnostic Board */}
                      <div className={`border p-6 rounded-3xl transition-all duration-300 ${
                        resolvedTheme === 'dark' ? 'bg-[#0B0F19]/80 border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
                      }`}>
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <h4 className={`text-xs font-black uppercase tracking-wider font-mono ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Trending Repair Matrices
                          </h4>
                        </div>

                        <div className="space-y-3">
                          {trendingProblems.slice(0, 4).map((prob: any) => (
                            <div 
                              key={prob.id} 
                              onClick={() => {
                                setSearchQuery(prob.problem);
                                setActiveTab('search');
                                handleSearchSubmit(undefined, prob.problem);
                              }}
                              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] ${
                                resolvedTheme === 'dark' 
                                  ? 'bg-[#121829]/60 hover:bg-[#121829] border-white/[0.04] hover:border-white/[0.1]' 
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-slate-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[8px] font-mono uppercase bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
                                  {prob.category || 'System'}
                                </span>
                                <span className="text-[10px] font-mono font-black text-emerald-400">
                                  {prob.delta}
                                </span>
                              </div>
                              <h5 className={`text-[11px] font-bold mt-1.5 truncate ${resolvedTheme === 'dark' ? 'text-gray-200' : 'text-slate-800'}`}>
                                {prob.problem}
                              </h5>
                              <span className="text-[9px] text-gray-500 mt-0.5 block font-mono">
                                Reported {prob.count} times this week
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Global Aggregator Logs Trace */}
                      <div className={`border p-6 rounded-3xl transition-all duration-300 ${
                        resolvedTheme === 'dark' ? 'bg-[#0B0F19]/80 border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
                      }`}>
                        <div className="flex items-center gap-2 mb-4">
                          <Layers className="w-4 h-4 text-blue-400" />
                          <h4 className={`text-xs font-black uppercase tracking-wider font-mono ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Global Scraper Telemetry
                          </h4>
                        </div>

                        {/* Logs container */}
                        <div className="bg-[#030712] border border-white/[0.06] rounded-2xl p-4 font-mono text-[9px] h-64 overflow-y-auto space-y-2 text-left select-text custom-scrollbar font-normal">
                          {aggregationLogs.length === 0 ? (
                            <div className="text-gray-600 italic">No logs on ledger. Connect to backend stream.</div>
                          ) : (
                            aggregationLogs.map((log, i) => {
                              let style = 'text-gray-400';
                              if (log.includes('[CRAWLER]')) style = 'text-amber-400';
                              if (log.includes('[DEDUPLICATE]')) style = 'text-blue-400';
                              if (log.includes('[GRAPH-INJECT]')) style = 'text-emerald-400';
                              if (log.includes('[PRIVACY-SYNC]')) style = 'text-cyan-300 font-semibold';
                              return (
                                <div key={i} className={`${style} leading-relaxed`}>
                                  {log}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                    </div>

                  </div>

                </div>

              </div>
            )}

          </main>

          {/* Persistent Footer Tabs navigation */}
          <footer id="bottom-tabs" className={`backdrop-blur-[20px] border-t h-20 fixed bottom-0 left-0 right-0 z-40 transition-colors duration-300 ${resolvedTheme === 'dark' ? 'bg-[#000000]/75 border-white/[0.08]' : 'bg-white/80 border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]'}`}>
            <div className="max-w-md mx-auto h-full flex items-center justify-around px-4">
              
              <button 
                onClick={() => { setActiveTab('search'); setSelectedSolution(null); }}
                className={`flex flex-col items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'search' ? (resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900') : 'text-gray-500 hover:text-slate-700'}`}
              >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'search' ? 'bg-gradient-to-r from-[#8B5CF6]/15 to-[#3B82F6]/15 text-[#3B82F6]' : ''}`}>
                  <Search className="w-5 h-5" />
                </div>
                <span className="text-[9px] tracking-widest font-mono">SEARCH</span>
              </button>

              <button 
                onClick={() => setActiveTab('saved')}
                className={`flex flex-col items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'saved' ? (resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900') : 'text-gray-500 hover:text-slate-700'}`}
              >
                <div className={`p-2 rounded-xl transition-all relative ${activeTab === 'saved' ? 'bg-gradient-to-r from-[#8B5CF6]/15 to-[#3B82F6]/15 text-[#3B82F6]' : ''}`}>
                  <Bookmark className="w-5 h-5" />
                  {savedFixIds.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#8B5CF6] text-white rounded-full text-[8px] h-4 min-w-4 flex items-center justify-center font-bold px-1 font-mono">
                      {savedFixIds.length}
                    </span>
                  )}
                </div>
                <span className="text-[9px] tracking-widest font-mono">VAULT</span>
              </button>

              <button 
                onClick={() => setActiveTab('aggregator')}
                className={`flex flex-col items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'aggregator' ? (resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900') : 'text-gray-500 hover:text-slate-700'}`}
              >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'aggregator' ? 'bg-gradient-to-r from-[#8B5CF6]/15 to-[#3B82F6]/15 text-[#3B82F6]' : ''}`}>
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="text-[9px] tracking-widest font-mono">LAB</span>
              </button>

              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'settings' ? (resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900') : 'text-gray-500 hover:text-slate-700'}`}
              >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-gradient-to-r from-[#8B5CF6]/15 to-[#3B82F6]/15 text-[#3B82F6]' : ''}`}>
                  <Settings className="w-5 h-5" />
                </div>
                <span className="text-[9px] tracking-widest font-mono">SETTINGS</span>
              </button>

            </div>
          </footer>

        </div>
      )}

      {/* 2. Authentication Modal Overlays */}
      {showAuthModal && (
        <div id="auth-modal" className="fixed inset-0 bg-black/85 backdrop-blur-[15px] flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#0B0F19]/95 border border-white/[0.1] max-w-sm w-full rounded-3xl p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative"
          >
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-white cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Logo */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-4 mx-auto">
                <Wrench className="w-6 h-6 text-[#8B5CF6]" />
              </div>
              <h2 className="text-xl font-bold text-white">FixFinder Workspace</h2>
              <p className="text-xs text-gray-400 mt-1.5">Create your secure on-device profile for off-grid operations.</p>
            </div>

            {/* Auth Tab selectors */}
            <div className="flex border-b border-white/[0.08] mb-6">
              <button 
                onClick={() => setAuthTab('login')}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 text-center cursor-pointer ${authTab === 'login' ? 'border-[#8B5CF6] text-[#8B5CF6]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => setAuthTab('register')}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 text-center cursor-pointer ${authTab === 'register' ? 'border-[#8B5CF6] text-[#8B5CF6]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                New Account
              </button>
            </div>

            {/* Error messaging */}
            {authError && (
              <div className="bg-red-500/10 border border-red-500/25 text-red-300 text-xs p-3.5 rounded-xl mb-4 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={authTab === 'login' ? handleLogin : handleRegister} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 font-mono">
                  EMAIL ADDRESS
                </label>
                <input 
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 bg-black/40 border border-white/[0.08] focus:border-[#8B5CF6]/50 rounded-xl text-xs text-white placeholder-gray-600 outline-none transition"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold font-mono">
                    PASSWORD
                  </label>
                  {authTab === 'login' && (
                    <button 
                      type="button"
                      onClick={() => showToast("Password reset manifest simulated!")}
                      className="text-[10px] text-gray-500 font-bold hover:text-gray-300 font-mono"
                    >
                      FORGOT?
                    </button>
                  )}
                </div>
                <input 
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-black/40 border border-white/[0.08] focus:border-[#8B5CF6]/50 rounded-xl text-xs text-white placeholder-gray-600 outline-none transition"
                />
              </div>

              <button 
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white py-3.5 rounded-xl font-bold hover:brightness-110 transition shadow-md text-xs tracking-wider uppercase font-mono cursor-pointer"
              >
                {authLoading ? 'Authorizing secure node...' : authTab === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.08]" /></div>
                <div className="relative flex justify-center text-[10px] font-mono"><span className="bg-[#0B0F19] px-2 text-gray-500 font-bold uppercase">Bypass Auth</span></div>
              </div>

              <button 
                type="button"
                onClick={handleGuestMode}
                className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-white py-3.5 rounded-xl font-bold transition text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-gray-400" />
                Continue as Guest (Pro access)
              </button>
            </form>

          </motion.div>
        </div>
      )}

      {/* 3. Go-Pro Premium Upsell Modal */}
      {showUpgradeModal && (
        <div id="upgrade-modal" className="fixed inset-0 bg-black/85 backdrop-blur-[15px] flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#0B0F19]/95 border border-white/[0.1] max-w-sm w-full rounded-3xl p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative text-center"
          >
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-white cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mb-5 mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
            </div>
            
            <h3 className="text-xl font-black text-white tracking-tight">Upgrade to RV Pro</h3>
            <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">
              Unlock unlimited diagnostic intelligence and direct manual offline databases.
            </p>

            {/* Benefits bullet list */}
            <ul className="text-left space-y-3 my-6 text-xs text-gray-300 max-w-[270px] mx-auto font-medium">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md bg-[#10B981]/10 border border-[#10B981]/25 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[3px]" />
                </div>
                <span><strong>Unlimited</strong> cognitive AI diagnostics</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md bg-[#10B981]/10 border border-[#10B981]/25 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[3px]" />
                </div>
                <span><strong>100% Offline Capable</strong> – No cellular sign</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md bg-[#10B981]/10 border border-[#10B981]/25 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[3px]" />
                </div>
                <span><strong>Download guides</strong> to local storage vault</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md bg-[#10B981]/10 border border-[#10B981]/25 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[3px]" />
                </div>
                <span><strong>No ads</strong> or recurring connectivity limits</span>
              </li>
            </ul>

            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl mb-6">
              <p className="text-gray-500 text-[10px] uppercase tracking-widest font-mono font-bold">PRO SUBSCRIPTION TIER</p>
              <p className="text-3xl font-extrabold text-white mt-1">$4.99 <span className="text-xs font-normal text-gray-400">/ month</span></p>
              <p className="text-[10px] text-[#10B981] font-semibold mt-1">7-Day Free Trial Activated</p>
            </div>

            <button 
              onClick={handleUpgradePayment}
              disabled={upgradeLoading}
              className="w-full bg-gradient-to-r from-[#8B5CF6] via-[#3B82F6] to-[#10B981] text-white py-3.5 rounded-xl font-bold hover:brightness-110 shadow-md transition text-xs uppercase tracking-wider font-mono cursor-pointer"
            >
              {upgradeLoading ? 'Authorizing Portal...' : 'Start 7-Day Free Trial'}
            </button>

            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="mt-4 block w-full text-xs font-bold text-gray-500 hover:text-gray-300 uppercase tracking-widest font-mono transition"
            >
              Cancel
            </button>

          </motion.div>
        </div>
      )}

      {/* 4. Simulated Stripe Checkout Window Modal */}
      {showStripeModal && (
        <div id="stripe-checkout" className="fixed inset-0 bg-black/90 backdrop-blur-[15px] flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#0B0F19]/95 border border-white/[0.1] max-w-md w-full rounded-3xl overflow-hidden shadow-2xl"
          >
            
            {/* Header bar branding */}
            <div className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] px-6 py-4.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wrench className="w-5 h-5 text-white" />
                <span className="font-extrabold tracking-tight text-sm">Secure Stripe Sandbox</span>
              </div>
              <span className="text-[9px] uppercase tracking-widest bg-white/15 px-2 py-0.5 rounded-md font-mono font-bold">
                TEST MODE
              </span>
            </div>

            {/* Main Checkout Fields */}
            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">SUBMITTING SECURE UPGRADE</p>
                <p className="text-xl font-extrabold text-white mt-1">FixFinder Pro Subscription</p>
                <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mt-1">$4.99/mo (7-day Trial)</p>
              </div>

              {stripeSuccessMessage ? (
                <div className="bg-[#10B981]/15 border border-[#10B981]/25 text-[#10B981] p-5 rounded-2xl text-center space-y-2.5">
                  <CheckCircle className="w-8 h-8 text-[#10B981] mx-auto animate-bounce" />
                  <p className="text-xs font-bold font-mono uppercase tracking-wider">{stripeSuccessMessage}</p>
                </div>
              ) : (
                <div className="space-y-4 bg-white/[0.02] p-4.5 rounded-2xl border border-white/[0.06]">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 font-mono mb-2">SIMULATED CRYPTO CARD FEED</p>
                  
                  <div className="space-y-3 font-mono text-xs text-gray-300">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">CARD NUMBER</label>
                      <input 
                        type="text" 
                        readOnly 
                        value="4242 •••• •••• 4242" 
                        className="w-full bg-[#000000]/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">EXPIRY</label>
                        <input 
                          type="text" 
                          readOnly 
                          value="12 / 29" 
                          className="w-full bg-[#000000]/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[#3B82F6] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">CVC</label>
                        <input 
                          type="text" 
                          readOnly 
                          value="321" 
                          className="w-full bg-[#000000]/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowStripeModal(false)}
                  disabled={upgradeLoading}
                  className="flex-1 border border-white/[0.08] hover:bg-white/[0.02] text-gray-400 hover:text-white py-3 rounded-xl text-xs font-bold transition cursor-pointer font-mono uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmStripePayment}
                  disabled={upgradeLoading || !!stripeSuccessMessage}
                  className="flex-1 bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white py-3 rounded-xl text-xs font-bold hover:brightness-110 transition cursor-pointer font-mono uppercase tracking-widest shadow-md"
                >
                  {upgradeLoading ? 'Authorizing...' : 'Authorize Pay'}
                </button>
              </div>

              <p className="text-[9px] text-gray-500 text-center font-mono leading-relaxed">
                🔒 BANK-GRADE SIMULATED STRIPE ENCRYPTION ACTIVE
              </p>
            </div>

          </motion.div>
        </div>
      )}

    </div>
  );
}
