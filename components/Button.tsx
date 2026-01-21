import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  enableShine?: boolean;
  enableRipple?: boolean;
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  enableShine = true,
  enableRipple = true,
  onClick,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const baseStyles = "rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden";

  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3",
    lg: "px-8 py-4 text-lg",
  };

  const variants = {
    primary: "bg-[#F6B45A] text-black hover:bg-[#ffc67a] shadow-[0_0_20px_rgba(246,180,90,0.2)] hover:shadow-[0_0_30px_rgba(246,180,90,0.4)]",
    secondary: "bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20",
    outline: "bg-transparent border-2 border-[#F6B45A]/50 text-[#F6B45A] hover:bg-[#F6B45A]/10 hover:border-[#F6B45A]",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
  };

  // Get shine color based on variant
  const shineColor = variant === 'primary' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (enableRipple && !disabled && !isLoading) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = { x, y, id: Date.now() };
      setRipples(prev => [...prev, newRipple]);

      // Clean up ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }

    onClick?.(e);
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      {...props}
    >
      {/* Shine sweep effect */}
      {enableShine && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ x: '-100%' }}
          animate={{ x: isHovered && !disabled && !isLoading ? '200%' : '-100%' }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <div
            className="w-1/3 h-full skew-x-[-20deg]"
            style={{
              background: `linear-gradient(90deg, transparent, ${shineColor}, transparent)`
            }}
          />
        </motion.div>
      )}

      {/* Ripple effects */}
      <AnimatePresence>
        {enableRipple && ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              backgroundColor: variant === 'primary' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 200, height: 200, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
        {children}
      </span>
    </motion.button>
  );
};
