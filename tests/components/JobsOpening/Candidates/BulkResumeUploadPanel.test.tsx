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
    expect(screen.getByText(/Done, you can close this now/)).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
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
