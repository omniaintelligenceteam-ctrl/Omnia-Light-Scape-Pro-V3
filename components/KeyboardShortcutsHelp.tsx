import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Command, Wand2, Navigation } from 'lucide-react';
import { KeyboardShortcut, formatShortcutKey } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcutsByCategory: Record<string, KeyboardShortcut[]>;
}

const categoryConfig: Record<string, { label: string; icon: React.ElementType }> = {
  general: { label: 'General', icon: Command },
  navigation: { label: 'Navigation', icon: Navigation },
  actions: { label: 'Actions', icon: Wand2 },
  editor: { label: 'Editor', icon: Keyboard },
};

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcutsByCategory,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[80vh] overflow-hidden"
          >
            <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F6B45A]/20 flex items-center justify-center">
                    <Keyboard className="w-5 h-5 text-[#F6B45A]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
                    <p className="text-xs text-gray-500">Press ? anytime to show this</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => {
                  const config = categoryConfig[category] || {
                    label: category,
                    icon: Keyboard,
                  };
                  const Icon = config.icon;

                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4 text-[#F6B45A]" />
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                          {config.label}
                        </h3>
                      </div>

                      <div className="space-y-2">
                        {shortcuts.map((shortcut, index) => (
                          <div
                            key={`${shortcut.key}-${index}`}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <span className="text-sm text-gray-300">
                              {shortcut.description}
                            </span>
                            <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-mono text-[#F6B45A]">
                              {formatShortcutKey(shortcut)}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Additional tips */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500 text-center">
                    Shortcuts are disabled when typing in input fields
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default KeyboardShortcutsHelp;
