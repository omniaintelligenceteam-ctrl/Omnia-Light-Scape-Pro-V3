import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { QuoteLineItem } from './types';

interface LineItemsSceneProps {
  lineItems: QuoteLineItem[];
  subtotal: number;
}

export const LineItemsScene: React.FC<LineItemsSceneProps> = ({
  lineItems,
  subtotal: _subtotal, // Available for display if needed
}) => {
  const frame = useCurrentFrame();

  // Header animation
  const headerOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const headerY = interpolate(frame, [0, 20], [-20, 0], {
    extrapolateRight: 'clamp',
  });

  // Calculate running total based on visible items
  const getRunningTotal = (itemIndex: number) => {
    let total = 0;
    for (let i = 0; i <= itemIndex; i++) {
      const itemFrame = i * 20 + 30;
      if (frame >= itemFrame + 15) {
        total += lineItems[i]?.total || 0;
      }
    }
    return total;
  };

  const visibleItemsCount = Math.min(
    Math.floor((frame - 30) / 20) + 1,
    lineItems.length
  );
  const runningTotal = getRunningTotal(visibleItemsCount - 1);

  // Running total animation
  const runningTotalOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#050505',
        padding: 60,
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background effects */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '100%',
          background: 'radial-gradient(circle at 100% 0%, rgba(246, 180, 90, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          marginBottom: 40,
        }}
      >
        <h2
          style={{
            fontSize: 36,
            fontWeight: 700,
            fontFamily: 'Playfair Display, serif',
            color: '#fff',
            margin: 0,
          }}
        >
          Your Quote
        </h2>
        <div
          style={{
            width: 60,
            height: 3,
            background: 'linear-gradient(90deg, #F6B45A, transparent)',
            marginTop: 16,
          }}
        />
      </div>

      {/* Line Items */}
      <div style={{ position: 'relative' }}>
        {lineItems.slice(0, 8).map((item, index) => {
          const itemDelay = index * 20 + 30;

          const itemOpacity = interpolate(
            frame,
            [itemDelay, itemDelay + 15],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          const itemX = interpolate(
            frame,
            [itemDelay, itemDelay + 15],
            [50, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          // Price counter animation
          const priceProgress = interpolate(
            frame,
            [itemDelay + 5, itemDelay + 20],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const displayPrice = Math.round(item.total * priceProgress);

          return (
            <div
              key={index}
              style={{
                opacity: itemOpacity,
                transform: `translateX(${itemX}px)`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: '#fff',
                  }}
                >
                  {item.name}
                </span>
                {item.quantity > 1 && (
                  <span
                    style={{
                      fontSize: 14,
                      color: '#666',
                      marginLeft: 12,
                    }}
                  >
                    × {item.quantity}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#F6B45A',
                  fontFamily: 'monospace',
                }}
              >
                ${displayPrice.toLocaleString()}
              </div>
            </div>
          );
        })}

        {lineItems.length > 8 && (
          <div
            style={{
              opacity: interpolate(frame, [180, 200], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              padding: '16px 0',
              textAlign: 'center',
              color: '#666',
              fontSize: 14,
            }}
          >
            + {lineItems.length - 8} more items
          </div>
        )}
      </div>

      {/* Running Total */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          right: 60,
          opacity: runningTotalOpacity,
          textAlign: 'right',
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 8,
          }}
        >
          Subtotal
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'monospace',
          }}
        >
          ${runningTotal.toLocaleString()}
        </div>
      </div>
    </div>
  );
};
