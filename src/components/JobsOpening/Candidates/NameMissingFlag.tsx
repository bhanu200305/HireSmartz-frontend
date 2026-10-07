import { Tooltip } from 'antd';
import { LuTriangleAlert } from 'react-icons/lu';
import { Badge } from '../../shared';

// Shown beside a candidate's name when ai-service found no name on the resume
// (`CandidateView.resume_name_missing`). Replaces relying on the bare "N/A"
// text, which could not tell "no name on this resume" from a real error.
const NameMissingFlag = () => (
  <Tooltip title="No name could be found on this resume. Review the resume and add the candidate's name.">
    <span className="inline-flex shrink-0">
      <Badge status="warning" dot={false}>
        <span className="inline-flex items-center gap-1">
          <LuTriangleAlert size={12} aria-hidden />
          Review Resume
        </span>
      </Badge>
    </span>
  </Tooltip>
);

export default NameMissingFlag;
