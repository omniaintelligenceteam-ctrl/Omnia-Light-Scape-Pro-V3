import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  MessageCircle,
  FileText,
  Receipt,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  X,
  Bell,
  BellOff,
  Phone,
  Mail,
  Paperclip,
} from 'lucide-react';

// Message types
export interface Message {
  id: string;
  sender_type: 'client' | 'company';
  sender_name: string;
  message_text: string;
  message_type?: 'text' | 'quote' | 'invoice' | 'reminder' | 'status_update';
  created_at: string;
  read_at?: string;
  metadata?: {
    quoteId?: string;
    quoteAmount?: number;
    invoiceId?: string;
    invoiceAmount?: number;
    appointmentDate?: string;
    statusFrom?: string;
    statusTo?: string;
  };
}

// Quick message template
interface MessageTemplate {
  id: string;
  label: string;
  icon: React.ElementType;
  message: string;
  category: 'quote' | 'schedule' | 'followup' | 'general';
}

// Notification preference
interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

interface ClientMessagingProps {
  messages: Message[];
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  projectName?: string;
  projectStatus?: string;
  quoteAmount?: number;
  onSendMessage: (message: string, type?: Message['message_type'], metadata?: Message['metadata']) => Promise<void>;
  onMarkRead: (messageIds: string[]) => void;
  onSendReminder?: (type: 'quote' | 'invoice' | 'appointment') => Promise<void>;
}

// Pre-defined message templates
const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'quote-ready',
    label: 'Quote Ready',
    icon: FileText,
    message: 'Hi! Your lighting design quote is ready for review. Please take a look and let me know if you have any questions.',
    category: 'quote',
  },
  {
    id: 'quote-followup',
    label: 'Quote Follow-up',
    icon: FileText,
    message: 'Hi! Just checking in about the lighting quote I sent. Do you have any questions, or would you like to discuss any changes?',
    category: 'quote',
  },
  {
    id: 'schedule-confirm',
    label: 'Confirm Install',
    icon: Calendar,
    message: 'Your installation has been scheduled! Please confirm the date works for you, and feel free to reach out if you need to reschedule.',
    category: 'schedule',
  },
  {
    id: 'schedule-reminder',
    label: 'Install Reminder',
    icon: Clock,
    message: 'Just a friendly reminder that your lighting installation is coming up soon. Please ensure access to the property is available.',
    category: 'schedule',
  },
  {
    id: 'complete-thankyou',
    label: 'Thank You',
    icon: CheckCircle2,
    message: 'Thank you for choosing us for your lighting project! We hope you love the results. Please let us know if you need any adjustments.',
    category: 'followup',
  },
  {
    id: 'invoice-sent',
    label: 'Invoice Sent',
    icon: Receipt,
    message: 'Your invoice has been sent. Please review it at your convenience. Payment details are included in the invoice.',
    category: 'general',
  },
];

// Haptic feedback helper
const triggerHaptic = (pattern: number | number[] = 10) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export const ClientMessaging: React.FC<ClientMessagingProps> = ({
  messages,
  clientName,
  clientEmail,
  clientPhone,
  projectName,
  projectStatus,
  quoteAmount,
  onSendMessage,
  onMarkRead,
  onSendReminder,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MessageTemplate['category'] | 'all'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();

    // Mark company messages as read
    const unreadCompanyMessages = messages
      .filter(m => m.sender_type === 'company' && !m.read_at)
      .map(m => m.id);

    if (unreadCompanyMessages.length > 0) {
      onMarkRead(unreadCompanyMessages);
    }
  }, [messages, onMarkRead, scrollToBottom]);

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return MESSAGE_TEMPLATES;
    return MESSAGE_TEMPLATES.filter(t => t.category === selectedCategory);
  }, [selectedCategory]);

  // Unread count
  const unreadCount = useMemo(() => {
    return messages.filter(m => m.sender_type === 'client' && !m.read_at).length;
  }, [messages]);

  // Handle sending message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    triggerHaptic(10);

    try {
      await onSendMessage(newMessage.trim(), 'text');
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  // Handle template selection
  const handleSelectTemplate = (template: MessageTemplate) => {
    // Personalize the message with client name
    let personalizedMessage = template.message;
    if (clientName) {
      personalizedMessage = personalizedMessage.replace('Hi!', `Hi ${clientName.split(' ')[0]}!`);
    }
    setNewMessage(personalizedMessage);
    setShowTemplates(false);
    inputRef.current?.focus();
    triggerHaptic(5);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format time
  const formatTime = (dateString: string): string => {
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

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get icon for message type
  const getMessageTypeIcon = (type?: Message['message_type']) => {
    switch (type) {
      case 'quote':
        return <FileText className="w-3 h-3 text-purple-400" />;
      case 'invoice':
        return <Receipt className="w-3 h-3 text-emerald-400" />;
      case 'reminder':
        return <Clock className="w-3 h-3 text-amber-400" />;
      case 'status_update':
        return <AlertCircle className="w-3 h-3 text-blue-400" />;
      default:
        return null;
    }
  };

  // Render special message cards (quote, invoice, etc.)
  const renderSpecialMessageContent = (message: Message) => {
    if (message.message_type === 'quote' && message.metadata?.quoteAmount) {
      return (
        <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-400 font-medium">Quote</span>
            </div>
            <span className="text-sm font-bold text-white">
              ${message.metadata.quoteAmount.toLocaleString()}
            </span>
          </div>
        </div>
      );
    }

    if (message.message_type === 'invoice' && message.metadata?.invoiceAmount) {
      return (
        <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Invoice</span>
            </div>
            <span className="text-sm font-bold text-white">
              ${message.metadata.invoiceAmount.toLocaleString()}
            </span>
          </div>
        </div>
      );
    }

    if (message.message_type === 'reminder' && message.metadata?.appointmentDate) {
      const date = new Date(message.metadata.appointmentDate);
      return (
        <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">
              Scheduled: {date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      );
    }

    if (message.message_type === 'status_update' && message.metadata?.statusTo) {
      return (
        <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">
              Status updated to: {message.metadata.statusTo}
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F6B45A] to-amber-600 flex items-center justify-center text-black font-bold text-sm">
            {clientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{clientName}</h3>
            {projectName && (
              <p className="text-xs text-gray-500">{projectName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}

          {/* Contact buttons */}
          {clientEmail && (
            <a
              href={`mailto:${clientEmail}`}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title={`Email ${clientEmail}`}
            >
              <Mail className="w-4 h-4" />
            </a>
          )}
          {clientPhone && (
            <a
              href={`tel:${clientPhone}`}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title={`Call ${clientPhone}`}
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Project Status Bar */}
      {(projectStatus || quoteAmount) && (
        <div className="flex items-center gap-4 px-4 py-2 bg-white/[0.02] border-b border-white/5 text-xs">
          {projectStatus && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Status:</span>
              <span className="px-2 py-0.5 bg-white/10 rounded text-white font-medium">
                {projectStatus}
              </span>
            </div>
          )}
          {quoteAmount && quoteAmount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Quote:</span>
              <span className="text-[#F6B45A] font-bold">
                ${quoteAmount.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 mb-1">No messages yet</p>
            <p className="text-xs text-gray-600">Use a template below to start the conversation</p>
          </div>
        ) : (
          messages.map((message) => {
            const isClient = message.sender_type === 'client';

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[75%] ${isClient ? 'order-1' : 'order-2'}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      isClient
                        ? 'bg-white/10 border border-white/10 rounded-bl-sm'
                        : 'bg-[#F6B45A]/10 border border-[#F6B45A]/20 rounded-br-sm'
                    }`}
                  >
                    {/* Message type indicator */}
                    {message.message_type && message.message_type !== 'text' && (
                      <div className="flex items-center gap-1 mb-1">
                        {getMessageTypeIcon(message.message_type)}
                        <span className="text-[10px] text-gray-500 uppercase">
                          {message.message_type.replace('_', ' ')}
                        </span>
                      </div>
                    )}

                    <p className="text-sm text-white whitespace-pre-wrap break-words">
                      {message.message_text}
                    </p>

                    {/* Special content cards */}
                    {renderSpecialMessageContent(message)}
                  </div>

                  <div className={`flex items-center gap-2 mt-1 px-2 ${isClient ? 'justify-start' : 'justify-end'}`}>
                    <span className="text-[10px] text-gray-600">
                      {formatTime(message.created_at)}
                    </span>
                    {!isClient && message.read_at && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Templates Panel */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="p-3 bg-white/[0.02]">
              {/* Category Tabs */}
              <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                {(['all', 'quote', 'schedule', 'followup', 'general'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#F6B45A] text-black'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>

              {/* Template Grid */}
              <div className="grid grid-cols-2 gap-2">
                {filteredTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="flex items-center gap-2 p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-left transition-all group"
                    >
                      <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-white/10">
                        <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
                      </div>
                      <span className="text-xs text-gray-300 group-hover:text-white font-medium">
                        {template.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="border-t border-white/10 p-3 bg-white/[0.02]">
        {/* Quick Actions */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showTemplates
                ? 'bg-[#F6B45A]/20 text-[#F6B45A] border border-[#F6B45A]/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Templates
            <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
          </button>

          {onSendReminder && (
            <>
              <button
                onClick={() => onSendReminder('quote')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                title="Send quote reminder"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quote</span>
              </button>
              <button
                onClick={() => onSendReminder('appointment')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                title="Send appointment reminder"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Remind</span>
              </button>
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${clientName.split(' ')[0]}...`}
            rows={2}
            disabled={sending}
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[#F6B45A]/50 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2.5 bg-[#F6B45A] hover:bg-[#ffc67a] rounded-xl text-black font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[52px]"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-gray-600 mt-1.5 px-1">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ClientMessaging;
