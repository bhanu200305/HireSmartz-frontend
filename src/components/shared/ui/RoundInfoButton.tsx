import { FC, useState } from 'react';
import { Popover } from 'antd';
import { MdInfoOutline } from 'react-icons/md';
import type { RoundInfoSection } from '../../../shared/utils/roundInfoContent';
import RoundInfoModal, { RoundInfoBody } from './RoundInfoModal';

interface RoundInfoButtonProps {
  roundName: string;
  badgeLabel?: string | null;
  description?: string | null;
  sections?: RoundInfoSection[];
  ariaLabel: string;
  /** Greyed out and inert, e.g. before a round is chosen. */
  disabled?: boolean;
}

/** The "i" icon: hover to preview the round, click to open it in a modal. */
const RoundInfoButton: FC<RoundInfoButtonProps> = ({
  roundName,
  badgeLabel,
  description,
  sections,
  ariaLabel,
  disabled = false,
}) => {
  const [hovering, setHovering] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const icon = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setHovering(false);
        setModalOpen(true);
      }}
      aria-label={ariaLabel}
      className={`inline-flex p-0.5 ${
        disabled
          ? 'text-neutral-200 cursor-not-allowed'
          : 'text-neutral-400 hover:text-primary-600 cursor-pointer'
      }`}
    >
      <MdInfoOutline size={16} />
    </button>
  );

  if (disabled) return icon;

  return (
    <>
      <Popover
        open={hovering && !modalOpen}
        onOpenChange={setHovering}
        trigger={['hover', 'focus']}
        placement="bottomLeft"
        mouseEnterDelay={0.1}
        mouseLeaveDelay={0.1}
        zIndex={2100}
        destroyOnHidden
        title={<span className="font-display text-sm font-semibold">{roundName}</span>}
        content={
          <div className="max-w-xs">
            <RoundInfoBody description={description} sections={sections} />
          </div>
        }
      >
        {icon}
      </Popover>
      {modalOpen && (
        <RoundInfoModal
          roundName={roundName}
          badgeLabel={badgeLabel}
          description={description}
          sections={sections}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

export default RoundInfoButton;
