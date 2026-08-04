import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setStreamError, updateStreamPayload } from '../redux/slices/streamSlice';

const AI_STREAM_BASE_URL = `${import.meta.env.VITE_BACKEND_ENDPOINT}/v1`;

interface StreamEventPayload {
  eventName: string;
  jobId?: number;
  interviewRoundIds?: number[];
  [key: string]: unknown;
}

/**
 * Hook to manage the AI questions stream lifecycle
 * Starts the stream and updates Redux with stream events
 * Returns abort function to stop the stream
 */
export const useStreamManager = () => {
  const dispatch = useDispatch();
  const activeControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (jobOpeningId: number) => {
      // Stop any existing stream
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }

      const controller = new AbortController();
      activeControllerRef.current = controller;

      const url = `${AI_STREAM_BASE_URL}/ai-questions/stream?jobId=${jobOpeningId}`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            Connection: 'keep-alive',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Stream error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get stream reader');
        }

        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let currentEvent: string | null = null;
        let currentData: string | null = null;

        const KEEPALIVE_EVENTS = new Set(['ping', 'heartbeat', 'keepalive', 'pong']);

        const processSSEEvent = (eventName: string, data: string) => {
          // Skip server-sent keepalive/ping events — they are not JSON payloads
          if (
            KEEPALIVE_EVENTS.has(eventName.toLowerCase()) ||
            KEEPALIVE_EVENTS.has(data.toLowerCase())
          ) {
            return;
          }

          try {
            const jsonData = JSON.parse(data);
            const payload: StreamEventPayload = {
              eventName,
              ...jsonData,
            };

            console.log('Stream event received:', eventName, jsonData);
            dispatch(updateStreamPayload(payload));
          } catch (parseErr) {
            // Non-JSON SSE data (e.g. informational text messages) — log as warning only
            console.warn('Received non-JSON SSE data (skipping):', data);
          }
        };

        const processLine = (line: string) => {
          const trimmed = line.trim();

          // Empty line signals end of event
          if (!trimmed) {
            if (currentEvent && currentData) {
              processSSEEvent(currentEvent, currentData);
              currentEvent = null;
              currentData = null;
            }
            return;
          }

          // Skip SSE comment lines used as keepalives (e.g. ": ping", ": heartbeat")
          if (trimmed.startsWith(':')) {
            return;
          }

          // Parse event: line (event comes before data in SSE protocol)
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim();
          }

          // Parse data: line (can be multi-line)
          if (trimmed.startsWith('data:')) {
            const dataValue = trimmed.slice(5).trim();
            currentData = currentData ? currentData + '\n' + dataValue : dataValue;
          }
        };

        const readLoop = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                // Process any remaining data in buffer
                if (buffer.trim()) {
                  processLine(buffer);
                }
                // Process any accumulated event
                if (currentEvent && currentData) {
                  processSSEEvent(currentEvent, currentData);
                }
                break;
              }

              // Decode with streaming flag to properly handle multi-byte UTF-8 sequences
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              // Split by newlines but keep incomplete lines in buffer
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep last incomplete line

              for (const line of lines) {
                processLine(line);
              }
            }

            // Final decode flush to handle any remaining bytes
            const finalChunk = decoder.decode();
            if (finalChunk) {
              buffer += finalChunk;
              const lines = buffer.split('\n');
              buffer = '';
              for (const line of lines) {
                processLine(line);
              }
            }
          } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
              dispatch(setStreamError(err.message));
              console.error('Stream read error:', err);
            }
          }
        };

        await readLoop();
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          dispatch(setStreamError(err.message));
        }
      }
    },
    [dispatch]
  );

  const stopStream = useCallback(() => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
      activeControllerRef.current = null;
    }
  }, []);

  return { startStream, stopStream };
};
