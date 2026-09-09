// Placeholder for the AI_VIDEO round's "avatar" presentation variant.
//
// NOT WIRED TO ANYTHING LIVE, DELIBERATELY. ai-service's real agent
// (`livekit_room_agent_client.py`) only ever calls `publish_audio_track()` —
// there is no video/avatar track published today, for any booking, under
// any job configuration. job-service's own catalog already lets a recruiter
// pick "avatar" as a round variant (`available_variants`), but nothing on
// the candidate-facing session join contract (`SessionTokenView`) exposes
// which variant a booking is configured for either — so `InterviewRoomLayout`
// has no live signal that would ever route a candidate to this component.
//
// It exists so the seam is ready — greyed out, "coming soon" — for the day
// either becomes true: ai-service starts publishing a real video track (this
// component gets replaced by an actual `ParticipantTile`, same as any human
// interviewer), or `presentation_mode` becomes reachable candidate-side and
// product wants an explicit "avatar is configured but not built yet" state
// instead of silently falling back to the soundwave. Until then this is
// dead code with nothing pointing at it — do not wire it into
// `InterviewRoomLayout`'s render path without both of those being real.
export const AvatarTile = ({ className }: { className?: string }) => (
  <div
    className={`flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/60 text-neutral-500 ${className ?? ''}`}
    aria-disabled="true"
  >
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
    <span className="text-sm font-medium">Avatar mode</span>
    <span className="text-xs text-neutral-600">Coming soon</span>
  </div>
);

export default AvatarTile;
