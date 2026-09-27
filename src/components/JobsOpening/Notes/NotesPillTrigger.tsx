import { Tooltip } from 'antd';
import clsx from 'clsx';
import { LuSquarePen } from 'react-icons/lu';

/** Brand color for notes triggers and drawer accents */
export const NOTES_ACCENT = '#263d92';

const pillBase =
  'inline-flex items-center rounded-full border font-medium transition-colors border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100 hover:border-primary-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-50 disabled:hover:border-primary-200';

type NotesPillTriggerProps = {
  count: number;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  /** Smaller padding for toolbars / sidebars */
  size?: 'default' | 'compact';
  tooltip?: string;
  /** Accessible label; visible text after the icon */
  label?: string;
  /** @default true */
  showBadge?: boolean;
};

/**
 * Pill: [pen icon] [label] [count badge — centered]
 * Matches light-blue notes control reference.
 */
export function NotesPillTrigger({
  count,
  onClick,
  disabled = false,
  className,
  size = 'default',
  tooltip,
  label = 'Notes',
  showBadge = true,
}: NotesPillTriggerProps) {
  const iconSize = size === 'compact' ? 15 : 18;
  const btn = (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        pillBase,
        'gap-2',
        size === 'compact' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm',
        className,
        'cursor-pointer'
      )}
    >
      <LuSquarePen size={iconSize} strokeWidth={2} className="shrink-0" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
      {showBadge ? (
        <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-md bg-[#263d92] px-1.5 py-0.5 text-xs font-semibold leading-none text-white tabular-nums">
          {count}
        </span>
      ) : null}
    </button>
  );

  if (tooltip) {
    if (disabled) {
      return (
        <Tooltip title={tooltip}>
          <span className="inline-flex">{btn}</span>
        </Tooltip>
      );
    }
    return <Tooltip title={tooltip}>{btn}</Tooltip>;
  }
  return btn;
}

type NotesIconPillTriggerProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  tooltip?: string;
  /** Slightly larger hit target in tables */
  size?: 'default' | 'compact';
};

/**
 * Icon-only light-blue pill (e.g. table row) — pen centered in rounded pill.
 */
export function NotesIconPillTrigger({
  onClick,
  disabled = false,
  className,
  tooltip = 'Notes',
  size = 'default',
}: NotesIconPillTriggerProps) {
  const dim = size === 'compact' ? 'h-8 w-8' : 'h-9 w-9';
  const iconSz = size === 'compact' ? 16 : 18;
  const btn = (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(pillBase, 'items-center justify-center', dim, className, 'cursor-pointer')}
      aria-label={tooltip}
    >
      <LuSquarePen size={iconSz} strokeWidth={2} />
    </button>
  );
  if (disabled) {
    return (
      <Tooltip title={tooltip}>
        <span className="inline-flex opacity-50">{btn}</span>
      </Tooltip>
    );
  }
  return <Tooltip title={tooltip}>{btn}</Tooltip>;
}
