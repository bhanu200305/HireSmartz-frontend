// Static presets for the virtual-background picker — no backend involved,
// these are bundled frontend assets. Kept as plain constants so
// `BackgroundSelector.tsx` and any future settings surface can share the
// same list without re-declaring it.

export type BackgroundBlurLevel = { id: string; label: string; radius: number };

export const BACKGROUND_BLUR_LEVELS: BackgroundBlurLevel[] = [
  { id: 'blur-light', label: 'Light blur', radius: 10 },
  { id: 'blur-strong', label: 'Strong blur', radius: 20 },
];

export type BackgroundImagePreset = { id: string; label: string; imagePath: string };

// Referencing /public assets — add the actual image files under
// `public/interview-backgrounds/` when wiring this up; using descriptive
// filenames here rather than inventing a CDN URL.
export const BACKGROUND_IMAGE_PRESETS: BackgroundImagePreset[] = [
  { id: 'office', label: 'Office', imagePath: '/interview-backgrounds/office.jpg' },
  { id: 'gradient', label: 'Gradient', imagePath: '/interview-backgrounds/gradient.jpg' },
  { id: 'bookshelf', label: 'Bookshelf', imagePath: '/interview-backgrounds/bookshelf.jpg' },
];
