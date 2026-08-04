export function getFeedbackKey(
  jobId: number,
  candidateId: string | number,
  interviewerId: number | null
) {
  return `interview_feedback_${jobId}_${candidateId}_${interviewerId || 'none'}_feedback`;
}
