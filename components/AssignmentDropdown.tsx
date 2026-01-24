import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  UserPlus,
  ChevronDown,
  Check,
  X,
  Loader2,
  Users
} from 'lucide-react';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { OrganizationMember, OrganizationRole } from '../types';

interface AssignmentDropdownProps {
  /** Currently assigned user ID */
  assignedUserId?: string;
  /** Currently assigned user name (for display) */
  assignedUserName?: string;
  /** Role filter - only show members with these roles */
  roleFilter?: OrganizationRole[];
  /** Callback when user is assigned */
  onAssign: (userId: string, userName: string) => Promise<void>;
  /** Callback when assignment is removed */
  onUnassign?: () => Promise<void>;
  /** Label for the dropdown */
  label?: string;
  /** Placeholder when no one is assigned */
  placeholder?: string;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Disable the dropdown */
  disabled?: boolean;
}

export const AssignmentDropdown: React.FC<AssignmentDropdownProps> = ({
  assignedUserId,
  assignedUserName,
  roleFilter,
  onAssign,
  onUnassign,
  label = 'Assign',
  placeholder = 'Unassigned',
  compact = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { members, isLoading: membersLoading } = useTeamMembers();

  // Filter members by role if specified
  const filteredMembers = roleFilter
    ? members.filter(m => m.isActive && roleFilter.includes(m.role))
    : members.filter(m => m.isActive);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (member: OrganizationMember) => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onAssign(member.userId, member.userName || member.userEmail || 'Unknown');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to assign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (disabled || isLoading || !onUnassign) return;

    setIsLoading(true);
    try {
      await onUnassign();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to unassign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = (role: OrganizationRole) => {
    const colors: Record<OrganizationRole, string> = {
      owner: 'bg-amber-500/20 text-amber-400',
      admin: 'bg-purple-500/20 text-purple-400',
      salesperson: 'bg-blue-500/20 text-blue-400',
      lead_technician: 'bg-emerald-500/20 text-emerald-400',
      technician: 'bg-gray-500/20 text-gray-400'
    };
    const labels: Record<OrganizationRole, string> = {
      owner: 'Owner',
      admin: 'Admin',
      salesperson: 'Sales',
      lead_technician: 'Lead',
      technician: 'Tech'
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[role]}`}>
        {labels[role]}
      </span>
    );
  };

  if (compact) {
    return (
      <div ref={dropdownRef} className="relative inline-block">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm transition-colors ${
            assignedUserId
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <User className="w-3 h-3" />
          )}
          <span className="truncate max-w-[80px]">
            {assignedUserName || placeholder}
          </span>
          {!disabled && <ChevronDown className="w-3 h-3" />}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute z-50 mt-1 right-0 min-w-[200px] p-1 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-xl"
            >
              {membersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No team members available
                </div>
              ) : (
                <>
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelect(member)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        member.userId === assignedUserId
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'hover:bg-white/5 text-white'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">
                        {(member.userName || member.userEmail || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.userName || member.userEmail}</p>
                      </div>
                      {getRoleBadge(member.role)}
                      {member.userId === assignedUserId && (
                        <Check className="w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                  {assignedUserId && onUnassign && (
                    <>
                      <div className="my-1 border-t border-white/10" />
                      <button
                        onClick={handleUnassign}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span className="text-sm">Remove assignment</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full-size version
  return (
    <div ref={dropdownRef} className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
          assignedUserId
            ? 'bg-blue-500/10 border-blue-500/30'
            : 'bg-white/5 border-white/10 hover:border-white/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        ) : assignedUserId ? (
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-400" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-gray-500" />
          </div>
        )}
        <div className="flex-1 text-left">
          <p className={`font-medium ${assignedUserId ? 'text-white' : 'text-gray-500'}`}>
            {assignedUserName || placeholder}
          </p>
        </div>
        {!disabled && <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 mt-2 w-full p-2 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-xl max-h-[calc(100vh-200px)] overflow-y-auto"
          >
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No team members available</p>
              </div>
            ) : (
              <>
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelect(member)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      member.userId === assignedUserId
                        ? 'bg-blue-500/20'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium text-white">
                      {(member.userName || member.userEmail || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {member.userName || member.userEmail}
                      </p>
                      {member.userEmail && member.userName && (
                        <p className="text-xs text-gray-500 truncate">{member.userEmail}</p>
                      )}
                    </div>
                    {getRoleBadge(member.role)}
                    {member.userId === assignedUserId && (
                      <Check className="w-5 h-5 text-blue-400" />
                    )}
                  </button>
                ))}
                {assignedUserId && onUnassign && (
                  <>
                    <div className="my-2 border-t border-white/10" />
                    <button
                      onClick={handleUnassign}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <X className="w-5 h-5" />
                      <span className="font-medium">Remove assignment</span>
                    </button>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssignmentDropdown;
