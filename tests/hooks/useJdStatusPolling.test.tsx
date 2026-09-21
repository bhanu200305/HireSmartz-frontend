import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { Provider } from 'react-redux';
import { act, renderHook } from '@testing-library/react';

type Status = 'PROCESSING' | 'GENERATING' | 'READY' | 'FAILED';
const JOB = 'job-1';

const backend = {
  status: 'READY' as Status,
  generatingUntil: 0,
  statusCalls: 0,
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeApi() {
  return createApi({
    reducerPath: 'api',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['JobDescription'],
    endpoints: (b) => ({
      getJdStatus: b.query<{ status: Status; error_message: string | null }, string>({
        queryFn: async () => {
          backend.statusCalls++;
          if (backend.status === 'GENERATING' && Date.now() >= backend.generatingUntil) {
            backend.status = 'READY';
          }
          const snapshot = backend.status;
          await sleep(300);
          return { data: { status: snapshot, error_message: null } };
        },
        providesTags: (_r, _e, id) => [{ type: 'JobDescription', id }],
      }),
      enhanceJd: b.mutation<Record<string, never>, string>({
        queryFn: async () => {
          await sleep(350);
          backend.status = 'GENERATING';
          backend.generatingUntil = Date.now() + 4_000;
          return { data: {} };
        },
        invalidatesTags: (_r, _e, id) => [{ type: 'JobDescription', id }],
      }),
    }),
  });
}

const testApi = vi.hoisted(() => ({ current: null as unknown as ReturnType<typeof makeApi> }));

vi.mock('../../src/api/job-service/JobOpening/JdUpload', () => ({
  useGetJdStatusQuery: (...args: unknown[]) =>
    (testApi.current.useGetJdStatusQuery as (...a: unknown[]) => unknown)(...args),
}));
vi.mock('../../src/components/shared/ui/toast', () => ({ showToast: vi.fn() }));

import { useJdStatusPolling } from '../../src/hooks/useJdStatusPolling';

const tick = async (ms: number, step = 100) => {
  for (let i = 0; i < ms / step; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(step);
    });
  }
};

function setup() {
  testApi.current = makeApi();
  const api = testApi.current;
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (g) => g().concat(api.middleware),
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { api, store, wrapper };
}

describe('useJdStatusPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    backend.status = 'READY';
    backend.statusCalls = 0;
  });
  afterEach(() => vi.useRealTimers());

  it('shows READY by itself after a regenerate started on the previous step', async () => {
    const { api, store, wrapper } = setup();

    // Previous step: status READY is loaded and cached.
    const details = renderHook(() => useJdStatusPolling(JOB), { wrapper });
    await tick(2_500);
    expect(details.result.current.data?.status).toBe('READY');

    // Save triggers a regenerate and navigates at once (new page mounts).
    let panel!: ReturnType<typeof renderHook<ReturnType<typeof useJdStatusPolling>, unknown>>;
    await act(async () => {
      const started = store.dispatch(api.endpoints.enhanceJd.initiate(JOB));
      await vi.advanceTimersByTimeAsync(360);
      await started;
      details.unmount();
      panel = renderHook(() => useJdStatusPolling(JOB), { wrapper });
    });

    await tick(15_000);
    expect(panel.result.current.data?.status).toBe('READY');
    expect(panel.result.current.timedOut).toBe(false);
  });

  it('stops polling once READY', async () => {
    const { wrapper } = setup();
    renderHook(() => useJdStatusPolling(JOB), { wrapper });
    await tick(30_000);
    expect(backend.statusCalls).toBe(1);
  });

  it('backs off: at most one request every 2 s at first, then every 5 s', async () => {
    const { wrapper } = setup();
    backend.status = 'GENERATING';
    backend.generatingUntil = Number.MAX_SAFE_INTEGER;
    renderHook(() => useJdStatusPolling(JOB), { wrapper });
    await tick(60_000);
    // 1 initial + ~9 polls in the first 20 s + ~8 in the next 40 s.
    expect(backend.statusCalls).toBeGreaterThan(10);
    expect(backend.statusCalls).toBeLessThan(25);
  });

  it('gives up after 3 minutes instead of buffering forever', async () => {
    const { wrapper } = setup();
    backend.status = 'GENERATING';
    backend.generatingUntil = Number.MAX_SAFE_INTEGER;
    const hook = renderHook(() => useJdStatusPolling(JOB, { notifyOnTimeout: true }), { wrapper });
    await tick(185_000, 250);
    expect(hook.result.current.timedOut).toBe(true);
    const callsAtGiveUp = backend.statusCalls;
    await tick(30_000, 250);
    expect(backend.statusCalls).toBe(callsAtGiveUp);
  });
});
