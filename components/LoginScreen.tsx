import React, { useState } from 'react';
import { ShieldCheck, ChevronRight, Lock, KeyRound, UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'LOGIN' | 'SETUP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('AUTHENTICATING...');
  const [feedback, setFeedback] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // Tech-deco background grid
  const GridBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      ></div>
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#F6B45A]/5 blur-[120px] rounded-full"></div>
    </div>
  );

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!email || !password) {
        setFeedback({ type: 'error', text: 'Please fill in all fields.' });
        return;
    }

    if (mode === 'SETUP') {
        // Signup Logic
        if (password !== confirmPassword) {
            setFeedback({ type: 'error', text: 'Passwords do not match.' });
            return;
        }
        if (password.length < 4) {
            setFeedback({ type: 'error', text: 'Password must be at least 4 characters.' });
            return;
        }

        setIsLoading(true);
        setLoadingText('CREATING ACCOUNT...');

        setTimeout(() => {
            localStorage.setItem('omnia_user', JSON.stringify({ email, password }));
            setLoadingText('LOGGING IN...');
            setTimeout(() => {
                onLogin();
            }, 800);
        }, 1000);

    } else {
        // Login Logic
        const stored = localStorage.getItem('omnia_user');
        
        setIsLoading(true);
        setLoadingText('VERIFYING...');

        setTimeout(() => {
             if (!stored) {
                setIsLoading(false);
                setFeedback({ type: 'error', text: 'Account not found. Please create one.' });
                return;
            }

            const user = JSON.parse(stored);
            if (user.email.toLowerCase() !== email.toLowerCase() || user.password !== password) {
                setIsLoading(false);
                setFeedback({ type: 'error', text: 'Invalid email or password.' });
                return;
            }

            setLoadingText('LOGGING IN...');
            setTimeout(() => {
                onLogin();
            }, 800);
        }, 1000);
    }
  };

  const handleDevBypass = () => {
    setIsLoading(true);
    setLoadingText('DEV BYPASS...');
    
    setTimeout(() => {
        setLoadingText('ACCESS GRANTED...');
        setTimeout(() => {
             onLogin();
        }, 600);
    }, 600);
  };

  const toggleMode = () => {
      setFeedback(null);
      setMode(mode === 'LOGIN' ? 'SETUP' : 'LOGIN');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden font-sans text-white">
      <GridBackground />

      {/* Hidden Dev Bypass - Top Right Corner */}
      <div className="absolute top-0 right-0 z-50">
        <button 
            onClick={handleDevBypass}
            className="w-16 h-16 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-500 group cursor-pointer"
            title="Dev Override"
        >
            <div className="w-2 h-2 bg-[#F6B45A] rounded-full shadow-[0_0_15px_#F6B45A] animate-pulse"></div>
        </button>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md p-8 md:p-12">
        
        {/* Card Container */}
        <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl p-8 md:p-10 relative overflow-hidden group transition-all duration-500">
            
            {/* Top decorative line */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${mode === 'SETUP' ? 'via-blue-400/50' : 'via-[#F6B45A]/50'} to-transparent transition-all duration-500`}></div>

            {/* Logo Section */}
            <div className="text-center mb-8">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border mb-4 shadow-[0_0_20px_rgba(0,0,0,0.2)] transition-colors duration-500 ${
                    mode === 'SETUP' 
                    ? 'bg-blue-500/10 border-blue-500/20' 
                    : 'bg-[#F6B45A]/10 border-[#F6B45A]/20'
                }`}>
                    {mode === 'SETUP' ? (
                        <UserPlus className="w-6 h-6 text-blue-400" />
                    ) : (
                        <Lock className="w-6 h-6 text-[#F6B45A]" />
                    )}
                </div>
                <h1 className="text-4xl font-bold text-white font-serif tracking-tight mb-1">Omnia</h1>
                <p className={`text-[10px] font-bold uppercase tracking-[0.3em] transition-colors duration-500 ${mode === 'SETUP' ? 'text-blue-400' : 'text-[#F6B45A]'}`}>
                    {mode === 'SETUP' ? 'Create Account' : 'Secure Login'}
                </p>
            </div>

            {/* Form Container */}
            {isLoading ? (
                <div className="h-[280px] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
                    <div className="relative">
                        <div className={`w-16 h-16 border-2 border-white/10 rounded-full animate-spin ${mode === 'SETUP' ? 'border-t-blue-400' : 'border-t-[#F6B45A]'}`}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-white/20" />
                        </div>
                    </div>
                    <p className={`text-xs font-mono animate-pulse ${mode === 'SETUP' ? 'text-blue-400' : 'text-[#F6B45A]'}`}>{loadingText}</p>
                </div>
            ) : (
                <form onSubmit={handleAuth} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Input: Email */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white ml-1">Email</label>
                        <div className="relative group/input">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className={`w-1.5 h-1.5 rounded-full bg-gray-400 transition-colors ${mode === 'SETUP' ? 'group-focus-within/input:bg-blue-400' : 'group-focus-within/input:bg-[#F6B45A]'}`}></span>
                            </div>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`w-full bg-[#050505] border border-white/10 rounded-xl py-3.5 pl-8 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all font-mono ${
                                    mode === 'SETUP' 
                                    ? 'focus:border-blue-400/50 focus:ring-blue-400/50' 
                                    : 'focus:border-[#F6B45A]/50 focus:ring-[#F6B45A]/50'
                                }`}
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    {/* Input: Password */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white ml-1">Password</label>
                        <div className="relative group/input">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <KeyRound className={`w-3.5 h-3.5 text-gray-400 transition-colors ${mode === 'SETUP' ? 'group-focus-within/input:text-blue-400' : 'group-focus-within/input:text-[#F6B45A]'}`} />
                            </div>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full bg-[#050505] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all font-mono ${
                                    mode === 'SETUP' 
                                    ? 'focus:border-blue-400/50 focus:ring-blue-400/50' 
                                    : 'focus:border-[#F6B45A]/50 focus:ring-[#F6B45A]/50'
                                }`}
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>

                    {/* Input: Confirm Password (Setup Only) */}
                    {mode === 'SETUP' && (
                        <div className="space-y-1 animate-in slide-in-from-top-2 fade-in duration-300">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white ml-1">Confirm Password</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <KeyRound className="w-3.5 h-3.5 text-gray-400 group-focus-within/input:text-blue-400 transition-colors" />
                                </div>
                                <input 
                                    type="password" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/50 font-mono transition-all"
                                    placeholder="••••••••••••"
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Feedback Message */}
                    {feedback && (
                        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/20 rounded-lg animate-in slide-in-from-top-1">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-[10px] font-mono font-bold text-red-400">{feedback.text}</span>
                        </div>
                    )}

                    {/* Main Action Button */}
                    <button 
                        type="submit"
                        className={`w-full rounded-xl py-4 font-bold text-xs uppercase tracking-[0.2em] shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 ${
                            mode === 'SETUP' 
                            ? 'bg-blue-500 text-white hover:bg-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]' 
                            : 'bg-[#F6B45A] text-[#050505] hover:bg-[#ffc67a] hover:shadow-[0_0_30px_rgba(246,180,90,0.4)]'
                        }`}
                    >
                        <span>{mode === 'SETUP' ? 'Create Account' : 'Login'}</span>
                        <ChevronRight className="w-3 h-3" />
                    </button>
                    
                    {/* Create Account / Login Toggle */}
                    <div className="text-center pt-4 border-t border-white/5 mt-6">
                        <p className="text-[10px] text-white font-mono mb-3">
                            {mode === 'SETUP' ? 'Already have an account?' : 'No account?'}
                        </p>
                         <button 
                            type="button" 
                            onClick={toggleMode}
                            className={`text-xs font-bold uppercase tracking-wider transition-all border py-2 px-4 rounded-lg flex items-center justify-center gap-2 w-full ${
                                mode === 'SETUP'
                                ? 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                                : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400'
                            }`}
                         >
                            {mode === 'SETUP' 
                                ? <><ArrowLeft className="w-3 h-3"/> Back to Login</> 
                                : <><UserPlus className="w-3 h-3"/> Create New Account</>
                            }
                         </button>
                    </div>

                </form>
            )}
            
            <div className="mt-8 flex justify-center">
                 <p className="text-[9px] text-white font-mono">SECURE GATEWAY V3.0.4</p>
            </div>
        </div>
      </div>
    </div>
  );
};