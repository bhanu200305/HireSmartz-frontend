import { act, renderHook } from '@testing-library/react';
import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

const room = new EventEmitter();

vi.mock('@livekit/components-react', () => ({
  useRoomContext: () => room,
}));

import { usePanelQuestions } from '../../../src/components/Interview/shared/PanelQuestionsPanel';

const send = (body: unknown) =>
  act(() => {
    room.emit('dataReceived', new TextEncoder().encode(JSON.stringify(body)));
  });

describe('usePanelQuestions', () => {
  it('returns the question set an interviewer receives', () => {
    const { result } = renderHook(() => usePanelQuestions(true));
    expect(result.current).toBeNull();

    send({
      resume_based: [{ question_text: 'Tell us about X' }],
      jd_based: [{ question_text: 'How would you Y?', scoring_sections: ['Skills'] }],
      instructions: 'Please introduce yourselves.',
    });

    expect(result.current?.resume_based).toHaveLength(1);
    expect(result.current?.jd_based[0].scoring_sections).toEqual(['Skills']);
    expect(result.current?.instructions).toBe('Please introduce yourselves.');
  });

  it('ignores the presence message every participant sends', () => {
    const { result } = renderHook(() => usePanelQuestions(true));
    send({ role: 'CANDIDATE' });
    expect(result.current).toBeNull();
  });

  it('ignores non-JSON data', () => {
    const { result } = renderHook(() => usePanelQuestions(true));
    act(() => {
      room.emit('dataReceived', new TextEncoder().encode('not json'));
    });
    expect(result.current).toBeNull();
  });

  it('never shows questions to someone who is not an interviewer', () => {
    const { result } = renderHook(() => usePanelQuestions(false));
    send({ resume_based: [{ question_text: 'Secret' }], jd_based: [], instructions: '' });
    expect(result.current).toBeNull();
  });

  it('stops listening when it unmounts', () => {
    const { unmount } = renderHook(() => usePanelQuestions(true));
    expect(room.listenerCount('dataReceived')).toBe(1);
    unmount();
    expect(room.listenerCount('dataReceived')).toBe(0);
  });
});
