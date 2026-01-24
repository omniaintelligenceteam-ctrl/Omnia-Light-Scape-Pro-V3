import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eraser, Check, PenTool } from 'lucide-react';
import SignaturePad from 'signature_pad';

interface SignatureCaptureProps {
  onSignatureChange: (signature: string | null) => void;
  disabled?: boolean;
}

export const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  onSignatureChange,
  disabled = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    // Set canvas size
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);

    // Initialize signature pad
    signaturePadRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgba(0, 0, 0, 0)',
      penColor: '#F6B45A',
      minWidth: 1,
      maxWidth: 3,
      throttle: 16
    });

    // Handle end of stroke
    signaturePadRef.current.addEventListener('endStroke', () => {
      if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
        setHasSignature(true);
        const dataUrl = signaturePadRef.current.toDataURL('image/png');
        onSignatureChange(dataUrl);
      }
    });

    // Resize handler
    const handleResize = () => {
      if (!canvasRef.current || !signaturePadRef.current) return;

      const data = signaturePadRef.current.toData();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);

      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);

      signaturePadRef.current.clear();
      signaturePadRef.current.fromData(data);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      signaturePadRef.current?.off();
    };
  }, [onSignatureChange]);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setHasSignature(false);
      onSignatureChange(null);
    }
  };

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#F6B45A]/20 flex items-center justify-center">
            <PenTool className="w-4 h-4 text-[#F6B45A]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Your Signature</h4>
            <p className="text-[10px] text-gray-500">Sign above to approve</p>
          </div>
        </div>
        {hasSignature && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
          >
            <Eraser className="w-3.5 h-3.5" />
            Clear
          </motion.button>
        )}
      </div>

      {/* Canvas */}
      <div className="relative">
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-white/10 pointer-events-none" />
        <canvas
          ref={canvasRef}
          className="w-full h-32 rounded-xl bg-black/30 cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
        />

        {/* Signature line */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sign Here</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Signed indicator */}
        {hasSignature && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </motion.div>
        )}
      </div>

      {!hasSignature && (
        <p className="text-xs text-gray-500 text-center">
          Use your mouse or finger to sign above
        </p>
      )}
    </div>
  );
};
