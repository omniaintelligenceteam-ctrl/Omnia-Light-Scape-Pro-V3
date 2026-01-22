import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, MapPin, User, Mail, Phone, Building2, FileText, Loader2, CreditCard, XCircle, DollarSign, Clock, ExternalLink } from 'lucide-react';

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

  // Check for payment success/cancel query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paid') === 'true') {
      setPaymentSuccess(true);
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
    }).format(amount);
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
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading invoice...</p>
        </motion.div>
      </div>
    );
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
          <p className="text-gray-400">{error}</p>
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

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 mb-2">
            {company.name}
          </h1>
          <p className="text-gray-400">Invoice</p>
        </motion.div>

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
              <div className="overflow-x-auto">
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

          {/* Payment Action */}
          {!isPaid && !isExpired && invoiceTotal > 0 && canAcceptPayment && (
            <div className="p-6">
              <motion.button
                onClick={handlePay}
                disabled={paying}
                className="w-full relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                whileHover={!paying ? { scale: 1.01 } : {}}
                whileTap={!paying ? { scale: 0.99 } : {}}
              >
                {paying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Redirecting to payment...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Pay {formatCurrency(invoiceTotal)}
                  </span>
                )}
                {!paying && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '200%' }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </motion.button>
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                <ExternalLink className="w-4 h-4" />
                <span>Secure payment powered by Stripe</span>
              </div>
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

          {/* Already Paid Message */}
          {isPaid && (
            <div className="p-6 text-center">
              <p className="text-emerald-400 font-medium mb-2">Thank you for your payment!</p>
              <p className="text-gray-400 text-sm">
                A confirmation has been sent to your email.
              </p>
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
