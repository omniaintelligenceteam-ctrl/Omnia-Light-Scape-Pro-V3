import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Wifi, ImageOff, CreditCard, Clock, FileWarning, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  copied: boolean;
}

// Error classification for user-friendly messages
interface ErrorDetails {
  title: string;
  description: string;
  suggestion: string;
  icon: typeof AlertTriangle;
  iconBg: string;
  iconColor: string;
}

const classifyError = (error: Error | null): ErrorDetails => {
  const message = error?.message?.toLowerCase() || '';
  const name = error?.name?.toLowerCase() || '';

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch') || name.includes('networkerror')) {
    return {
      title: 'Connection Lost',
      description: 'We couldn\'t connect to our servers. This usually happens when your internet connection is unstable.',
      suggestion: 'Check your internet connection and try again.',
      icon: Wifi,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-500',
    };
  }

  // Image/upload errors
  if (message.includes('image') || message.includes('upload') || message.includes('file')) {
    return {
      title: 'Image Processing Failed',
      description: 'There was a problem processing your image. The file might be corrupted or in an unsupported format.',
      suggestion: 'Try a different image (JPG or PNG recommended).',
      icon: ImageOff,
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-500',
    };
  }

  // Payment/subscription errors
  if (message.includes('payment') || message.includes('subscription') || message.includes('stripe') || message.includes('billing')) {
    return {
      title: 'Payment Issue',
      description: 'There was a problem with your payment or subscription.',
      suggestion: 'Please check your billing information in Settings.',
      icon: CreditCard,
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-500',
    };
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out') || message.includes('took too long')) {
    return {
      title: 'Request Timed Out',
      description: 'The operation took too long to complete. This might happen during busy periods.',
      suggestion: 'Please wait a moment and try again.',
      icon: Clock,
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-500',
    };
  }

  // Quota/limit errors
  if (message.includes('quota') || message.includes('limit') || message.includes('exceeded') || message.includes('generation')) {
    return {
      title: 'Limit Reached',
      description: 'You\'ve reached your usage limit for this billing period.',
      suggestion: 'Upgrade your plan for more generations or wait until next month.',
      icon: FileWarning,
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-500',
    };
  }

  // Default error
  return {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Don\'t worry, your work has been saved.',
    suggestion: 'Try refreshing the page. If the problem persists, contact support.',
    icon: AlertTriangle,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-500',
  };
};

// Generate a short error reference ID
const generateErrorId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `ERR-${timestamp}-${random}`.toUpperCase();
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorId: generateErrorId() };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log error with ID for debugging
    console.error(`[${this.state.errorId}] Error Boundary caught an error:`, error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      copied: false,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleCopyErrorId = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(this.state.errorId);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // Fallback for older browsers
      console.log('Error ID:', this.state.errorId);
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorDetails = classifyError(this.state.error);
      const IconComponent = errorDetails.icon;

      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8" style={{ minHeight:'100vh', backgroundColor:'#050505', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
          <div className="max-w-md w-full text-center space-y-6 p-8 bg-[#111] rounded-2xl border border-white/10 shadow-2xl">
            {/* Error Icon - contextual */}
            <div className="flex justify-center">
              <div className={`w-16 h-16 rounded-full ${errorDetails.iconBg} flex items-center justify-center`}>
                <IconComponent className={`w-8 h-8 ${errorDetails.iconColor}`} />
              </div>
            </div>

            {/* Title - contextual */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">{errorDetails.title}</h1>
              <p className="text-gray-400 text-sm">
                {errorDetails.description}
              </p>
            </div>

            {/* What to do next */}
            <div className="bg-[#F6B45A]/10 border border-[#F6B45A]/20 rounded-xl p-4">
              <p className="text-[#F6B45A] text-sm font-medium">
                {errorDetails.suggestion}
              </p>
            </div>

            {/* Error Reference ID */}
            {this.state.errorId && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-gray-500">Reference:</span>
                <button
                  onClick={this.handleCopyErrorId}
                  className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <span className="font-mono">{this.state.errorId}</span>
                  {this.state.copied ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}

            {/* Error Details (collapsed by default) */}
            {this.state.error && (
              <details className="text-left bg-black/40 rounded-xl p-4 border border-white/5">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                  Technical details
                </summary>
                <pre className="mt-3 text-xs text-red-400 overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-24 font-mono">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-3 bg-[#F6B45A] text-[#050505] rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#ffc67a] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload App
              </button>
            </div>

            {/* Help text */}
            <p className="text-xs text-gray-500">
              If this problem persists, contact support with the reference ID above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
