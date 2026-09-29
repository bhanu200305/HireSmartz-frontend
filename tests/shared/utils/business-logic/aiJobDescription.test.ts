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

describe('formatAiJobDescription — metadata "Label: value" lines are not headings', () => {
  it('renders a Job Type metadata line as bold key:value, not a heading', () => {
    const text = 'Job Type: Full-Time\nShift: Swing Shift\nSalary Range: $17 to $22 per hour';
    const result = formatAiJobDescription(text);
    expect(result).toContain('**Job Type:** Full-Time');
    expect(result).toContain('**Shift:** Swing Shift');
    expect(result).toContain('**Salary Range:** $17 to $22 per hour');
    expect(result).not.toContain('## Job Type');
    expect(result).not.toContain('## Shift');
    expect(result).not.toContain('## Salary Range');
  });

  it('does not misread a heading keyword deep in a sentence as a heading', () => {
    const text =
      '## About The Role\n\nWarehouse management system (WMS) experience is a strong plus.';
    const result = formatAiJobDescription(text);
    expect(result).toContain('Warehouse management system (WMS) experience is a strong plus.');
    expect(result).not.toContain('## Warehouse');
  });

  it('still recognizes a real multi-word heading near a keyword', () => {
    const text = '## About The Role\n\nSome content.\n\nWhat We Offer\n\n- Health insurance';
    const result = formatAiJobDescription(text);
    expect(result).toContain('## What We Offer');
  });
});

describe('formatAiJobDescription — bullet-list continuation vs. new item', () => {
  it('keeps separate capitalized skill names as separate bullets, not merged', () => {
    const text = [
      '## Key Skills',
      '',
      '- Inventory management',
      'Forklift or pallet jack operation',
      'Basic mathematics for cash handling',
    ].join('\n');
    const result = formatAiJobDescription(text);
    expect(result).toContain('- Inventory management');
    expect(result).toContain('- Forklift or pallet jack operation');
    expect(result).toContain('- Basic mathematics for cash handling');
    expect(result).not.toContain('Inventory management Forklift');
  });

  // Known, deliberately-accepted gap - see isLikelyAiJdHeading's comment.
  it('KNOWN GAP: a skill line starting with a heading keyword still misreads as a heading', () => {
    const text = [
      '## Key Skills',
      '',
      '- Inventory management',
      'Bilingual communication skills',
    ].join('\n');
    const result = formatAiJobDescription(text);
    expect(result).toContain('## Bilingual communication skills');
  });

  it('merges a genuine mid-sentence hard-wrap continuation into the previous bullet', () => {
    const text = [
      '## Requirements',
      '',
      '- Must be able to lift up to 50',
      'pounds regularly.',
    ].join('\n');
    const result = formatAiJobDescription(text);
    expect(result).toContain('- Must be able to lift up to 50 pounds regularly.');
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
