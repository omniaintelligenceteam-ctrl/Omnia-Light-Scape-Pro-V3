import React, { useRef } from 'react';
import { Upload, X, Camera } from 'lucide-react';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  if (currentImage && previewUrl) {
    return (
      <div className="relative w-full h-[50vh] md:h-[60vh] rounded-2xl overflow-hidden group shadow-2xl border border-white/10 bg-black">
        <img 
          src={previewUrl} 
          alt="Original" 
          className="w-full h-full object-contain pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-500"
        />
        
        {/* Tech Overlay lines */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-[#F6B45A]/50"></div>
            <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-[#F6B45A]/50"></div>
            <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-[#F6B45A]/50"></div>
            <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-[#F6B45A]/50"></div>
        </div>

        <div className="absolute top-4 right-4 z-30">
          <button 
            onClick={onClear}
            className="p-3 bg-black/60 hover:bg-[#F6B45A] hover:text-black text-white rounded-full backdrop-blur-md transition-all border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-video bg-[#0a0a0a] rounded-2xl border border-dashed border-gray-700 flex flex-col items-center justify-center transition-all duration-300 overflow-hidden shadow-inner"
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      </div>

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

      {/* Button Content */}
      <div className="relative z-20 flex flex-col items-center gap-4 px-6 w-full max-w-xs">
        {/* Take Photo - Primary Button */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#F6B45A] text-black rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#ffc67a] active:scale-95 transition-all shadow-lg"
        >
          <Camera className="w-5 h-5" />
          Take Photo
        </button>

        {/* Upload from Gallery - Secondary Button */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-transparent border border-white/20 text-gray-300 rounded-xl font-bold text-sm uppercase tracking-wider hover:border-[#F6B45A]/50 hover:text-white active:scale-95 transition-all"
        >
          <Upload className="w-5 h-5" />
          Upload from Gallery
        </button>
      </div>
    </div>
  );
};