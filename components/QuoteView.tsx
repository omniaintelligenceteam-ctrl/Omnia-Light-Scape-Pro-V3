import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Download, Calendar, User, MapPin, Plus, Trash2, Percent, Save, Phone, Tag, FileText, Loader2, ClipboardList, Send, X, MessageSquare, Check, Sparkles, DollarSign, Receipt, Building2, Hash, Pencil, Upload, Share2, Link2, Copy, ExternalLink, ChevronDown } from 'lucide-react';
import { DEFAULT_PRICING } from '../constants';
import { LineItem, QuoteData, CompanyProfile, FixturePricing } from '../types';
import { uploadImage } from '../services/uploadService';

interface QuoteViewProps {
    onSave: (data: QuoteData) => void;
    onGenerateBOM?: (data: QuoteData) => void;
    onClose?: () => void;
    onEditDesign?: () => void;
    onDeleteProject?: () => void;
    initialData?: QuoteData | null;
    companyProfile?: CompanyProfile;
    defaultPricing?: FixturePricing[];
    containerId?: string;
    hideToolbar?: boolean;
    projectImage?: string | null;
    userId?: string;
    projectId?: string;
    internalNotes?: string;
    onInternalNotesChange?: (notes: string) => void;
}

export const QuoteView: React.FC<QuoteViewProps> = ({
    onSave,
    onGenerateBOM,
    onClose,
    onEditDesign,
    onDeleteProject,
    initialData,
    companyProfile = { name: 'Omnia Light Scape Pro', email: '', address: '123 Landscape Lane\nDesign District, CA 90210', logo: null },
    defaultPricing = DEFAULT_PRICING,
    containerId = "quote-content",
    hideToolbar = false,
    projectImage = null,
    userId,
    projectId,
    internalNotes = '',
    onInternalNotesChange
}) => {
  // Helper to find pricing by type
  const getPrice = (type: string) => defaultPricing.find(p => p.fixtureType === type) || DEFAULT_PRICING.find(p => p.fixtureType === type)!;

  // Line Items State - use initialData if provided, otherwise empty array (no defaults)
  // This ensures only items selected in the editor appear on the quote
  const [lineItems, setLineItems] = useState<LineItem[]>(initialData?.lineItems || []);

  const [taxRate, setTaxRate] = useState<number>(initialData?.taxRate ?? 0.07);
  const [discount, setDiscount] = useState<number>(initialData?.discount || 0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Send Quote Modal State
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendMethod, setSendMethod] = useState<'email' | 'sms'>('email');
  const [customMessage, setCustomMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Share Portal Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Add Item Dropdown State
  const [showAddItemDropdown, setShowAddItemDropdown] = useState(false);

  // Client Details State (Controlled) - empty defaults
  const [clientName, setClientName] = useState(initialData?.clientDetails.name || "");
  const [clientEmail, setClientEmail] = useState(initialData?.clientDetails.email || "");
  const [clientPhone, setClientPhone] = useState(initialData?.clientDetails.phone || "");
  const [projectAddress, setProjectAddress] = useState(initialData?.clientDetails.address || "");

  const handleUpdateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const handleAddItem = (fixture?: FixturePricing) => {
    const newItem: LineItem = fixture ? {
      id: `${fixture.fixtureType}_${Date.now()}`,
      name: fixture.name,
      description: fixture.description,
      quantity: 1,
      unitPrice: fixture.unitPrice
    } : {
      id: `custom_${Date.now()}`,
      name: "New Custom Item",
      description: "Description of services...",
      quantity: 1,
      unitPrice: 0.00
    };
    setLineItems([...lineItems, newItem]);
    setShowAddItemDropdown(false);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newItems);
  };

  const subtotal = lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  // Calculate taxable amount (subtotal - discount), ensuring it doesn't go below zero
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = taxableAmount * taxRate;
  const total = taxableAmount + tax;

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleSaveClick = () => {
      const data: QuoteData = {
          lineItems,
          taxRate,
          discount,
          clientDetails: {
              name: clientName,
              email: clientEmail,
              phone: clientPhone,
              address: projectAddress
          },
          total
      };
      onSave(data);
  };

  const handleGenerateBOMClick = () => {
      if (!onGenerateBOM) return;
      const data: QuoteData = {
          lineItems,
          taxRate,
          discount,
          clientDetails: {
              name: clientName,
              email: clientEmail,
              phone: clientPhone,
              address: projectAddress
          },
          total
      };
      onGenerateBOM(data);
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById(containerId);
    if (!element) return;

    setIsGeneratingPdf(true);

    // Apply specific class to container to force "Light Mode" styles defined in index.html
    element.classList.add('pdf-mode');

    const opt = {
        margin: [0.3, 0.3, 0.3, 0.3], // top, left, bottom, right in inches
        filename: `Omnia_Quote_${clientName.replace(/[^a-z0-9]/gi, '_').substring(0, 20)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
        // html2pdf is loaded via CDN in index.html, so we access it via window
        if ((window as any).html2pdf) {
            await (window as any).html2pdf().set(opt).from(element).save();
        } else {
            console.error("html2pdf library not loaded");
            alert("PDF generation library not loaded. Please refresh.");
        }
    } catch (e) {
        console.error("PDF Generation failed:", e);
        alert("Failed to generate PDF. Please try again.");
    } finally {
        element.classList.remove('pdf-mode');
        setIsGeneratingPdf(false);
    }
  };

  // Generate quote summary text for SMS/Email
  const generateQuoteSummary = () => {
    const itemsList = lineItems
      .filter(item => item.quantity > 0)
      .map(item => `• ${item.name} (${item.quantity}x) - $${(item.unitPrice * item.quantity).toFixed(2)}`)
      .join('\n');

    return `Quote for ${clientName}

Project: ${projectAddress.split('\n')[0]}

${itemsList}

Subtotal: $${subtotal.toFixed(2)}
${discount > 0 ? `Discount: -$${discount.toFixed(2)}\n` : ''}Tax (${(taxRate * 100).toFixed(1)}%): $${tax.toFixed(2)}
TOTAL: $${total.toFixed(2)}

${customMessage ? `\n${customMessage}\n` : ''}
- ${companyProfile.name}`;
  };

  const handleSendEmail = async () => {
    if (!clientEmail) return;

    setIsSendingEmail(true);
    setEmailError(null);
    setEmailSent(false);

    try {
      // Prepare image URL - upload if it's a base64 data URL
      let imageUrl: string | undefined;

      if (projectImage) {
        if (projectImage.startsWith('http')) {
          // Already a URL, use directly
          imageUrl = projectImage;
        } else if (projectImage.startsWith('data:') && userId) {
          // It's a base64 data URL - upload it first so it can be included in the email
          try {
            console.log('Uploading image for email...');
            imageUrl = await uploadImage(projectImage, userId);
            console.log('Image uploaded for email:', imageUrl);
          } catch (uploadErr) {
            console.warn('Failed to upload image for email, sending without image:', uploadErr);
            // Continue without image rather than failing the whole email
          }
        }
      }

      // Generate approve link if project is saved
      let approveLink: string | undefined;
      if (projectId && userId) {
        try {
          const shareResponse = await fetch(`/api/projects/${projectId}/share?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'quote', expiresInDays: 30 })
          });
          const shareData = await shareResponse.json();
          if (shareResponse.ok && shareData.data?.shareUrl) {
            approveLink = shareData.data.shareUrl;
          }
        } catch (err) {
          console.warn('Failed to generate approve link, sending without it:', err);
        }
      }

      const response = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail,
          clientName,
          projectName: projectAddress.split('\n')[0] || 'Lighting Project',
          companyName: companyProfile.name,
          companyEmail: companyProfile.email,
          companyPhone: companyProfile.phone,
          companyAddress: companyProfile.address,
          companyLogo: companyProfile.logo,
          lineItems: lineItems.filter(item => item.quantity > 0).map(item => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice
          })),
          subtotal,
          taxRate,
          taxAmount: tax,
          discount,
          total,
          projectImageUrl: imageUrl,
          customMessage: customMessage || undefined,
          approveLink
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Show more detailed error message
        let errorMsg = data.message || data.error || 'Failed to send email';
        if (data.details) {
          errorMsg += ` - ${data.details}`;
        }
        throw new Error(errorMsg);
      }

      setEmailSent(true);
      setTimeout(() => {
        setShowSendModal(false);
        setEmailSent(false);
        setCustomMessage('');
      }, 2000);
    } catch (err: any) {
      console.error('Error sending email:', err);
      setEmailError(err.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendSMS = () => {
    // Clean phone number for SMS
    const cleanPhone = clientPhone.replace(/[^\d+]/g, '');
    const message = encodeURIComponent(generateQuoteSummary());
    // Use sms: protocol - works on mobile devices
    const smsLink = `sms:${cleanPhone}?body=${message}`;
    window.open(smsLink, '_blank');
    setShowSendModal(false);
  };

  // Generate shareable client portal link
  const handleGenerateShareLink = async () => {
    if (!projectId || !userId) {
      setShareError('Unable to generate link. Project must be saved first.');
      return;
    }

    setIsGeneratingLink(true);
    setShareError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/share?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'quote', expiresInDays: 30 })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate share link');
      }

      setShareUrl(data.data.shareUrl);
    } catch (err: any) {
      console.error('Error generating share link:', err);
      setShareError(err.message || 'Failed to generate share link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleOpenShareModal = () => {
    setShowShareModal(true);
    setShareUrl(null);
    setShareError(null);
    setLinkCopied(false);
    // Auto-generate link when modal opens
    if (projectId && userId) {
      handleGenerateShareLink();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] px-3 py-4 md:p-8 pb-24 md:pb-8 overflow-y-auto overflow-x-hidden relative scroll-smooth [-webkit-overflow-scrolling:touch]">
      {/* Background Ambient Glow - hidden on mobile for performance */}
      <div className="hidden md:block absolute top-[-10%] right-[-10%] w-[50%] h-[500px] bg-[#F6B45A]/5 blur-[120px] rounded-full pointer-events-none print:hidden ambient-glow"></div>
      <div className="hidden md:block absolute bottom-[-10%] left-[-10%] w-[40%] h-[400px] bg-[#F6B45A]/3 blur-[100px] rounded-full pointer-events-none print:hidden"></div>

      <div className="max-w-4xl mx-auto w-full space-y-3 md:space-y-6 relative z-10">

        {/* Premium Toolbar */}
        {!hideToolbar && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-b from-white/[0.08] to-[#111]/95 backdrop-blur-xl p-3 md:p-5 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] print:hidden sticky top-0 z-20 overflow-hidden"
            >
                {/* Top gradient line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F6B45A]/40 to-transparent" />

                {/* Desktop Layout */}
                <div className="hidden md:flex items-center justify-between gap-3">
                    {/* Save & Delete Buttons */}
                    <div className="flex items-center gap-2">
                        <motion.button
                            onClick={handleSaveClick}
                            className="relative overflow-hidden bg-gradient-to-r from-[#F6B45A] to-[#ffc67a] text-[#111] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_4px_20px_rgba(246,180,90,0.3)]"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Save className="w-4 h-4" />
                            Save
                        </motion.button>

                        {/* Delete Project Button */}
                        {onDeleteProject && (
                            <motion.button
                                onClick={() => setShowDeleteConfirmModal(true)}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-red-500/20 hover:border-red-500/40 transition-all"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                title="Delete Project"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </motion.button>
                        )}
                    </div>

                    {/* Action Buttons Group */}
                    <div className="flex items-center gap-1.5">
                        {/* Edit Design Button */}
                        {onEditDesign && (
                            <motion.button
                                onClick={onEditDesign}
                                className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white p-2 rounded-lg transition-all border border-white/10 hover:border-white/20"
                                whileTap={{ scale: 0.95 }}
                                title="Edit Design"
                            >
                                <Pencil className="w-4 h-4" />
                            </motion.button>
                        )}

                        {/* BOM Button */}
                        {onGenerateBOM && (
                            <motion.button
                                onClick={handleGenerateBOMClick}
                                className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white p-2 rounded-lg transition-all border border-white/10 hover:border-white/20"
                                whileTap={{ scale: 0.95 }}
                                title="Generate BOM"
                            >
                                <ClipboardList className="w-4 h-4" />
                            </motion.button>
                        )}

                        {/* Send Quote Button */}
                        <motion.button
                            onClick={() => setShowSendModal(true)}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white p-2 rounded-lg transition-all border border-white/10 hover:border-white/20"
                            whileTap={{ scale: 0.95 }}
                            title="Send Quote"
                        >
                            <Send className="w-4 h-4" />
                        </motion.button>

                        {/* Share Portal Link Button */}
                        {projectId && (
                            <motion.button
                                onClick={handleOpenShareModal}
                                className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white p-2 rounded-lg transition-all border border-white/10 hover:border-white/20"
                                whileTap={{ scale: 0.95 }}
                                title="Share Link"
                            >
                                <Share2 className="w-4 h-4" />
                            </motion.button>
                        )}

                        {/* Download PDF Button */}
                        <motion.button
                            onClick={handleDownloadPdf}
                            disabled={isGeneratingPdf}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white p-2 rounded-lg transition-all border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileTap={!isGeneratingPdf ? { scale: 0.95 } : {}}
                            title="Download PDF"
                        >
                            {isGeneratingPdf ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                        </motion.button>
                    </div>

                    {/* Close Button */}
                    {onClose && (
                        <motion.button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white bg-white/5 hover:bg-red-500/20 p-2 rounded-lg transition-all border border-white/10 hover:border-red-500/30"
                            whileTap={{ scale: 0.95 }}
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </motion.button>
                    )}
                </div>

                {/* Mobile Layout - Clean compact row */}
                <div className="flex md:hidden items-center justify-between gap-1.5">
                    {/* Save & Delete Buttons */}
                    <div className="flex items-center gap-1">
                        <motion.button
                            onClick={handleSaveClick}
                            className="bg-gradient-to-r from-[#F6B45A] to-[#ffc67a] text-[#111] p-2 rounded-lg"
                            whileTap={{ scale: 0.95 }}
                            title="Save"
                        >
                            <Save className="w-4 h-4" />
                        </motion.button>

                        {/* Delete Project Button - Mobile */}
                        {onDeleteProject && (
                            <motion.button
                                onClick={() => setShowDeleteConfirmModal(true)}
                                className="bg-red-500/10 text-red-400 p-2 rounded-lg border border-red-500/20"
                                whileTap={{ scale: 0.95 }}
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </motion.button>
                        )}
                    </div>

                    {/* Icon Buttons Group */}
                    <div className="flex items-center gap-1">
                        {onEditDesign && (
                            <motion.button
                                onClick={onEditDesign}
                                className="bg-white/5 text-gray-300 p-2 rounded-lg border border-white/10"
                                whileTap={{ scale: 0.95 }}
                                title="Edit"
                            >
                                <Pencil className="w-4 h-4" />
                            </motion.button>
                        )}

                        {onGenerateBOM && (
                            <motion.button
                                onClick={handleGenerateBOMClick}
                                className="bg-white/5 text-gray-300 p-2 rounded-lg border border-white/10"
                                whileTap={{ scale: 0.95 }}
                                title="BOM"
                            >
                                <ClipboardList className="w-4 h-4" />
                            </motion.button>
                        )}

                        <motion.button
                            onClick={() => {
                                if (clientEmail) {
                                    handleSendEmail();
                                } else {
                                    setShowSendModal(true);
                                }
                            }}
                            disabled={isSendingEmail}
                            className={`p-2 rounded-lg border ${
                                emailSent
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : emailError
                                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}
                            whileTap={!isSendingEmail ? { scale: 0.95 } : {}}
                            title={emailSent ? "Sent!" : emailError ? "Failed - tap to retry" : "Send Quote"}
                        >
                            {isSendingEmail ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : emailSent ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Mail className="w-4 h-4" />
                            )}
                        </motion.button>

                        <motion.button
                            onClick={handleDownloadPdf}
                            disabled={isGeneratingPdf}
                            className="bg-white/5 text-gray-300 p-2 rounded-lg border border-white/10 disabled:opacity-50"
                            whileTap={!isGeneratingPdf ? { scale: 0.95 } : {}}
                            title="PDF"
                        >
                            {isGeneratingPdf ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                        </motion.button>
                    </div>

                    {/* Close Button */}
                    {onClose && (
                        <motion.button
                            onClick={onClose}
                            className="text-gray-400 bg-white/5 p-2 rounded-lg border border-white/10"
                            whileTap={{ scale: 0.95 }}
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </motion.button>
                    )}
                </div>
            </motion.div>
        )}

        {/* Paper Document / Digital Datapad */}
        <motion.div
            id={containerId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative bg-gradient-to-b from-[#111] to-[#0a0a0a] rounded-xl md:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/10 min-h-auto md:min-h-[1000px] p-3 md:p-12 overflow-hidden print:shadow-none print:border-none print:m-0 print:w-full print:bg-white print:text-black"
        >
          {/* Decorative corner accents - hidden on mobile */}
          <div className="hidden md:block absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[#F6B45A]/20 rounded-tl-lg print:hidden" />
          <div className="hidden md:block absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[#F6B45A]/20 rounded-tr-lg print:hidden" />
          <div className="hidden md:block absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[#F6B45A]/20 rounded-bl-lg print:hidden" />
          <div className="hidden md:block absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[#F6B45A]/20 rounded-br-lg print:hidden" />

          {/* Header - Compact on mobile */}
          <header className="mb-4 md:mb-12 border-b border-white/10 pb-4 md:pb-6 print:border-gray-200 relative">
             {/* Company Name - Smaller on mobile */}
             <div className="text-center mb-3 md:mb-6">
                <h1 className="text-xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F6B45A] to-[#ffd699] tracking-tight font-serif print:text-[#111]">
                     {companyProfile.name}
                </h1>
             </div>

             {/* Mobile: Compact stacked layout */}
             <div className="md:hidden space-y-3">
                {/* Client Info Row */}
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                    <User className="w-4 h-4 text-[#F6B45A] shrink-0" />
                    <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="flex-1 bg-transparent text-sm font-bold text-white placeholder-gray-500 focus:outline-none"
                        placeholder="Client Name"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                        <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <input
                            type="text"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-500 focus:outline-none min-w-0"
                            placeholder="Email"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                        <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <input
                            type="text"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-500 focus:outline-none min-w-0"
                            placeholder="Phone"
                        />
                    </div>
                </div>
                {/* Address Row */}
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                    <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <input
                        type="text"
                        className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-500 focus:outline-none min-w-0"
                        value={projectAddress}
                        onChange={(e) => setProjectAddress(e.target.value)}
                        placeholder="Address"
                    />
                </div>
                {/* Date */}
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#F6B45A]"/>
                        {today}
                    </span>
                    <span className="font-mono">QT-{String(Date.now()).slice(-8)}</span>
                </div>
             </div>

             {/* Desktop: Two Column Layout */}
             <div className="hidden md:flex flex-row justify-between gap-6">
                {/* Left Side - Quote For (Client Info) */}
                <div className="flex-1 max-w-[45%]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-[#F6B45A]/10 border border-[#F6B45A]/20">
                            <User className="w-4 h-4 text-[#F6B45A]" />
                        </div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-[0.15em] print:text-gray-800">Quote For</h3>
                    </div>

                    <div className="space-y-3 print:text-black">
                        <div className="group">
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="w-full bg-transparent border-b border-white/10 group-hover:border-[#F6B45A]/30 focus:border-[#F6B45A] p-2 text-lg font-bold text-white placeholder-gray-500 transition-colors print:text-black print:border-none print:p-0"
                                placeholder="Client Name"
                            />
                        </div>
                        <div className="flex items-center gap-3 text-gray-400 group">
                            <Mail className="w-4 h-4 shrink-0 group-hover:text-[#F6B45A] transition-colors print:text-gray-400" />
                            <input
                                type="text"
                                value={clientEmail}
                                onChange={(e) => setClientEmail(e.target.value)}
                                className="w-full bg-transparent border-b border-white/10 group-hover:border-[#F6B45A]/30 focus:border-[#F6B45A] p-1 text-sm text-gray-300 placeholder-gray-500 transition-colors print:text-black print:border-none print:p-0"
                                placeholder="Client Email"
                            />
                        </div>
                        <div className="flex items-center gap-3 text-gray-400 group">
                            <Phone className="w-4 h-4 shrink-0 group-hover:text-[#F6B45A] transition-colors print:text-gray-400" />
                            <input
                                type="text"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                className="w-full bg-transparent border-b border-white/10 group-hover:border-[#F6B45A]/30 focus:border-[#F6B45A] p-1 text-sm text-gray-300 placeholder-gray-500 transition-colors print:text-black print:border-none print:p-0"
                                placeholder="Cell Phone"
                            />
                        </div>
                        <div className="flex items-center gap-3 text-gray-400 group">
                            <MapPin className="w-4 h-4 shrink-0 group-hover:text-[#F6B45A] transition-colors print:text-gray-400" />
                            <input
                                type="text"
                                value={projectAddress}
                                onChange={(e) => setProjectAddress(e.target.value)}
                                className="w-full bg-transparent border-b border-white/10 group-hover:border-[#F6B45A]/30 focus:border-[#F6B45A] p-1 text-sm text-gray-300 placeholder-gray-500 transition-colors print:text-black print:border-none print:p-0"
                                placeholder="Address"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Side - Logo, Address, Date */}
                <div className="flex flex-col items-end text-right">
                    {/* Logo - Top Right, Bigger */}
                    {companyProfile.logo && (
                        <img src={companyProfile.logo} alt="Logo" className="h-28 w-28 object-contain mb-4" />
                    )}
                    {/* Address & Phone */}
                    <div className="text-sm text-gray-400 space-y-0.5 whitespace-pre-line print:text-gray-600 mb-3">
                        {companyProfile.address}
                        {companyProfile.phone && (
                          <div className="mt-1">{companyProfile.phone}</div>
                        )}
                    </div>
                    {/* Date */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F6B45A]/10 border border-[#F6B45A]/20">
                            <Calendar className="w-3.5 h-3.5 text-[#F6B45A]"/>
                            <span className="text-xs font-bold text-[#F6B45A] uppercase tracking-wider">Date</span>
                        </div>
                        <span className="text-sm font-medium text-white print:text-black">{today}</span>
                    </div>
                </div>
             </div>

             {/* Quote number badge - Desktop only */}
             <div className="hidden md:flex absolute top-0 right-0 items-center gap-2 px-4 py-2 rounded-bl-xl bg-white/5 border-l border-b border-white/10 print:hidden">
                 <Hash className="w-3 h-3 text-gray-500" />
                 <span className="text-[10px] font-mono text-gray-400">QT-{String(Date.now()).slice(-8)}</span>
             </div>
          </header>

          {/* Line Items Section Header */}
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <div className="p-1.5 md:p-2 rounded-lg bg-white/5 border border-white/10">
                  <Receipt className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
              </div>
              <h3 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-[0.15em]">Line Items</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          {/* Line Items - DESKTOP TABLE */}
          <div className="hidden md:block mb-8 bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white/5">
                        <th className="py-4 px-5 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 w-[50%] print:text-black">Description</th>
                        <th className="py-4 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 text-center w-[10%] print:text-black">Qty</th>
                        <th className="py-4 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 text-right w-[15%] print:text-black">Rate</th>
                        <th className="py-4 px-5 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 text-right w-[15%] print:text-black">Amount</th>
                        <th className="py-4 px-3 w-[5%] print:hidden"></th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                  <AnimatePresence mode="popLayout">
                    {lineItems.map((item, index) => (
                        <motion.tr
                            key={item.id || index}
                            layout
                            className="border-t border-white/5 group hover:bg-white/[0.03] transition-colors print:border-gray-200"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.03, type: "spring", stiffness: 400, damping: 30 }}
                        >
                            <td className="py-4 px-5 align-top">
                                <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                                    className="font-bold text-white mb-1 w-full bg-transparent border-none p-0 focus:ring-0 rounded print:text-black"
                                />
                                <textarea
                                    value={item.description}
                                    onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                                    className="text-gray-400 text-xs whitespace-pre-line leading-relaxed w-full bg-transparent border-none p-0 focus:ring-0 rounded resize-y min-h-[40px] font-mono print:text-gray-600"
                                    rows={2}
                                />
                            </td>
                            <td className="py-4 px-3 text-center align-top">
                                <input
                                    type="number"
                                    value={item.quantity}
                                    min="0"
                                    onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                    className="w-16 text-center font-bold text-[#F6B45A] bg-[#0a0a0a] border border-white/10 focus:border-[#F6B45A] rounded-lg p-2 transition-colors print:text-black print:bg-transparent print:border-none"
                                />
                            </td>
                            <td className="py-4 px-3 text-right align-top">
                                <div className="flex items-center justify-end gap-1">
                                    <span className="text-gray-500 text-xs">$</span>
                                    <input
                                        type="number"
                                        value={item.unitPrice}
                                        min="0"
                                        step="0.01"
                                        onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                        className="w-24 text-right font-bold text-white text-base bg-transparent border-none p-0 focus:ring-0 rounded print:text-black"
                                    />
                                </div>
                            </td>
                            <td className="py-4 px-5 text-right font-bold text-white text-base align-top pt-5 font-mono print:text-black">
                                ${(item.unitPrice * item.quantity).toFixed(2)}
                            </td>
                            <td className="py-4 px-3 text-right align-top print:hidden">
                                <motion.button
                                    onClick={() => handleRemoveItem(index)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </motion.button>
                            </td>
                        </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
            </table>
          </div>

          {/* Line Items - MOBILE CARDS - Compact */}
          <div className="md:hidden space-y-2 mb-4">
            <AnimatePresence mode="popLayout">
              {lineItems.map((item, index) => (
                  <motion.div
                      key={item.id || index}
                      layout
                      className="relative bg-white/[0.03] border border-white/10 rounded-xl p-3 overflow-hidden print:bg-transparent print:border-gray-200"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.02, type: "spring", stiffness: 400, damping: 30 }}
                  >
                    {/* Top row: Name + Delete */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                            className="font-bold text-white text-sm flex-1 bg-transparent border-none p-0 focus:ring-0 placeholder-gray-500 print:text-black"
                            placeholder="Item Name"
                        />
                        <motion.button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg print:hidden"
                            whileTap={{ scale: 0.9 }}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                    </div>

                    {/* Controls Row: Qty, Rate, Total */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5 border border-white/5">
                            <label className="text-[8px] font-bold uppercase text-gray-500">Qty</label>
                            <input
                                type="number"
                                value={item.quantity}
                                min="0"
                                onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-10 text-sm font-bold text-[#F6B45A] bg-transparent border-none p-0 focus:ring-0 text-center print:text-black"
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5 border border-white/5">
                            <label className="text-[8px] font-bold uppercase text-gray-500">$</label>
                            <input
                                type="number"
                                value={item.unitPrice}
                                step="0.01"
                                onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-14 text-sm font-bold text-white bg-transparent border-none p-0 focus:ring-0 print:text-black"
                            />
                        </div>
                        <div className="flex-1 text-right">
                            <span className="text-sm font-bold text-[#F6B45A] font-mono">
                                ${(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Line Items - MOBILE CARDS - Original (hidden, keeping for reference) */}
          <div className="hidden space-y-4 mb-8">
            {lineItems.map((item, index) => (
                <motion.div
                    key={index}
                    className="relative bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 rounded-2xl p-5 shadow-lg overflow-hidden print:bg-transparent print:border-gray-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    {/* Remove Button */}
                    <motion.button
                        onClick={() => handleRemoveItem(index)}
                        className="absolute top-3 right-3 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors print:hidden"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </motion.button>

                    {/* Name & Desc */}
                    <div className="pr-10 mb-4">
                        <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                            className="font-bold text-white text-lg mb-1 w-full bg-transparent border-none p-0 focus:ring-0 placeholder-gray-500 print:text-black"
                            placeholder="Item Name"
                        />
                        <textarea
                            value={item.description}
                            onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                            className="text-gray-400 text-xs w-full bg-transparent border-none p-0 focus:ring-0 resize-none min-h-[40px] font-mono print:text-gray-600"
                            rows={2}
                            placeholder="Description"
                        />
                    </div>

                    {/* Controls Grid */}
                    <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 print:bg-transparent print:border-gray-100">
                            <label className="text-[9px] font-bold uppercase text-gray-500 block mb-1">Qty</label>
                            <input
                                type="number"
                                value={item.quantity}
                                min="0"
                                onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full text-lg font-bold text-[#F6B45A] bg-transparent border-none p-0 focus:ring-0 print:text-black"
                            />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 print:bg-transparent print:border-gray-100">
                            <label className="text-[9px] font-bold uppercase text-gray-500 block mb-1">Rate</label>
                            <div className="flex items-center">
                                <span className="text-xs text-gray-500 mr-1">$</span>
                                <input
                                    type="number"
                                    value={item.unitPrice}
                                    step="0.01"
                                    onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    className="w-full text-lg font-bold text-white bg-transparent border-none p-0 focus:ring-0 print:text-black"
                                />
                            </div>
                        </div>
                        <div className="bg-[#F6B45A]/10 rounded-xl p-3 border border-[#F6B45A]/20 flex flex-col justify-center items-end print:bg-gray-100 print:border-gray-200">
                            <label className="text-[9px] font-bold uppercase text-[#F6B45A] block mb-0.5 print:text-gray-600">Total</label>
                            <span className="text-lg font-black text-white font-mono print:text-black">
                                ${(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </motion.div>
            ))}
          </div>

          {/* Add Item Button with Dropdown */}
          {!hideToolbar && (
            <div className="mb-4 md:mb-12 print:hidden relative">
                <motion.button
                    onClick={() => setShowAddItemDropdown(!showAddItemDropdown)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-wider text-[#F6B45A] hover:text-[#ffc67a] hover:bg-[#F6B45A]/10 px-4 md:px-8 py-2.5 md:py-4 rounded-lg md:rounded-xl border border-dashed border-[#F6B45A]/30 hover:border-[#F6B45A]/60 transition-all"
                    whileTap={{ scale: 0.99 }}
                >
                    <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    ADD ITEM
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAddItemDropdown ? 'rotate-180' : ''}`} />
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {showAddItemDropdown && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 md:left-auto md:right-auto mt-2 w-full md:w-80 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                            <div className="p-2 border-b border-white/10">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2">Select Fixture</span>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {defaultPricing.map((fixture) => (
                                    <button
                                        key={fixture.id}
                                        onClick={() => handleAddItem(fixture)}
                                        className="w-full px-4 py-3 text-left hover:bg-[#F6B45A]/10 transition-colors border-b border-white/5 last:border-b-0"
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{fixture.name.split(':')[0]}</p>
                                                <p className="text-xs text-gray-500 capitalize">{fixture.fixtureType.replace('coredrill', 'Core Drill')}</p>
                                            </div>
                                            <span className="text-sm font-bold text-[#F6B45A] shrink-0">${fixture.unitPrice}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="p-2 border-t border-white/10">
                                <button
                                    onClick={() => handleAddItem()}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-[#F6B45A] hover:bg-[#F6B45A]/10 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Custom Item
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          )}

          {/* Totals with Project Image */}
          <motion.div
              className="relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-3 md:p-8 rounded-xl md:rounded-2xl border border-white/10 mb-4 md:mb-16 overflow-hidden print:bg-transparent print:border-none print:p-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
          >
             {/* Decorative glow - hidden on mobile */}
             <div className="hidden md:block absolute top-0 right-0 w-32 h-32 bg-[#F6B45A]/10 rounded-full blur-3xl pointer-events-none print:hidden" />

             <div className="flex flex-col md:flex-row gap-3 md:gap-8 relative z-10">
                 {/* Project Image - DESKTOP ONLY (left side) */}
                 <div className="hidden md:block md:flex-[1.2]">
                     {projectImage ? (
                         <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30 print:border-gray-200">
                             <img
                                 src={projectImage}
                                 alt="Project Design"
                                 className="w-full h-auto object-cover"
                             />
                             {/* Tech corners */}
                             <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#F6B45A]/50 print:hidden" />
                             <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#F6B45A]/50 print:hidden" />
                             <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#F6B45A]/50 print:hidden" />
                             <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#F6B45A]/50 print:hidden" />
                         </div>
                     ) : (
                         <motion.div
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             className="flex h-full min-h-[280px] rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] flex-col items-center justify-center text-center p-6 print:hidden"
                         >
                             <motion.div
                                 animate={{ y: [0, -8, 0] }}
                                 transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                 className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 animate-empty-glow-pulse"
                             >
                                 <Sparkles className="w-6 h-6 text-gray-600" />
                             </motion.div>
                             <p className="text-sm text-gray-500 font-medium mb-1">No Image Available</p>
                             <p className="text-xs text-gray-600">Generate a design in the Editor tab</p>
                         </motion.div>
                     )}
                 </div>

                 {/* Totals Column - Compact on mobile */}
                 <div className="flex flex-col md:items-end gap-1 md:gap-3 md:flex-1">
                     <div className="w-full md:w-72 flex justify-between py-1.5 md:py-3 text-xs md:text-sm text-gray-300 print:text-gray-600">
                        <span>Subtotal</span>
                        <span className="font-bold text-sm md:text-lg text-white font-mono print:text-black">${subtotal.toFixed(2)}</span>
                     </div>

                     {/* Discount Row */}
                     <div className="w-full md:w-72 flex justify-between items-center py-1.5 md:py-3 text-xs md:text-sm text-gray-300 print:text-gray-600">
                        <span className="flex items-center gap-1 md:gap-2 text-white font-medium print:text-black">
                            <Tag className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                            Discount
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500 text-xs md:text-sm">-$</span>
                            <input
                                type="number"
                                value={discount}
                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                className="w-16 md:w-24 text-right bg-[#0a0a0a] border border-white/10 rounded-lg px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white focus:ring-0 focus:border-[#F6B45A] font-bold placeholder-gray-600 font-mono transition-colors print:bg-transparent print:border-gray-200 print:text-black"
                                min="0"
                                placeholder="0"
                            />
                        </div>
                     </div>

                     <div className="w-full md:w-72 flex justify-between items-center py-1.5 md:py-3 text-xs md:text-sm text-gray-300 border-b border-white/10 print:border-gray-200 print:text-gray-600">
                        <div className="flex items-center gap-1 md:gap-2">
                            <span>Tax Rate</span>
                            <div className="flex items-center bg-[#0a0a0a] rounded-lg px-2 py-1 md:px-3 md:py-2 border border-white/10 hover:border-[#F6B45A]/30 transition-colors print:bg-gray-50 print:border-none" title="Enter your state tax rate">
                                <input
                                    type="number"
                                    value={(taxRate * 100).toFixed(1)}
                                    onChange={(e) => setTaxRate((parseFloat(e.target.value) || 0) / 100)}
                                    className="w-10 md:w-14 text-right bg-transparent border-none p-0 text-xs md:text-sm focus:ring-0 font-medium text-white font-mono print:text-black"
                                    step="0.1"
                                    min="0"
                                    max="15"
                                    placeholder="7.0"
                                />
                                <Percent className="w-2.5 h-2.5 md:w-3 md:h-3 ml-0.5 md:ml-1 text-gray-500" />
                            </div>
                        </div>
                        <span className="font-bold text-sm md:text-lg text-white font-mono print:text-black">${tax.toFixed(2)}</span>
                     </div>

                     {/* Grand Total */}
                     <div className="w-full md:w-72 flex justify-between items-center py-2 md:py-4 mt-1 md:mt-2">
                        <span className="text-sm md:text-lg font-bold text-white print:text-black">Total</span>
                        <div className="relative">
                            <span className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F6B45A] to-[#ffd699] font-mono print:text-black">
                                ${total.toFixed(2)}
                            </span>
                            <div className="hidden md:block absolute -inset-2 bg-[#F6B45A]/20 blur-xl -z-10 print:hidden" />
                        </div>
                     </div>
                 </div>

                 {/* Project Image - MOBILE ONLY (below totals) */}
                 {projectImage && (
                     <div className="md:hidden mt-3">
                         <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/30">
                             <img
                                 src={projectImage}
                                 alt="Project Design"
                                 className="w-full h-auto object-cover"
                             />
                         </div>
                     </div>
                 )}
             </div>
          </motion.div>

          {/* Footer / Terms - Hidden on mobile for compactness */}
          <div className="hidden md:block mt-auto pt-8 border-t border-white/10 print:border-gray-200">
             <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                     <FileText className="w-4 h-4 text-gray-400" />
                 </div>
                 <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-white print:text-gray-800">Terms & Conditions</h4>
             </div>
             <textarea
                className="w-full text-xs text-gray-400 leading-relaxed max-w-2xl mb-12 border-none resize-none bg-transparent focus:bg-white/5 p-3 rounded-xl focus:ring-0 min-h-[100px] transition-colors print:text-gray-600"
                defaultValue="This estimate is valid for 30 days. A 50% deposit is required to schedule installation. The remaining balance is due upon completion of the project. Any changes to this scope of work must be approved in writing and may result in additional charges. Lifetime warranty on fixtures covers manufacturer defects; labor warranty is valid for 2 years from installation date."
             />

             <div className="flex flex-row justify-between items-end gap-12">
                <div className="flex-1">
                    <div className="border-b-2 border-white/20 pb-2 mb-2 print:border-gray-300" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest print:text-gray-400">Authorized Signature</p>
                </div>
                <div className="flex-1">
                     <div className="border-b-2 border-white/20 pb-2 mb-2 print:border-gray-300" />
                     <p className="text-[10px] text-gray-500 uppercase tracking-widest print:text-gray-400">Date</p>
                </div>
             </div>
          </div>

        </motion.div>
      </div>

      {/* Internal Notes Section - NEVER shared with clients */}
      {onInternalNotesChange && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-gradient-to-b from-amber-500/5 to-transparent border border-amber-500/20 rounded-xl md:rounded-2xl p-4 md:p-6 print:hidden"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <MessageSquare className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-400">Internal Notes</h4>
              <p className="text-[10px] text-amber-400/60 uppercase tracking-wider">Team only • Never shared with clients</p>
            </div>
          </div>
          <textarea
            value={internalNotes}
            onChange={(e) => onInternalNotesChange(e.target.value)}
            placeholder="Add internal notes about this project/client (e.g., site access details, client preferences, follow-up reminders)..."
            className="w-full bg-black/30 border border-amber-500/10 rounded-xl p-3 md:p-4 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-amber-500/30 resize-none min-h-[100px] md:min-h-[120px]"
            rows={4}
          />
          <p className="mt-2 text-[10px] text-gray-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
            These notes are private and will not appear in quotes, emails, PDFs, or the client portal.
          </p>
        </motion.div>
      )}

      {/* Send Quote Modal */}
      <AnimatePresence>
          {showSendModal && (
            <motion.div
                className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-8 pb-32 bg-black/80 backdrop-blur-sm overflow-y-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ paddingBottom: 'max(8rem, env(safe-area-inset-bottom, 2rem))' }}
            >
              <motion.div
                  className="w-full max-w-md bg-gradient-to-b from-[#151515] to-[#0a0a0a] rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden my-auto md:my-0"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
              >
                {/* Modal Header */}
                <div className="relative flex items-center justify-between p-5 border-b border-white/10">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F6B45A]/30 to-transparent" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#F6B45A]/10 rounded-xl border border-[#F6B45A]/20">
                      <Send className="w-5 h-5 text-[#F6B45A]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white font-serif">Send Quote</h3>
                        <p className="text-[10px] text-gray-500">Choose delivery method</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowSendModal(false)}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-5">
                  {/* Recipient Info */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <User className="w-4 h-4 text-[#F6B45A]" />
                      <span className="font-bold text-white">{clientName || 'No name set'}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3 text-gray-400">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{clientEmail || 'No email set'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-400">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{clientPhone || 'No phone set'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Send Method - Email Only */}
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Mail className="w-4 h-4 text-[#F6B45A]" />
                    <span>Quote will be sent via email</span>
                  </div>

                  {/* Custom Message */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Add a personal message (optional)</label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Thanks for choosing us! Let me know if you have any questions..."
                      className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-[#F6B45A]/50 focus:outline-none resize-none placeholder-gray-500 transition-colors"
                    />
                  </div>

                  {/* Quote Preview */}
                  <div className="bg-gradient-to-br from-[#F6B45A]/10 to-transparent rounded-xl p-4 border border-[#F6B45A]/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Quote Total</span>
                      <span className="text-xl font-bold text-[#F6B45A] font-mono">${total.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {lineItems.filter(i => i.quantity > 0).length} items
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-white/10 bg-black/30">
                  <motion.button
                    onClick={handleSendEmail}
                    disabled={!clientEmail || isSendingEmail || emailSent}
                    className={`relative w-full overflow-hidden py-4 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-lg ${
                      emailSent
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-[#F6B45A] to-[#ffc67a] text-black shadow-[#F6B45A]/20 disabled:opacity-50'
                    }`}
                    whileHover={!(!clientEmail || isSendingEmail || emailSent) ? { scale: 1.01 } : {}}
                    whileTap={!(!clientEmail || isSendingEmail || emailSent) ? { scale: 0.99 } : {}}
                  >
                    {emailSent ? (
                      <>
                        <Check className="w-4 h-4" />
                        Email Sent!
                      </>
                    ) : isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Quote
                      </>
                    )}
                    {!emailSent && !isSendingEmail && (
                      <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
                          initial={{ x: '-100%' }}
                          whileHover={{ x: '200%' }}
                          transition={{ duration: 0.6 }}
                      />
                    )}
                  </motion.button>
                  {!clientEmail && (
                    <p className="text-xs text-red-400 text-center mt-3">Please add a client email address first</p>
                  )}
                  {emailError && (
                    <p className="text-xs text-red-400 text-center mt-3">{emailError}</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Share Portal Modal */}
      <AnimatePresence>
          {showShareModal && (
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
              <motion.div
                  className="w-full max-w-md bg-gradient-to-b from-[#151515] to-[#0a0a0a] rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
              >
                {/* Modal Header */}
                <div className="relative flex items-center justify-between p-5 border-b border-white/10">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F6B45A]/30 to-transparent" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#F6B45A]/10 rounded-xl border border-[#F6B45A]/20">
                      <Share2 className="w-5 h-5 text-[#F6B45A]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white font-serif">Client Portal</h3>
                        <p className="text-[10px] text-gray-500">Share quote with client</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowShareModal(false)}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-5">
                  {/* Info */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <ExternalLink className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm mb-1">Client Portal Link</p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Share this link with your client. They can view the quote details and approve it directly without needing an account.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Link Display */}
                  {isGeneratingLink ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-[#F6B45A] animate-spin" />
                      <span className="ml-3 text-gray-400">Generating link...</span>
                    </div>
                  ) : shareError ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                      <p className="text-red-400 text-sm">{shareError}</p>
                      <button
                        onClick={handleGenerateShareLink}
                        className="mt-3 text-xs text-[#F6B45A] hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : shareUrl ? (
                    <div className="space-y-3">
                      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                        <Link2 className="w-5 h-5 text-gray-500 shrink-0" />
                        <input
                          type="text"
                          value={shareUrl}
                          readOnly
                          className="flex-1 bg-transparent text-white text-sm focus:outline-none truncate"
                        />
                      </div>
                      <motion.button
                        onClick={handleCopyLink}
                        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                          linkCopied
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#F6B45A]/10 text-[#F6B45A] border border-[#F6B45A]/30 hover:bg-[#F6B45A]/20'
                        }`}
                        whileTap={{ scale: 0.98 }}
                      >
                        {linkCopied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied to Clipboard!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </>
                        )}
                      </motion.button>
                    </div>
                  ) : null}

                  {/* Valid Period Info */}
                  {shareUrl && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Link valid for 30 days</span>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-white/10 bg-black/30">
                  <motion.button
                    onClick={() => setShowShareModal(false)}
                    className="w-full py-3 rounded-xl font-bold text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    whileTap={{ scale: 0.98 }}
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
          {showDeleteConfirmModal && (
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
              <motion.div
                  className="w-full max-w-sm bg-gradient-to-b from-[#151515] to-[#0a0a0a] rounded-2xl border border-red-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
              >
                {/* Modal Header */}
                <div className="relative flex items-center justify-between p-5 border-b border-white/10">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white font-serif">Delete Project</h3>
                        <p className="text-[10px] text-gray-500">This action cannot be undone</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowDeleteConfirmModal(false)}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Modal Body */}
                <div className="p-5">
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-5">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Are you sure you want to delete this project? All associated data including the design, quote, and internal notes will be permanently removed.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setShowDeleteConfirmModal(false);
                        onDeleteProject?.();
                      }}
                      className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};
