import { useIsSpeaking } from '@livekit/components-react';
import type { Participant } from 'livekit-client';

// Shown for a person whose camera is off (or who joined without one), in
// place of the soundwave — that one is reserved for the AI interviewer,
// which has no camera at all. Initials in a coloured circle; the ring
// lights up while they speak so it's still clear who's talking.

const AVATAR_COLORS = [
  'bg-sky-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-fuchsia-600',
];

const getInitials = (name: string): string => {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
};

// Same name always gets the same colour, for every viewer.
const colorFor = (key: string): string => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

type CameraOffTileProps = {
  participant: Participant;
  name: string;
  className?: string;
};

export const CameraOffTile = ({ participant, name, className }: CameraOffTileProps) => {
  const isSpeaking = useIsSpeaking(participant);
  return (
    <div
      className={`@container flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-800 ${className ?? ''}`}
      aria-label={`${name}, camera off`}
    >
      <div
        className={`flex aspect-square w-[min(7rem,34cqi)] min-w-12 select-none items-center justify-center rounded-full text-[clamp(1rem,11cqi,2.5rem)] font-semibold text-white ring-offset-2 ring-offset-neutral-800 transition-shadow duration-150 ${colorFor(
          participant.identity || name
        )} ${isSpeaking ? 'ring-4 ring-emerald-400' : 'ring-0'}`}
      >
        {getInitials(name)}
      </div>
    </div>
  );
};

export default CameraOffTile;
