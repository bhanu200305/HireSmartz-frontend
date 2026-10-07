// One star-rating -> interviewer-recommendation mapping for every feedback
// screen (the in-call Quick Feedback and the Advance popup), so a rating always
// means the same thing to the backend. `POST /bookings/{id}/feedback` and
// `POST /candidates/{id}/advance` both take
// `strong_no | no | neutral | yes | strong_yes`.
export type RatingRecommendation = 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';

export const RATING_TO_RECOMMENDATION: Record<number, RatingRecommendation> = {
  1: 'strong_no',
  2: 'no',
  3: 'neutral',
  4: 'yes',
  5: 'strong_yes',
};
