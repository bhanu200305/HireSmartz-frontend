import { describe, it, expect } from 'vitest';
import { interviewTypeForRound } from '../../../../src/components/JobsOpening/Candidates/roundPipeline';

type Round = Parameters<typeof interviewTypeForRound>[0];
const round = (fields: Partial<Round>) => fields as Round;

describe('interviewTypeForRound', () => {
  it('uses the round type from candidate-service when there is one', () => {
    expect(interviewTypeForRound(round({ round_type: 'PANEL', round_name: 'Anything' }))).toBe(
      'panel'
    );
    expect(interviewTypeForRound(round({ round_type: 'AUDIO_SCREENING' }))).toBe('audio_screening');
  });

  it('treats Live Video and In-Person as panel rounds, not AI video, when unclassified', () => {
    expect(
      interviewTypeForRound(round({ round_type: null, round_name: 'Live Video Interview' }))
    ).toBe('panel');
    expect(
      interviewTypeForRound(round({ round_type: null, round_name: 'In-Person Interview II' }))
    ).toBe('panel');
  });

  it('still reads AI Video Interview as AI video and AI Agent Call as audio screening', () => {
    expect(
      interviewTypeForRound(round({ round_type: null, round_name: 'AI Video Interview' }))
    ).toBe('ai_video');
    expect(interviewTypeForRound(round({ round_type: null, round_name: 'AI Agent Call' }))).toBe(
      'audio_screening'
    );
  });
});
