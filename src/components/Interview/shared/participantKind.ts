import type { Participant } from 'livekit-client';

// interview-service gives every person in a room a UUID identity (the
// candidate's is their candidate id, an interviewer's their user id), or the
// legacy "interviewer-link". ai-service's interviewer joins as a plain
// participant under a configured name ("Iris"), not as a LiveKit agent. So
// anything that is not a person's identity is the AI: the only participant that
// gets the soundwave, because it never has a camera. A person with their camera
// off must never look like it.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isAiIdentity = (identity: string): boolean =>
  !(UUID_RE.test(identity) || identity === 'interviewer-link');

export const isAiInterviewer = (participant: Pick<Participant, 'isAgent' | 'identity'>): boolean =>
  participant.isAgent || isAiIdentity(participant.identity);
