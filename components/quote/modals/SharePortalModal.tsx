import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, X, ExternalLink, Link2, Copy, Check, Loader2, FileText } from 'lucide-react';

interface SharePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string | null;
  isGeneratingLink: boolean;
  linkCopied: boolean;
  shareError: string | null;
  onGenerateLink: () => void;
  onCopyLink: () => void;
}

export const SharePortalModal: React.FC<SharePortalModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  isGeneratingLink,
  linkCopied,
  shareError,
  onGenerateLink,
  onCopyLink
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
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
                onClick={onClose}
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
                    onClick={onGenerateLink}
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
                    onClick={onCopyLink}
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
                onClick={onClose}
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
  );
};
