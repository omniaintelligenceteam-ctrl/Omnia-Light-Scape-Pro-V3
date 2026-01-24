import React from 'react';
import { useCurrentFrame, interpolate, Img } from 'remotion';
import { BEFORE_DURATION, TRANSITION_DURATION } from './types';

interface BeforeAfterSceneProps {
  beforeImage?: string;
  afterImage?: string;
}

export const BeforeAfterScene: React.FC<BeforeAfterSceneProps> = ({
  beforeImage,
  afterImage,
}) => {
  const frame = useCurrentFrame();
  const totalDuration = BEFORE_DURATION + TRANSITION_DURATION;

  // Before image: visible for first portion, then fades
  const beforeOpacity = interpolate(
    frame,
    [0, BEFORE_DURATION, BEFORE_DURATION + 60],
    [1, 1, 0],
    { extrapolateRight: 'clamp' }
  );

  // Subtle zoom on before image
  const beforeScale = interpolate(
    frame,
    [0, BEFORE_DURATION],
    [1, 1.05],
    { extrapolateRight: 'clamp' }
  );

  // After image: fades in during transition
  const afterOpacity = interpolate(
    frame,
    [BEFORE_DURATION, BEFORE_DURATION + 60],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // After image zoom
  const afterScale = interpolate(
    frame,
    [BEFORE_DURATION, totalDuration],
    [1.05, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Labels
  const beforeLabelOpacity = interpolate(
    frame,
    [10, 30, BEFORE_DURATION, BEFORE_DURATION + 30],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const afterLabelOpacity = interpolate(
    frame,
    [BEFORE_DURATION + 30, BEFORE_DURATION + 60],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Placeholder gradient for missing images
  const placeholderGradient = 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)';

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#050505',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Before Image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: beforeOpacity,
          transform: `scale(${beforeScale})`,
        }}
      >
        {beforeImage ? (
          <Img
            src={beforeImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: placeholderGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#333', fontSize: 24 }}>Property Photo</span>
          </div>
        )}
      </div>

      {/* After Image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: afterOpacity,
          transform: `scale(${afterScale})`,
        }}
      >
        {afterImage ? (
          <Img
            src={afterImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1a1510 0%, #0a0a0a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#F6B45A', fontSize: 24 }}>Lighting Design</span>
          </div>
        )}
      </div>

      {/* Vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Before Label */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 60,
          opacity: beforeLabelOpacity,
        }}
      >
        <div
          style={{
            padding: '12px 24px',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Current View
          </span>
        </div>
      </div>

      {/* After Label */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 60,
          opacity: afterLabelOpacity,
        }}
      >
        <div
          style={{
            padding: '12px 24px',
            background: 'rgba(246, 180, 90, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(246, 180, 90, 0.3)',
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#000',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Your Lighting Design
          </span>
        </div>
      </div>

      {/* Corner accents */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          width: 40,
          height: 40,
          borderLeft: '3px solid rgba(246, 180, 90, 0.4)',
          borderTop: '3px solid rgba(246, 180, 90, 0.4)',
          opacity: afterOpacity,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 40,
          width: 40,
          height: 40,
          borderRight: '3px solid rgba(246, 180, 90, 0.4)',
          borderTop: '3px solid rgba(246, 180, 90, 0.4)',
          opacity: afterOpacity,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 40,
          width: 40,
          height: 40,
          borderLeft: '3px solid rgba(246, 180, 90, 0.4)',
          borderBottom: '3px solid rgba(246, 180, 90, 0.4)',
          opacity: afterOpacity,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          width: 40,
          height: 40,
          borderRight: '3px solid rgba(246, 180, 90, 0.4)',
          borderBottom: '3px solid rgba(246, 180, 90, 0.4)',
          opacity: afterOpacity,
        }}
      />
    </div>
  );
};
