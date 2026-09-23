import { useEffect, useRef, useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';

// Pre-join screen shown before connecting to the LiveKit room at all — for
// every round type, no exceptions. Candidate always previews and can toggle
// both camera and mic here (per product decision: AI_VIDEO keeps the
// candidate's camera on same as PANEL, it's only the *interviewer* side that
// differs). Uses raw `getUserMedia`/device enumeration rather than mounting
// `<LiveKitRoom connect={false}>` for the preview — simpler and avoids
// depending on unconfirmed behaviour of toggling local tracks before a room
// connection exists. Tracks started here are stopped before handing off to
// the real room (`onReady`), which acquires its own via `<LiveKitRoom audio
// video>` — a brief device release/reacquire, same pattern virtually every
// video-conferencing pre-join screen uses.

export type DeviceCheckLobbyProps = {
  onReady: (choice: { micEnabled: boolean; cameraEnabled: boolean }) => void;
};

type DeviceOption = { deviceId: string; label: string };

const stopStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

export const DeviceCheckLobby = ({ onReady }: DeviceCheckLobbyProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const [audioDevices, setAudioDevices] = useState<DeviceOption[]>([]);
  const [videoDevices, setVideoDevices] = useState<DeviceOption[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const teardownLevelMeter = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const startLevelMeter = (stream: MediaStream) => {
    teardownLevelMeter();
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    audioContextRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    ctx.createMediaStreamSource(stream).connect(analyser); // tap only, never to destination
    const data = new Uint8Array(analyser.frequencyBinCount);

    const sample = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      setMicLevel(Math.min(1, Math.sqrt(sum / data.length) / 90));
      rafRef.current = requestAnimationFrame(sample);
    };
    rafRef.current = requestAnimationFrame(sample);
  };

  const startPreview = async (audioDeviceId?: string, videoDeviceId?: string) => {
    setError(null);
    stopStream(streamRef.current);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioDeviceId
          ? { deviceId: { exact: audioDeviceId }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true },
        video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      startLevelMeter(stream);

      // Device labels are empty until permission is granted — enumerate
      // only now, after getUserMedia succeeded once.
      const all = await navigator.mediaDevices.enumerateDevices();
      const mics = all
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || 'Microphone' }));
      const cams = all
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || 'Camera' }));
      setAudioDevices(mics);
      setVideoDevices(cams);
      setSelectedAudioId(
        (prev) => prev || stream.getAudioTracks()[0]?.getSettings().deviceId || ''
      );
      setSelectedVideoId(
        (prev) => prev || stream.getVideoTracks()[0]?.getSettings().deviceId || ''
      );

      stream.getAudioTracks().forEach((t) => (t.enabled = micEnabled));
      stream.getVideoTracks().forEach((t) => (t.enabled = cameraEnabled));
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'NotAllowedError'
          ? 'Camera and microphone access was blocked. Allow access in your browser settings, then reload this page.'
          : 'Could not access your camera/microphone. Check that no other app is using them.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void startPreview();
    return () => {
      stopStream(streamRef.current);
      teardownLevelMeter();
    };
  }, []);

  const handleMicToggle = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
  };

  const handleCameraToggle = () => {
    const next = !cameraEnabled;
    setCameraEnabled(next);
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
  };

  const handleJoin = () => {
    stopStream(streamRef.current);
    teardownLevelMeter();
    onReady({ micEnabled, cameraEnabled });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 py-10 text-white">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-center text-xl font-semibold">Check your camera and mic</h1>
        <p className="mb-6 text-center text-sm text-neutral-400">
          You&apos;ll be on camera for the whole interview, so take a moment to make sure everything
          looks and sounds right.
        </p>

        <div className="relative aspect-video overflow-hidden rounded-2xl bg-neutral-900">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
              Requesting camera access…
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${cameraEnabled ? '' : 'hidden'}`}
          />
          {!loading && !cameraEnabled && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
              Camera off
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleMicToggle}
            className={`flex h-11 w-11 items-center justify-center rounded-full border cursor-pointer ${
              micEnabled
                ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700'
                : 'border-red-600 bg-red-600 hover:bg-red-500'
            }`}
            aria-pressed={micEnabled}
            aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {micEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </button>
          <button
            type="button"
            onClick={handleCameraToggle}
            className={`flex h-11 w-11 items-center justify-center rounded-full border cursor-pointer ${
              cameraEnabled
                ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700'
                : 'border-red-600 bg-red-600 hover:bg-red-500'
            }`}
            aria-pressed={cameraEnabled}
            aria-label={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {cameraEnabled ? <FaVideo /> : <FaVideoSlash />}
          </button>
        </div>

        {/* Live mic level meter — the simplest honest "yes, it's working" signal */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-100"
            style={{ width: `${micEnabled ? Math.round(micLevel * 100) : 0}%` }}
          />
        </div>

        {(audioDevices.length > 1 || videoDevices.length > 1) && (
          <div className="mt-5 flex flex-col gap-2">
            {audioDevices.length > 1 && (
              <select
                value={selectedAudioId}
                onChange={(e) => {
                  setSelectedAudioId(e.target.value);
                  void startPreview(e.target.value, selectedVideoId);
                }}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
              >
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            )}
            {videoDevices.length > 1 && (
              <select
                value={selectedVideoId}
                onChange={(e) => {
                  setSelectedVideoId(e.target.value);
                  void startPreview(selectedAudioId, e.target.value);
                }}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
              >
                {videoDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleJoin}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-white py-3 text-sm font-semibold text-neutral-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Join Interview
        </button>
      </div>
    </div>
  );
};

export default DeviceCheckLobby;
