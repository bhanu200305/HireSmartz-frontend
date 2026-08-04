import InterviewRounds from './InterviewRounds';
import { CandidateByIdResponse } from '../../../../types';
import type { CandidateNoteItem } from '../../Notes/notesTypes';

type InterviewSummaryProps = {
  candidateId: number;
  candidate?: CandidateByIdResponse;
  onOpenRoundNotes?: (interviewRoundId: number, roundName?: string) => void;
  allNotesForCounts?: CandidateNoteItem[];
};

const InterviewSummary: React.FC<InterviewSummaryProps> = ({
  candidateId,
  candidate,
  onOpenRoundNotes,
  allNotesForCounts,
}) => {
  return (
    <div className="flex">
      <div className="flex flex-col w-5/5 bg-white rounded-lg shadow-sm px-4 py-4">
        <div className="flex justify-center mt-auto mb-6">
          <h3 className="font-bold">Round Overview</h3>
        </div>
        <InterviewRounds
          candidateId={Number(candidateId)}
          candidate={candidate}
          onOpenRoundNotes={onOpenRoundNotes}
          allNotesForCounts={allNotesForCounts}
        />
      </div>
    </div>
  );
};

export default InterviewSummary;
