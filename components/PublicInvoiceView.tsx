import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, MapPin, User, Mail, Phone, Building2, FileText, XCircle, DollarSign, Clock, Share2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { InvoiceStatusHero, getInvoiceStatus, PaymentSection } from './invoice';
import { InvoicePageSkeleton } from './shared/PremiumSkeleton';

// Celebration confetti burst (blue theme for invoices)
const triggerCelebration = () => {
  const duration = 3000;
  const colors = ['#3B82F6', '#60A5FA', '#93C5FD', '#10B981', '#34D399', '#FFFFFF'];

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

interface InvoiceProject {
  id: string;
  name: string;
  generatedImageUrl: string | null;
  originalImageUrl: string | null;
  promptConfig: any;
  invoiceExpiresAt: string | null;
  invoiceSentAt: string | null;
  invoicePaidAt: string | null;
  createdAt: string;
}

interface InvoiceClient {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface InvoiceCompany {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  logo: string | null;
}

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceDataDetails {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  notes: string | null;
}

interface PublicInvoiceData {
  project: InvoiceProject;
  invoiceData: InvoiceDataDetails | null;
  client: InvoiceClient | null;
  company: InvoiceCompany;
  paid: boolean;
  canAcceptPayment: boolean;
}

interface PublicInvoiceViewProps {
  token: string;
}

export const PublicInvoiceView: React.FC<PublicInvoiceViewProps> = ({ token }) => {
  const [data, setData] = useState<PublicInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const celebrationTriggered = useRef(false);

  // Check for payment success/cancel query params and trigger celebration
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paid') === 'true') {
      setPaymentSuccess(true);
      // Trigger celebration only once
      if (!celebrationTriggered.current) {
        celebrationTriggered.current = true;
        setShowCelebration(true);
        triggerCelebration();
        setTimeout(() => setShowCelebration(false), 2500);
      }
    }
  }, []);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/invoice/${token}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load invoice');
        }

        setData(result.data);
        if (result.data.paid) {
          setPaymentSuccess(true);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();
  }, [token]);

  const handlePay = async () => {
    try {
      setPaying(true);
      const response = await fetch(`/api/public/invoice/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate payment');
      }

      // Redirect to Stripe Checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
      setPaying(false);
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

  // Share invoice handler
  const handleShare = async () => {
    const shareData = {
      title: `Invoice from ${data?.company.name || 'Company'}`,
      text: `Invoice ${data?.invoiceData?.invoiceNumber || ''} - ${formatCurrency(data?.invoiceData?.total || 0)}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch (err) {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Loading State - Premium Skeleton
  if (loading) {
    return <InvoicePageSkeleton />;
  }

  // Error State
  if (error && !data) {
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
          <h1 className="text-xl font-bold text-white mb-2">Unable to Load Invoice</h1>
          <p className="text-gray-400">{typeof error === 'string' ? error : 'An error occurred'}</p>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const { project, invoiceData, client, company, canAcceptPayment } = data;
  const isExpired = project.invoiceExpiresAt && new Date(project.invoiceExpiresAt) < new Date();
  const isPaid = paymentSuccess || data.paid;

  // Get invoice total from invoice data or fall back to quote data
  const invoiceTotal = invoiceData?.total || project.promptConfig?.quote?.total || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8 px-4 sm:px-6 lg:px-8">
      {/* Background Glow - Blue theme for invoices */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[600px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[40%] h-[500px] bg-blue-500/3 blur-[120px] rounded-full pointer-events-none" />

      {/* Payment Success Celebration Overlay */}
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
                Payment Successful!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-gray-400"
              >
                Thank you for your payment
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className="h-16 md:h-20 max-w-[200px] mx-auto mb-4 object-contain"
            />
          ) : null}
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 mb-2">
            {company.name}
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-500/50" />
            <p className="text-blue-500/80 text-sm font-medium tracking-wider uppercase">Invoice</p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-blue-500/50" />
          </div>

          {/* Share Button */}
          <motion.button
            onClick={handleShare}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              linkCopied
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            {linkCopied ? (
              <>
                <Check className="w-4 h-4" />
                <span className="text-sm">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Share Invoice</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Premium Invoice Status Hero */}
        <div className="mb-8">
          <InvoiceStatusHero
            status={getInvoiceStatus(invoiceData?.dueDate || project.invoiceExpiresAt || null, isPaid)}
            amount={invoiceTotal}
            dueDate={invoiceData?.dueDate || project.invoiceExpiresAt}
            onPay={handlePay}
            isPaying={paying}
            canPay={canAcceptPayment && !isExpired && invoiceTotal > 0}
            paidDate={project.invoicePaidAt}
            invoiceNumber={invoiceData?.invoiceNumber || `INV-${project.id.slice(0, 8).toUpperCase()}`}
          />
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-b from-white/[0.08] to-gray-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
        >
          {/* Status Banner */}
          {isPaid ? (
            <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-b border-emerald-500/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-400">Payment Received</p>
                  <p className="text-sm text-emerald-300/70">
                    {project.invoicePaidAt
                      ? `Paid on ${formatDate(project.invoicePaidAt)}`
                      : 'Thank you for your payment!'}
                  </p>
                </div>
              </div>
            </div>
          ) : isExpired ? (
            <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border-b border-red-500/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-red-400">Invoice Expired</p>
                  <p className="text-sm text-red-300/70">
                    Please contact {company.name} for an updated invoice
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-b border-blue-500/20 px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-400">Payment Due</p>
                    {project.invoiceExpiresAt && (
                      <p className="text-sm text-blue-300/70">
                        Due by {formatDate(project.invoiceExpiresAt)}
                      </p>
                    )}
                  </div>
                </div>
                {invoiceTotal > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Amount Due</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(invoiceTotal)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invoice Details */}
          <div className="p-6 border-b border-white/10">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Invoice Info */}
              <div>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Invoice Details
                </h2>
                <div className="space-y-3">
                  {invoiceData?.invoiceNumber && (
                    <div>
                      <p className="text-sm text-gray-400">Invoice Number</p>
                      <p className="text-white font-medium">{invoiceData.invoiceNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-400">Project</p>
                    <p className="text-white font-medium">{project.name}</p>
                  </div>
                  {invoiceData?.invoiceDate && (
                    <div>
                      <p className="text-sm text-gray-400">Invoice Date</p>
                      <p className="text-white">{formatDate(invoiceData.invoiceDate)}</p>
                    </div>
                  )}
                  {invoiceData?.dueDate && (
                    <div>
                      <p className="text-sm text-gray-400">Due Date</p>
                      <p className="text-white">{formatDate(invoiceData.dueDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Client Details */}
              {client && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    Bill To
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
                    {client.phone && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start gap-2 text-gray-300">
                        <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                        <span className="whitespace-pre-line">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          {invoiceData?.lineItems && invoiceData.lineItems.length > 0 && (
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-500" />
                Invoice Items
              </h2>
              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3">
                {invoiceData.lineItems.map((item) => (
                  <div key={item.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="font-medium text-white mb-3">{item.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Qty</p>
                        <p className="text-gray-300">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Unit Price</p>
                        <p className="text-gray-300">{formatCurrency(item.unitPrice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-xs mb-1">Total</p>
                        <p className="font-medium text-white">{formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                      <th className="pb-3 font-medium">Description</th>
                      <th className="pb-3 font-medium text-center">Qty</th>
                      <th className="pb-3 font-medium text-right">Unit Price</th>
                      <th className="pb-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {invoiceData.lineItems.map((item) => (
                      <tr key={item.id} className="text-white">
                        <td className="py-3">{item.description}</td>
                        <td className="py-3 text-center text-gray-300">{item.quantity}</td>
                        <td className="py-3 text-right text-gray-300">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoiceData.subtotal)}</span>
                </div>
                {invoiceData.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span>-{formatCurrency(invoiceData.discount)}</span>
                  </div>
                )}
                {invoiceData.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-300">
                    <span>Tax ({(invoiceData.taxRate * 100).toFixed(1)}%)</span>
                    <span>{formatCurrency(invoiceData.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-white/10">
                  <span>Total Due</span>
                  <span className="text-blue-400">{formatCurrency(invoiceData.total)}</span>
                </div>
              </div>

              {/* Notes */}
              {invoiceData.notes && (
                <div className="mt-6 p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Notes</p>
                  <p className="text-gray-300 whitespace-pre-line">{invoiceData.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Invoice Amount Summary (fallback if no line items) */}
          {(!invoiceData?.lineItems || invoiceData.lineItems.length === 0) && invoiceTotal > 0 && (
            <div className="p-6 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-lg font-bold text-white">Total Amount</span>
                </div>
                <span className="text-2xl font-bold text-blue-400">{formatCurrency(invoiceTotal)}</span>
              </div>
            </div>
          )}

          {/* Design Preview */}
          {project.generatedImageUrl && (
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Project Design
              </h2>
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30">
                <img
                  src={project.generatedImageUrl}
                  alt="Project Design"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          )}

          {/* Company Contact */}
          <div className="p-6 border-b border-white/10 bg-white/[0.02]">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Contact Us
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="w-4 h-4 text-gray-500" />
                <a href={`mailto:${company.email}`} className="hover:text-blue-400 transition-colors">
                  {company.email}
                </a>
              </div>
              {company.phone && (
                <div className="flex items-center gap-3 text-gray-300">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <a href={`tel:${company.phone}`} className="hover:text-blue-400 transition-colors">
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

          {/* Payment Section */}
          {!isExpired && invoiceTotal > 0 && canAcceptPayment && (
            <div className="p-6">
              <PaymentSection
                amount={invoiceTotal}
                onPay={handlePay}
                isPaying={paying}
                isPaid={isPaid}
                companyEmail={company.email}
                companyPhone={company.phone}
              />
            </div>
          )}

          {/* Contact for Payment (when online payment not available) */}
          {!isPaid && !isExpired && invoiceTotal > 0 && !canAcceptPayment && (
            <div className="p-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                <p className="text-blue-300 mb-2">To pay this invoice, please contact:</p>
                <a
                  href={`mailto:${company.email}?subject=Payment for ${invoiceData?.invoiceNumber || project.name}`}
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
                >
                  <Mail className="w-4 h-4" />
                  {company.email}
                </a>
                {company.phone && (
                  <p className="mt-2">
                    <a href={`tel:${company.phone}`} className="text-blue-400 hover:text-blue-300">
                      {company.phone}
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Expired Message */}
          {isExpired && !isPaid && (
            <div className="p-6 text-center">
              <p className="text-gray-400">
                Contact{' '}
                <a href={`mailto:${company.email}`} className="text-blue-400 hover:underline">
                  {company.email}
                </a>{' '}
                to get an updated invoice.
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

export default PublicInvoiceView;
