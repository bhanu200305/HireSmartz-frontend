// The time-picker page asks for "AI-assisted interview" consent before it shows
// the calendar. That consent only fits rounds an AI agent runs, so it is skipped
// for human-led rounds, which the scheduling link marks with `roundtype`:
//   inperson - in-person hiring panel
//   video / panel - live video hiring panel (the notification team picks one of
//                   these; both are accepted until they confirm)
// `ai`, any other value, or no value (older links) still show the consent: the
// safe default.

const HUMAN_LED_ROUND_TYPES = new Set(['inperson', 'video', 'panel']);

export const skipsAiConsent = (roundType: string | null | undefined): boolean =>
  HUMAN_LED_ROUND_TYPES.has((roundType ?? '').trim().toLowerCase());
