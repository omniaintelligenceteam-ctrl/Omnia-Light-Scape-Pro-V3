import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface CTASceneProps {
  approvalUrl?: string;
  expiresAt?: string;
  companyName: string;
}

export const CTAScene: React.FC<CTASceneProps> = ({
  approvalUrl: _approvalUrl, // Reserved for future QR code generation
  expiresAt,
  companyName,
}) => {
  const frame = useCurrentFrame();

  // Background animation
  const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Button scale and bounce
  const buttonScale = interpolate(
    frame,
    [20, 40, 50, 55],
    [0, 1.1, 0.95, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const buttonOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Pulse animation for the button
  const pulseScale = interpolate(
    frame % 60,
    [0, 30, 60],
    [1, 1.02, 1],
    { extrapolateRight: 'clamp' }
  );

  // Text animations
  const textOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textY = interpolate(frame, [40, 60], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Expires text
  const expiresOpacity = interpolate(frame, [70, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Company branding
  const brandingOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Format expiration date
  const formatExpiration = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const expirationText = formatExpiration(expiresAt);

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
          inset: 0,
          background: 'radial-gradient(circle at 50% 30%, rgba(246, 180, 90, 0.08) 0%, transparent 50%)',
          opacity: bgOpacity,
        }}
      />

      {/* Animated rings */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 300 + i * 100,
            height: 300 + i * 100,
            borderRadius: '50%',
            border: `1px solid rgba(246, 180, 90, ${0.1 - i * 0.02})`,
            opacity: bgOpacity * (1 - i * 0.2),
          }}
        />
      ))}

      {/* Main content */}
      <div
        style={{
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Heading */}
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            marginBottom: 32,
          }}
        >
          <h2
            style={{
              fontSize: 42,
              fontWeight: 700,
              fontFamily: 'Playfair Display, serif',
              color: '#fff',
              margin: 0,
              marginBottom: 12,
            }}
          >
            Ready to Transform Your Space?
          </h2>
          <p
            style={{
              fontSize: 18,
              color: '#888',
              margin: 0,
            }}
          >
            Approve your quote to get started
          </p>
        </div>

        {/* CTA Button */}
        <div
          style={{
            opacity: buttonOpacity,
            transform: `scale(${buttonScale * pulseScale})`,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '20px 48px',
              background: 'linear-gradient(135deg, #F6B45A 0%, #E09A3A 100%)',
              borderRadius: 16,
              boxShadow: '0 20px 50px rgba(246, 180, 90, 0.4), 0 0 30px rgba(246, 180, 90, 0.2)',
              cursor: 'pointer',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: '#000' }}
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22,4 12,14.01 9,11.01" />
            </svg>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#000',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Approve Quote
            </span>
          </div>
        </div>

        {/* Expiration notice */}
        {expirationText && (
          <div
            style={{
              opacity: expiresOpacity,
              marginBottom: 48,
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: '#666',
              }}
            >
              Quote valid until{' '}
              <span style={{ color: '#F6B45A', fontWeight: 500 }}>
                {expirationText}
              </span>
            </span>
          </div>
        )}

        {/* Company branding */}
        <div
          style={{
            opacity: brandingOpacity,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(246, 180, 90, 0.2) 0%, rgba(224, 154, 58, 0.1) 100%)',
              border: '1px solid rgba(246, 180, 90, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: '#F6B45A' }}
            >
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 14,
              color: '#666',
            }}
          >
            Powered by{' '}
            <span style={{ color: '#888', fontWeight: 500 }}>
              {companyName}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
