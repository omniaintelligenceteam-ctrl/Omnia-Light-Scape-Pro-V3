import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  ExternalLink,
  LogOut,
  Home,
  ImageIcon as GalleryIcon,
  GitBranch,
  MessageCircle,
  Folder,
  Sparkles,
  ArrowRight,
  Star
} from 'lucide-react';
import { ClientPortalLogin } from './ClientPortalLogin';
import { ProjectGallery, ProjectPhoto } from './portal/ProjectGallery';
import { ProjectTimeline, ProjectData } from './portal/ProjectTimeline';
import { ClientCommunicationHub, Message } from './portal/ClientCommunicationHub';
import { DocumentLibrary, ClientDocument } from './portal/DocumentLibrary';

interface PortalProject {
  id: string;
  name: string;
  status: string;
  imageUrl: string | null;
  createdAt: string;
  totalPrice: number | null;
  quote: {
    sentAt: string | null;
    approvedAt: string | null;
    token: string | null;
  };
  invoice: {
    sentAt: string | null;
    paidAt: string | null;
    token: string | null;
  };
}

interface PortalSession {
  token: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  companyName: string;
  companyLogo: string | null;
}

interface PortalData {
  projects: PortalProject[];
  photos: ProjectPhoto[];
  documents: ClientDocument[];
  messages: Message[];
  unreadMessageCount: number;
  summary: {
    totalProjects: number;
    pendingQuotes: number;
    approvedProjects: number;
    pendingInvoices: number;
    paidInvoices: number;
  };
}

interface ClientPortalProps {
  initialToken?: string | null;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ initialToken }) => {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'quotes' | 'invoices'>('all');
  const [portalView, setPortalView] = useState<'overview' | 'gallery' | 'timeline' | 'messages' | 'documents'>('overview');

  // Check for existing session or validate token
  useEffect(() => {
    async function initSession() {
      // Check localStorage for existing session
      const savedSession = localStorage.getItem('clientPortalSession');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (new Date(parsed.expires) > new Date()) {
            setSession(parsed);
            await loadData(parsed.clientId, parsed.token);
            return;
          } else {
            localStorage.removeItem('clientPortalSession');
          }
        } catch {
          localStorage.removeItem('clientPortalSession');
        }
      }

      // If we have a token in URL, verify it
      if (initialToken) {
        await verifyToken(initialToken);
      } else {
        setLoading(false);
      }
    }

    initSession();
  }, [initialToken]);

  const verifyToken = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/client-portal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify access');
      }

      const newSession: PortalSession = {
        token,
        clientId: result.data.client.id,
        clientName: result.data.client.name,
        clientEmail: result.data.client.email,
        companyName: result.data.company.name,
        companyLogo: result.data.company.logo
      };

      // Save session
      localStorage.setItem('clientPortalSession', JSON.stringify({
        ...newSession,
        expires: result.data.sessionExpires
      }));

      setSession(newSession);

      // Clear token from URL
      window.history.replaceState({}, '', '/portal');

      await loadData(newSession.clientId, token);
    } catch (err: any) {
      setError(err.message || 'Failed to verify access');
      setLoading(false);
    }
  };

  const loadData = async (clientId: string, token: string) => {
    try {
      const response = await fetch(`/api/client-portal/data?clientId=${clientId}&token=${token}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load data');
      }

      setData(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clientPortalSession');
    setSession(null);
    setData(null);
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Show login if no session
  if (!session && !loading) {
    return <ClientPortalLogin />;
  }

  // Get first name from full name
  const firstName = useMemo(() => {
    if (!session?.clientName) return '';
    return session.clientName.split(' ')[0];
  }, [session?.clientName]);

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F6B45A] to-[#E09F45] blur-xl opacity-40 animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F6B45A]/20 to-[#E09F45]/20 border border-[#F6B45A]/30 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-[#F6B45A] animate-spin" />
            </div>
          </div>
          <p className="text-gray-400 font-medium">Loading your portal...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-gradient-to-b from-[#111] to-[#0a0a0a] rounded-2xl border border-red-500/20 p-8 text-center shadow-2xl"
        >
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl" />
            <div className="relative w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white mb-3">Access Error</h2>
          <p className="text-gray-400 mb-6">{typeof error === 'string' ? error : 'An error occurred'}</p>
          <motion.button
            onClick={() => {
              setError(null);
              setSession(null);
            }}
            className="px-8 py-3 bg-gradient-to-r from-[#F6B45A] to-[#E09F45] text-black font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[#F6B45A]/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Try Again
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Filter projects based on active tab
  const filteredProjects = data?.projects.filter(project => {
    if (activeTab === 'quotes') return project.quote.sentAt && !project.quote.approvedAt;
    if (activeTab === 'invoices') return project.invoice.sentAt && !project.invoice.paidAt;
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(246, 180, 90, 0.05) 0%, transparent 50%)' }}></div>
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {session?.companyLogo ? (
              <motion.img
                src={session.companyLogo}
                alt={session.companyName}
                className="h-10 md:h-12 max-w-[140px] object-contain"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            ) : (
              <motion.div
                className="relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#F6B45A] to-[#E09A3A] blur-md opacity-50" />
                <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#F6B45A] to-[#E09A3A] flex items-center justify-center shadow-lg">
                  <span className="text-black font-bold text-lg">
                    {session?.companyName?.charAt(0) || 'C'}
                  </span>
                </div>
              </motion.div>
            )}
            <div>
              <h1 className="text-xl font-serif font-bold text-white">{session?.companyName}</h1>
              <div className="flex items-center gap-2">
                <div className="h-px w-4 bg-gradient-to-r from-[#F6B45A]/50 to-transparent" />
                <p className="text-xs text-[#F6B45A]/80 uppercase tracking-wider font-medium">Client Portal</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-gray-500">{greeting}</p>
              <p className="text-white font-semibold">{firstName}</p>
            </div>
            <motion.button
              onClick={handleLogout}
              className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"
              title="Sign Out"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Personalized Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#111] via-[#0f0f0f] to-[#0a0a0a] border border-white/5 p-6 md:p-8">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F6B45A]/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F6B45A]/3 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />

            {/* Premium corner accents */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[#F6B45A]/20 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[#F6B45A]/20 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[#F6B45A]/20 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[#F6B45A]/20 rounded-br-lg" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-[#F6B45A]" />
                  <span className="text-xs text-[#F6B45A]/80 uppercase tracking-wider font-semibold">Welcome Back</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">
                  {greeting}, {firstName}!
                </h2>
                <p className="text-gray-400 max-w-lg">
                  {data?.summary.pendingQuotes ? (
                    <>You have <span className="text-[#F6B45A] font-semibold">{data.summary.pendingQuotes} quote{data.summary.pendingQuotes > 1 ? 's' : ''}</span> awaiting your review.</>
                  ) : data?.summary.pendingInvoices ? (
                    <>You have <span className="text-blue-400 font-semibold">{data.summary.pendingInvoices} invoice{data.summary.pendingInvoices > 1 ? 's' : ''}</span> pending payment.</>
                  ) : (
                    <>Thank you for choosing {session?.companyName}. We're here to illuminate your world.</>
                  )}
                </p>
              </div>

              {/* Quick Action Buttons */}
              {(data?.summary.pendingQuotes || 0) > 0 || (data?.summary.pendingInvoices || 0) > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {(data?.summary.pendingQuotes || 0) > 0 && (
                    <motion.button
                      onClick={() => setActiveTab('quotes')}
                      className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FileText className="w-4 h-4" />
                      Review Quotes
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  )}
                  {(data?.summary.pendingInvoices || 0) > 0 && (
                    <motion.button
                      onClick={() => setActiveTab('invoices')}
                      className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Receipt className="w-4 h-4" />
                      Pay Invoices
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <motion.button
              onClick={() => setPortalView('overview')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                portalView === 'overview'
                  ? 'bg-gradient-to-r from-[#F6B45A] to-[#E09F45] text-black shadow-lg shadow-[#F6B45A]/20'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Home className="w-4 h-4" />
              Overview
            </motion.button>
            <motion.button
              onClick={() => setPortalView('gallery')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                portalView === 'gallery'
                  ? 'bg-gradient-to-r from-[#F6B45A] to-[#E09F45] text-black shadow-lg shadow-[#F6B45A]/20'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <GalleryIcon className="w-4 h-4" />
              Gallery
            </motion.button>
            <motion.button
              onClick={() => setPortalView('timeline')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                portalView === 'timeline'
                  ? 'bg-gradient-to-r from-[#F6B45A] to-[#E09F45] text-black shadow-lg shadow-[#F6B45A]/20'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <GitBranch className="w-4 h-4" />
              Timeline
            </motion.button>
            <motion.button
              onClick={() => setPortalView('messages')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap relative ${
                portalView === 'messages'
                  ? 'bg-gradient-to-r from-[#F6B45A] to-[#E09F45] text-black shadow-lg shadow-[#F6B45A]/20'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <MessageCircle className="w-4 h-4" />
              Messages
              {data && data.unreadMessageCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg"
                >
                  {data.unreadMessageCount}
                </motion.span>
              )}
            </motion.button>
            <motion.button
              onClick={() => setPortalView('documents')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                portalView === 'documents'
                  ? 'bg-gradient-to-r from-[#F6B45A] to-[#E09F45] text-black shadow-lg shadow-[#F6B45A]/20'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Folder className="w-4 h-4" />
              Documents
            </motion.button>
          </div>
        </div>

        {/* Overview Tab */}
        {portalView === 'overview' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative bg-gradient-to-b from-[#111] to-[#0a0a0a] rounded-2xl border border-white/5 p-5 overflow-hidden hover:border-[#F6B45A]/20 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#F6B45A]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-[#F6B45A]/10 border border-[#F6B45A]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5 text-[#F6B45A]" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{data?.summary.totalProjects || 0}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Projects</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="group relative bg-gradient-to-b from-[#111] to-[#0a0a0a] rounded-2xl border border-white/5 p-5 overflow-hidden hover:border-purple-500/20 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{data?.summary.pendingQuotes || 0}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Pending Quotes</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group relative bg-gradient-to-b from-[#111] to-[#0a0a0a] rounded-2xl border border-white/5 p-5 overflow-hidden hover:border-blue-500/20 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Receipt className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{data?.summary.pendingInvoices || 0}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Pending Invoices</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="group relative bg-gradient-to-b from-[#111] to-[#0a0a0a] rounded-2xl border border-white/5 p-5 overflow-hidden hover:border-emerald-500/20 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{data?.summary.approvedProjects || 0}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Approved</p>
                </div>
              </motion.div>
            </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-[#0a0a0a] p-1.5 rounded-xl border border-white/5 w-fit backdrop-blur-sm">
          <motion.button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-[#F6B45A] to-[#E09F45] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            All Projects
          </motion.button>
          <motion.button
            onClick={() => setActiveTab('quotes')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'quotes'
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileText className="w-4 h-4" />
            Pending Quotes
            {(data?.summary.pendingQuotes || 0) > 0 && (
              <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold">{data?.summary.pendingQuotes}</span>
            )}
          </motion.button>
          <motion.button
            onClick={() => setActiveTab('invoices')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Receipt className="w-4 h-4" />
            Pending Invoices
            {(data?.summary.pendingInvoices || 0) > 0 && (
              <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold">{data?.summary.pendingInvoices}</span>
            )}
          </motion.button>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-2xl bg-white/5 blur-lg" />
              <div className="relative w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-gray-600" />
              </div>
            </div>
            <p className="text-gray-400 text-lg">
              {activeTab === 'quotes' && 'No pending quotes'}
              {activeTab === 'invoices' && 'No pending invoices'}
              {activeTab === 'all' && 'No projects yet'}
            </p>
            <p className="text-gray-600 text-sm mt-2">Your projects will appear here</p>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-gradient-to-b from-[#111] to-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all duration-300"
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#F6B45A]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  {/* Project Image */}
                  <div className="aspect-video bg-[#080808] relative overflow-hidden">
                    {project.imageUrl ? (
                      <img
                        src={project.imageUrl}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] to-[#050505]">
                        <ImageIcon className="w-12 h-12 text-gray-800" />
                      </div>
                    )}

                    {/* Premium vignette overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {project.invoice.paidAt ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="px-3 py-1.5 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-500/30"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Paid
                        </motion.span>
                      ) : project.quote.approvedAt ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="px-3 py-1.5 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg shadow-blue-500/30"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approved
                        </motion.span>
                      ) : project.quote.sentAt ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="px-3 py-1.5 bg-purple-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg shadow-purple-500/30"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Quote Pending
                        </motion.span>
                      ) : null}
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="p-5 relative">
                    <h3 className="font-serif font-bold text-lg text-white mb-1.5 group-hover:text-[#F6B45A] transition-colors">{project.name}</h3>
                    <p className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(project.createdAt)}
                    </p>

                    {project.totalPrice && (
                      <div className="mb-5">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Project Total</p>
                        <p className="text-2xl font-bold text-[#F6B45A] flex items-center">
                          {formatCurrency(project.totalPrice)}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {project.quote.token && !project.quote.approvedAt && (
                        <motion.a
                          href={`/p/quote/${project.quote.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-bold rounded-xl hover:from-purple-500 hover:to-purple-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <FileText className="w-4 h-4" />
                          View Quote
                          <ExternalLink className="w-3.5 h-3.5" />
                        </motion.a>
                      )}
                      {project.invoice.token && !project.invoice.paidAt && (
                        <motion.a
                          href={`/p/invoice/${project.invoice.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-bold rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Receipt className="w-4 h-4" />
                          Pay Invoice
                          <ExternalLink className="w-3.5 h-3.5" />
                        </motion.a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
          </>
        )}

        {/* Gallery Tab */}
        {portalView === 'gallery' && data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#F6B45A]/10 border border-[#F6B45A]/20 flex items-center justify-center">
                <GalleryIcon className="w-5 h-5 text-[#F6B45A]" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-white">Project Gallery</h2>
            </div>
            {data.projects.length > 0 ? (
              <div className="space-y-8">
                {data.projects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-b from-[#111] to-[#0a0a0a] rounded-2xl border border-white/5 p-6 hover:border-white/10 transition-all"
                  >
                    <h3 className="text-lg font-serif font-bold text-white mb-4">{project.name}</h3>
                    <ProjectGallery photos={data.photos} projectId={project.id} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <GalleryIcon className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500">No projects yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Timeline Tab */}
        {portalView === 'timeline' && data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#F6B45A]/10 border border-[#F6B45A]/20 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-[#F6B45A]" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-white">Project Timeline</h2>
            </div>
            {data.projects.length > 0 ? (
              <div className="space-y-6">
                {data.projects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-b from-[#111] to-[#0a0a0a] rounded-2xl border border-white/5 p-6 hover:border-white/10 transition-all"
                  >
                    <h3 className="text-lg font-serif font-bold text-white mb-6">{project.name}</h3>
                    <ProjectTimeline project={project as unknown as ProjectData} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <GitBranch className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500">No projects yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Messages Tab */}
        {portalView === 'messages' && data && session && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#F6B45A]/10 border border-[#F6B45A]/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[#F6B45A]" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-white">Messages</h2>
            </div>
            <ClientCommunicationHub
              messages={data.messages}
              clientName={session.clientName}
              token={session.token}
              onSendMessage={async (messageText: string) => {
                const response = await fetch('/api/client-portal/messages/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token: session.token,
                    messageText,
                    senderName: session.clientName
                  })
                });
                if (response.ok && session) {
                  // Refresh data to show new message
                  loadData(session.clientId, session.token);
                }
              }}
              onMarkRead={(messageIds: string[]) => {
                fetch('/api/client-portal/messages/mark-read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token: session.token,
                    messageIds
                  })
                });
              }}
            />
          </motion.div>
        )}

        {/* Documents Tab */}
        {portalView === 'documents' && data && session && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#F6B45A]/10 border border-[#F6B45A]/20 flex items-center justify-center">
                <Folder className="w-5 h-5 text-[#F6B45A]" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-white">Documents</h2>
            </div>
            <DocumentLibrary
              documents={data.documents}
              onDownload={async (documentId: string) => {
                const response = await fetch(`/api/client-portal/documents/download?token=${session.token}&documentId=${documentId}`);
                if (response.ok) {
                  const result = await response.json();
                  // Open download URL in new tab
                  window.open(result.data.url, '_blank');
                }
              }}
            />
          </motion.div>
        )}
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-white/5 mt-16 py-8 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#F6B45A]/5 to-transparent opacity-50 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F6B45A]/20 to-[#E09F45]/10 border border-[#F6B45A]/20 flex items-center justify-center">
                <Star className="w-4 h-4 text-[#F6B45A]" />
              </div>
              <p className="text-sm text-gray-500">
                Powered by <span className="text-gray-400 font-medium">Omnia LightScape</span>
              </p>
            </div>
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
