import { useEffect, useRef } from 'react';
import { handleRefreshToken } from '../services/AuthService';

interface UseJdUploadStreamProps {
  batchId: string | null;
  token?: string;
  onProgress?: (data: any) => void;
  onNotification?: (data: any) => void;
  onComplete?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * Hook to manage JD Upload stream connections for real-time progress and notifications
 * Handles both progress and notification streams
 */
const useJdUploadStream = ({
  batchId,
  token,
  onProgress,
  onNotification,
  onComplete,
  onError,
}: UseJdUploadStreamProps) => {
  const progressControllerRef = useRef<AbortController | null>(null);
  const notificationControllerRef = useRef<AbortController | null>(null);
  const activeConnectionKeyRef = useRef<string | null>(null);

  const baseUrl = `${import.meta.env.VITE_BACKEND_ENDPOINT}${import.meta.env.VITE_BACKEND_PREFIX}`;

  const connectToStream = async (
    streamType: 'progress' | 'notifications',
    tkn: string | undefined,
    signal: AbortSignal
  ) => {
    try {
      const url = new URL(baseUrl + `/job-opening/jd-upload/${streamType}?batchId=${batchId}`);
      const headers: HeadersInit = {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      };

      if (tkn) {
        headers.Authorization = 'Bearer ' + tkn;
      }

      const requestOptions: RequestInit = {
        method: 'GET',
        headers,
        signal,
      };

      const response = await fetch(url.toString(), requestOptions);

      if (!response.ok || !response.body) {
        if (tkn && response.status === 401) {
          const refreshTokenResponse = await handleRefreshToken();
          if (refreshTokenResponse?.token) {
            return connectToStream(streamType, refreshTokenResponse.token, signal);
          }
        }
        throw new Error(`Failed to connect to ${streamType} stream: ${response.statusText}`);
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

          // Route to appropriate handler based on stream type and event
          if (streamType === 'progress') {
            // Check for completion status
            if (json.status === 'COMPLETED' || json.status === 'JD_UPLOAD_COMPLETED') {
              onComplete?.(json);
            } else {
              onProgress?.(json);
            }
          } else if (streamType === 'notifications') {
            onNotification?.(json);
          }
        } catch (err) {
          console.warn(`Received non-JSON ${streamType} data:`, data);
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

          // Decode chunk with streaming flag to handle multi-byte characters
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            await processLine(line);
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.debug(`${streamType} stream aborted`);
        } else {
          console.error(`${streamType} stream error:`, err);
          onError?.(err);
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.debug(`${streamType} connection aborted`);
      } else {
        console.error(`${streamType} connection error:`, error);
        onError?.(error);
      }
    }
  };

  useEffect(() => {
    if (!batchId) {
      // Clear old connections if batchId is cleared
      if (progressControllerRef.current) {
        progressControllerRef.current.abort();
        progressControllerRef.current = null;
      }
      if (notificationControllerRef.current) {
        notificationControllerRef.current.abort();
        notificationControllerRef.current = null;
      }
      return;
    }

    const connectionKey = `jd-upload::${batchId}::${token || ''}`;

    // Prevent duplicate connections in React StrictMode
    if (activeConnectionKeyRef.current === connectionKey) {
      return;
    }

    // Abort old connections before starting new ones
    if (progressControllerRef.current) {
      progressControllerRef.current.abort();
    }
    if (notificationControllerRef.current) {
      notificationControllerRef.current.abort();
    }

    activeConnectionKeyRef.current = connectionKey;

    // Connect to both streams in parallel
    const progressController = new AbortController();
    const notificationController = new AbortController();

    progressControllerRef.current = progressController;
    notificationControllerRef.current = notificationController;

    connectToStream('progress', token, progressController.signal);
    connectToStream('notifications', token, notificationController.signal);

    return () => {
      // Don't abort here to prevent premature disconnection in StrictMode
      // The connections will be aborted when batchId changes or component unmounts
    };
  }, [batchId, token, onProgress, onNotification, onComplete, onError]);

  const stopStreams = () => {
    if (progressControllerRef.current) {
      progressControllerRef.current.abort();
      progressControllerRef.current = null;
    }
    if (notificationControllerRef.current) {
      notificationControllerRef.current.abort();
      notificationControllerRef.current = null;
    }
    activeConnectionKeyRef.current = null;
  };

  return { stopStreams };
};

export default useJdUploadStream;
