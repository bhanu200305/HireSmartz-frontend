import { describe, it, expect } from 'vitest';
import { resolveVariantLabel } from '../../../src/shared/utils/variantLabel';

describe('resolveVariantLabel', () => {
  it('uses the database label when one is set', () => {
    expect(resolveVariantLabel('avatar', { avatar: 'Virtual Host' })).toBe('Virtual Host');
  });

  it('matches the variant code case-insensitively', () => {
    expect(resolveVariantLabel('SOUNDWAVE', { soundwave: 'Voice Agent' })).toBe('Voice Agent');
  });

  it('falls back to the capitalised code plus Round when no label is set', () => {
    expect(resolveVariantLabel('avatar', null)).toBe('Avatar Round');
    expect(resolveVariantLabel('soundwave', {})).toBe('Soundwave Round');
  });

  it('turns underscores and dashes into spaces in the fallback', () => {
    expect(resolveVariantLabel('phone_screen', undefined)).toBe('Phone Screen Round');
  });

  it('ignores labels set for other codes', () => {
    expect(resolveVariantLabel('avatar', { soundwave: 'Voice Agent' })).toBe('Avatar Round');
  });
});
