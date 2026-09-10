// Hand-written declaration for the vendored `interview-visualizer.js` (a
// plain ES module, no build step, no types of its own — see that file's own
// header comment). This project doesn't enable `allowJs`/`checkJs`, so this
// file exists purely to let `tsc` type-check anything that imports from
// `./interview-visualizer` — it must be kept in sync with the real file's
// public API by hand (constructor options, `setState`'s state union,
// `set()`'s runtime-option keys) if that file is ever re-copied from the
// source artifact with a changed API.

export type VisualizerState = 'connecting' | 'ai' | 'candidate' | 'idle';
export type VisualizerVariant = 'aperture' | 'braid' | 'field';

export interface VisualizerHueMap {
  connecting: number;
  ai: number;
  candidate: number;
  idle: number;
}

export interface VisualizerChromaMap {
  connecting: number;
  ai: number;
  candidate: number;
  idle: number;
}

export interface InterviewVisualizerOptions {
  variant?: VisualizerVariant;
  state?: VisualizerState;
  /** Input gain; raise for quiet mics. Default 1.15. */
  sensitivity?: number;
  /** Global time scale. Default 1. */
  motionSpeed?: number;
  /** Canvas shadow bloom — set false on low-end devices. Default true. */
  glow?: boolean;
  /** 'field' variant only — draws the O(n^2) link pass. Default true. */
  connectors?: boolean;
  hues?: Partial<VisualizerHueMap>;
  chromas?: Partial<VisualizerChromaMap>;
}

export interface InterviewVisualizerRuntimeOptions {
  sensitivity?: number;
  motionSpeed?: number;
  glow?: boolean;
  connectors?: boolean;
  hues?: Partial<VisualizerHueMap>;
  chromas?: Partial<VisualizerChromaMap>;
}

export class InterviewVisualizer {
  constructor(canvas: HTMLCanvasElement, opts?: InterviewVisualizerOptions);

  /** Crossfades color + geometry to the new state — never cuts. */
  setState(next: VisualizerState): void;
  setVariant(variant: VisualizerVariant): void;
  set(opts: InterviewVisualizerRuntimeOptions): void;

  /** Grabs the mic via getUserMedia + builds its own AnalyserNode. Must be
   * called from a user gesture. Resolves false on denial (not a rejection) —
   * the synthetic envelope silently keeps running either way. */
  enableMic(): Promise<boolean>;
  /** Stops any mic tracks started by enableMic() and clears the analyser. */
  disableMic(): void;
  /** Drive the 'candidate' state from an AnalyserNode you already own —
   * that state is the only one that reads a live analyser at all (the 'ai'
   * state always plays its own synthetic envelope, see interview-visualizer.js's
   * own header comment). */
  attachAnalyser(node: AnalyserNode): void;

  /** Called automatically on window resize + ResizeObserver; exposed in
   * case you need to force a re-measure after your own layout change. */
  resize(): void;
  /** Cancels the rAF loop and closes any AudioContext this instance opened.
   * Required on unmount. */
  destroy(): void;
}

export default InterviewVisualizer;
