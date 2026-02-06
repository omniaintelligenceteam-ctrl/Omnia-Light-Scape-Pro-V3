/**
 * Canvas Night Service
 *
 * Pre-darkens a daytime property photo using pure canvas operations.
 * This preserves 100% of the image composition (same pixels, just darker/bluer)
 * so that IC-Light V2 receives an already-dark input and needs minimal changes.
 *
 * Used as Step 1 of the multi-model pipeline before IC-Light V2.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-DARKEN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Darken and blue-shift a daytime image to create a rough nighttime base.
 * Preserves all architectural composition — only modifies color/brightness.
 *
 * @param imageBase64 - Raw base64 string (no data URI prefix)
 * @param mimeType - e.g. 'image/jpeg'
 * @returns base64 string of the darkened image (no data URI prefix)
 */
export async function preDarkenImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('[CanvasNight] Failed to create canvas context'));
          return;
        }

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Get pixel data for per-channel manipulation
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Apply twilight/dusk color shift:
          // - Darken by ~50-55% while keeping enough detail for FLUX Fill
          // - Blue channel brighter (moonlit ambiance)
          // - Values tuned so FLUX Fill can render visible bright fixtures
          data[i]     = data[i]     * 0.22;  // R — significant reduction
          data[i + 1] = data[i + 1] * 0.25;  // G — significant reduction
          data[i + 2] = data[i + 2] * 0.40;  // B — moderate reduction (blue tint)
          // Alpha unchanged
        }

        ctx.putImageData(imageData, 0, 0);

        // Extract base64 without the data URI prefix
        const dataUrl = canvas.toDataURL(mimeType, 0.92);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('[CanvasNight] Failed to load image'));
    img.src = `data:${mimeType};base64,${imageBase64}`;
  });
}
