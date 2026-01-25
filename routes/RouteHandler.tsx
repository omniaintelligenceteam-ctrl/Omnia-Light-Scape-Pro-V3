import React, { useState } from 'react';
import { ClientPortal } from '../components/ClientPortal';
import { AcceptInvite } from '../components/AcceptInvite';
import { BillingSuccess } from '../components/BillingSuccess';
import { BillingCanceled } from '../components/BillingCanceled';
import AuthWrapper from '../components/AuthWrapper';

interface RouteHandlerProps {
  children: React.ReactNode;
  isCheckingAuth: boolean;
  isAuthorized: boolean;
  onRequestApiKey: () => void;
  onShowPricing: () => void;
}

/**
 * RouteHandler - Handles special routes before the main app content
 *
 * Routes handled:
 * - /portal - Client Portal (no auth required)
 * - /invite/:token - Accept Invite (no auth required)
 * - /billing/success - Billing Success (auth required)
 * - /billing/canceled - Billing Canceled (auth required)
 *
 * Also handles:
 * - Loading state while checking auth
 * - API Key setup view when not authorized
 */
export const RouteHandler: React.FC<RouteHandlerProps> = ({
  children,
  isCheckingAuth,
  isAuthorized,
  onRequestApiKey,
  onShowPricing
}) => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Handle billing page navigation
  const handleBillingContinue = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  const handleBillingRetry = () => {
    onShowPricing();
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  // 1. Show Loading State while checking API Key
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        Loading System...
      </div>
    );
  }

  // 2. Show API Key Setup if not authorized (no env var AND no IDX shim key)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8">
        <div className="max-w-md text-center space-y-8 p-12 bg-[#111] rounded-[28px] shadow-2xl border border-white/10">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-bold text-[#F6B45A] tracking-tight font-serif">Omnia</h1>
            <span className="text-gray-300 font-bold italic text-sm tracking-[0.2em] uppercase font-serif">
              Light Scape Pro
            </span>
          </div>
          <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
            <p className="text-gray-300 text-sm leading-relaxed">
              To access the advanced <span className="text-[#F6B45A] font-bold">Gemini 3 Pro</span> model,
              please configure your API Key in the application settings.
            </p>
          </div>
          {/* Only show the connect button if we are in a dev environment that supports it */}
          {(window as any).aistudio ? (
            <button
              onClick={onRequestApiKey}
              className="w-full bg-[#F6B45A] text-[#050505] rounded-xl py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#ffc67a] shadow-[0_0_20px_rgba(246,180,90,0.2)] hover:shadow-[0_0_30px_rgba(246,180,90,0.4)] hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              Connect API Key (Dev Mode)
            </button>
          ) : (
            <div className="text-red-400 text-xs mt-4 border border-red-900/50 p-2 rounded bg-red-900/20">
              Environment Variable <code>VITE_GEMINI_API_KEY</code> is missing.
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Client Portal (no auth required)
  if (currentPath.startsWith('/portal')) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    return <ClientPortal initialToken={token} />;
  }

  // 4. Accept Invite page (no auth required - handles auth internally)
  if (currentPath.startsWith('/invite/')) {
    const token = currentPath.replace('/invite/', '');
    return <AcceptInvite token={token} />;
  }

  // 5. Show Billing Success page
  if (currentPath === '/billing/success') {
    return (
      <AuthWrapper>
        <BillingSuccess onContinue={handleBillingContinue} />
      </AuthWrapper>
    );
  }

  // 6. Show Billing Canceled page
  if (currentPath === '/billing/canceled') {
    return (
      <AuthWrapper>
        <BillingCanceled onContinue={handleBillingContinue} onRetry={handleBillingRetry} />
      </AuthWrapper>
    );
  }

  // 7. Default: Render main app content
  return <>{children}</>;
};

export default RouteHandler;
