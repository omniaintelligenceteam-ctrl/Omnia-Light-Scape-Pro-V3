import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
  DollarSign,
  Image as ImageIcon,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { ClientPortalLogin } from './ClientPortalLogin';

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#F6B45A] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your portal...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111] rounded-2xl border border-red-500/20 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Access Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setSession(null);
            }}
            className="px-6 py-2 bg-[#F6B45A] text-black font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
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
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {session?.companyLogo ? (
              <img
                src={session.companyLogo}
                alt={session.companyName}
                className="h-10 md:h-12 max-w-[140px] object-contain"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F6B45A] to-[#E09A3A] flex items-center justify-center">
                <span className="text-black font-bold text-lg">
                  {session?.companyName?.charAt(0) || 'C'}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{session?.companyName}</h1>
              <p className="text-xs text-[#F6B45A]/80 uppercase tracking-wider font-medium">Client Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-gray-400">Welcome back</p>
              <p className="text-white font-medium">{session?.clientName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#111] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#F6B45A]/20 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-[#F6B45A]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{data?.summary.totalProjects || 0}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Projects</p>
          </div>

          <div className="bg-[#111] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{data?.summary.pendingQuotes || 0}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Pending Quotes</p>
          </div>

          <div className="bg-[#111] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{data?.summary.pendingInvoices || 0}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Pending Invoices</p>
          </div>

          <div className="bg-[#111] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{data?.summary.approvedProjects || 0}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Approved</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-[#111] p-1.5 rounded-xl border border-white/5 w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-[#F6B45A] text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'quotes'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            Pending Quotes
            {(data?.summary.pendingQuotes || 0) > 0 && (
              <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{data?.summary.pendingQuotes}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Pending Invoices
            {(data?.summary.pendingInvoices || 0) > 0 && (
              <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{data?.summary.pendingInvoices}</span>
            )}
          </button>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400">
              {activeTab === 'quotes' && 'No pending quotes'}
              {activeTab === 'invoices' && 'No pending invoices'}
              {activeTab === 'all' && 'No projects yet'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden group"
                >
                  {/* Project Image */}
                  <div className="aspect-video bg-[#0a0a0a] relative overflow-hidden">
                    {project.imageUrl ? (
                      <img
                        src={project.imageUrl}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-700" />
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {project.invoice.paidAt ? (
                        <span className="px-2 py-1 bg-emerald-500/90 text-white text-xs font-bold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Paid
                        </span>
                      ) : project.quote.approvedAt ? (
                        <span className="px-2 py-1 bg-blue-500/90 text-white text-xs font-bold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      ) : project.quote.sentAt ? (
                        <span className="px-2 py-1 bg-purple-500/90 text-white text-xs font-bold rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Quote Pending
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-white mb-1">{project.name}</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatDate(project.createdAt)}
                    </p>

                    {project.totalPrice && (
                      <p className="text-lg font-bold text-[#F6B45A] mb-4 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatCurrency(project.totalPrice)}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {project.quote.token && !project.quote.approvedAt && (
                        <a
                          href={`/p/quote/${project.quote.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 bg-purple-500 text-white text-sm font-bold rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          View Quote
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {project.invoice.token && !project.invoice.paidAt && (
                        <a
                          href={`/p/invoice/${project.invoice.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 bg-blue-500 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Receipt className="w-4 h-4" />
                          Pay Invoice
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-6 text-center text-xs text-gray-600">
        Powered by Omnia LightScape
      </footer>
    </div>
  );
};
