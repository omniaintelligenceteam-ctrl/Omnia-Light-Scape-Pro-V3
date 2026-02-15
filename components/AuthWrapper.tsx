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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center" style={{ minHeight:'100vh', background:'linear-gradient(135deg,#111827,#1e3a5f,#312e81)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div className="text-center" style={{ textAlign:'center' }}>
          <div className="text-[#F6B45A] text-2xl font-bold mb-2" style={{ color:'#F6B45A', fontSize:'1.5rem', fontWeight:'bold', marginBottom:'0.5rem' }}>Omnia</div>
          <div className="text-white text-sm" style={{ color:'#ffffff', fontSize:'0.875rem' }}>Loading...</div>
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4" style={{ minHeight:'100vh', background:'linear-gradient(135deg,#111827,#1e3a5f,#312e81)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
        <div className="max-w-md w-full" style={{ maxWidth:'28rem', width:'100%' }}>
          <div className="text-center mb-8" style={{ textAlign:'center', marginBottom:'2rem' }}>
            <h1 className="text-4xl font-bold text-white mb-2" style={{ fontSize:'2.25rem', fontWeight:'bold', color:'#ffffff', marginBottom:'0.5rem' }}>Omnia Light Scape Pro</h1>
            <p className="text-gray-300" style={{ color:'#d1d5db' }}>Transform landscapes with AI-powered lighting</p>
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
