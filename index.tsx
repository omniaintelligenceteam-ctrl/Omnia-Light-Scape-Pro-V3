import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key. Set VITE_CLERK_PUBLISHABLE_KEY in your environment.");
}

// Token cache for mobile persistence - stores tokens in localStorage
// This helps mobile browsers (especially iOS Safari) retain sessions
const tokenCache = {
  getToken: async (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  saveToken: async (key: string, token: string) => {
    try {
      localStorage.setItem(key, token);
    } catch {
      // Storage quota exceeded
    }
  },
  clearToken: async (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <ClerkProvider
          publishableKey={PUBLISHABLE_KEY}
          // @ts-expect-error - tokenCache helps mobile session persistence but isn't in Clerk's types
          tokenCache={tokenCache}
        >
          <ToastProvider>
            <App />
          </ToastProvider>
        </ClerkProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (err) {
  const errEl = document.getElementById('_boot_error');
  if (errEl) {
    errEl.style.display = 'block';
    errEl.textContent = 'Mount Error: ' + (err instanceof Error ? err.message : String(err));
  }
  console.error('Failed to mount React app:', err);
}
