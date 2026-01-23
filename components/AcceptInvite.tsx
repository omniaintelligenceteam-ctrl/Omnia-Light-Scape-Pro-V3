import React, { useState, useEffect } from 'react';
import { useUser, SignIn, SignUp } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Mail, Shield, Building2, ArrowRight, UserPlus } from 'lucide-react';
import { useUserSync } from '../hooks/useUserSync';

interface InviteData {
  email: string;
  role: string;
  organizationName: string;
  expiresAt: string;
}

interface AcceptInviteProps {
  token: string;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: 'Office Manager',
  salesperson: 'Salesperson',
  lead_technician: 'Lead Technician',
  technician: 'Technician'
};

export const AcceptInvite: React.FC<AcceptInviteProps> = ({ token }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  useUserSync(); // Sync user to Supabase when they sign in

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [showAuth, setShowAuth] = useState<'signin' | 'signup' | null>(null);

  // Fetch invite details on mount
  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const response = await fetch(`/api/organizations/invites?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid or expired invite');
          return;
        }

        if (data.success && data.data) {
          setInviteData(data.data);
        } else {
          setError('Invalid invite');
        }
      } catch {
        setError('Failed to load invite details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  // Accept invite when user is signed in
  const acceptInvite = async () => {
    if (!user?.id || !inviteData) return;

    setIsAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/invites?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkUserId: user.id })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invite');
        return;
      }

      setAcceptSuccess(true);

      // Redirect to main app after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch {
      setError('Failed to accept invite. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  // Auto-accept when user signs in and their email matches
  useEffect(() => {
    if (isSignedIn && inviteData && !acceptSuccess && !isAccepting) {
      const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
      const inviteEmail = inviteData.email.toLowerCase();

      if (userEmail === inviteEmail) {
        acceptInvite();
      } else {
        setError(`This invite was sent to ${inviteData.email}. Please sign in with that email address.`);
      }
    }
  }, [isSignedIn, inviteData, user]);

  // Loading state
  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#F6B45A] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid/expired invite)
  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 bg-[#111] rounded-2xl border border-white/10 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            Go to Homepage
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (acceptSuccess) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 bg-[#111] rounded-2xl border border-emerald-500/30 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to the Team!</h1>
          <p className="text-gray-400 mb-4">
            You've successfully joined <span className="text-[#F6B45A]">{inviteData?.organizationName}</span>.
          </p>
          <p className="text-sm text-gray-500">Redirecting you to the app...</p>
        </motion.div>
      </div>
    );
  }

  // Invite details view
  if (inviteData && !isSignedIn) {
    const roleDisplayName = ROLE_DISPLAY_NAMES[inviteData.role] || inviteData.role;

    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {showAuth ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-md"
            >
              <button
                onClick={() => setShowAuth(null)}
                className="text-gray-400 hover:text-white mb-4 text-sm flex items-center gap-1"
              >
                &larr; Back to invite
              </button>

              {showAuth === 'signup' ? (
                <SignUp
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'bg-[#111] border border-white/10 shadow-2xl',
                      headerTitle: 'text-white',
                      headerSubtitle: 'text-gray-400',
                      formFieldLabel: 'text-gray-400',
                      formFieldInput: 'bg-white/5 border-white/10 text-white',
                      formButtonPrimary: 'bg-[#F6B45A] hover:bg-[#f6c45a] text-black',
                      footerActionLink: 'text-[#F6B45A]',
                      identityPreviewText: 'text-white',
                      identityPreviewEditButton: 'text-[#F6B45A]',
                    }
                  }}
                  initialValues={{ emailAddress: inviteData.email }}
                  afterSignUpUrl={`/invite/${token}`}
                  redirectUrl={`/invite/${token}`}
                />
              ) : (
                <SignIn
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'bg-[#111] border border-white/10 shadow-2xl',
                      headerTitle: 'text-white',
                      headerSubtitle: 'text-gray-400',
                      formFieldLabel: 'text-gray-400',
                      formFieldInput: 'bg-white/5 border-white/10 text-white',
                      formButtonPrimary: 'bg-[#F6B45A] hover:bg-[#f6c45a] text-black',
                      footerActionLink: 'text-[#F6B45A]',
                    }
                  }}
                  afterSignInUrl={`/invite/${token}`}
                  redirectUrl={`/invite/${token}`}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="invite"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="p-8 bg-[#111] rounded-2xl border border-white/10">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F6B45A] to-[#e5a24a] flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-black" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">You're Invited!</h1>
                  <p className="text-gray-400">
                    Join <span className="text-[#F6B45A] font-semibold">{inviteData.organizationName}</span>
                  </p>
                </div>

                {/* Invite Details */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                      <p className="text-white font-medium">{inviteData.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Role</p>
                      <p className="text-white font-medium">{roleDisplayName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Organization</p>
                      <p className="text-white font-medium">{inviteData.organizationName}</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => setShowAuth('signup')}
                    className="w-full py-4 rounded-xl bg-[#F6B45A] text-black font-semibold hover:bg-[#f6c45a] transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Create Account
                  </button>

                  <button
                    onClick={() => setShowAuth('signin')}
                    className="w-full py-4 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                  >
                    I already have an account
                  </button>
                </div>

                <p className="text-center text-xs text-gray-500 mt-6">
                  This invite expires on {new Date(inviteData.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // User is signed in, accepting invite
  if (isSignedIn && inviteData) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 bg-[#111] rounded-2xl border border-white/10 text-center"
        >
          {isAccepting ? (
            <>
              <Loader2 className="w-8 h-8 text-[#F6B45A] animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Joining {inviteData.organizationName}...</p>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Unable to Accept Invite</h1>
              <p className="text-gray-400 mb-6">{error}</p>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
              >
                Go to Homepage
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400">Processing invite...</p>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return null;
};

export default AcceptInvite;
