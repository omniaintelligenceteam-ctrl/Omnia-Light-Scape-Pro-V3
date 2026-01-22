import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';

export interface Message {
  id: string;
  sender_type: 'client' | 'company';
  sender_name: string;
  message_text: string;
  created_at: string;
  read_at?: string;
}

interface ClientCommunicationHubProps {
  messages: Message[];
  clientName: string;
  token: string;
  onSendMessage: (message: string) => Promise<void>;
  onMarkRead: (messageIds: string[]) => void;
}

export const ClientCommunicationHub: React.FC<ClientCommunicationHubProps> = ({
  messages,
  clientName,
  token,
  onSendMessage,
  onMarkRead
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();

    // Mark company messages as read
    const unreadCompanyMessages = messages
      .filter(m => m.sender_type === 'company' && !m.read_at)
      .map(m => m.id);

    if (unreadCompanyMessages.length > 0) {
      onMarkRead(unreadCompanyMessages);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-white/10">
        <MessageCircle className="w-12 h-12 text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 mb-1">No messages yet</p>
        <p className="text-xs text-gray-600">Start a conversation by sending a message below</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isClient = message.sender_type === 'client';

          return (
            <div
              key={message.id}
              className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${isClient ? 'order-2' : 'order-1'}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    isClient
                      ? 'bg-blue-500/20 border border-blue-500/30 rounded-br-sm'
                      : 'bg-white/10 border border-white/10 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm text-white whitespace-pre-wrap break-words">
                    {message.message_text}
                  </p>
                </div>
                <div className={`flex items-center gap-2 mt-1 px-2 ${isClient ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-xs text-gray-500">
                    {message.sender_name}
                  </span>
                  <span className="text-xs text-gray-600">•</span>
                  <span className="text-xs text-gray-600">
                    {formatTime(message.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 p-4">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            rows={2}
            disabled={sending}
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="px-6 py-3 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
