import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ProjectPhoto {
  id: string;
  project_id: string;
  photo_url: string;
  label?: string;
  photo_type: 'before' | 'after' | 'progress' | 'final' | 'detail' | 'other';
  display_order: number;
}

interface ProjectGalleryProps {
  photos: ProjectPhoto[];
  projectId: string;
}

const photoTypeLabels: Record<string, string> = {
  before: 'Before',
  after: 'After',
  progress: 'Progress',
  final: 'Final',
  detail: 'Detail',
  other: 'Photo'
};

const photoTypeColors: Record<string, string> = {
  before: 'bg-red-500/20 border-red-500/30 text-red-400',
  after: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  progress: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  final: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
  detail: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  other: 'bg-gray-500/20 border-gray-500/30 text-gray-400'
};

export const ProjectGallery: React.FC<ProjectGalleryProps> = ({ photos, projectId }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const projectPhotos = photos
    .filter(p => p.project_id === projectId)
    .sort((a, b) => a.display_order - b.display_order);

  if (projectPhotos.length === 0) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
        <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No photos available yet</p>
        <p className="text-xs text-gray-600 mt-1">Photos will appear here once uploaded</p>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % projectPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + projectPhotos.length) % projectPhotos.length);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!lightboxOpen) return;
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'ArrowLeft') prevPhoto();
    if (e.key === 'Escape') setLightboxOpen(false);
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as any);
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  }, [lightboxOpen]);

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectPhotos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative group cursor-pointer aspect-video rounded-xl overflow-hidden border border-white/10 bg-black"
            onClick={() => openLightbox(index)}
          >
            <img
              src={photo.photo_url}
              alt={photo.label || photoTypeLabels[photo.photo_type]}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {photo.label && (
                  <p className="text-white font-medium text-sm mb-2">{photo.label}</p>
                )}
                <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium border ${photoTypeColors[photo.photo_type]}`}>
                  {photoTypeLabels[photo.photo_type]}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Previous Button */}
            {projectPhotos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl max-h-[90vh] mx-auto px-16"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={projectPhotos[currentIndex].photo_url}
                alt={projectPhotos[currentIndex].label || photoTypeLabels[projectPhotos[currentIndex].photo_type]}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />

              {/* Caption */}
              <div className="text-center mt-4">
                {projectPhotos[currentIndex].label && (
                  <p className="text-white font-medium mb-2">
                    {projectPhotos[currentIndex].label}
                  </p>
                )}
                <div className="flex items-center justify-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${photoTypeColors[projectPhotos[currentIndex].photo_type]}`}>
                    {photoTypeLabels[projectPhotos[currentIndex].photo_type]}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {currentIndex + 1} / {projectPhotos.length}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Next Button */}
            {projectPhotos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
