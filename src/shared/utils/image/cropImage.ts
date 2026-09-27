export type PixelCrop = { x: number; y: number; width: number; height: number };

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

/**
 * Thrown instead of the browser's own opaque `SecurityError` when the source
 * image is cross-origin and its server doesn't send permissive CORS headers
 * (e.g. a scraped company logo served straight from the company's own
 * website, not re-hosted by us) — canvas.toBlob() taints and refuses to read
 * back pixel data in that case. Callers (ImageCropModal) catch this
 * specifically to show an actionable message ("download and re-upload it
 * instead") rather than a generic failure.
 */
export class CrossOriginCropError extends Error {
  constructor() {
    super('This image cannot be cropped directly from its source.');
    this.name = 'CrossOriginCropError';
  }
}

/**
 * Renders the cropped+rotated region of `imageSrc` onto a fixed-size square
 * canvas (both avatars and company logos are stored/displayed at one size
 * regardless of the source image's resolution) and returns it as a JPEG
 * blob — smaller than PNG for a photograph and already one of
 * ALLOWED_LOGO_TYPES / ALLOWED_AVATAR_TYPES.
 */
export const getCroppedImageBlob = async (
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotationDeg: number,
  outputSize = 512
): Promise<Blob> => {
  const image = await loadImage(imageSrc);

  // Rotation happens around the original image's center on an intermediate
  // canvas large enough to never clip corners, then the crop rect (already
  // computed in rotated-image space by react-easy-crop) is read back off it.
  const rotation = (rotationDeg * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rotation));
  const cos = Math.abs(Math.cos(rotation));
  const rotatedWidth = image.width * cos + image.height * sin;
  const rotatedHeight = image.width * sin + image.height * cos;

  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = rotatedWidth;
  rotatedCanvas.height = rotatedHeight;
  const rotatedCtx = rotatedCanvas.getContext('2d');
  if (!rotatedCtx) throw new Error('Canvas is not supported in this browser.');

  rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
  rotatedCtx.rotate(rotation);
  rotatedCtx.drawImage(image, -image.width / 2, -image.height / 2);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = outputSize;
  outputCanvas.height = outputSize;
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) throw new Error('Canvas is not supported in this browser.');

  // Flatten onto white first — the source may have transparency, and the
  // stored image is a plain JPEG.
  outputCtx.fillStyle = '#ffffff';
  outputCtx.fillRect(0, 0, outputSize, outputSize);
  outputCtx.drawImage(
    rotatedCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    try {
      // A tainted (cross-origin, non-CORS) canvas is this call's only
      // realistic failure mode once a 2d context exists — Firefox throws
      // synchronously, Chrome/Safari instead invoke the callback with
      // `null` — so either shape here is normalized to the same typed
      // error rather than a generic, unactionable message.
      outputCanvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new CrossOriginCropError())),
        'image/jpeg',
        0.92
      );
    } catch {
      reject(new CrossOriginCropError());
    }
  });
};
