import { describe, it, expect } from 'vitest';
import {
  isAiIdentity,
  isAiInterviewer,
} from '../../../src/components/Interview/shared/participantKind';
import { tileGridColumns } from '../../../src/components/Interview/shared/tileGrid';

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
  });

  it('uses responsive columns for two or more, small enough for two side by side', () => {
    for (const count of [2, 3, 6]) {
      expect(tileGridColumns(count)).toBe('repeat(auto-fit, minmax(min(100%, 180px), 1fr))');
    }
  });
});
