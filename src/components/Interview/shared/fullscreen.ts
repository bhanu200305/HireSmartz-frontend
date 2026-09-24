// Cross-browser Fullscreen API helpers — Safari (desktop + iOS) only
// exposes the prefixed `webkit*` variants, everything else has the
// standard unprefixed ones.
type FullscreenishElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FullscreenishDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

export const isDocumentFullscreen = (): boolean => {
  const doc = document as FullscreenishDocument;
  return !!(doc.fullscreenElement || doc.webkitFullscreenElement);
};

/**
 * Must be called synchronously inside a real user gesture (a click
 * handler, before any `await`) — browsers silently refuse
 * `requestFullscreen()` otherwise. Fails silently rather than blocking the
 * candidate from joining their interview: some browsers/contexts (an
 * iframe without `allowfullscreen`, a browser that doesn't support the
 * API at all) will never grant this, and that's not worth erroring over.
 */
export const requestFullscreen = (): void => {
  const el = document.documentElement as FullscreenishElement;
  const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
  if (!request) return;
  void Promise.resolve(request()).catch(() => {});
};

export const exitFullscreen = (): void => {
  if (!isDocumentFullscreen()) return;
  const doc = document as FullscreenishDocument;
  const exit = doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc);
  if (!exit) return;
  void Promise.resolve(exit()).catch(() => {});
};
