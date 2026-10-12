import { describe, it, expect } from 'vitest';
import {
  isAiIdentity,
  isAiInterviewer,
} from '../../../src/components/Interview/shared/participantKind';
import {
  tileCellClass,
  tileGridClass,
  tileGridColumnCount,
  tileGridColumns,
} from '../../../src/components/Interview/shared/tileGrid';

const UUID = '2e4b02e6-9350-47d7-ad3d-fe8dee9b085d';

describe('which room participant is the AI (the only one that gets the soundwave)', () => {
  it('treats the plain "Iris" participant as the AI', () => {
    expect(isAiInterviewer({ identity: 'Iris', isAgent: false })).toBe(true);
    expect(isAiInterviewer({ identity: UUID, isAgent: true })).toBe(true);
  });

  it('never treats a person as the AI, so a camera-off interviewer is not a waveform', () => {
    expect(isAiInterviewer({ identity: UUID, isAgent: false })).toBe(false);
    expect(isAiInterviewer({ identity: 'interviewer-link', isAgent: false })).toBe(false);
    expect(isAiIdentity(UUID.toUpperCase())).toBe(false);
  });
});

describe('tileGridColumns', () => {
  it('lets one person fill the space', () => {
    expect(tileGridColumns(1)).toBe('1fr');
    expect(tileGridColumns(0)).toBe('1fr');
    expect(tileCellClass(1)).toContain('h-full');
  });

  it('puts two side by side, three or four in a 2 x 2, and more in wider rows', () => {
    expect(tileGridColumnCount(2)).toBe(2);
    expect(tileGridColumnCount(3)).toBe(2);
    expect(tileGridColumnCount(4)).toBe(2);
    expect(tileGridColumnCount(5)).toBe(3);
    expect(tileGridColumnCount(9)).toBe(3);
    expect(tileGridColumnCount(10)).toBe(4);
  });

  it('keeps a minimum tile width so a narrow window wraps instead of making slivers', () => {
    for (const count of [2, 3, 6]) {
      expect(tileGridColumns(count)).toContain('auto-fit');
      expect(tileGridColumns(count)).toContain('max(220px');
    }
  });

  it('gives tiles beyond the first a 16:9 shape rather than the full room height', () => {
    expect(tileCellClass(2)).toContain('aspect-video');
    expect(tileCellClass(5)).toContain('aspect-video');
    expect(tileGridClass(3)).toContain('content-center');
    expect(tileGridClass(3)).not.toContain('auto-rows-fr');
  });
});
