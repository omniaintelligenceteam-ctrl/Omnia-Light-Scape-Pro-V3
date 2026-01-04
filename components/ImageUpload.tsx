import React from 'react';
import { Upload, X, Scan } from 'lucide-react';

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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
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
      className="group relative w-full aspect-video bg-[#0a0a0a] rounded-2xl border border-dashed border-gray-700 hover:border-[#F6B45A]/50 hover:bg-[#111] flex flex-col items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden shadow-inner"
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      </div>

      {/* Input - High Z-Index to ensure it captures clicks over visual elements */}
      <input 
        type="file" 
        accept="image/*" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
        onChange={handleFileChange}
      />
      
      {/* Visual Content - Low Z-Index/Pointer Events None to allow click through to input */}
      <div className="relative z-20 flex flex-col items-center pointer-events-none">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-black shadow-lg border border-gray-700 group-hover:border-[#F6B45A]/50 group-hover:scale-105 transition-all duration-300 flex items-center justify-center mb-6">
            <Upload className="w-8 h-8 text-gray-300 group-hover:text-[#F6B45A] transition-colors" />
        </div>
        
        <p className="text-xl font-bold text-white tracking-tight font-serif">Upload Photo</p>
      </div>
    </div>
  );
};