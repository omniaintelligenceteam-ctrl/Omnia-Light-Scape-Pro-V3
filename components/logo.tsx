import React from 'react';

interface LogoProps {
  className?: string;
  dark?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-12", dark: _dark = false }) => {
  return (
    <img 
      src="/logo.png" 
      alt="Omnia's Light Scape Pro" 
      className={`${className} w-auto object-contain`}
    />
  );
};