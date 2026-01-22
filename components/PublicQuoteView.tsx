import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, MapPin, User, Mail, Phone, Building2, FileText, Loader2, AlertCircle, Check, XCircle } from 'lucide-react';

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

export const PublicQuoteView: React.FC<PublicQuoteViewProps> = ({ token }) => {
  const [data, setData] = useState<PublicQuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approvalDate, setApprovalDate] = useState<string | null>(null);

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

  const handleApprove = async () => {
    try {
      setApproving(true);
      const response = await fetch(`/api/public/quote/${token}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve quote');
      }

      setApproved(true);
      setApprovalDate(result.data.approvedAt);
    } catch (err: any) {
      setError(err.message || 'Failed to approve quote');
    } finally {
      setApproving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading quote...</p>
        </motion.div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md text-center"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Unable to Load Quote</h1>
          <p className="text-gray-400">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const { project, client, company } = data;
  const isExpired = project.quoteExpiresAt && new Date(project.quoteExpiresAt) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8 px-4 sm:px-6 lg:px-8">
      {/* Background Glow */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[600px] bg-amber-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[40%] h-[500px] bg-amber-500/3 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 mb-2">
            {company.name}
          </h1>
          <p className="text-gray-400">Landscape Lighting Quote</p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-b from-white/[0.08] to-gray-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
        >
          {/* Status Banner */}
          {approved ? (
            <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-b border-emerald-500/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-400">Quote Approved</p>
                  <p className="text-sm text-emerald-300/70">
                    {approvalDate && `Approved on ${formatDate(approvalDate)}`}
                  </p>
                </div>
              </div>
            </div>
          ) : isExpired ? (
            <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border-b border-red-500/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-red-400">Quote Expired</p>
                  <p className="text-sm text-red-300/70">
                    Please contact {company.name} for an updated quote
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-b border-amber-500/20 px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-400">Awaiting Approval</p>
                    {project.quoteExpiresAt && (
                      <p className="text-sm text-amber-300/70">
                        Valid until {formatDate(project.quoteExpiresAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project Info */}
          <div className="p-6 border-b border-white/10">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Project Details */}
              <div>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" />
                  Project Details
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Project Name</p>
                    <p className="text-white font-medium">{project.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Quote Date</p>
                    <p className="text-white">{formatDate(project.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Client Details */}
              {client && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-500" />
                    Client Details
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Name</p>
                      <p className="text-white font-medium">{client.name}</p>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span>{client.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Design Preview */}
          {project.generatedImageUrl && (
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Your Lighting Design
              </h2>
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30">
                <img
                  src={project.generatedImageUrl}
                  alt="Lighting Design Preview"
                  className="w-full h-auto object-cover"
                />
                {/* Corner Accents */}
                <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-amber-500/50" />
                <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-amber-500/50" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-amber-500/50" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-amber-500/50" />
              </div>
            </div>
          )}

          {/* Company Contact */}
          <div className="p-6 border-b border-white/10 bg-white/[0.02]">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              Contact Us
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="w-4 h-4 text-gray-500" />
                <a href={`mailto:${company.email}`} className="hover:text-amber-400 transition-colors">
                  {company.email}
                </a>
              </div>
              {company.phone && (
                <div className="flex items-center gap-3 text-gray-300">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <a href={`tel:${company.phone}`} className="hover:text-amber-400 transition-colors">
                    {company.phone}
                  </a>
                </div>
              )}
              {company.address && (
                <div className="flex items-start gap-3 text-gray-300">
                  <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                  <span className="whitespace-pre-line">{company.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Approval Action */}
          {!approved && !isExpired && (
            <div className="p-6">
              <motion.button
                onClick={handleApprove}
                disabled={approving}
                className="w-full relative overflow-hidden bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-4 px-6 rounded-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                whileHover={!approving ? { scale: 1.01 } : {}}
                whileTap={!approving ? { scale: 0.99 } : {}}
              >
                {approving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Approving...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    Approve This Quote
                  </span>
                )}
                {!approving && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '200%' }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </motion.button>
              <p className="text-center text-sm text-gray-500 mt-4">
                By approving, you agree to proceed with this lighting project
              </p>
            </div>
          )}

          {/* Already Approved Message */}
          {approved && (
            <div className="p-6 text-center">
              <p className="text-emerald-400 font-medium mb-2">Thank you for your approval!</p>
              <p className="text-gray-400 text-sm">
                {company.name} will be in touch to schedule your installation.
              </p>
            </div>
          )}

          {/* Expired Message */}
          {isExpired && !approved && (
            <div className="p-6 text-center">
              <p className="text-gray-400">
                Contact{' '}
                <a href={`mailto:${company.email}`} className="text-amber-400 hover:underline">
                  {company.email}
                </a>{' '}
                to get an updated quote.
              </p>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-gray-600 text-xs mt-8"
        >
          Powered by Omnia LightScape
        </motion.p>
      </div>
    </div>
  );
};

export default PublicQuoteView;
