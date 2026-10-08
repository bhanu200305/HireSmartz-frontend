import { describe, it, expect } from 'vitest';
import { getVariantBadge } from '../../../../src/components/JobsOpening/EditJobOpening/sortableInterviewRounds';

describe('getVariantBadge', () => {
  it('returns null when the round has no variant', () => {
    expect(getVariantBadge(null)).toBeNull();
    expect(getVariantBadge(undefined)).toBeNull();
  });

  it('shows the database label and keeps the icon for a known code', () => {
    const badge = getVariantBadge('avatar', { avatar: 'Virtual Interviewer' });
    expect(badge?.label).toBe('Virtual Interviewer');
    expect(badge?.icon).not.toBeNull();
  });

  it('lets a Super Admin override change the text without changing the icon', () => {
    const original = getVariantBadge('soundwave', { soundwave: 'Voice Agent Round' });
    const renamed = getVariantBadge('soundwave', { soundwave: 'Voice Round' });
    expect(renamed?.label).toBe('Voice Round');
    expect(renamed?.icon).toBe(original?.icon);
  });

  it('uses the capitalised code and no icon for an unknown code', () => {
    const badge = getVariantBadge('hybrid', {});
    expect(badge?.label).toBe('Hybrid Round');
    expect(badge?.icon).toBeNull();
  });
});
