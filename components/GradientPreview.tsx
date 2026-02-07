/**
 * GradientPreview
 *
 * Toggleable canvas overlay that renders directional light gradient cones
 * on top of the property image. Lets contractors preview the gradient map
 * before sending to Gemini.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import type { LightFixture } from '../types/fixtures';
import { paintGradientsToCanvas } from '../services/lightGradientPainter';

interface GradientPreviewProps {
  fixtures: LightFixture[];
  containerWidth: number;
  containerHeight: number;
  visible: boolean;
}

export const GradientPreview: React.FC<GradientPreviewProps> = ({
  fixtures,
  containerWidth,
  containerHeight,
  visible,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;

    // Match canvas resolution to container
    const dpr = window.devicePixelRatio || 1;
    const w = containerWidth;
    const h = containerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Semi-transparent dark overlay so cones pop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, w, h);

    // Paint gradient cones
    paintGradientsToCanvas(ctx, fixtures, w, h);
  }, [fixtures, containerWidth, containerHeight, visible]);

  // Debounced redraw when fixtures or size change
  useEffect(() => {
    if (!visible) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    }, 150);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, visible]);

  if (!visible || fixtures.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
};
