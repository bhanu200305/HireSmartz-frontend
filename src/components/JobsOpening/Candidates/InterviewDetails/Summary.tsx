import { EvaluationResponseDto } from '../../../../types';

type SummaryContentProps = {
  evalResponse?: EvaluationResponseDto;
};

const SummaryContent = ({ evalResponse }: SummaryContentProps) => (
  <p>
    {evalResponse?.summary ? (
      evalResponse?.summary
    ) : (
      <p className="font-black">No interview summary yet</p>
    )}
  </p>
);

export default SummaryContent;
