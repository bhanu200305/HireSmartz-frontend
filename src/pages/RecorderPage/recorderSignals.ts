// What LiveKit's egress service loads for a custom recording layout, and how this page
// talks back to it.
//
// LiveKit opens this page in its own headless browser and appends three query
// parameters to the URL it is given: `url` (the LiveKit server), `token` (an access
// token for a hidden "recorder" participant, minted by LiveKit itself) and `layout`
// (whatever the backend passed when it started the egress). It starts recording when the
// page logs START_RECORDING to the browser console and stops when it logs END_RECORDING.
//
// This is what `EgressHelper` in `@livekit/egress-sdk` does too (read the three
// parameters, log those two strings); it is a few lines, so it is written here rather than
// adding a package to the app for it.

export type RecorderParams = {
  serverUrl: string | null;
  token: string | null;
  layout: string;
};

export const readRecorderParams = (search: string): RecorderParams => {
  const params = new URLSearchParams(search);
  return {
    serverUrl: params.get('url'),
    token: params.get('token'),
    layout: params.get('layout') || 'grid',
  };
};

export const START_RECORDING = 'START_RECORDING';
export const END_RECORDING = 'END_RECORDING';

// Each signal is sent at most once: starting twice or ending twice would confuse the
// recorder, and a reconnect inside the page must not restart it.
let started = false;
let ended = false;

export const startRecording = (): void => {
  if (started || ended) return;
  started = true;
  console.log(START_RECORDING);
};

export const endRecording = (): void => {
  if (!started || ended) return;
  ended = true;
  console.log(END_RECORDING);
};

/** For tests only. */
export const resetRecorderSignals = (): void => {
  started = false;
  ended = false;
};
