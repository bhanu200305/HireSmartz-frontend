export type PixelCrop = { x: number; y: number; width: number; height: number };

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const OUTPUT_SIZE = 512;

/**
 * Renders the cropped+rotated region of `imageSrc` onto a fixed-size square
 * canvas (avatars are stored/displayed at one size regardless of the source
 * photo's resolution) and returns it as a JPEG blob — smaller than PNG for a
 * photograph and already one of ALLOWED_LOGO_TYPES.
 */
export const getCroppedImageBlob = async (
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotationDeg: number
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
  outputCanvas.width = OUTPUT_SIZE;
  outputCanvas.height = OUTPUT_SIZE;
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) throw new Error('Canvas is not supported in this browser.');

  // Flatten onto white first — the source may have transparency, and the
  // stored avatar is a plain JPEG.
  outputCtx.fillStyle = '#ffffff';
  outputCtx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  outputCtx.drawImage(
    rotatedCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to process image.'))),
      'image/jpeg',
      0.92
    );
  });
};
