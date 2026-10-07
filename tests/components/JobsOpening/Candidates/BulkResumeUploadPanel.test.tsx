import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

type Progress = {
  batch_id: string;
  job_opening_id: string;
  status: string;
  total_files: number;
  valid_files: number;
  parsed_files: number;
  items: {
    filename: string;
    status: string;
    candidate_id: string | null;
    error_message: string | null;
  }[];
};

let progress: Progress | undefined;
let pollError: unknown;
const pollingIntervals: number[] = [];

vi.mock('../../../../src/api/candidate-service/Candidates/CandidateLifecycle', () => ({
  useBulkUploadResumesMutation: () => [
    () => ({
      unwrap: () =>
        Promise.resolve({ batch_id: 'b1', total_files: 4, valid_files: 4, invalid_files: [] }),
    }),
    { isLoading: false },
  ],
  useGetBatchProgressQuery: (_id: string, opts: { pollingInterval?: number }) => {
    pollingIntervals.push(opts.pollingInterval ?? 0);
    return { data: progress, error: pollError, fulfilledTimeStamp: progress ? 1 : undefined };
  },
}));
vi.mock('../../../../src/hooks/useSessionTenantId', () => ({ useSessionTenantId: () => 't1' }));
vi.mock('../../../../src/components/shared/ui/toast', () => ({ showToast: vi.fn() }));

import BulkResumeUploadPanel from '../../../../src/components/JobsOpening/Candidates/Modal/BulkResumeUploadPanel';

const batch = (over: Partial<Progress>): Progress => ({
  batch_id: 'b1',
  job_opening_id: 'j1',
  status: 'processing',
  total_files: 4,
  valid_files: 4,
  parsed_files: 2,
  items: [],
  ...over,
});

const renderPanel = async () => {
  const onCompleted = vi.fn();
  const onDone = vi.fn();
  const view = render(
    <MemoryRouter initialEntries={['/jobs/view/j1/candidates']}>
      <Routes>
        <Route
          path="/jobs/view/:id/candidates"
          element={<BulkResumeUploadPanel onCompleted={onCompleted} onDone={onDone} />}
        />
      </Routes>
    </MemoryRouter>
  );
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  await act(async () => {
    fireEvent.click(screen.getByText(/UPLOAD \(1\)/));
  });
  return { onCompleted, onDone, view };
};

describe('BulkResumeUploadPanel progress', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    progress = undefined;
    pollError = undefined;
    pollingIntervals.length = 0;
  });
  afterEach(() => vi.useRealTimers());

  it('finishes and closes itself when every file succeeded', async () => {
    progress = batch({
      status: 'completed',
      parsed_files: 4,
      items: [{ filename: 'a.pdf', status: 'parsed', candidate_id: 'c1', error_message: null }],
    });
    const { onCompleted, onDone } = await renderPanel();
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(screen.getByText('4 of 4 resumes added.')).toBeTruthy();
    expect(screen.queryByText(/Done, you can close this now/)).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('counts every uploaded file, including ones rejected as duplicates', async () => {
    // 5 uploaded, 4 rejected up front as already uploaded, 1 accepted and parsed.
    const dup = (name: string) => ({
      filename: name,
      status: 'failed',
      candidate_id: null,
      error_message: 'this resume was already uploaded for this job',
    });
    progress = batch({
      status: 'completed',
      total_files: 5,
      valid_files: 1,
      parsed_files: 1,
      items: [
        { filename: 'new.pdf', status: 'parsed', candidate_id: 'c1', error_message: null },
        dup('a.pdf'),
        dup('b.pdf'),
        dup('c.pdf'),
        dup('d.pdf'),
      ],
    });
    await renderPanel();
    expect(screen.getByText('1 of 5 resumes added.')).toBeTruthy();
    expect(screen.queryByText(/Processed 1 of 1/)).toBeNull();
    // The reason is said once, in the heading — not repeated per file.
    expect(
      screen.getByText(
        '4 resumes could not be added because they were already uploaded for this job:'
      )
    ).toBeTruthy();
    expect(screen.queryAllByText(/already uploaded for this job/)).toHaveLength(1);
    ['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf'].forEach((name) =>
      expect(screen.getByText(name)).toBeTruthy()
    );
  });

  it('groups failed files under one heading per reason', async () => {
    const failed = (name: string, reason: string | null) => ({
      filename: name,
      status: 'failed',
      candidate_id: null,
      error_message: reason,
    });
    progress = batch({
      status: 'completed',
      total_files: 5,
      valid_files: 1,
      parsed_files: 1,
      items: [
        { filename: 'ok.pdf', status: 'parsed', candidate_id: 'c1', error_message: null },
        failed('a.pdf', 'this resume was already uploaded for this job'),
        failed('b.pdf', 'this resume was already uploaded for this job'),
        failed('big.pdf', 'must be under 5MB'),
        failed('odd.pdf', 'Parser timed out'),
      ],
    });
    await renderPanel();
    expect(
      screen.getByText(
        '2 resumes could not be added because they were already uploaded for this job:'
      )
    ).toBeTruthy();
    expect(
      screen.getByText("1 resume could not be added because it's larger than 5MB:")
    ).toBeTruthy();
    expect(screen.getByText('1 resume could not be added (Parser timed out):')).toBeTruthy();
  });

  it('shows progress against the total while still processing', async () => {
    // 5 uploaded, 1 rejected up front, 2 of the 4 accepted parsed so far.
    progress = batch({
      total_files: 5,
      valid_files: 4,
      parsed_files: 2,
      items: [{ filename: 'a.pdf', status: 'uploaded', candidate_id: 'c1', error_message: null }],
    });
    await renderPanel();
    expect(screen.getByText('Processed 3 of 5 resumes…')).toBeTruthy();
  });

  it('finishes on the item list alone and keeps failed files open with their reason', async () => {
    progress = batch({
      parsed_files: 2,
      items: [
        { filename: 'ok.pdf', status: 'parsed', candidate_id: 'c1', error_message: null },
        { filename: 'dup.pdf', status: 'failed', candidate_id: null, error_message: 'Duplicate' },
      ],
    });
    const { onCompleted, onDone } = await renderPanel();
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(screen.getByText('dup.pdf')).toBeTruthy();
    expect(screen.getByText(/Duplicate/)).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('CLOSE'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('gives up after two minutes without progress and stops polling', async () => {
    progress = batch({
      parsed_files: 2,
      items: [{ filename: 'a.pdf', status: 'uploaded', candidate_id: 'c1', error_message: null }],
    });
    const { onCompleted, onDone } = await renderPanel();
    expect(onCompleted).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000 + 1000);
    });
    expect(screen.getByText(/still being processed in the background/)).toBeTruthy();
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(pollingIntervals[pollingIntervals.length - 1]).toBe(0);
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('CLOSE'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
