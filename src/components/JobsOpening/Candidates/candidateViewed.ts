// Which candidates THIS user has already opened, so the "New" badge in the
// candidate list lasts only until the person looking at the list (recruiter,
// hiring manager, anyone) opens that candidate's profile once.
//
// Stored per user, in this browser's localStorage: candidate-service has no
// "viewed by" tracking yet, so the state does not follow the user to another
// browser or device. Every access is wrapped: localStorage can throw or be
// empty (private window, blocked site data) and the badge must still render.

const storageKey = (userId: string) => `cfp:viewed-candidates:${userId}`;

type ViewedMap = Record<string, number>;

const readViewed = (userId: string): ViewedMap => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === 'object' ? (parsed as ViewedMap) : {};
  } catch {
    return {};
  }
};

export const isCandidateViewed = (
  userId: string | number | null | undefined,
  candidateId: string
): boolean => (userId == null ? false : candidateId in readViewed(String(userId)));

export const markCandidateViewed = (
  userId: string | number | null | undefined,
  candidateId: string
): void => {
  if (userId == null || !candidateId) return;
  try {
    const key = String(userId);
    const viewed = readViewed(key);
    if (candidateId in viewed) return;
    viewed[candidateId] = Date.now();
    window.localStorage.setItem(storageKey(key), JSON.stringify(viewed));
  } catch {
    // Storage unavailable: the badge simply stays until the window ends.
  }
};
