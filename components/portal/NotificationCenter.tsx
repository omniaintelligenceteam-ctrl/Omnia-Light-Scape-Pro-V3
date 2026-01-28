import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  MessageCircle,
  FileText,
  Receipt,
  Calendar,
  AlertCircle,
  Clock,
  User,
  Trash2,
} from 'lucide-react';

// Notification types
export type NotificationType =
  | 'message_received'
  | 'quote_viewed'
  | 'quote_approved'
  | 'quote_declined'
  | 'invoice_paid'
  | 'appointment_confirmed'
  | 'appointment_reminder'
  | 'client_created';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string;
  projectName?: string;
  clientName?: string;
  amount?: number;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead: (ids: string[]) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

// Get icon and color for notification type
const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case 'message_received':
      return { icon: MessageCircle, color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    case 'quote_viewed':
      return { icon: FileText, color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
    case 'quote_approved':
      return { icon: Check, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
    case 'quote_declined':
      return { icon: X, color: 'text-red-400', bgColor: 'bg-red-500/20' };
    case 'invoice_paid':
      return { icon: Receipt, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
    case 'appointment_confirmed':
      return { icon: Calendar, color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    case 'appointment_reminder':
      return { icon: Clock, color: 'text-amber-400', bgColor: 'bg-amber-500/20' };
    case 'client_created':
      return { icon: User, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' };
    default:
      return { icon: AlertCircle, color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
  }
};

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Haptic feedback
const triggerHaptic = (pattern: number | number[] = 10) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearAll,
  onNotificationClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.readAt).length;
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.readAt);
    }
    return notifications;
  }, [notifications, filter]);

  // Toggle open state
  const toggleOpen = useCallback(() => {
    triggerHaptic(10);
    setIsOpen(prev => !prev);
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: Notification) => {
    triggerHaptic(5);
    if (!notification.readAt) {
      onMarkRead([notification.id]);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  }, [onMarkRead, onNotificationClick]);

  // Handle delete
  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    triggerHaptic(15);
    onDelete(id);
  }, [onDelete]);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={toggleOpen}
        className={`relative p-2.5 rounded-xl transition-colors ${
          isOpen
            ? 'bg-[#F6B45A]/20 text-[#F6B45A]'
            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
        }`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => {
                        triggerHaptic(10);
                        onMarkAllRead();
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === 'unread'
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Unread
                </button>
              </div>

              {/* Notifications List */}
              <div className="max-h-[400px] overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="w-10 h-10 text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500">
                      {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredNotifications.map((notification) => {
                      const style = getNotificationStyle(notification.type);
                      const Icon = style.icon;
                      const isUnread = !notification.readAt;

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => handleNotificationClick(notification)}
                          className={`relative flex gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            isUnread ? 'bg-white/[0.02]' : ''
                          } hover:bg-white/[0.04]`}
                        >
                          {/* Unread indicator */}
                          {isUnread && (
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}

                          {/* Icon */}
                          <div className={`shrink-0 w-9 h-9 rounded-lg ${style.bgColor} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${style.color}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${isUnread ? 'text-white' : 'text-gray-300'} line-clamp-1`}>
                                {notification.title}
                              </p>
                              <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                {formatRelativeTime(notification.createdAt)}
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>

                            {/* Amount badge */}
                            {notification.amount && (
                              <span className="inline-block mt-1.5 px-2 py-0.5 bg-[#F6B45A]/10 text-[#F6B45A] text-[10px] font-bold rounded">
                                ${notification.amount.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="shrink-0 p-1 rounded hover:bg-white/10 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-white/[0.02]">
                  <button
                    onClick={() => {
                      triggerHaptic(15);
                      onClearAll();
                    }}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                  <span className="text-[10px] text-gray-600">
                    {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Hook for managing notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
    return newNotification.id;
  }, []);

  const markRead = useCallback((ids: string[]) => {
    setNotifications(prev =>
      prev.map(n =>
        ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n
      )
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
    );
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.readAt).length;
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markRead,
    markAllRead,
    deleteNotification,
    clearAll,
  };
};

export default NotificationCenter;
