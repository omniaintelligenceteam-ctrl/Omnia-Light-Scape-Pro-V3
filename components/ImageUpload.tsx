import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Check if device supports touch
const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(patterns[type]);
  }
};

// Compress image for faster upload
const compressImage = async (file: File, maxWidth = 1920, quality = 0.85): Promise<File> => {
  return new Promise((resolve) => {
    // If file is already small enough, return as-is
    if (file.size < 500000) { // 500KB
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

interface ImageUploadProps {
  currentImage: File | null;
  previewUrl: string | null;
  onImageSelect: (file: File) => void;
  onClear: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  previewUrl,
  onImageSelect,
  onClear,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Haptic feedback on file selection
      if (isTouchDevice) {
        triggerHaptic('light');
      }

      // Show processing state for larger files
      if (file.size > 500000) {
        setIsProcessing(true);
        setProcessingProgress(0);

        // Simulate progress (compression is quick but we want visual feedback)
        const progressInterval = setInterval(() => {
          setProcessingProgress(prev => Math.min(prev + 15, 90));
        }, 100);

        try {
          const compressedFile = await compressImage(file);
          clearInterval(progressInterval);
          setProcessingProgress(100);

          // Short delay to show 100% before completing
          setTimeout(() => {
            setIsProcessing(false);
            setProcessingProgress(0);
            onImageSelect(compressedFile);

            // Success haptic
            if (isTouchDevice) {
              triggerHaptic('medium');
            }
          }, 200);
        } catch {
          clearInterval(progressInterval);
          setIsProcessing(false);
          setProcessingProgress(0);
          // Fallback to original file
          onImageSelect(file);
        }
      } else {
        onImageSelect(file);
        if (isTouchDevice) {
          triggerHaptic('medium');
        }
      }
    }
    e.target.value = '';
  }, [onImageSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      onImageSelect(files[0]);
    }
  }, [onImageSelect]);

  // Uploaded state - premium display
  if (currentImage && previewUrl) {
    return (
      <motion.div
        className="relative w-full rounded-2xl overflow-hidden group"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Image container with premium styling */}
        <div className="relative aspect-[16/10] md:aspect-[16/9] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
          <img
            src={previewUrl}
            alt="Selected photo"
            className="w-full h-full object-contain transition-all duration-500 group-hover:scale-[1.02]"
          />

          {/* Subtle vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 pointer-events-none" />

          {/* Premium corner accents */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-3 left-3 w-5 h-5 border-l-2 border-t-2 border-[#F6B45A]/40 rounded-tl-sm" />
            <div className="absolute top-3 right-3 w-5 h-5 border-r-2 border-t-2 border-[#F6B45A]/40 rounded-tr-sm" />
            <div className="absolute bottom-3 left-3 w-5 h-5 border-l-2 border-b-2 border-[#F6B45A]/40 rounded-bl-sm" />
            <div className="absolute bottom-3 right-3 w-5 h-5 border-r-2 border-b-2 border-[#F6B45A]/40 rounded-br-sm" />
          </div>
        </div>

        {/* Action buttons - optimized touch targets */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <motion.button
            onClick={() => {
              if (isTouchDevice) triggerHaptic('light');
              galleryInputRef.current?.click();
            }}
            className="flex items-center gap-2 px-5 py-3 min-h-[48px] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-gray-300 hover:text-white text-sm font-medium transition-all touch-manipulation select-none"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Upload className="w-4 h-4" />
            Change Photo
          </motion.button>
          <motion.button
            onClick={() => {
              if (isTouchDevice) triggerHaptic('light');
              onClear();
            }}
            className="flex items-center gap-2 px-5 py-3 min-h-[48px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-xl text-red-400 hover:text-red-300 text-sm font-medium transition-all touch-manipulation select-none"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <X className="w-4 h-4" />
            Remove
          </motion.button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </motion.div>
    );
  }

  // Empty state - premium drop zone
  return (
    <motion.div
      className={`relative w-full rounded-2xl transition-all duration-300 ${
        isDragging ? 'scale-[1.02]' : ''
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Outer glow on drag */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            className="absolute -inset-2 bg-[#F6B45A]/20 blur-xl rounded-3xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Main drop zone */}
      <div className={`relative aspect-[16/10] sm:aspect-[16/10] md:aspect-[16/9] rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
        isDragging
          ? 'border-[#F6B45A] bg-[#F6B45A]/5'
          : 'border-white/10 hover:border-white/20 bg-gradient-to-b from-white/[0.02] to-black/20'
      }`}>

        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6">

          {/* Icon */}
          <motion.div
            className={`relative mb-4 sm:mb-6 transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}
            animate={isDragging ? { y: [0, -8, 0] } : {}}
            transition={{ repeat: isDragging ? Infinity : 0, duration: 1.5 }}
          >
            <div className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragging
                ? 'bg-[#F6B45A]/20 border-[#F6B45A]/30'
                : 'bg-white/[0.03] border-white/5'
            } border`}>
              <ImageIcon className={`w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 transition-colors duration-300 ${
                isDragging ? 'text-[#F6B45A]' : 'text-gray-400'
              }`} />
            </div>

            {/* Decorative ring - hidden on small mobile */}
            <div className={`hidden sm:block absolute -inset-2 rounded-3xl border transition-all duration-300 ${
              isDragging ? 'border-[#F6B45A]/30' : 'border-white/5'
            }`} />
          </motion.div>

          {/* Text */}
          <div className="text-center mb-4 sm:mb-6">
            <h3 className={`text-sm sm:text-base md:text-lg font-semibold mb-1 transition-colors duration-300 ${
              isDragging ? 'text-[#F6B45A]' : 'text-white'
            }`}>
              {isDragging ? 'Drop to upload' : 'Upload Photo'}
            </h3>
          </div>

          {/* Buttons - optimized touch targets */}
          <div className="flex flex-row items-center gap-2 sm:gap-3 w-full max-w-xs sm:max-w-sm px-2 sm:px-0">
            <motion.button
              onClick={() => {
                if (isTouchDevice) triggerHaptic('light');
                cameraInputRef.current?.click();
              }}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3.5 sm:py-4 min-h-[48px] bg-[#F6B45A] hover:bg-[#ffc67a] disabled:opacity-50 text-black rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-[#F6B45A]/20 touch-manipulation select-none"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="whitespace-nowrap">Take Photo</span>
            </motion.button>

            <motion.button
              onClick={() => {
                if (isTouchDevice) triggerHaptic('light');
                galleryInputRef.current?.click();
              }}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3.5 sm:py-4 min-h-[48px] bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-xl font-semibold text-xs sm:text-sm transition-all touch-manipulation select-none"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="whitespace-nowrap">Browse Files</span>
            </motion.button>
          </div>

          {/* Processing overlay */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="w-8 h-8 text-[#F6B45A] animate-spin mb-4" />
                <p className="text-white font-medium mb-2">Optimizing image...</p>
                <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#F6B45A] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${processingProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">{processingProgress}%</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
