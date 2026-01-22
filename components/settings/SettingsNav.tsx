import React from 'react';
import { motion } from 'framer-motion';
import {
  User, Palette, Bell, DollarSign, Package, Lightbulb,
  CreditCard, HelpCircle, LogOut, Clock, Target, MapPin, Users, UserPlus, Warehouse, BarChart3
} from 'lucide-react';

export type SettingsSection =
  | 'profile'
  | 'appearance'
  | 'notifications'
  | 'pricing'
  | 'catalog'
  | 'inventory'
  | 'lighting'
  | 'followups'
  | 'goals'
  | 'analytics'
  | 'locations'
  | 'technicians'
  | 'team'
  | 'subscription'
  | 'support';

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
  group: string;
}

const navItems: NavItem[] = [
  { id: 'profile', label: 'Profile', icon: User, group: 'Account' },
  { id: 'subscription', label: 'Plan', icon: CreditCard, group: 'Account' },
  { id: 'appearance', label: 'Theme', icon: Palette, group: 'Preferences' },
  { id: 'notifications', label: 'Alerts', icon: Bell, group: 'Preferences' },
  { id: 'pricing', label: 'Pricing', icon: DollarSign, group: 'Business' },
  { id: 'catalog', label: 'Catalog', icon: Package, group: 'Business' },
  { id: 'inventory', label: 'Inventory', icon: Warehouse, group: 'Business' },
  { id: 'lighting', label: 'Lighting', icon: Lightbulb, group: 'Business' },
  { id: 'followups', label: 'Follow-ups', icon: Clock, group: 'Business' },
  { id: 'goals', label: 'Goals', icon: Target, group: 'Business' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'Business' },
  { id: 'locations', label: 'Locations', icon: MapPin, group: 'Organization' },
  { id: 'technicians', label: 'Technicians', icon: Users, group: 'Organization' },
  { id: 'team', label: 'Team', icon: UserPlus, group: 'Organization' },
  { id: 'support', label: 'Help', icon: HelpCircle, group: 'Support' },
];

interface SettingsNavProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onSignOut?: () => void;
}

export const SettingsNav: React.FC<SettingsNavProps> = ({
  activeSection,
  onSectionChange,
  onSignOut
}) => {
  // Group nav items
  const groups = navItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <nav className="w-60 shrink-0 bg-[#0a0a0a] border-r border-white/5 flex flex-col h-full">
      <div className="p-6 border-b border-white/5">
        <h2 className="text-xl font-bold text-white">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3">
        {Object.entries(groups).map(([groupName, items]) => (
          <div key={groupName} className="mb-6">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              {groupName}
            </h3>
            <div className="space-y-1">
              {items.map((item) => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                      isActive
                        ? 'text-white bg-white/5'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#F6B45A] rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}

                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[#F6B45A]' : ''}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sign Out - Always visible */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all group"
        >
          <LogOut className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </nav>
  );
};
