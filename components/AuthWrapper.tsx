import { SignIn, useUser } from '@clerk/clerk-react';
import { ReactNode, useState, useEffect } from 'react';

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isLoaded, isSignedIn } = useUser();
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setIsTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#F6B45A] text-2xl font-bold mb-2">Omnia</div>
          <div className="text-white text-sm">Loading...</div>
          {isTimedOut && (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-[#F6B45A] text-[#050505] rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#ffc67a] transition-all"
            >
              Reload Page
            </button>
          )}
        </div>
      </div>
    );
  }

  // Not signed in - show Clerk sign in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Omnia Light Scape Pro</h1>
            <p className="text-gray-300">Transform landscapes with AI-powered lighting</p>
          </div>
          <SignIn
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-white shadow-xl"
              }
            }}
          />
        </div>
      </div>
    );
  }

  // Signed in - render app
  return <>{children}</>;
}
