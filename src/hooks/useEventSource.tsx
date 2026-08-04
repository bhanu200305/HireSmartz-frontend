import { useEffect, useRef } from 'react';
import { handleRefreshToken } from '../services/AuthService';

export type StreamType = 'candidate' | 'batch';

interface UseEventSourceProps {
  type: StreamType;
  restUrl: string;
  token?: string;
  queryParams?: Record<string, string | number | boolean>;
  // requestBody?: Record<string, any>
  onMessage: (data: any) => void;
  onAbort?: (controller?: any, eventData?: any) => void | Promise<void>;
}

const useEventSource = ({
  type,
  restUrl,
  token,
  queryParams,
  // requestBody,
  onMessage,
  onAbort,
}: UseEventSourceProps) => {
  const controllerRef = useRef<AbortController | null>(null);
  const batchCompletedRef = useRef(false);
  const activeConnectionKeyRef = useRef<string | null>(null);
  // Tracks the URL that the currently running batch SSE is connected to.
  // Prevents StrictMode's mount→cleanup→remount from opening two connections
  // to the same URL (which tells the server "client closed" on the first abort).
  const activeUrlRef = useRef<string | null>(null);

  const baseUrl = `${import.meta.env.VITE_BACKEND_ENDPOINT}${import.meta.env.VITE_BACKEND_PREFIX}`;
  const getFullUrl = () => {
    const url = new URL(baseUrl + restUrl);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  };

  const connectToSSE = async (tkn: string | undefined, signal: AbortSignal) => {
    try {
      const url = getFullUrl();
      const headers: HeadersInit = {
        Accept: 'text/event-stream',
      };

      if (tkn) {
        headers.Authorization = 'Bearer ' + tkn;
      }

      const requestOptions: RequestInit = {
        method: 'GET',
        headers,
        signal,
      };

      const response = await fetch(url, requestOptions);

      if (!response.ok || !response.body) {
        if (tkn && response.status === 401) {
          const refreshTokenResponse = await handleRefreshToken();
          if (refreshTokenResponse?.token) {
            return connectToSSE(refreshTokenResponse.token, signal);
          }
        }
        throw new Error('Failed to connect to SSE stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const KEEPALIVE_PATTERNS = /^(ping|heartbeat|keepalive|pong)$/i;

      const processLine = async (line: string) => {
        line = line.trim();
        if (!line) return;

        // Skip SSE comment lines used as keepalives (e.g. ": ping", ": heartbeat")
        if (line.startsWith(':')) return;

        let data = line;
        // Handle standard SSE format
        if (line.startsWith('data:')) {
          data = line.slice(5).trim();
        }
        // Handle raw JSON response (backend quirk)
        else if (!line.startsWith('{') && !line.startsWith('[')) {
          return;
        }

        // Skip known keepalive/ping payloads that are not JSON
        if (KEEPALIVE_PATTERNS.test(data)) return;

        try {
          const json = JSON.parse(data);

          if (type === 'batch' && json.status === 'BATCH_COMPLETED') {
            batchCompletedRef.current = true;
            activeUrlRef.current = null; // allow reconnection for a future batch
            if (onAbort) {
              await onAbort?.(controllerRef.current, json);
            } else {
              controllerRef.current?.abort();
            }
          }

          onMessage(json);
        } catch (err) {
          console.warn('Received non-JSON SSE data:', data);
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            if (buffer.trim()) {
              await processLine(buffer);
            }
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            await processLine(line);
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
        } else {
          console.error('SSE stream error:', err);
          if (type === 'batch') {
            activeUrlRef.current = null;
            activeConnectionKeyRef.current = null;
          }
          onMessage(null);
        }
      } finally {
        reader.releaseLock();
        if (type === 'batch' && !batchCompletedRef.current) {
          // Stream ended unexpectedly before completion; allow reconnect attempts.
          activeUrlRef.current = null;
          activeConnectionKeyRef.current = null;
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
      } else {
        console.error('SSE connection error:', error);
        if (type === 'batch') {
          activeUrlRef.current = null;
          activeConnectionKeyRef.current = null;
        }
        onMessage(null);
      }
    }
  };

  useEffect(() => {
    if (!restUrl) {
      // Empty string is an intentional skip — no warning needed
      return;
    }
    if (restUrl.includes('null') || restUrl.includes('undefined')) {
      console.warn('SSE not started because restUrl is empty or invalid:', restUrl);
      return;
    }

    if (type === 'batch') {
      const connectionKey = `${restUrl}::${token || ''}`;
      // If already connected to this exact URL, skip.
      // This is the StrictMode guard: mount→cleanup→remount with the same restUrl
      // must not open a second connection, otherwise the first abort tells the server
      // "client closed the stream" and the server terminates batch processing early.
      if (activeConnectionKeyRef.current === connectionKey && controllerRef.current) {
        return;
      }
      // URL changed (new batch) — abort the old connection before starting new one.
      if (activeUrlRef.current !== null && controllerRef.current) {
        controllerRef.current.abort();
      }
      activeUrlRef.current = restUrl;
      activeConnectionKeyRef.current = connectionKey;
    }

    batchCompletedRef.current = false;
    const controller = new AbortController();
    controllerRef.current = controller;

    connectToSSE(token, controller.signal);

    return () => {
      if (type === 'batch') {
        // Do NOT abort here for batch type.
        // The StrictMode deduplication above (activeUrlRef check) prevents double
        // connections, so we no longer need the abort to suppress the ghost stream.
        // Aborting here would still send "client closed" to the server prematurely.
        // activeUrlRef is intentionally NOT reset here; it's reset when onAbort fires
        // (BATCH_COMPLETED) or when the URL changes in the effect body above.
      } else {
        if (controllerRef.current) {
          controllerRef.current.abort();
          onAbort?.();
        }
      }
    };
  }, [restUrl, token, type, JSON.stringify(queryParams)]);
};

export default useEventSource;
