import { describe, it, expect } from 'vitest';
import { parseTranscript } from '../../../../src/components/JobsOpening/Candidates/RoundArtifactsPanel';

const diarized =
  'spk_0: Hello, tell me about yourself.\nspk_1: Sure, I am a developer.\nspk_0: Great.';

describe('parseTranscript', () => {
  it('AI Video: first spk_N is the AI Interviewer, the other is the Candidate', () => {
    const messages = parseTranscript(diarized, true)!;
    expect(messages.map((m) => m.speakerLabel)).toEqual([
      'AI Interviewer',
      'Candidate',
      'AI Interviewer',
    ]);
    expect(messages[0].isBot).toBe(true);
    expect(messages[1].isCandidate).toBe(true);
  });

  it('other rounds keep the raw spk_N label (speaker order cannot be trusted)', () => {
    const messages = parseTranscript(diarized)!;
    expect(messages.map((m) => m.speakerLabel)).toEqual(['spk_0', 'spk_1', 'spk_0']);
  });

  it('leaves the VAPI labels untouched either way', () => {
    const vapi = 'AI: Hi there.\nUser: Hello.';
    for (const aiFirst of [true, false]) {
      expect(parseTranscript(vapi, aiFirst)!.map((m) => m.speakerLabel)).toEqual([
        'AI Interviewer',
        'Candidate',
      ]);
    }
  });
});
