import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, Sparkles } from 'lucide-react';

interface DemoCelebrationProps {
  isVisible: boolean;
  onComplete: () => void;
}

// Confetti particle component
const ConfettiParticle: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  const randomX = Math.random() * 100;
  const randomRotate = Math.random() * 360;
  const randomDuration = 2 + Math.random() * 2;

  return (
    <motion.div
      initial={{
        opacity: 1,
        y: -20,
        x: `${randomX}vw`,
        rotate: 0,
        scale: 1
      }}
      animate={{
        opacity: 0,
        y: '100vh',
        rotate: randomRotate,
        scale: 0.5
      }}
      transition={{
        duration: randomDuration,
        delay,
        ease: 'easeOut'
      }}
      className="fixed top-0 z-[250] pointer-events-none"
      style={{
        left: 0,
        width: '12px',
        height: '12px',
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }}
    />
  );
};

const DemoCelebration: React.FC<DemoCelebrationProps> = ({
  isVisible,
  onComplete,
}) => {
  const [particles, setParticles] = useState<{ id: number; delay: number; color: string }[]>([]);

  const colors = [
    '#F6B45A', // Gold
    '#FFD700', // Yellow
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#A78BFA', // Purple
    '#60A5FA', // Blue
    '#34D399', // Green
    '#F472B6', // Pink
  ];

  useEffect(() => {
    if (isVisible) {
      // Generate confetti particles
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
      setParticles(newParticles);

      // Auto-dismiss after animation
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Confetti particles */}
          {particles.map((particle) => (
            <ConfettiParticle
              key={particle.id}
              delay={particle.delay}
              color={particle.color}
            />
          ))}

          {/* Celebration message overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[240] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-center"
            >
              {/* Animated icons */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <motion.div
                  animate={{
                    rotate: [-10, 10, -10],
                    y: [0, -10, 0]
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <PartyPopper className="w-12 h-12 text-[#F6B45A]" />
                </motion.div>
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 360]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <Sparkles className="w-16 h-16 text-amber-400" />
                </motion.div>
                <motion.div
                  animate={{
                    rotate: [10, -10, 10],
                    y: [0, -10, 0]
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.25
                  }}
                >
                  <PartyPopper className="w-12 h-12 text-[#F6B45A] scale-x-[-1]" />
                </motion.div>
              </div>

              {/* Message */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-bold text-white mb-2"
              >
                You're all set!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-gray-400 text-lg"
              >
                Demo mode complete. Time to build something amazing!
              </motion.p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DemoCelebration;
