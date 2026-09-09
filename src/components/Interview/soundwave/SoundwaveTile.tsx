import { useEffect, useRef } from 'react';
import type { TrackReference } from '@livekit/components-react';
import { InterviewVisualizer } from './interview-visualizer';

// Renders the AI interviewer's presence for an AI_VIDEO round as a live,
// audio-reactive waveform instead of a video tile — ai-service's own agent
// never publishes a video track (confirmed directly against
// `livekit_room_agent_client.py`: `publish_audio_track()` only), so this is
// not a stylistic substitute for a video feed that could otherwise be shown,
// it's the only thing there actually is to render for that participant.
//
// Wraps the vendored `interview-visualizer.js` (braid variant) exactly per
// its own README's React usage example: one instance for the component's
// whole lifetime (empty-dep mount effect), `destroy()` on unmount, `setState`
// driven by a separate effect keyed on whatever changes the visual state.
//
// STATE MAPPING — the library ships four states (`connecting`/`ai`/
// `candidate`/`idle`) but only `'candidate'` ever reads a live AnalyserNode;
// `'ai'` always plays a synthetic, procedurally-generated envelope, real
// audio or not (see interview-visualizer.js's own `_frame()`). Since the
// whole point here is a waveform that's actually reactive to the AI's real
// voice, this component never uses the `'ai'` state — it attaches a real
// analyser built from the AI's LiveKit audio track and drives:
//   no track yet          -> 'connecting'
//   track present, silent -> 'idle'
//   track present, loud   -> 'candidate'   (the library's "read the attached
//                                            analyser" slot — naming is the
//                                            library's own, not a claim that
//                                            the candidate is the source)
export type SoundwaveTileProps = {
  /** The AI participant's subscribed microphone TrackReference. `undefined`
   * while no remote participant has joined/published audio yet — renders
   * the 'connecting' look. */
  audioTrackRef: TrackReference | undefined;
  className?: string;
  label?: string;
};

// Hysteresis thresholds against the 0..1 level this component computes from
// the analyser's frequency data (same normalisation the library's own
// 'candidate' branch uses internally, so the two stay visually consistent).
// Fast attack (speak as soon as it's loud enough), slow release (a short
// pause mid-sentence shouldn't flicker back to 'idle' and cross-fade away).
const SPEAKING_ON_THRESHOLD = 0.07;
const SPEAKING_OFF_HOLD_MS = 380;

export const SoundwaveTile = ({ audioTrackRef, className, label }: SoundwaveTileProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vizRef = useRef<InterviewVisualizer | null>(null);

  // Mount once for the component's lifetime — recreating this on every
  // track/state change would restart the crossfade animation and, per the
  // README, leak an AudioContext if destroy() isn't paired with every
  // construction.
  useEffect(() => {
    if (!canvasRef.current) return;
    const viz = new InterviewVisualizer(canvasRef.current, {
      variant: 'braid',
      state: 'connecting',
      // No hues/chromas override — one fixed, general theme for every
      // tenant/job, per product decision; the library's own defaults are
      // already a considered palette (amber connecting, teal "speaking",
      // cool violet idle).
    });
    vizRef.current = viz;
    return () => {
      viz.destroy();
      vizRef.current = null;
    };
  }, []);

  // Analyser wiring + amplitude-driven state, re-run whenever the AI's
  // track reference changes (participant (re)joins, track republished after
  // a reconnect, etc).
  useEffect(() => {
    const viz = vizRef.current;
    if (!viz) return;

    const track = audioTrackRef?.publication?.track;
    const mediaStreamTrack = track?.mediaStreamTrack;
    if (!mediaStreamTrack) {
      viz.setState('connecting');
      return;
    }

    let cancelled = false;
    let rafId: number | null = null;
    let audioContext: AudioContext | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      // No Web Audio support at all — nothing to analyse; leave the braid on
      // its synthetic-free 'connecting' look rather than crash.
      viz.setState('connecting');
      return;
    }

    audioContext = new AudioContextCtor();
    // AnalyserNode tap only — deliberately NEVER connected to
    // `audioContext.destination`. The remote track's actual audible
    // playback is already handled by `<RoomAudioRenderer />` in the room;
    // connecting this tap to destination too would be a second, independent
    // playback path (real double-audio), not a visualization concern.
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.72;

    const stream = new MediaStream([mediaStreamTrack]);
    sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyser);
    viz.attachAnalyser(analyser);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false;
    let lastAboveThresholdAt = 0;

    void audioContext.resume();

    const sample = () => {
      if (cancelled) return;
      analyser.getByteFrequencyData(freqData);
      // Same band range + normalisation interview-visualizer.js's own
      // 'candidate' branch uses, so "loud enough to be speaking" here
      // agrees with how loud the braid itself will actually render.
      let sumSquares = 0;
      const upper = Math.min(140, freqData.length);
      for (let i = 2; i < upper; i++) sumSquares += freqData[i] * freqData[i];
      const level = Math.min(1, Math.sqrt(sumSquares / (upper - 2)) / 118);

      const now = performance.now();
      if (level > SPEAKING_ON_THRESHOLD) {
        lastAboveThresholdAt = now;
        if (!speaking) speaking = true;
      } else if (speaking && now - lastAboveThresholdAt > SPEAKING_OFF_HOLD_MS) {
        speaking = false;
      }
      viz.setState(speaking ? 'candidate' : 'idle');

      rafId = requestAnimationFrame(sample);
    };
    rafId = requestAnimationFrame(sample);

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      sourceNode?.disconnect();
      void audioContext?.close();
    };
    // Keyed on the track identity, not the whole TrackReference object — a
    // new object wrapping the same underlying track shouldn't retrigger this.
  }, [audioTrackRef?.publication?.track?.mediaStreamTrack]);

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-950 ${className ?? ''}`}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      {label && (
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/40 px-2 py-1 text-xs font-medium text-white/80">
          {label}
        </span>
      )}
    </div>
  );
};

export default SoundwaveTile;
