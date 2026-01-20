/**
 * Applies a diagonal "OMNIA FREE TRIAL" watermark to an image
 * @param imageDataUrl - Base64 data URL of the image
 * @returns Promise<string> - Base64 data URL of the watermarked image
 */
export async function applyWatermark(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Configure watermark text
        const fontSize = Math.max(18, Math.floor(img.width / 50));
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'; // White at 12% opacity - slightly more visible
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Calculate diagonal pattern
        const text = 'OMNIA FREE TRIAL';
        const textWidth = ctx.measureText(text).width;
        const spacing = textWidth + 150; // More space between repetitions

        // Save context state
        ctx.save();

        // Rotate canvas for diagonal effect
        ctx.translate(img.width / 2, img.height / 2);
        ctx.rotate(-Math.PI / 6); // -30 degrees

        // Calculate how many repetitions we need to cover the rotated canvas
        const diagonal = Math.sqrt(img.width * img.width + img.height * img.height);
        const repetitionsX = Math.ceil(diagonal / spacing) + 2;
        const repetitionsY = Math.ceil(diagonal / spacing) + 2;

        // Draw repeating pattern
        for (let x = -repetitionsX; x < repetitionsX; x++) {
          for (let y = -repetitionsY; y < repetitionsY; y++) {
            ctx.fillText(text, x * spacing, y * spacing);
          }
        }

        // Restore context
        ctx.restore();

        // Convert to data URL
        const watermarkedDataUrl = canvas.toDataURL('image/png', 1.0);
        resolve(watermarkedDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageDataUrl;
  });
}

/**
 * Check if watermark should be applied based on subscription status
 * @param hasActiveSubscription - Whether user has an active paid subscription
 * @returns boolean - true if watermark should be applied
 */
export function shouldApplyWatermark(hasActiveSubscription: boolean): boolean {
  return !hasActiveSubscription;
}
