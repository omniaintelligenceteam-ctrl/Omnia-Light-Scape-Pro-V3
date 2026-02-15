import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paintbrush, FolderOpen, FolderClosed, Settings, Sparkles, Calendar, CalendarCheck, ClipboardList } from 'lucide-react';
import { useOrganization } from '../hooks/useOrganization';
import { OrganizationRole, RolePermissions } from '../types';

// Check if device supports touch
const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(patterns[type]);
  }
};

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  /** Roles that can see this menu item (if empty, all roles can see) */
  allowedRoles?: OrganizationRole[];
  /** Permission required to see this item */
  requiredPermission?: keyof RolePermissions;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { role, hasPermission } = useOrganization();

  // Handle tab change with haptic feedback
  const handleTabChange = useCallback((tabId: string) => {
    if (isTouchDevice && tabId !== activeTab) {
      triggerHaptic('light');
    }
    onTabChange(tabId);
  }, [activeTab, onTabChange]);

  // Define all menu items with their access requirements
  const allMenuItems: MenuItem[] = [
    { id: 'editor', label: 'Editor', icon: Paintbrush, requiredPermission: 'canCreateProjects' },
    { id: 'manual-placement', label: 'AI Placement', icon: Sparkles, requiredPermission: 'canCreateProjects' },
    { id: 'projects', label: 'Projects', icon: FolderOpen }, // All roles can see (filtered view)
    { id: 'schedule', label: 'Schedule', icon: Calendar }, // All roles can see (filtered view)
    { id: 'settings', label: 'Settings', icon: Settings }, // All roles can see (role-filtered content)
  ];

  // Technician-specific menu (simplified view)
  const technicianMenuItems: MenuItem[] = [
    { id: 'schedule', label: 'My Jobs', icon: ClipboardList },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Filter menu items based on role
  const menuItems = useMemo(() => {
    // If no role yet (not in org), show default items
    if (!role) {
      return allMenuItems;
    }

    // Technicians get simplified menu
    if (role === 'technician') {
      return technicianMenuItems;
    }

    // Lead technicians see schedule + limited settings
    if (role === 'lead_technician') {
      return [
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }

    // For other roles, filter by permissions
    return allMenuItems.filter(item => {
      // If no permission required, show to everyone
      if (!item.requiredPermission && !item.allowedRoles) {
        return true;
      }

      // Check allowed roles
      if (item.allowedRoles && item.allowedRoles.length > 0) {
        if (!item.allowedRoles.includes(role)) {
          return false;
        }
      }

      // Check permission
      if (item.requiredPermission) {
        if (!hasPermission(item.requiredPermission)) {
          return false;
        }
      }

      return true;
    });
  }, [role, hasPermission]);

  return (
    <nav className="w-full text-white shrink-0 z-50 fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)]">
      {/* Frosted glass background */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/98 via-[#0f0f0f]/95 to-[#111]/90"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      />

      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex flex-col items-center px-2 md:px-6 lg:px-8 py-1.5 md:py-2 lg:py-2.5">
        {/* Navigation Container */}
        <div className="flex items-center justify-center gap-1.5 md:gap-4 lg:gap-5 w-full max-w-xl lg:max-w-2xl">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 md:gap-1 lg:gap-1.5 py-2.5 md:py-2.5 lg:py-3 min-h-[50px] md:min-h-[36px] rounded-xl md:rounded-xl lg:rounded-2xl transition-all duration-300 touch-manipulation select-none"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.95, y: 1 }}
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: '1000px',
                }}
              >
                {/* Outer glow for active - extends further from button edges */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="absolute -inset-4 md:-inset-3 lg:-inset-3 rounded-3xl md:rounded-2xl lg:rounded-2xl pointer-events-none"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        background: 'radial-gradient(ellipse at center, rgba(246,180,90,0.6) 0%, rgba(246,180,90,0.3) 40%, rgba(246,180,90,0.1) 60%, transparent 80%)',
                        filter: 'blur(12px)',
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* 3D Button base - bottom layer (shadow/depth) */}
                <div
                  className="absolute inset-0 rounded-xl md:rounded-xl lg:rounded-xl"
                  style={{
                    background: isActive
                      ? 'linear-gradient(to bottom, #8a5a1a 0%, #6d4515 100%)'
                      : 'linear-gradient(to bottom, #1a1a1a 0%, #0a0a0a 100%)',
                    transform: 'translateY(3px)',
                    boxShadow: isActive
                      ? '0 4px 12px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)'
                      : '0 4px 8px rgba(0,0,0,0.4)',
                  }}
                />

                {/* 3D Button main surface */}
                <motion.div
                  className="absolute inset-0 rounded-xl md:rounded-xl lg:rounded-xl overflow-hidden"
                  initial={false}
                  animate={{
                    y: isActive ? 1 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  style={{
                    background: isActive
                      ? 'linear-gradient(160deg, #ffd080 0%, #F6B45A 30%, #e5a040 70%, #d4902a 100%)'
                      : 'linear-gradient(160deg, rgba(45,45,45,1) 0%, rgba(35,35,35,1) 50%, rgba(25,25,25,1) 100%)',
                    boxShadow: isActive
                      ? 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.3)'
                      : 'inset 0 1px 2px rgba(255,255,255,0.05), inset 0 -1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
                    border: isActive
                      ? '1px solid rgba(255,220,150,0.4)'
                      : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Top highlight for 3D effect */}
                  <div
                    className="absolute inset-x-0 top-0 h-1/3 rounded-t-xl md:rounded-t-xl lg:rounded-t-xl"
                    style={{
                      background: isActive
                        ? 'linear-gradient(to bottom, rgba(255,255,255,0.25) 0%, transparent 100%)'
                        : 'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 100%)',
                    }}
                  />

                  {/* Bottom shadow for 3D depth */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-1/4 rounded-b-xl md:rounded-b-xl lg:rounded-b-xl"
                    style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.15) 0%, transparent 100%)',
                    }}
                  />
                </motion.div>


                {/* Icon */}
                <motion.div
                  className="relative z-10"
                  animate={{
                    y: isActive ? 0 : 0,
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
                              className="w-5 h-5 md:w-5 md:h-5 lg:w-5 lg:h-5 text-[#1a1a1a] drop-shadow-sm"
                              strokeWidth={2.5}
                            />
                          </motion.div>
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                  ) : item.id === 'projects' ? (
                    <FolderClosed
                      className="w-5 h-5 md:w-5 md:h-5 lg:w-5 lg:h-5 text-gray-400"
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
                        className="w-5 h-5 md:w-5 md:h-5 lg:w-5 lg:h-5 text-[#1a1a1a] drop-shadow-sm"
                        strokeWidth={2.5}
                      />
                    </motion.div>
                  ) : item.id === 'schedule' ? (
                    <Calendar
                      className="w-5 h-5 md:w-5 md:h-5 lg:w-5 lg:h-5 text-gray-400"
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
                        className="w-5 h-5 md:w-5 md:h-5 lg:w-5 lg:h-5 text-[#1a1a1a] drop-shadow-sm"
                        strokeWidth={2.5}
                      />
                    </motion.div>
                  ) : (
                    <Icon
                      className={`w-5 h-5 md:w-5 md:h-5 lg:w-5 lg:h-5 transition-all duration-300 ${
                        isActive
                          ? 'text-[#1a1a1a] drop-shadow-sm'
                          : 'text-gray-400'
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  )}

                  {/* Magic sparkles for Editor tab - only at brush tip (bottom-left) */}
                  <AnimatePresence>
                    {item.id === 'editor' && isActive && (
                      <>
                        {/* Sparkle 1 - directly at brush tip */}
                        <motion.div
                          className="absolute -bottom-1 -left-1.5"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                        >
                          <Sparkles className="w-2.5 h-2.5 text-[#1a1a1a]" />
                        </motion.div>
                        {/* Sparkle 2 - slightly below tip */}
                        <motion.div
                          className="absolute -bottom-2.5 -left-0.5"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: [0, 1, 0], scale: [0.4, 0.9, 0.4] }}
                          transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.6, delay: 0.2 }}
                        >
                          <Sparkles className="w-2 h-2 text-[#1a1a1a]/80" />
                        </motion.div>
                        {/* Sparkle 3 - to the left of tip */}
                        <motion.div
                          className="absolute -bottom-0.5 -left-3"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: [0, 0.9, 0], scale: [0.3, 0.8, 0.3] }}
                          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.7, delay: 0.4 }}
                        >
                          <Sparkles className="w-1.5 h-1.5 text-[#1a1a1a]/70" />
                        </motion.div>
                        {/* Sparkle 4 - diagonal from tip */}
                        <motion.div
                          className="absolute -bottom-2 -left-2.5"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: [0, 0.8, 0], scale: [0.3, 0.7, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.9, delay: 0.6 }}
                        >
                          <Sparkles className="w-1.5 h-1.5 text-[#1a1a1a]/60" />
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Label */}
                <motion.span
                  className={`relative z-10 text-[9px] md:text-[9px] lg:text-[10px] font-semibold uppercase tracking-wide md:tracking-wider transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'text-[#1a1a1a] font-bold drop-shadow-sm'
                      : 'text-gray-400'
                  }`}
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
