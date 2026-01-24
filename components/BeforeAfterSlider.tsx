import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, GripVertical } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className = ''
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border border-white/10 cursor-ew-resize select-none ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Before Image (Full width, underneath) */}
      <div className="relative aspect-video">
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* After Image (Clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={afterImage}
            alt={afterLabel}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Slider Line */}
        <motion.div
          className="absolute top-0 bottom-0 w-1 bg-[#F6B45A] shadow-lg shadow-[#F6B45A]/30"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          animate={{ boxShadow: isDragging ? '0 0 20px rgba(246, 180, 90, 0.5)' : '0 0 10px rgba(246, 180, 90, 0.3)' }}
        >
          {/* Slider Handle */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#F6B45A] shadow-xl flex items-center justify-center"
            animate={{ scale: isDragging ? 1.15 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <GripVertical className="w-5 h-5 text-black" />
          </motion.div>
        </motion.div>

        {/* Labels */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
          <Moon className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">{beforeLabel}</span>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-[#F6B45A]/90 backdrop-blur-sm rounded-full">
          <Sun className="w-3.5 h-3.5 text-black" />
          <span className="text-xs font-semibold text-black uppercase tracking-wider">{afterLabel}</span>
        </div>

        {/* Corner Accents */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-[#F6B45A]/30 rounded-tl-sm" />
          <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-[#F6B45A]/30 rounded-tr-sm" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-[#F6B45A]/30 rounded-bl-sm" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-[#F6B45A]/30 rounded-br-sm" />
        </div>
      </div>

      {/* Instruction */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full">
        <span className="text-[10px] text-gray-300 uppercase tracking-wider">Drag to compare</span>
      </div>
    </div>
  );
};
