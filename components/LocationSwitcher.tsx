import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Building2, Check, Globe } from 'lucide-react';
import { Location } from '../types';

interface LocationSwitcherProps {
  locations: Location[];
  selectedLocationId: string | null; // null means "All Locations"
  onLocationChange: (locationId: string | null) => void;
  isLoading?: boolean;
}

export const LocationSwitcher: React.FC<LocationSwitcherProps> = ({
  locations,
  selectedLocationId,
  onLocationChange,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get only active locations
  const activeLocations = locations.filter(loc => loc.isActive);

  // Find the selected location
  const selectedLocation = selectedLocationId
    ? activeLocations.find(loc => loc.id === selectedLocationId)
    : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if there are no locations or only one
  if (activeLocations.length === 0) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl
          bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
          transition-all duration-200
          ${isOpen ? 'border-[#F6B45A]/40 bg-[#F6B45A]/5' : ''}
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={isLoading}
      >
        <div className="w-6 h-6 rounded-lg bg-[#F6B45A]/20 flex items-center justify-center shrink-0">
          {selectedLocation ? (
            <MapPin className="w-3.5 h-3.5 text-[#F6B45A]" />
          ) : (
            <Globe className="w-3.5 h-3.5 text-[#F6B45A]" />
          )}
        </div>
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-medium">
            Location
          </span>
          <span className="text-sm font-semibold text-white truncate max-w-[120px] md:max-w-[160px]">
            {selectedLocation ? selectedLocation.name : 'All Locations'}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-[100]"
          >
            {/* "All Locations" option */}
            <button
              onClick={() => {
                onLocationChange(null);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 transition-colors
                ${!selectedLocationId ? 'bg-[#F6B45A]/10' : 'hover:bg-white/5'}
              `}
            >
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center
                ${!selectedLocationId ? 'bg-[#F6B45A]/20' : 'bg-white/10'}
              `}>
                <Globe className={`w-4 h-4 ${!selectedLocationId ? 'text-[#F6B45A]' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold ${!selectedLocationId ? 'text-[#F6B45A]' : 'text-white'}`}>
                  All Locations
                </p>
                <p className="text-xs text-gray-500">
                  View all {activeLocations.length} locations
                </p>
              </div>
              {!selectedLocationId && (
                <Check className="w-4 h-4 text-[#F6B45A]" />
              )}
            </button>

            {/* Divider */}
            {activeLocations.length > 0 && (
              <div className="h-px bg-white/10 mx-3" />
            )}

            {/* Location list */}
            <div className="max-h-80 overflow-y-auto">
              {activeLocations.map((location) => {
                const isSelected = selectedLocationId === location.id;
                return (
                  <button
                    key={location.id}
                    onClick={() => {
                      onLocationChange(location.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 transition-colors
                      ${isSelected ? 'bg-[#F6B45A]/10' : 'hover:bg-white/5'}
                    `}
                  >
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center
                      ${isSelected ? 'bg-[#F6B45A]/20' : 'bg-white/10'}
                    `}>
                      <Building2 className={`w-4 h-4 ${isSelected ? 'text-[#F6B45A]' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#F6B45A]' : 'text-white'}`}>
                        {location.name}
                      </p>
                      {location.address && (
                        <p className="text-xs text-gray-500 truncate">
                          {location.address}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#F6B45A] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-white/10 bg-white/[0.02]">
              <p className="text-[10px] text-gray-500 text-center">
                Switch locations to filter all data
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
