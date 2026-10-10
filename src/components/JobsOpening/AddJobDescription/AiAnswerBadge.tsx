import { Tooltip } from 'antd';
import { HiOutlineSparkles } from 'react-icons/hi';

/** Marks an answer AI wrote because the uploaded document had none. */
export const AiAnswerBadge = () => (
  <Tooltip title="Written by AI because your file had no answer. Review and edit if needed.">
    <span className="inline-flex shrink-0 cursor-help items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
      <HiOutlineSparkles className="text-xs" aria-hidden />
      AI-written answer
    </span>
  </Tooltip>
);

export default AiAnswerBadge;
