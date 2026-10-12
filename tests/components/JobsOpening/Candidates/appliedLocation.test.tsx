import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppliedLocationPicker, {
  locationsToChoose,
  mustPickLocation,
} from '../../../../src/components/shared/AppliedLocationPicker';
import { candidateAppliedLocation } from '../../../../src/components/JobsOpening/Candidates/candidateDisplay';
import { getAppliedLocationErrorMessage } from '../../../../src/shared/utils/auth/candidateError.helpers';
import type { CandidateView } from '../../../../src/api/candidate-service/Candidates/CandidateLifecycle';

const PUNE = { job_location_id: 'o1', address_line_1: 'MG Road', city: 'Pune', state: 'MH' };
const DELHI = { job_location_id: 'o2', address_line_1: 'CP', city: 'Delhi', state: 'DL' };
const TYPED = { job_location_id: null, address_line_1: 'Typed by hand', city: 'Goa' };

describe('which jobs make the office required', () => {
  it('requires it only for two or more offices that have ids', () => {
    expect(mustPickLocation([PUNE, DELHI])).toBe(true);
    expect(mustPickLocation([PUNE])).toBe(false);
    expect(mustPickLocation([])).toBe(false);
    expect(mustPickLocation(undefined)).toBe(false);
    // an address typed by hand has no id, so it cannot be chosen
    expect(mustPickLocation([PUNE, TYPED])).toBe(false);
    expect(locationsToChoose([PUNE, TYPED])).toEqual([PUNE]);
  });
});

describe('AppliedLocationPicker', () => {
  it('renders nothing when the job has fewer than two offices', () => {
    const { container } = render(
      <AppliedLocationPicker
        id="x"
        label="Office"
        locations={[PUNE]}
        value=""
        onChange={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('is a required field when the job has several offices', () => {
    render(
      <AppliedLocationPicker
        id="x"
        label="Which office?"
        locations={[PUNE, DELHI]}
        value=""
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Which office?')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows the "choose a location" message when flagged', () => {
    render(
      <AppliedLocationPicker
        id="x"
        label="Office"
        locations={[PUNE, DELHI]}
        value=""
        onChange={() => {}}
        hasError
      />
    );
    expect(screen.getByText('Please choose a location.')).toBeInTheDocument();
  });
});

describe('getAppliedLocationErrorMessage', () => {
  it('words the two office refusals, wherever the code sits', () => {
    expect(
      getAppliedLocationErrorMessage({
        status: 422,
        data: { error_code: 'APPLIED_LOCATION_REQUIRED' },
      })
    ).toBe('Please select an office for this job.');
    expect(
      getAppliedLocationErrorMessage({
        status: 422,
        data: { data: { error_code: 'APPLIED_LOCATION_NOT_ON_JOB' } },
      })
    ).toBe('Selected office is no longer valid for this job - please choose again.');
    expect(
      getAppliedLocationErrorMessage({ data: { message: 'APPLIED_LOCATION_REQUIRED: pick one' } })
    ).toBe('Please select an office for this job.');
  });

  it('leaves every other error alone', () => {
    expect(
      getAppliedLocationErrorMessage({ status: 500, data: { message: 'boom' } })
    ).toBeUndefined();
    expect(getAppliedLocationErrorMessage(undefined)).toBeUndefined();
  });
});

describe('candidateAppliedLocation', () => {
  const base = { id: 'c1' } as CandidateView;

  it('joins the address the server resolved', () => {
    expect(
      candidateAppliedLocation({
        ...base,
        applied_location_address_line_1: 'MG Road',
        applied_location_city: 'Pune',
        applied_location_state: 'MH',
        applied_location_country: 'India',
      })
    ).toBe('MG Road, Pune, MH, India');
  });

  it('is null (row left out) when the server gave nothing', () => {
    expect(candidateAppliedLocation(base)).toBeNull();
    expect(
      candidateAppliedLocation({
        ...base,
        applied_location_city: null,
        applied_location_state: ' ',
      })
    ).toBeNull();
  });
});
