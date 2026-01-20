import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paintbrush, FolderOpen, Settings, Package, Sparkles } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'editor', label: 'Editor', icon: Paintbrush },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="w-full bg-gradient-to-t from-[#0a0a0a] via-[#0f0f0f] to-[#111] text-white shrink-0 z-50 relative">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F6B45A]/40 to-transparent" />

      {/* Secondary subtle line */}
      <div className="absolute top-[1px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* Ambient glow behind navigation */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-16 bg-[#F6B45A]/[0.03] blur-[50px] pointer-events-none" />

      <div className="flex flex-col items-center px-4 py-3 md:py-4">
        {/* Brand text - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 mb-3 text-[10px] text-gray-500">
          <span className="font-mono tracking-wider">OMNIA LIGHT SCAPE PRO</span>
          <span className="text-gray-600">|</span>
          <span>{new Date().getFullYear()}</span>
        </div>

        {/* Navigation Container - 4 separate buttons */}
        <div className="flex items-center justify-center gap-2 md:gap-3 w-full max-w-md">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 md:gap-1.5 py-2.5 md:py-3 rounded-xl transition-all duration-300 overflow-hidden"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Button background - individual for each button */}
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  initial={false}
                  animate={{
                    background: isActive
                      ? 'linear-gradient(to bottom, #F6B45A, #f0a847, #e59a3a)'
                      : 'linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(0,0,0,0.4))',
                    borderColor: isActive ? 'rgba(246,180,90,0.5)' : 'rgba(255,255,255,0.08)',
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    border: '1px solid',
                  }}
                />

                {/* Inner glow for active state */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-white/10 to-white/20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </AnimatePresence>

                {/* Shine effect for active */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-20deg]"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{
                          repeat: Infinity,
                          repeatDelay: 3,
                          duration: 1,
                          ease: "easeInOut"
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Outer glow for active */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="absolute -inset-1 bg-[#F6B45A]/30 blur-xl -z-10 rounded-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon */}
                <motion.div
                  className="relative z-10"
                  animate={{
                    y: isActive ? -1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon
                    className={`w-[18px] h-[18px] md:w-5 md:h-5 transition-all duration-300 ${
                      isActive
                        ? 'text-[#1a1a1a]'
                        : 'text-gray-500'
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />

                  {/* Magic sparkles for Editor tab */}
                  <AnimatePresence>
                    {item.id === 'editor' && isActive && (
                      <>
                        <motion.div
                          className="absolute -top-1 -right-1"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                        >
                          <Sparkles className="w-2 h-2 text-[#1a1a1a]" />
                        </motion.div>
                        <motion.div
                          className="absolute -bottom-0.5 -left-1"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.8, delay: 0.3 }}
                        >
                          <Sparkles className="w-1.5 h-1.5 text-[#1a1a1a]/70" />
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Label */}
                <motion.span
                  className={`relative z-10 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.05em] transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'text-[#1a1a1a] font-bold'
                      : 'text-gray-500'
                  }`}
                  animate={{
                    y: isActive ? -1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {item.label}
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-2 left-6 hidden md:flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full bg-[#F6B45A]/30" />
        <div className="w-6 h-[1px] bg-gradient-to-r from-[#F6B45A]/20 to-transparent" />
      </div>
      <div className="absolute bottom-2 right-6 hidden md:flex items-center gap-1.5">
        <div className="w-6 h-[1px] bg-gradient-to-l from-[#F6B45A]/20 to-transparent" />
        <div className="w-1 h-1 rounded-full bg-[#F6B45A]/30" />
      </div>
    </nav>
  );
};
