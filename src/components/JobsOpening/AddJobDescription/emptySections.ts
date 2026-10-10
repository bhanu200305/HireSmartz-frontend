export type SectionRef = { key: string; name: string };

export const INTAKE_SECTION: SectionRef = { key: 'intake', name: 'the Intake Call' };

/**
 * The rounds (and the Intake Call, when the job has one) that still have no
 * question, in tab order. Save & Next and Save & Finish stay disabled until
 * this is empty for the tab being left.
 */
export const emptySections = (
  rounds: { round_instance_id: string; round_name: string }[],
  countByRound: Record<string, number>,
  intake: { count: number } | null
): SectionRef[] => [
  ...(intake && intake.count === 0 ? [INTAKE_SECTION] : []),
  ...rounds
    .filter((round) => !countByRound[round.round_instance_id])
    .map((round) => ({ key: round.round_instance_id, name: round.round_name })),
];
