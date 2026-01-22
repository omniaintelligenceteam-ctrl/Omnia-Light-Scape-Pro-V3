import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

// Subtle notification sounds (very short, quiet tones) - Base64 encoded tiny WAV files
const NOTIFICATION_SOUNDS: Record<ToastType, string> = {
  // Soft success chime - pleasant high tone
  success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZeWj4F0ZmJneIOQl5aOgXRlYmZ4g5CXlo+BdGViZniDkJeWj4F0ZWJmeIORl5aPgXRlYmZ4g5GXlo+BdGViZniDkZeWj4F0',
  // Low soft tone for errors
  error: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBdGJmeIOJj5KRjIN4bmZlbHWAiI2PjYiAdGtmZ2x1fIOIioiFfnVua2hsdXyChomIhX52bmtobnV8goaJiIV+dnBra253fIKGiYiFfnZwa2tud3yCh4mIhX52',
  // Mid-range alert tone
  warning: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhIN+eHZ4foSIioqHg352c3R4fYOHioqIhH93dHV4fYOHioqIhH93dHV4fYOHioqIhH93dHV5fYOHioqIhH93dHV5fYOHioqIhH93dHV5fYOHioqIhH93',
  // Neutral info tone
  info: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBg4F+fHt9gIOFhoaCfnt5eXt+gYSGhoSBfnt5en1/goWGhoSBfnt5en1/goWGhoSBfnt5en1/goWGhoSBfnt5en1/goWGhoSBfnt5en1/goWGhoSBfnt5',
};

// Play notification sound if enabled in settings
const playNotificationSound = (type: ToastType) => {
  try {
    const savedNotifications = localStorage.getItem('omnia_notifications');
    if (savedNotifications) {
      const notifications = JSON.parse(savedNotifications);
      if (notifications.soundEffects) {
        const audio = new Audio(NOTIFICATION_SOUNDS[type]);
        audio.volume = 0.15; // Keep it quiet
        audio.play().catch(() => {}); // Ignore errors (e.g., autoplay restrictions)
      }
    }
  } catch {
    // Silently fail if localStorage or audio fails
  }
};

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: ToastType, message: string, duration?: number, title?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000, title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, type, message, duration, title };

    // Play notification sound if enabled
    playNotificationSound(type);

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const startTime = Date.now();
    const duration = toast.duration;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining > 0) {
        requestAnimationFrame(updateProgress);
      }
    };

    const animationFrame = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationFrame);
  }, [toast.duration]);

  const config: Record<ToastType, {
    icon: React.ReactNode;
    iconBg: string;
    border: string;
    progressColor: string;
    title: string;
    glowClass: string;
  }> = {
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      iconBg: 'bg-emerald-500/20',
      border: 'border-emerald-500/20',
      progressColor: 'bg-emerald-500',
      title: 'Success',
      glowClass: 'toast-glow-success',
    },
    error: {
      icon: <XCircle className="w-4 h-4 text-red-400" />,
      iconBg: 'bg-red-500/20',
      border: 'border-red-500/20',
      progressColor: 'bg-red-500',
      title: 'Error',
      glowClass: 'toast-glow-error',
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      iconBg: 'bg-amber-500/20',
      border: 'border-amber-500/20',
      progressColor: 'bg-amber-500',
      title: 'Warning',
      glowClass: 'toast-glow-warning',
    },
    info: {
      icon: <Info className="w-4 h-4 text-blue-400" />,
      iconBg: 'bg-blue-500/20',
      border: 'border-blue-500/20',
      progressColor: 'bg-blue-500',
      title: 'Info',
      glowClass: 'toast-glow-info',
    },
  };

  const { icon, iconBg, border, progressColor, title, glowClass } = config[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`relative glass rounded-xl border overflow-hidden ${border} ${glowClass}`}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">{toast.title || title}</p>
          <p className="text-gray-400 text-xs mt-0.5">{toast.message}</p>
        </div>

        {/* Dismiss Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onDismiss(toast.id)}
          className="text-gray-500 hover:text-white transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Progress Bar */}
      {toast.duration && toast.duration > 0 && (
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${progressColor}/20`}>
          <motion.div
            className={`h-full ${progressColor}`}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}
    </motion.div>
  );
};

// Helper hooks for common toast patterns
export const useSuccessToast = () => {
  const { showToast } = useToast();
  return useCallback((message: string, title?: string) => showToast('success', message, 4000, title), [showToast]);
};

export const useErrorToast = () => {
  const { showToast } = useToast();
  return useCallback((message: string, title?: string) => showToast('error', message, 6000, title), [showToast]);
};

export const useWarningToast = () => {
  const { showToast } = useToast();
  return useCallback((message: string, title?: string) => showToast('warning', message, 5000, title), [showToast]);
};

export const useInfoToast = () => {
  const { showToast } = useToast();
  return useCallback((message: string, title?: string) => showToast('info', message, 4000, title), [showToast]);
};
