import { describe, expect, it } from 'vitest';
import {
  formatAiJobDescription,
  jdGenerationFailureMessage,
} from '../../../../src/shared/utils/business-logic';

describe('formatAiJobDescription — leaked Suggested Skills/Vacancies section', () => {
  it('drops a bold "Suggested Skills:" section and its raw JSON array', () => {
    const text =
      '## Other Requirements\n\nSome text here.\n\n' +
      '**Suggested Skills:**\n' +
      '[ { "skill_label": "Deep Learning", "suggested_type": "Optional" } ]';
    const result = formatAiJobDescription(text);
    expect(result).not.toContain('Suggested Skills');
    expect(result).not.toContain('skill_label');
  });

  it('drops a markdown "## Vacancies" section up to the next heading', () => {
    const text = '## Vacancies\n\n[]\n\n## About The Role\n\nReal content here.';
    const result = formatAiJobDescription(text);
    expect(result).not.toContain('Vacancies');
    expect(result).toContain('About The Role');
    expect(result).toContain('Real content here.');
  });

  it('leaves a real "Skills" mention in ordinary prose untouched', () => {
    const text = '## About The Role\n\nStrong communication skills are a plus.';
    const result = formatAiJobDescription(text);
    expect(result).toContain('communication skills');
  });

  it('is a no-op on text with no leaked section', () => {
    const text = '## About The Role\n\n- Build things\n- Ship things';
    expect(formatAiJobDescription(text)).toContain('Build things');
  });
});

describe('jdGenerationFailureMessage', () => {
  it('replaces a raw internal "model ..." message with a friendly one', () => {
    const message = jdGenerationFailureMessage(
      'model used **bold** on ordinary text instead of reserving it for section headers'
    );
    expect(message).not.toContain('**bold**');
    expect(message).toBe(
      'Something went wrong while generating the job description. Please try again.'
    );
  });

  it('keeps a non-internal, recruiter-relevant message as-is', () => {
    const message = jdGenerationFailureMessage(
      'Your instruction was blocked: contains a prompt injection attempt'
    );
    expect(message).toBe('Your instruction was blocked: contains a prompt injection attempt');
  });

  it('falls back to the friendly message when there is no error message at all', () => {
    expect(jdGenerationFailureMessage(null)).toBe(
      'Something went wrong while generating the job description. Please try again.'
    );
    expect(jdGenerationFailureMessage(undefined)).toBe(
      'Something went wrong while generating the job description. Please try again.'
    );
  });
});
