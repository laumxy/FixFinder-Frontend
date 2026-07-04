import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress MetaMask/Web3 connection errors in sandboxed iframe environments
if (typeof window !== 'undefined') {
  // Prevent unhandled promise rejections from MetaMask / other wallets
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason && (reason.message || String(reason));
    if (msg && (
      msg.toLowerCase().includes('metamask') || 
      msg.toLowerCase().includes('ethereum') || 
      msg.toLowerCase().includes('wallet') ||
      msg.toLowerCase().includes('provider')
    )) {
      console.warn('Suppressed sandboxed MetaMask/Web3 promise rejection:', msg);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  // Prevent generic uncaught errors from MetaMask / other wallets
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (msg && (
      msg.toLowerCase().includes('metamask') || 
      msg.toLowerCase().includes('ethereum') || 
      msg.toLowerCase().includes('wallet') ||
      msg.toLowerCase().includes('provider')
    )) {
      console.warn('Suppressed sandboxed MetaMask/Web3 error:', msg);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  // Safely intercept and mock ethereum provider to prevent extension crashes inside sandboxed iframe
  if (!(window as any).ethereum) {
    (window as any).ethereum = {
      isMetaMask: true,
      request: async (args: any) => {
        console.log('Mock MetaMask Request:', args);
        if (args?.method === 'eth_requestAccounts' || args?.method === 'eth_accounts') {
          return ['0x0000000000000000000000000000000000000000'];
        }
        return null;
      },
      on: () => {},
      removeListener: () => {},
      autoRefreshOnNetworkChange: false
    };
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

