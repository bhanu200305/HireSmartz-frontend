import { describe, expect, it } from 'vitest';
import reducer, {
  setEditJobOpeningId,
  setAtsJobOpeningId,
  setIsDraft,
  setIsChanged,
  updateEditJobDetails,
  updateEditJobDescription,
  updateEditInterviewRounds,
  updateEditAiJobDescription,
  resetEditJobState,
} from '../../src/redux/slices/editJobOpeningSlice';

const initialState = reducer(undefined, { type: '@@INIT' });

describe('editJobOpeningSlice reducer', () => {
  it('setEditJobOpeningId / setAtsJobOpeningId set their own field independently', () => {
    const state = reducer(
      reducer(initialState, setEditJobOpeningId('job-1')),
      setAtsJobOpeningId('ats-1')
    );

    expect(state.jobOpeningId).toBe('job-1');
    expect(state.atsJobOpeningId).toBe('ats-1');
  });

  it('setIsDraft and setIsChanged toggle their own boolean flags', () => {
    const state = reducer(reducer(initialState, setIsDraft(true)), setIsChanged(true));
    expect(state.isDraft).toBe(true);
    expect(state.isChanged).toBe(true);
  });

  it('updateEditJobDetails merges into the existing details rather than replacing them', () => {
    const withTitle = reducer(initialState, updateEditJobDetails({ jobTitle: ['Engineer'] }));
    const state = reducer(withTitle, updateEditJobDetails({ openings: 3 }));

    expect(state.details.jobTitle).toEqual(['Engineer']);
    expect(state.details.openings).toBe(3);
  });

  it('updateEditJobDescription merges into the existing description', () => {
    const state = reducer(
      initialState,
      updateEditJobDescription({ otherRequirements: 'Must relocate' })
    );

    expect(state.description.otherRequirements).toBe('Must relocate');
    expect(state.description.mandatorySkills).toEqual([]);
  });

  it('updateEditInterviewRounds replaces the interview rounds list wholesale', () => {
    const rounds = [{ id: 'r1' }] as any;
    const state = reducer(initialState, updateEditInterviewRounds(rounds));
    expect(state.interviewRounds).toBe(rounds);
  });

  it('updateEditAiJobDescription replaces the whole aiJobDescription object', () => {
    const aiDescription = { id: 'ai-1', jobDescription: 'Generated text', jobOpeningId: 'job-1' };
    const state = reducer(initialState, updateEditAiJobDescription(aiDescription));
    expect(state.aiJobDescription).toEqual(aiDescription);
  });

  it('resetEditJobState restores the initial state', () => {
    const dirty = reducer(initialState, setIsChanged(true));
    expect(reducer(dirty, resetEditJobState())).toEqual(initialState);
  });
});
