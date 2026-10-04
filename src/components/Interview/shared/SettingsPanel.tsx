import type { ReactNode } from 'react';
import { MdClose } from 'react-icons/md';
import { BackgroundSelector } from './BackgroundSelector';

export type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
  /** Flow-specific device-picker UI — Flow A reuses its existing hand-rolled
   * Ant Design device picker (already working, not replaced here); Flow B
   * has no device picker today, so it renders LiveKit's own
   * `MediaDeviceSelect` instead. Passed in rather than hard-coded so this
   * panel stays flow-agnostic. */
  devicesSection: ReactNode;
  className?: string;
  /** See `ChatPanel`'s own `embedded` doc — same reasoning: Flow A hosts
   * this inside its existing `Sidebar` chrome (own title bar + close
   * button), so the outer card/header here would double up. */
  embedded?: boolean;
};

const sections = (devicesSection: ReactNode) => (
  <>
    <div className="mb-5">
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-neutral-400">Devices</h4>
      {devicesSection}
    </div>
    <div>
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-neutral-400">Background</h4>
      <BackgroundSelector />
    </div>
  </>
);

// Two sections: Devices (flow-specific, see `devicesSection`) + Background
// (shared `BackgroundSelector`, identical in both flows and in the pre-join
// lobby).
export const SettingsPanel = ({
  open,
  onClose,
  devicesSection,
  className,
  embedded = false,
}: SettingsPanelProps) => {
  if (!open) return null;

  if (embedded) {
    return <div className={`w-full ${className ?? ''}`}>{sections(devicesSection)}</div>;
  }

  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 ${className ?? ''}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Settings</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <MdClose size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{sections(devicesSection)}</div>
    </div>
  );
};

export default SettingsPanel;
