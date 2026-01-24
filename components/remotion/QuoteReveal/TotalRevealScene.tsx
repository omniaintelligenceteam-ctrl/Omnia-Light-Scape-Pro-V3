import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface TotalRevealSceneProps {
  subtotal: number;
  tax: number;
  total: number;
}

export const TotalRevealScene: React.FC<TotalRevealSceneProps> = ({
  subtotal,
  tax,
  total,
}) => {
  const frame = useCurrentFrame();

  // Background blur in
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Card scale up
  const cardScale = interpolate(frame, [10, 35], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cardOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Price counter animation
  const priceProgress = interpolate(frame, [25, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const displayTotal = Math.round(total * priceProgress);

  // Glow pulse
  const glowIntensity = interpolate(
    frame,
    [60, 70, 80, 90],
    [0.3, 0.6, 0.3, 0.4],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Subtotal/tax fade in
  const detailsOpacity = interpolate(frame, [45, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#050505',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Blurred background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(246, 180, 90, 0.1) 0%, transparent 50%)',
          opacity: bgOpacity,
        }}
      />

      {/* Animated glow ring */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(246, 180, 90, ${glowIntensity}) 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />

      {/* Main card */}
      <div
        style={{
          opacity: cardOpacity,
          transform: `scale(${cardScale})`,
          background: 'linear-gradient(180deg, rgba(17, 17, 17, 0.95) 0%, rgba(10, 10, 10, 0.98) 100%)',
          borderRadius: 24,
          padding: '48px 64px',
          border: '1px solid rgba(246, 180, 90, 0.2)',
          boxShadow: `0 40px 80px rgba(0, 0, 0, 0.5), 0 0 60px rgba(246, 180, 90, ${glowIntensity * 0.3})`,
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Corner accents */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            width: 24,
            height: 24,
            borderLeft: '2px solid rgba(246, 180, 90, 0.4)',
            borderTop: '2px solid rgba(246, 180, 90, 0.4)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 24,
            height: 24,
            borderRight: '2px solid rgba(246, 180, 90, 0.4)',
            borderTop: '2px solid rgba(246, 180, 90, 0.4)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            width: 24,
            height: 24,
            borderLeft: '2px solid rgba(246, 180, 90, 0.4)',
            borderBottom: '2px solid rgba(246, 180, 90, 0.4)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            width: 24,
            height: 24,
            borderRight: '2px solid rgba(246, 180, 90, 0.4)',
            borderBottom: '2px solid rgba(246, 180, 90, 0.4)',
          }}
        />

        {/* Label */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'rgba(246, 180, 90, 0.8)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: 16,
          }}
        >
          Investment Total
        </div>

        {/* Main price */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            fontFamily: 'Playfair Display, serif',
            color: '#F6B45A',
            textShadow: `0 0 40px rgba(246, 180, 90, ${glowIntensity})`,
            marginBottom: 24,
          }}
        >
          ${displayTotal.toLocaleString()}
        </div>

        {/* Subtotal and tax */}
        <div
          style={{
            opacity: detailsOpacity,
            display: 'flex',
            justifyContent: 'center',
            gap: 40,
            paddingTop: 24,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              Subtotal
            </div>
            <div style={{ fontSize: 18, color: '#fff', fontWeight: 500 }}>
              ${subtotal.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              Tax
            </div>
            <div style={{ fontSize: 18, color: '#fff', fontWeight: 500 }}>
              ${tax.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
