import { describe, it, expect } from 'vitest';
import {
  isRepeat,
  splitRepeats,
} from '../../../../src/components/JobsOpening/AddJobDescription/questionRepeats';

describe('isRepeat', () => {
  it('matches ignoring case and surrounding spaces', () => {
    expect(isRepeat('  what is REST?  ', ['What is REST?'])).toBe(true);
  });

  it('does not match a different question', () => {
    expect(isRepeat('What is SOAP?', ['What is REST?'])).toBe(false);
  });

  it('does not match anything in an empty list', () => {
    expect(isRepeat('What is REST?', [])).toBe(false);
  });
});

describe('splitRepeats', () => {
  it('keeps new lines and flags repeats of existing questions', () => {
    const result = splitRepeats(['What is REST?', 'What is SOAP?'], ['what is rest?']);
    expect(result).toEqual({ fresh: ['What is SOAP?'], repeats: ['What is REST?'] });
  });

  it('flags a line typed twice, keeping the first', () => {
    const result = splitRepeats(['Explain GIL.', 'explain gil.'], []);
    expect(result).toEqual({ fresh: ['Explain GIL.'], repeats: ['explain gil.'] });
  });

  it('returns everything as new when nothing repeats', () => {
    expect(splitRepeats(['A', 'B'], ['C'])).toEqual({ fresh: ['A', 'B'], repeats: [] });
  });
});
