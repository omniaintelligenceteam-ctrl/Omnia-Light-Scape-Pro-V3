import React from 'react';
import { useCurrentFrame, interpolate, Img } from 'remotion';

interface IntroSceneProps {
  companyName: string;
  companyLogo?: string;
  clientName: string;
  projectName: string;
}

export const IntroScene: React.FC<IntroSceneProps> = ({
  companyName,
  companyLogo,
  clientName,
  projectName,
}) => {
  const frame = useCurrentFrame();

  // Logo fade in (frames 0-20)
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const logoScale = interpolate(frame, [0, 20], [0.8, 1], {
    extrapolateRight: 'clamp',
  });

  // "Lighting Proposal" fade in (frames 15-35)
  const titleOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [15, 35], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Gold line animation (frames 30-50)
  const lineWidth = interpolate(frame, [30, 50], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // "Prepared for [Name]" fade in (frames 45-65)
  const preparedOpacity = interpolate(frame, [45, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const preparedY = interpolate(frame, [45, 65], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Client name fade in (frames 55-75)
  const clientOpacity = interpolate(frame, [55, 75], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const clientScale = interpolate(frame, [55, 75], [0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#050505',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          height: '60%',
          background: 'radial-gradient(circle at 50% 0%, rgba(246, 180, 90, 0.08) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.03,
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      {/* Company Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          marginBottom: 40,
        }}
      >
        {companyLogo ? (
          <Img
            src={companyLogo}
            style={{
              height: 80,
              maxWidth: 200,
              objectFit: 'contain',
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #F6B45A 0%, #E09A3A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(246, 180, 90, 0.3)',
            }}
          >
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: '#000',
              }}
            >
              {companyName.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          marginBottom: 24,
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: 'rgba(246, 180, 90, 0.8)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
          }}
        >
          Lighting Proposal
        </span>
      </div>

      {/* Gold accent line */}
      <div
        style={{
          width: `${lineWidth}px`,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #F6B45A, transparent)',
          marginBottom: 32,
        }}
      />

      {/* Prepared for */}
      <div
        style={{
          opacity: preparedOpacity,
          transform: `translateY(${preparedY}px)`,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 16,
            color: '#888',
          }}
        >
          Prepared exclusively for
        </span>
      </div>

      {/* Client name */}
      <div
        style={{
          opacity: clientOpacity,
          transform: `scale(${clientScale})`,
        }}
      >
        <span
          style={{
            fontSize: 48,
            fontWeight: 700,
            fontFamily: 'Playfair Display, serif',
            color: '#fff',
          }}
        >
          {clientName}
        </span>
      </div>

      {/* Project name */}
      {projectName && (
        <div
          style={{
            opacity: clientOpacity,
            marginTop: 12,
          }}
        >
          <span
            style={{
              fontSize: 18,
              color: '#666',
            }}
          >
            {projectName}
          </span>
        </div>
      )}
    </div>
  );
};
