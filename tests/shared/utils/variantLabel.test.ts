import { describe, it, expect } from 'vitest';
import { resolveVariantLabel } from '../../../src/shared/utils/variantLabel';

describe('resolveVariantLabel', () => {
  it('uses the database label when one is set', () => {
    expect(resolveVariantLabel('offline', { offline: 'On Site Visit' })).toBe('On Site Visit');
  });

  it('matches the variant code case-insensitively', () => {
    expect(resolveVariantLabel('ONLINE', { online: 'Video Call' })).toBe('Video Call');
  });

  it('falls back to the capitalised code plus Round when no label is set', () => {
    expect(resolveVariantLabel('offline', null)).toBe('Offline Round');
    expect(resolveVariantLabel('soundwave', {})).toBe('Soundwave Round');
  });

  it('turns underscores and dashes into spaces in the fallback', () => {
    expect(resolveVariantLabel('phone_screen', undefined)).toBe('Phone Screen Round');
  });

  it('ignores labels set for other codes', () => {
    expect(resolveVariantLabel('avatar', { online: 'Video Call' })).toBe('Avatar Round');
  });
});
