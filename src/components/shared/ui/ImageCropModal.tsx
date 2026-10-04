import React, { useCallback, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Slider } from 'antd';
import { MdRotateLeft, MdRotateRight, MdZoomIn, MdZoomOut } from 'react-icons/md';
import AntdCommonModal from './AntdCommonModal';
import { Button, showToast } from '..';
import { getCroppedImageBlob, CrossOriginCropError } from '../../../shared/utils/image/cropImage';

type ImageCropModalProps = {
  open: boolean;
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  isSaving?: boolean;
  title?: string;
  subtitle?: string;
  /** 'round' for a circular avatar-style crop, 'rect' for a rectangular one. */
  cropShape?: 'round' | 'rect';
  aspect?: number;
  outputSize?: number;
};

// Zoom is relative to "the whole image fits the frame" (1), not an absolute
// scale — MIN_ZOOM below 1 lets the user shrink the image further, adding
// margin around it, and MAX_ZOOM above 1 lets them crop tighter into it.
// Both directions matter here specifically because a scraped logo is a
// third-party asset with no consistent built-in padding: some need
// shrinking to stop touching the frame's edges, others need zooming in to
// stop showing mostly empty canvas.
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;

/**
 * Generic drag/zoom/rotate crop editor — extracted from what used to be
 * UserProfile's own `ProfilePictureCropModal` (still the same UX for that
 * avatar case) so a second caller (company logo upload) doesn't hand-copy
 * the same ~150 lines of react-easy-crop wiring and canvas math with a
 * different title string.
 */
const ImageCropModal: React.FC<ImageCropModalProps> = ({
  open,
  imageSrc,
  onCancel,
  onConfirm,
  isSaving = false,
  title = 'Adjust Your Photo',
  subtitle = 'Drag to reposition, then zoom or rotate to fit the frame',
  cropShape = 'round',
  aspect = 1,
  outputSize = 512,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cropper keeps calling back as the user drags/zooms; only the last call
  // before Apply matters, so this is cheap to just overwrite each time.
  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  // Every open (a freshly selected file/URL each time) should start from a
  // centered, unzoomed, unrotated crop rather than carrying over whatever
  // the previous image ended on.
  const resetAdjustments = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
  };

  const handleCancel = () => {
    resetAdjustments();
    onCancel();
  };

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation, outputSize);
      onConfirm(blob);
      resetAdjustments();
    } catch (err) {
      // Cross-origin source (e.g. a logo scraped straight from the
      // company's own website, never re-hosted by us) — the browser
      // refuses to read pixel data back off the canvas. Left open so the
      // user can Cancel and fall back to downloading + re-uploading the
      // file, which crops fine since that source is same-origin (a local
      // blob).
      const message =
        err instanceof CrossOriginCropError
          ? "This image can't be adjusted directly from its source — download it and upload it as a file instead."
          : 'Failed to process image.';
      showToast({ message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={handleCancel}
      title={title}
      subtitle={subtitle}
      modalProps={{ width: 'min(480px, 92vw)', keyboard: !isProcessing && !isSaving }}
    >
      {/* No independent scroll region here — AntdCommonModal's own
          `.ant-modal-body` fallback scrollbar (see index.css) already caps
          this against the viewport. A second `overflow-y-auto` wrapper here
          used to create a nested scroll region of its own, which is where
          the "two scrollbars" came from. */}
      <div className="flex flex-col gap-5">
        <div
          className="relative mx-auto w-full shrink-0 overflow-hidden rounded-2xl bg-[var(--gray-900)]"
          // The photo area's own shape must match the crop selection's
          // aspect ratio (aspect, 1 = square for a round avatar/logo) — it
          // used to be a wide rectangle (full modal width x a fixed height)
          // with a SQUARE selection centered inside it, so most of that
          // rectangle sat outside the circle and was never part of what
          // could be kept. That's what made a wide/short logo look
          // pointlessly tiny inside the circle: `contain` was fitting it to
          // the whole oversized rectangle, not to the circle's own bounds.
          // Sizing the box itself to the crop's aspect ratio means the
          // selection now occupies (approximately) the whole box, so
          // `contain` actually fits the frame the user is looking at.
          style={{ aspectRatio: aspect, maxWidth: 'min(360px, 100%)' }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            // 'contain' (react-easy-crop's own default) — the complete
            // image, uncropped, at zoom 1: that has to be the STARTING
            // point for a third-party scraped logo, never an assumption
            // baked in by the tool that some of it doesn't matter. Zoom
            // (now both directions — see MIN_ZOOM/MAX_ZOOM above) is what
            // lets the person actually setting the logo decide, themselves,
            // whether to fill the frame more tightly (cropping in) or add
            // breathing room (shrinking further) — never a default this
            // component picks for them.
            objectFit="contain"
            showGrid={false}
            restrictPosition
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <MdZoomOut className="text-[var(--gray-500)] text-lg shrink-0" />
          <Slider
            className="flex-1"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            onChange={setZoom}
            tooltip={{ open: false }}
          />
          <MdZoomIn className="text-[var(--gray-500)] text-lg shrink-0" />
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setRotation((prev) => prev - 90)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gray-700)] bg-white border border-[var(--border)] rounded-full px-3.5 py-1.5 hover:border-[var(--primary-300)] hover:text-[var(--primary)] transition-colors cursor-pointer"
          >
            <MdRotateLeft className="text-base" />
            <span>Rotate Left</span>
          </button>
          <button
            type="button"
            onClick={() => setRotation((prev) => prev + 90)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gray-700)] bg-white border border-[var(--border)] rounded-full px-3.5 py-1.5 hover:border-[var(--primary-300)] hover:text-[var(--primary)] transition-colors cursor-pointer"
          >
            <MdRotateRight className="text-base" />
            <span>Rotate Right</span>
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-center gap-3 pt-1">
          <Button
            type="button"
            disabled={isProcessing || isSaving}
            onClick={handleCancel}
            className="w-full sm:w-auto min-w-[140px] text-[var(--gray-700)] bg-white border border-[var(--border)] rounded-full px-6 py-2.5 font-semibold transition-colors hover:border-[var(--primary-300)]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isProcessing || isSaving || !croppedAreaPixels}
            onClick={handleApply}
            className="w-full sm:w-auto min-w-[140px] text-white bg-button rounded-full px-6 py-2.5 font-semibold transition-transform hover:scale-[1.02] disabled:hover:scale-100"
          >
            {isProcessing || isSaving ? 'Applying…' : 'Apply'}
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default ImageCropModal;
