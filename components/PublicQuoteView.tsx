import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, MapPin, User, Mail, Phone, Building2, FileText, Loader2,
  AlertCircle, Check, XCircle, Shield, ChevronDown, ChevronUp, Sparkles,
  CreditCard, Calendar, Play, FileText as DocumentIcon, Receipt, Clock, Package,
  MessageCircle, Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SignatureCapture } from './SignatureCapture';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { QuoteVideoPlayer } from './remotion/QuoteVideoPlayer';
import type { QuoteVideoProps } from './remotion/QuoteReveal';
import { QuoteCoverSection, InteractivePricingTable, QuoteProgressStepper, ExpirationCountdown } from './quote';
import { QuotePageSkeleton } from './shared/PremiumSkeleton';

interface QuoteProject {
  id: string;
  name: string;
  generatedImageUrl: string | null;
  originalImageUrl: string | null;
  promptConfig: any;
  quoteExpiresAt: string | null;
  createdAt: string;
}

interface QuoteClient {
  name: string;
  email: string | null;
}

interface QuoteCompany {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  logo: string | null;
}

interface QuoteApproval {
  approvedAt: string;
}

interface PublicQuoteData {
  project: QuoteProject;
  client: QuoteClient | null;
  company: QuoteCompany;
  approved: QuoteApproval | null;
}

interface PublicQuoteViewProps {
  token: string;
}

// Celebration confetti burst
const triggerCelebration = () => {
  const duration = 3000;
  const colors = ['#F6B45A', '#FFD700', '#FFA500', '#FFE4B5', '#FFFFFF'];

  // First burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors
  });

  // Side bursts
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors
    });
  }, 250);

  // Final shower
  const end = Date.now() + duration;
  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.5 },
      colors
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.5 },
      colors
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
};

export const PublicQuoteView: React.FC<PublicQuoteViewProps> = ({ token }) => {
  const [data, setData] = useState<PublicQuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approvalDate, setApprovalDate] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);

  // Ref for approval section to track visibility
  const approvalSectionRef = useRef<HTMLDivElement>(null);

  // Approval form state
  const [signature, setSignature] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>('deposit');

  // View mode: document or video
  const [viewMode, setViewMode] = useState<'document' | 'video'>('document');

  // Client question state
  const [clientQuestion, setClientQuestion] = useState('');
  const [sendingQuestion, setSendingQuestion] = useState(false);
  const [questionSent, setQuestionSent] = useState(false);

  useEffect(() => {
    async function fetchQuote() {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/quote/${token}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load quote');
        }

        setData(result.data);
        if (result.data.approved) {
          setApproved(true);
          setApprovalDate(result.data.approved.approvedAt);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load quote');
      } finally {
        setLoading(false);
      }
    }

    fetchQuote();
  }, [token]);

  // Track approval section visibility for floating CTA
  useEffect(() => {
    // Calculate if expired from data
    const quoteExpired = data?.project?.quoteExpiresAt
      ? new Date(data.project.quoteExpiresAt) < new Date()
      : false;

    if (!approvalSectionRef.current || approved || quoteExpired) {
      setShowFloatingCTA(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show floating CTA when approval section is NOT visible
        setShowFloatingCTA(!entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '-100px 0px 0px 0px',
        threshold: 0.1
      }
    );

    observer.observe(approvalSectionRef.current);

    return () => observer.disconnect();
  }, [approved, data]);

  const handleApprove = async () => {
    if (!signature || !termsAccepted) return;

    try {
      setApproving(true);
      const response = await fetch(`/api/public/quote/${token}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          termsAcceptedAt: new Date().toISOString(),
          paymentOption
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve quote');
      }

      // Trigger celebration
      setShowCelebration(true);
      triggerCelebration();

      setTimeout(() => {
        setApproved(true);
        setApprovalDate(result.data.approvedAt);
        setShowCelebration(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to approve quote');
    } finally {
      setApproving(false);
    }
  };

  // Send client question to contractor
  const handleSendQuestion = async () => {
    if (!clientQuestion.trim() || sendingQuestion) return;

    try {
      setSendingQuestion(true);
      const response = await fetch(`/api/public/quote/${token}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: clientQuestion.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send question');
      }

      setQuestionSent(true);
      setClientQuestion('');
      // Reset after showing success
      setTimeout(() => setQuestionSent(false), 5000);
    } catch (err: any) {
      console.error('Failed to send question:', err);
      // Show error but don't throw - questions are optional
    } finally {
      setSendingQuestion(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Scroll to approval section
  const scrollToApproval = () => {
    approvalSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Get total from quote if available
  const quoteTotal = data?.project?.promptConfig?.quote?.total || 0;
  const depositAmount = quoteTotal * 0.5;
  const lineItems = data?.project?.promptConfig?.quote?.lineItems || [];
  const lineItemCount = lineItems.length;

  // Calculate days until expiry
  const getDaysUntilExpiry = () => {
    if (!data?.project.quoteExpiresAt) return null;
    const expires = new Date(data.project.quoteExpiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };
  const daysUntilExpiry = getDaysUntilExpiry();

  // Build video props from quote data
  const buildVideoProps = (): QuoteVideoProps | null => {
    if (!data) return null;
    const quoteConfig = data.project.promptConfig?.quote || {};
    const lineItems = quoteConfig.lineItems || [];

    return {
      companyName: data.company.name,
      companyLogo: data.company.logo || undefined,
      clientName: data.client?.name || 'Valued Customer',
      projectName: data.project.name,
      beforeImage: data.project.originalImageUrl || undefined,
      afterImage: data.project.generatedImageUrl || undefined,
      lineItems: lineItems.map((item: any) => ({
        name: item.name || item.type || 'Item',
        quantity: item.quantity || 1,
        unitPrice: item.price || 0,
        total: (item.price || 0) * (item.quantity || 1),
      })),
      subtotal: quoteConfig.subtotal || quoteTotal,
      tax: quoteConfig.tax || 0,
      total: quoteTotal,
      approvalUrl: window.location.href,
      expiresAt: data.project.quoteExpiresAt || undefined,
    };
  };

  const videoProps = buildVideoProps();

  // Loading State - Premium Skeleton
  if (loading) {
    return <QuotePageSkeleton />;
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-b from-red-500/10 to-transparent border border-red-500/20 rounded-2xl p-8 max-w-md text-center backdrop-blur-xl"
        >
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white font-serif mb-2">Unable to Load Quote</h1>
          <p className="text-gray-400">{typeof error === 'string' ? error : 'An error occurred'}</p>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const { project, client, company } = data;
  const isExpired = project.quoteExpiresAt && new Date(project.quoteExpiresAt) < new Date();
  const canApprove = signature && termsAccepted && !approved && !isExpired;

  return (
    <div className="min-h-screen bg-[#050505] py-8 px-4 sm:px-6 lg:px-8">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(246, 180, 90, 0.05) 0%, transparent 50%)' }} />
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30"
              >
                <CheckCircle2 className="w-12 h-12 text-white" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-white font-serif mb-2"
              >
                Quote Approved!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-gray-400"
              >
                Thank you for choosing {company.name}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Premium Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className="h-16 md:h-20 max-w-[200px] mx-auto mb-6 object-contain"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F6B45A] to-[#E09A3A] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#F6B45A]/20">
              <span className="text-3xl font-bold text-black font-serif">
                {company.name?.charAt(0) || 'C'}
              </span>
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white font-serif mb-3">
            {company.name}
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#F6B45A]/50" />
            <p className="text-[#F6B45A]/80 text-xs font-semibold tracking-[0.2em] uppercase">
              Landscape Lighting Quote
            </p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#F6B45A]/50" />
          </div>

          {/* View Mode Toggle */}
          {videoProps && !approved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-2 mt-6"
            >
              <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
                <motion.button
                  onClick={() => setViewMode('document')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'document'
                      ? 'bg-[#F6B45A] text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <DocumentIcon className="w-4 h-4" />
                  Document
                </motion.button>
                <motion.button
                  onClick={() => setViewMode('video')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'video'
                      ? 'bg-[#F6B45A] text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play className="w-4 h-4" />
                  Video
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Progress Stepper - Shows approval journey */}
        {!approved && !isExpired && viewMode === 'document' && (
          <QuoteProgressStepper
            hasSignature={!!signature}
            termsAccepted={termsAccepted}
            isApproved={approved}
          />
        )}

        {/* Quick Summary Card - Shows key info at a glance */}
        {!approved && viewMode === 'document' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            {/* Total */}
            <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] rounded-2xl p-4 text-center border border-white/10 hover:border-[#F6B45A]/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#F6B45A]/10 flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-5 h-5 text-[#F6B45A]" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-white font-mono">{formatCurrency(quoteTotal)}</p>
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mt-1">Total</p>
            </div>

            {/* Items */}
            <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] rounded-2xl p-4 text-center border border-white/10 hover:border-[#F6B45A]/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#F6B45A]/10 flex items-center justify-center mx-auto mb-2">
                <Package className="w-5 h-5 text-[#F6B45A]" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-white">{lineItemCount}</p>
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mt-1">{lineItemCount === 1 ? 'Item' : 'Items'}</p>
            </div>

            {/* Days Left / Status */}
            <div className={`bg-gradient-to-b from-white/[0.06] to-white/[0.02] rounded-2xl p-4 text-center border transition-colors ${
              isExpired ? 'border-red-500/30' : daysUntilExpiry !== null && daysUntilExpiry <= 3 ? 'border-amber-500/30' : 'border-white/10 hover:border-[#F6B45A]/20'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${
                isExpired ? 'bg-red-500/10' : daysUntilExpiry !== null && daysUntilExpiry <= 3 ? 'bg-amber-500/10' : 'bg-[#F6B45A]/10'
              }`}>
                <Clock className={`w-5 h-5 ${
                  isExpired ? 'text-red-400' : daysUntilExpiry !== null && daysUntilExpiry <= 3 ? 'text-amber-400' : 'text-[#F6B45A]'
                }`} />
              </div>
              {isExpired ? (
                <>
                  <p className="text-xl md:text-2xl font-bold text-red-400">Expired</p>
                  <p className="text-[10px] md:text-xs text-red-400/70 uppercase tracking-wider mt-1">Contact Us</p>
                </>
              ) : daysUntilExpiry !== null ? (
                <>
                  <p className={`text-xl md:text-2xl font-bold ${daysUntilExpiry <= 3 ? 'text-amber-400' : 'text-white'}`}>
                    {daysUntilExpiry}
                  </p>
                  <p className={`text-[10px] md:text-xs uppercase tracking-wider mt-1 ${daysUntilExpiry <= 3 ? 'text-amber-400/70' : 'text-gray-500'}`}>
                    {daysUntilExpiry === 1 ? 'Day Left' : 'Days Left'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl md:text-2xl font-bold text-emerald-400">Open</p>
                  <p className="text-[10px] md:text-xs text-emerald-400/70 uppercase tracking-wider mt-1">No Expiry</p>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Live Countdown Timer - Shows when quote has expiration */}
        {!approved && !isExpired && project.quoteExpiresAt && viewMode === 'document' && daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 p-5 bg-gradient-to-b from-white/[0.06] to-white/[0.02] rounded-2xl border border-white/10"
          >
            <ExpirationCountdown expiresAt={project.quoteExpiresAt} />
          </motion.div>
        )}

        {/* Video Player */}
        <AnimatePresence mode="wait">
          {viewMode === 'video' && videoProps && (
            <motion.div
              key="video"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <QuoteVideoPlayer
                quoteData={videoProps}
                className="shadow-2xl shadow-black/50"
                showControls
              />
              <p className="text-center text-gray-500 text-sm mt-4">
                Watch your personalized quote presentation, then switch to Document view to approve.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium Cover Section - Shows project image as hero */}
        {viewMode === 'document' && project.generatedImageUrl && (
          <div className="mb-8">
            <QuoteCoverSection
              companyName={company.name}
              companyLogo={company.logo}
              clientName={client?.name}
              projectName={project.name}
              quoteDate={project.createdAt}
              projectImage={project.generatedImageUrl}
              expiresAt={project.quoteExpiresAt}
            />
          </div>
        )}

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-b from-white/[0.08] to-[#111]/80 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50"
        >
          {/* Status Banner */}
          {approved ? (
            <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-emerald-500/20 border-b border-emerald-500/20 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-emerald-400 font-serif text-lg">Quote Approved</p>
                  <p className="text-sm text-emerald-300/70">
                    {approvalDate && `Approved on ${formatDate(approvalDate)}`}
                  </p>
                </div>
              </div>
            </div>
          ) : isExpired ? (
            <div className="bg-gradient-to-r from-red-500/20 via-red-500/10 to-red-500/20 border-b border-red-500/20 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl border border-red-500/30 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-red-400 font-serif text-lg">Quote Expired</p>
                  <p className="text-sm text-red-300/70">
                    Contact {company.name} for an updated quote
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-[#F6B45A]/10 via-[#F6B45A]/5 to-[#F6B45A]/10 border-b border-[#F6B45A]/20 px-6 py-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#F6B45A]/20 rounded-xl border border-[#F6B45A]/30 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#F6B45A]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#F6B45A] font-serif text-lg">Awaiting Your Approval</p>
                    {project.quoteExpiresAt && (
                      <p className="text-sm text-[#F6B45A]/70">
                        Valid until {formatDate(project.quoteExpiresAt)}
                      </p>
                    )}
                  </div>
                </div>
                {quoteTotal > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-bold text-white font-serif">{formatCurrency(quoteTotal)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project & Client Info */}
          <div className="p-6 md:p-8 border-b border-white/10">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-bold text-white font-serif mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#F6B45A]" />
                  Project Details
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400">Project Name</span>
                    <span className="text-white font-medium">{project.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400">Quote Date</span>
                    <span className="text-white">{formatDate(project.createdAt)}</span>
                  </div>
                  {project.quoteExpiresAt && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-400">Valid Until</span>
                      <span className="text-white">{formatDate(project.quoteExpiresAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {client && (
                <div>
                  <h2 className="text-lg font-bold text-white font-serif mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#F6B45A]" />
                    Prepared For
                  </h2>
                  <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                    <p className="text-white font-semibold text-lg mb-2">{client.name}</p>
                    {client.email && (
                      <p className="text-gray-400 text-sm flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {client.email}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Design Preview - Before/After or Single Image */}
          {project.generatedImageUrl && (
            <div className="p-6 md:p-8 border-b border-white/10">
              <h2 className="text-lg font-bold text-white font-serif mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F6B45A]" />
                Your Lighting Design
              </h2>

              {project.originalImageUrl ? (
                <BeforeAfterSlider
                  beforeImage={project.originalImageUrl}
                  afterImage={project.generatedImageUrl}
                  beforeLabel="Before"
                  afterLabel="With Lighting"
                />
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30">
                  <img
                    src={project.generatedImageUrl}
                    alt="Lighting Design Preview"
                    className="w-full h-auto object-cover"
                  />
                  {/* Corner Accents */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-[#F6B45A]/40 rounded-tl-sm" />
                    <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-[#F6B45A]/40 rounded-tr-sm" />
                    <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-[#F6B45A]/40 rounded-bl-sm" />
                    <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-[#F6B45A]/40 rounded-br-sm" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Pricing Table - Line Items */}
          {(() => {
            const quoteConfig = project.promptConfig?.quote || {};
            const lineItems = quoteConfig.lineItems || [];
            if (lineItems.length > 0) {
              const formattedItems = lineItems.map((item: any, index: number) => ({
                id: item.id || `item-${index}`,
                name: item.name || item.type || 'Item',
                type: item.fixtureType || item.category,
                description: item.description,
                quantity: item.quantity || 1,
                unitPrice: item.price || item.unitPrice || 0,
                total: (item.price || item.unitPrice || 0) * (item.quantity || 1),
              }));
              return (
                <div className="p-6 md:p-8 border-b border-white/10">
                  <h2 className="text-lg font-bold text-white font-serif mb-6 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#F6B45A]" />
                    Quote Details
                  </h2>
                  <InteractivePricingTable
                    lineItems={formattedItems}
                    subtotal={quoteConfig.subtotal || quoteTotal}
                    taxRate={quoteConfig.taxRate || 0}
                    taxAmount={quoteConfig.tax || 0}
                    discount={quoteConfig.discount || 0}
                    total={quoteTotal}
                    showAnimations={true}
                  />
                </div>
              );
            }
            return null;
          })()}

          {/* Warranty Badge */}
          <div className="px-6 md:px-8 py-4 border-b border-white/10 bg-gradient-to-r from-emerald-500/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-emerald-400">5-Year Warranty Included</p>
                <p className="text-xs text-gray-500">Parts and labor coverage on all installed fixtures</p>
              </div>
            </div>
          </div>

          {/* Approval Section - Only if not approved and not expired */}
          {!approved && !isExpired && (
            <div ref={approvalSectionRef} className="p-6 md:p-8 space-y-6">
              {/* Payment Options */}
              {quoteTotal > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#F6B45A]" />
                    Payment Option
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentOption('deposit')}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        paymentOption === 'deposit'
                          ? 'bg-[#F6B45A]/10 border-[#F6B45A]/40'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-semibold ${paymentOption === 'deposit' ? 'text-[#F6B45A]' : 'text-white'}`}>
                          50% Deposit
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentOption === 'deposit' ? 'border-[#F6B45A] bg-[#F6B45A]' : 'border-white/30'
                        }`}>
                          {paymentOption === 'deposit' && <Check className="w-3 h-3 text-black" />}
                        </div>
                      </div>
                      <p className="text-lg font-bold text-white">{formatCurrency(depositAmount)}</p>
                      <p className="text-xs text-gray-500">Balance due upon completion</p>
                    </button>

                    <button
                      onClick={() => setPaymentOption('full')}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        paymentOption === 'full'
                          ? 'bg-[#F6B45A]/10 border-[#F6B45A]/40'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-semibold ${paymentOption === 'full' ? 'text-[#F6B45A]' : 'text-white'}`}>
                          Pay in Full
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentOption === 'full' ? 'border-[#F6B45A] bg-[#F6B45A]' : 'border-white/30'
                        }`}>
                          {paymentOption === 'full' && <Check className="w-3 h-3 text-black" />}
                        </div>
                      </div>
                      <p className="text-lg font-bold text-white">{formatCurrency(quoteTotal)}</p>
                      <p className="text-xs text-gray-500">Complete payment now</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Client Question Box */}
              <div className="bg-white/[0.02] rounded-xl border border-white/10 p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#F6B45A]" />
                  Have a Question?
                </h3>
                {questionSent ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <p className="text-sm text-emerald-400">
                      Question sent! {company.name} will get back to you soon.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <textarea
                      value={clientQuestion}
                      onChange={(e) => setClientQuestion(e.target.value)}
                      placeholder="Ask about this quote before approving..."
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-[#F6B45A]/30 transition-colors"
                      rows={2}
                      maxLength={500}
                    />
                    <AnimatePresence>
                      {clientQuestion.trim() && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3"
                        >
                          <motion.button
                            onClick={handleSendQuestion}
                            disabled={sendingQuestion}
                            className="flex items-center gap-2 px-4 py-2 bg-[#F6B45A]/10 border border-[#F6B45A]/30 rounded-lg text-[#F6B45A] text-sm font-medium hover:bg-[#F6B45A]/20 transition-colors disabled:opacity-50"
                            whileHover={sendingQuestion ? {} : { scale: 1.02 }}
                            whileTap={sendingQuestion ? {} : { scale: 0.98 }}
                          >
                            {sendingQuestion ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                Send Question
                              </>
                            )}
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>

              {/* Terms Acceptance */}
              <div className="bg-white/[0.02] rounded-xl border border-white/10 p-4">
                <button
                  onClick={() => setShowTerms(!showTerms)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setTermsAccepted(!termsAccepted);
                      }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                        termsAccepted
                          ? 'bg-[#F6B45A] border-[#F6B45A]'
                          : 'border-white/30 hover:border-white/50'
                      }`}
                    >
                      {termsAccepted && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-sm text-white">
                      I accept the <span className="text-[#F6B45A]">terms and conditions</span>
                    </span>
                  </div>
                  {showTerms ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                <AnimatePresence>
                  {showTerms && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-400 space-y-2 max-h-40 overflow-y-auto">
                        <p>By approving this quote, you agree to the following terms:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Work will be scheduled within 2-4 weeks of approval, weather permitting.</li>
                          <li>A {paymentOption === 'deposit' ? '50% deposit is required' : 'full payment is due'} upon approval.</li>
                          <li>Final payment is due upon project completion.</li>
                          <li>All fixtures include a 5-year manufacturer warranty.</li>
                          <li>Changes to the approved design may result in additional charges.</li>
                          <li>Cancellations within 48 hours of scheduled work may incur fees.</li>
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Digital Signature */}
              <SignatureCapture
                onSignatureChange={setSignature}
                disabled={!termsAccepted}
              />

              {/* Approve Button */}
              <motion.button
                onClick={handleApprove}
                disabled={!canApprove || approving}
                className={`w-full relative overflow-hidden py-4 px-6 rounded-xl text-lg font-bold transition-all ${
                  canApprove
                    ? 'bg-gradient-to-r from-[#F6B45A] to-[#E09A3A] text-black shadow-lg shadow-[#F6B45A]/20 hover:shadow-xl hover:shadow-[#F6B45A]/30'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                }`}
                whileHover={canApprove ? { scale: 1.01 } : {}}
                whileTap={canApprove ? { scale: 0.99 } : {}}
              >
                {approving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing Approval...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    Approve Quote {quoteTotal > 0 && `(${formatCurrency(paymentOption === 'deposit' ? depositAmount : quoteTotal)} due)`}
                  </span>
                )}
                {canApprove && !approving && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '200%' }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </motion.button>

              {!canApprove && !approving && (
                <p className="text-center text-xs text-gray-500">
                  {!termsAccepted && !signature && 'Accept terms and sign above to approve'}
                  {!termsAccepted && signature && 'Accept the terms and conditions to continue'}
                  {termsAccepted && !signature && 'Add your signature above to approve'}
                </p>
              )}
            </div>
          )}

          {/* Approved Message */}
          {approved && (
            <div className="p-6 md:p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-serif mb-2">Thank You!</h3>
              <p className="text-gray-400 mb-4">
                Your approval has been received. {company.name} will be in touch shortly to schedule your installation.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                Expect a call within 1-2 business days
              </div>
            </div>
          )}

          {/* Expired Message */}
          {isExpired && !approved && (
            <div className="p-6 md:p-8 text-center">
              <p className="text-gray-400">
                This quote has expired. Contact{' '}
                <a href={`mailto:${company.email}`} className="text-[#F6B45A] hover:underline">
                  {company.email}
                </a>{' '}
                for an updated quote.
              </p>
            </div>
          )}

          {/* Company Contact */}
          <div className="p-6 md:p-8 bg-white/[0.02] border-t border-white/10">
            <h2 className="text-lg font-bold text-white font-serif mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#F6B45A]" />
              Questions? Contact Us
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <a
                href={`mailto:${company.email}`}
                className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-[#F6B45A]/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#F6B45A]/10 transition-colors">
                  <Mail className="w-5 h-5 text-gray-400 group-hover:text-[#F6B45A]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-white">{company.email}</p>
                </div>
              </a>
              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-[#F6B45A]/30 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#F6B45A]/10 transition-colors">
                    <Phone className="w-5 h-5 text-gray-400 group-hover:text-[#F6B45A]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-white">{company.phone}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-gray-600 text-xs mt-8 pb-20 md:pb-0"
        >
          Powered by Omnia LightScape
        </motion.p>
      </div>

      {/* Floating Approve CTA - Mobile Only */}
      <AnimatePresence>
        {showFloatingCTA && !approved && !isExpired && viewMode === 'document' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-black/95 backdrop-blur-xl border-t border-white/10 z-50 md:hidden safe-area-pb"
          >
            <div className="flex items-center justify-between gap-4 max-w-xl mx-auto">
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-lg truncate">{formatCurrency(quoteTotal)}</p>
                <p className="text-xs text-gray-400">
                  {termsAccepted && signature ? 'Ready to approve' : 'Review & sign to approve'}
                </p>
              </div>
              <motion.button
                onClick={scrollToApproval}
                className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-[#F6B45A] to-[#E09A3A] rounded-xl font-bold text-black shadow-lg shadow-[#F6B45A]/25"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {termsAccepted && signature ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Approve
                  </span>
                ) : (
                  'Approve Now'
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicQuoteView;
