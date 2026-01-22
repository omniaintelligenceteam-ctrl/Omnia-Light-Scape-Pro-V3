import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ColorOption {
  id: string;
  name: string;
  primary: string;
  glow: string;
}

interface ColorPickerProps {
  colors: readonly ColorOption[];
  value: string;
  onChange: (colorId: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ colors, value, onChange }) => (
  <div className="flex flex-wrap gap-3">
    {colors.map((color) => {
      const isSelected = value === color.id;

      return (
        <motion.button
          key={color.id}
          onClick={() => onChange(color.id)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
            isSelected ? 'bg-white/10' : 'hover:bg-white/5'
          }`}
        >
          <div className="relative">
            <div
              className={`w-10 h-10 rounded-full transition-all duration-300 ${
                isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a]' : ''
              }`}
              style={{
                backgroundColor: color.primary,
                boxShadow: isSelected ? `0 0 25px ${color.glow}` : 'none'
              }}
            />
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                  <Check className="w-3 h-3 text-black" />
                </div>
              </motion.div>
            )}
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${
            isSelected ? 'text-white' : 'text-gray-500'
          }`}>
            {color.name}
          </span>
        </motion.button>
      );
    })}
  </div>
);
