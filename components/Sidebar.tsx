import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paintbrush, FolderOpen, FolderClosed, Settings, Package, PackageOpen, Sparkles, Calendar, CalendarCheck } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'editor', label: 'Editor', icon: Paintbrush },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="w-full bg-gradient-to-t from-[#0a0a0a] via-[#0f0f0f] to-[#111] text-white shrink-0 z-50 fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)]">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F6B45A]/40 to-transparent" />

      {/* Secondary subtle line */}
      <div className="absolute top-[1px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* Ambient glow behind navigation - hidden on mobile */}
      <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-16 bg-[#F6B45A]/[0.03] blur-[50px] pointer-events-none" />

      <div className="flex flex-col items-center px-3 md:px-8 lg:px-10 py-2 md:py-6 lg:py-8">
        {/* Navigation Container - 4 separate buttons */}
        <div className="flex items-center justify-center gap-1.5 md:gap-5 lg:gap-6 w-full max-w-lg lg:max-w-2xl">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 md:gap-2.5 lg:gap-3 py-2.5 md:py-6 lg:py-7 rounded-xl md:rounded-2xl lg:rounded-3xl transition-all duration-300 overflow-hidden"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Button background - individual for each button */}
                <motion.div
                  className="absolute inset-0 rounded-xl md:rounded-2xl lg:rounded-3xl"
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
                      className="absolute inset-0 rounded-xl md:rounded-2xl lg:rounded-3xl bg-gradient-to-t from-transparent via-white/10 to-white/20"
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
                      className="absolute inset-0 rounded-xl md:rounded-2xl lg:rounded-3xl overflow-hidden"
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
                      className="absolute -inset-1 bg-[#F6B45A]/30 blur-xl -z-10 rounded-xl md:rounded-2xl lg:rounded-3xl"
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
                  {/* Projects - Folder open/close animation */}
                  {item.id === 'projects' && isActive ? (
                    <motion.div
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key="folder-animation"
                          initial={{ opacity: 1 }}
                          animate={{ opacity: 1 }}
                        >
                          <motion.div
                            animate={{
                              rotateX: [0, -20, 0],
                            }}
                            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
                          >
                            <FolderOpen
                              className="w-[18px] h-[18px] md:w-8 md:h-8 lg:w-9 lg:h-9 text-[#1a1a1a]"
                              strokeWidth={2.5}
                            />
                          </motion.div>
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                  ) : item.id === 'projects' ? (
                    <FolderClosed
                      className="w-[18px] h-[18px] md:w-8 md:h-8 lg:w-9 lg:h-9 text-gray-500"
                      strokeWidth={2}
                    />
                  ) : /* Inventory - Package open/close animation */
                  item.id === 'inventory' && isActive ? (
                    <motion.div
                      animate={{
                        scale: [1, 1.05, 1],
                        y: [0, -2, 0]
                      }}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 1.2 }}
                    >
                      <PackageOpen
                        className="w-[18px] h-[18px] md:w-8 md:h-8 lg:w-9 lg:h-9 text-[#1a1a1a]"
                        strokeWidth={2.5}
                      />
                    </motion.div>
                  ) : item.id === 'inventory' ? (
                    <Package
                      className="w-[18px] h-[18px] md:w-8 md:h-8 lg:w-9 lg:h-9 text-gray-500"
                      strokeWidth={2}
                    />
                  ) : /* Schedule - Calendar check animation */
                  item.id === 'schedule' && isActive ? (
                    <motion.div
                      animate={{
                        scale: [1, 1.08, 1],
                      }}
                      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
                    >
                      <CalendarCheck
                        className="w-[18px] h-[18px] md:w-8 md:h-8 lg:w-9 lg:h-9 text-[#1a1a1a]"
                        strokeWidth={2.5}
                      />
                    </motion.div>
                  ) : item.id === 'schedule' ? (
                    <Calendar
                      className="w-[18px] h-[18px] md:w-8 md:h-8 lg:w-9 lg:h-9 text-gray-500"
                      strokeWidth={2}
                    />
                  ) : /* Settings - Gear rotation animation */
                  item.id === 'settings' && isActive ? (
                    <motion.div
                      animate={{
                        rotate: [0, 45, 0, -45, 0]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Settings
                        className="w-[18px] h-[18px] md:w-8 md:h-8 lg:w-9 lg:h-9 text-[#1a1a1a]"
                        strokeWidth={2.5}
                      />
                    </motion.div>
                  ) : (
                    <Icon
                      className={`w-[18px] h-[18px] md:w-8 md:h-8 lg:w-9 lg:h-9 transition-all duration-300 ${
                        isActive
                          ? 'text-[#1a1a1a]'
                          : 'text-gray-500'
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  )}

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
                  className={`relative z-10 text-[9px] md:text-sm lg:text-base font-semibold uppercase tracking-[0.02em] md:tracking-[0.08em] lg:tracking-[0.1em] transition-all duration-300 whitespace-nowrap ${
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

    </nav>
  );
};
