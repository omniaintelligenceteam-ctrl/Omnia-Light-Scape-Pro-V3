import React from 'react';
import { Wand2, FolderOpen, FileText, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'editor', label: 'Editor', icon: Wand2 },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'quotes', label: 'Quotes', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="w-full bg-[#111] text-white flex items-center justify-between px-3 md:px-8 py-3 md:py-4 border-t border-gray-800 shrink-0 z-50">
      {/* Left side spacer to balance the layout if needed, currently empty or could hold status */}
      <div className="w-32 hidden md:block">
        {/* Potential status indicator or version number */}
        <span className="text-[10px] text-gray-400 font-mono">v1.0.4</span>
      </div>

      {/* Center Navigation Pills */}
      <div className="flex-1 md:flex-none flex items-center justify-between md:justify-center gap-1 md:gap-2 bg-white/5 rounded-full p-1 md:p-1.5 border border-white/5 mx-auto w-full md:w-auto max-w-sm md:max-w-none">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center justify-center gap-1.5 md:gap-2 px-0 py-2.5 md:px-6 md:py-2.5 rounded-full transition-all duration-300 flex-1 md:flex-none ${
                isActive 
                  ? 'bg-[#F6B45A] text-[#111] shadow-[0_0_20px_rgba(246,180,90,0.2)] font-bold translate-y-[-1px]' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <item.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isActive ? 'text-[#111]' : 'text-gray-300'}`} />
              <span className="text-[9px] md:text-xs font-bold uppercase tracking-wide truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Right Side Actions - Hidden on Mobile */}
      <div className="w-32 hidden md:flex justify-end">
        <button className="flex items-center gap-2 text-gray-300 hover:text-red-400 transition-colors px-2 py-2 group">
          <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Sign Out</span>
        </button>
      </div>
    </nav>
  );
};