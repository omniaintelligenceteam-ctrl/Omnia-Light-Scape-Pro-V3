import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  isLoading, 
  variant = 'primary', 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  
  const variants = {
    primary: "bg-[#F6B45A] text-[#111111] hover:bg-[#ffc67a] shadow-[0_0_15px_rgba(246,180,90,0.3)] hover:shadow-[0_0_25px_rgba(246,180,90,0.5)]",
    secondary: "bg-[#222222] text-white hover:bg-[#333333] border border-[#333333]",
    outline: "bg-transparent border-2 border-[#F6B45A] text-[#F6B45A] hover:bg-[#F6B45A] hover:text-[#111111]"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
};