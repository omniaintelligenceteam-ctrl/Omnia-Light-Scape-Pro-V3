import React from 'react';
import { motion } from 'framer-motion';
import {
  Save, Trash2, Pencil, ClipboardList, Send, Share2, Download, X,
  Loader2, Check, Mail
} from 'lucide-react';

interface QuoteToolbarProps {
  onSave: () => void;
  onDelete?: () => void;
  onEditDesign?: () => void;
  onGenerateBOM?: () => void;
  onSendQuote: () => void;
  onShare?: () => void;
  onDownloadPdf: () => void;
  onClose?: () => void;
  isGeneratingPdf: boolean;
  isSendingEmail: boolean;
  emailSent: boolean;
  emailError: string | null;
  clientEmail: string;
  projectId?: string;
  onQuickSend?: () => void;
}

export const QuoteToolbar: React.FC<QuoteToolbarProps> = ({
  onSave,
  onDelete,
  onEditDesign,
  onGenerateBOM,
  onSendQuote,
  onShare,
  onDownloadPdf,
  onClose,
  isGeneratingPdf,
  isSendingEmail,
  emailSent,
  emailError,
  clientEmail,
  projectId,
  onQuickSend
}) => {
  return (
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
            onClick={onSave}
            className="relative overflow-hidden bg-gradient-to-r from-[#F6B45A] to-[#ffc67a] text-[#111] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_4px_20px_rgba(246,180,90,0.3)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Save className="w-4 h-4" />
            Save
          </motion.button>

          {/* Delete Project Button */}
          {onDelete && (
            <motion.button
              onClick={onDelete}
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
              onClick={onGenerateBOM}
              className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white p-2 rounded-lg transition-all border border-white/10 hover:border-white/20"
              whileTap={{ scale: 0.95 }}
              title="Generate BOM"
            >
              <ClipboardList className="w-4 h-4" />
            </motion.button>
          )}

          {/* Send Quote Button */}
          <motion.button
            onClick={onSendQuote}
            className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white p-2 rounded-lg transition-all border border-white/10 hover:border-white/20"
            whileTap={{ scale: 0.95 }}
            title="Send Quote"
          >
            <Send className="w-4 h-4" />
          </motion.button>

          {/* Share Portal Link Button */}
          {projectId && onShare && (
            <motion.button
              onClick={onShare}
              className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white p-2 rounded-lg transition-all border border-white/10 hover:border-white/20"
              whileTap={{ scale: 0.95 }}
              title="Share Link"
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
          )}

          {/* Download PDF Button */}
          <motion.button
            onClick={onDownloadPdf}
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
            onClick={onSave}
            className="bg-gradient-to-r from-[#F6B45A] to-[#ffc67a] text-[#111] p-2 rounded-lg"
            whileTap={{ scale: 0.95 }}
            title="Save"
          >
            <Save className="w-4 h-4" />
          </motion.button>

          {/* Delete Project Button - Mobile */}
          {onDelete && (
            <motion.button
              onClick={onDelete}
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
              onClick={onGenerateBOM}
              className="bg-white/5 text-gray-300 p-2 rounded-lg border border-white/10"
              whileTap={{ scale: 0.95 }}
              title="BOM"
            >
              <ClipboardList className="w-4 h-4" />
            </motion.button>
          )}

          <motion.button
            onClick={() => {
              if (clientEmail && onQuickSend) {
                onQuickSend();
              } else {
                onSendQuote();
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
            onClick={onDownloadPdf}
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
  );
};
