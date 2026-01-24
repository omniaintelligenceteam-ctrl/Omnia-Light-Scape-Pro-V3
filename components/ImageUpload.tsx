import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Camera, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
    e.target.value = '';
  };

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

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <motion.button
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-gray-300 hover:text-white text-sm font-medium transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Upload className="w-4 h-4" />
            Change Photo
          </motion.button>
          <motion.button
            onClick={onClear}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-xl text-red-400 hover:text-red-300 text-sm font-medium transition-all"
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
      <div className={`relative aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
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

          {/* Buttons */}
          <div className="flex flex-row items-center gap-2 sm:gap-3 w-full max-w-xs sm:max-w-sm px-2 sm:px-0">
            <motion.button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-[#F6B45A] hover:bg-[#ffc67a] text-black rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-[#F6B45A]/20"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Camera className="w-4 h-4" />
              <span className="whitespace-nowrap">Take Photo</span>
            </motion.button>

            <motion.button
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-xl font-semibold text-xs sm:text-sm transition-all"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Upload className="w-4 h-4" />
              <span className="whitespace-nowrap">Browse Files</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
