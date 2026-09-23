import React, { useCallback, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Slider } from 'antd';
import { MdRotateLeft, MdRotateRight, MdZoomIn, MdZoomOut } from 'react-icons/md';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { Button } from '../shared';
import { getCroppedImageBlob } from './cropImage';

type ProfilePictureCropModalProps = {
  open: boolean;
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  isSaving?: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const ProfilePictureCropModal: React.FC<ProfilePictureCropModalProps> = ({
  open,
  imageSrc,
  onCancel,
  onConfirm,
  isSaving = false,
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

  // Every open (a freshly selected file each time — see index.tsx) should
  // start from a centered, unzoomed, unrotated crop rather than carrying
  // over whatever the previous photo ended on.
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
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation);
      onConfirm(blob);
      resetAdjustments();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={handleCancel}
      title="Adjust your photo"
      subtitle="Drag to reposition, then zoom or rotate to fit the frame"
      modalProps={{ width: 'min(480px, 92vw)', keyboard: !isProcessing && !isSaving }}
    >
      <div className="flex flex-col gap-5">
        <div
          className="relative w-full rounded-2xl overflow-hidden bg-[var(--gray-900)]"
          style={{ height: 'min(320px, 60vh)' }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
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
            <span>Rotate left</span>
          </button>
          <button
            type="button"
            onClick={() => setRotation((prev) => prev + 90)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gray-700)] bg-white border border-[var(--border)] rounded-full px-3.5 py-1.5 hover:border-[var(--primary-300)] hover:text-[var(--primary)] transition-colors cursor-pointer"
          >
            <MdRotateRight className="text-base" />
            <span>Rotate right</span>
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

export default ProfilePictureCropModal;
