import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, FolderOpen, Settings, Package } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'editor', label: 'Editor', icon: Wand2 },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const [tabDimensions, setTabDimensions] = useState<{ width: number; left: number }[]>([]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const buttons = containerRef.current.querySelectorAll('button');
        const dims = Array.from(buttons).map(btn => ({
          width: btn.offsetWidth,
          left: btn.offsetLeft,
        }));
        setTabDimensions(dims);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const activeIndex = menuItems.findIndex(item => item.id === activeTab);
  const activeDimension = tabDimensions[activeIndex];

  return (
    <nav className="w-full bg-gradient-to-t from-[#0a0a0a] via-[#0f0f0f] to-[#111] text-white shrink-0 z-50 relative">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F6B45A]/40 to-transparent" />

      {/* Secondary subtle line */}
      <div className="absolute top-[1px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* Ambient glow behind navigation */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-16 bg-[#F6B45A]/[0.03] blur-[50px] pointer-events-none" />

      <div className="flex items-center justify-center px-4 py-3 md:py-4">
        {/* Navigation Container */}
        <div
          ref={containerRef}
          className="relative flex items-center gap-0 p-1.5 md:p-2 rounded-2xl bg-gradient-to-b from-white/[0.04] to-black/40 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          {/* Animated background pill */}
          {activeDimension && (
            <motion.div
              className="absolute top-1.5 md:top-2 bottom-1.5 md:bottom-2 rounded-xl overflow-hidden"
              initial={false}
              animate={{
                x: activeDimension.left,
                width: activeDimension.width,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 35
              }}
            >
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#F6B45A] via-[#f0a847] to-[#e59a3a]" />

              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20" />

              {/* Shine effect */}
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

              {/* Outer glow */}
              <div className="absolute -inset-1 bg-[#F6B45A]/30 blur-xl -z-10" />
            </motion.div>
          )}

          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative z-10 flex flex-col items-center justify-center gap-1 md:gap-1.5 px-4 md:px-6 py-2.5 md:py-3 rounded-xl transition-colors duration-200"
                whileHover={{ scale: isActive ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Icon */}
                <motion.div
                  className="relative"
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

                  {/* Icon glow when active */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 bg-[#1a1a1a]/10 blur-sm rounded-full scale-150"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Label */}
                <motion.span
                  className={`text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em] transition-all duration-300 whitespace-nowrap ${
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

                {/* Hover highlight for inactive tabs */}
                {!isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-white/0 hover:bg-white/[0.04] transition-colors duration-200"
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                  />
                )}
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