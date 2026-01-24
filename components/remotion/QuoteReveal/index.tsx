import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { IntroScene } from './IntroScene';
import { BeforeAfterScene } from './BeforeAfterScene';
import { LineItemsScene } from './LineItemsScene';
import { TotalRevealScene } from './TotalRevealScene';
import { CTAScene } from './CTAScene';
import {
  QuoteVideoProps,
  VIDEO_FPS,
  INTRO_DURATION,
  BEFORE_DURATION,
  TRANSITION_DURATION,
  LINE_ITEMS_DURATION,
  TOTAL_DURATION,
  CTA_DURATION,
  TOTAL_FRAMES,
} from './types';

export { VIDEO_FPS, TOTAL_FRAMES };
export type { QuoteVideoProps };

export const QuoteRevealVideo: React.FC<QuoteVideoProps> = ({
  companyName,
  companyLogo,
  clientName,
  projectName,
  beforeImage,
  afterImage,
  lineItems,
  subtotal,
  tax,
  total,
  approvalUrl,
  expiresAt,
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#050505',
      }}
    >
      {/* Scene 1: Intro */}
      <Sequence from={0} durationInFrames={INTRO_DURATION}>
        <IntroScene
          companyName={companyName}
          companyLogo={companyLogo}
          clientName={clientName}
          projectName={projectName}
        />
      </Sequence>

      {/* Scene 2: Before/After Image Transition */}
      <Sequence
        from={INTRO_DURATION}
        durationInFrames={BEFORE_DURATION + TRANSITION_DURATION}
      >
        <BeforeAfterScene
          beforeImage={beforeImage}
          afterImage={afterImage}
        />
      </Sequence>

      {/* Scene 3: Line Items */}
      <Sequence
        from={INTRO_DURATION + BEFORE_DURATION + TRANSITION_DURATION}
        durationInFrames={LINE_ITEMS_DURATION}
      >
        <LineItemsScene
          lineItems={lineItems}
          subtotal={subtotal}
        />
      </Sequence>

      {/* Scene 4: Total Reveal */}
      <Sequence
        from={INTRO_DURATION + BEFORE_DURATION + TRANSITION_DURATION + LINE_ITEMS_DURATION}
        durationInFrames={TOTAL_DURATION}
      >
        <TotalRevealScene
          subtotal={subtotal}
          tax={tax}
          total={total}
        />
      </Sequence>

      {/* Scene 5: CTA */}
      <Sequence
        from={INTRO_DURATION + BEFORE_DURATION + TRANSITION_DURATION + LINE_ITEMS_DURATION + TOTAL_DURATION}
        durationInFrames={CTA_DURATION}
      >
        <CTAScene
          approvalUrl={approvalUrl}
          expiresAt={expiresAt}
          companyName={companyName}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// Default export for Remotion composition registration
export default QuoteRevealVideo;
