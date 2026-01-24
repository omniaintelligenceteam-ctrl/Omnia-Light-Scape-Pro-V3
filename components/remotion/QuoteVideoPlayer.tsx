import React, { useMemo, ComponentType } from 'react';
import { Player } from '@remotion/player';
import { QuoteRevealVideo, QuoteVideoProps, VIDEO_FPS, TOTAL_FRAMES } from './QuoteReveal';

interface QuoteVideoPlayerProps {
  quoteData: QuoteVideoProps;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  showControls?: boolean;
}

export const QuoteVideoPlayer: React.FC<QuoteVideoPlayerProps> = ({
  quoteData,
  className = '',
  autoPlay = false,
  loop = false,
  showControls = true,
}) => {
  // Memoize the input props to prevent unnecessary re-renders
  const inputProps = useMemo(() => quoteData, [
    quoteData.companyName,
    quoteData.clientName,
    quoteData.projectName,
    quoteData.total,
    quoteData.lineItems.length,
  ]);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <Player
        component={QuoteRevealVideo as unknown as ComponentType<Record<string, unknown>>}
        inputProps={inputProps as unknown as Record<string, unknown>}
        durationInFrames={TOTAL_FRAMES}
        fps={VIDEO_FPS}
        compositionWidth={1920}
        compositionHeight={1080}
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
        controls={showControls}
        autoPlay={autoPlay}
        loop={loop}
        clickToPlay
        doubleClickToFullscreen
        spaceKeyToPlayOrPause
      />
    </div>
  );
};

export default QuoteVideoPlayer;
