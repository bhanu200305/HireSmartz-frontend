import React, { useState } from 'react';
import { Switch, Tooltip } from 'antd';
import ConfirmationModal from './ConfirmationModal';

export type StatusToggleProps = {
  /** Current active/inactive state — the Switch is a plain reflection of
   * this, not locally-tracked optimistic state, so it always matches
   * whatever the list actually has (and snaps back on its own if a
   * deactivate is cancelled or an activate/deactivate call fails). */
  isActive: boolean;
  /** Applies immediately on click — no confirmation, matching how
   * "Activate" already worked before this control existed. */
  onActivate: () => Promise<unknown>;
  /** Only called after the confirmation modal below is accepted. */
  onDeactivate: () => Promise<unknown>;
  activateLabel: string;
  deactivateLabel: string;
  /** Shown in the confirmation modal before a deactivate actually applies
   * — deactivating isn't always risk-free (e.g. a department/office/user
   * may still be referenced elsewhere), so this keeps that same safety
   * step the standalone "Deactivate" button used to have. */
  deactivateConfirmTitle: string;
  /** No edit permission (or some other reason this row can't be changed) —
   * renders the switch inert rather than hiding it, so status is still
   * visible either way. */
  disabled?: boolean;
  /** "small" for tight spaces like an inline dropdown row; default matches
   * every existing catalogue-table caller. */
  size?: 'default' | 'small';
};

/**
 * One control for both showing AND changing a row's active/inactive
 * status — replaces the old pairing of a read-only "Status" Badge plus a
 * separate Deactivate/Activate icon button in Actions, used identically
 * across every org-service catalogue (Departments, Locations, Job Titles,
 * Industries) and user list in the app. Self-contained: owns its own
 * confirm-before-deactivate modal and per-row busy state, so a caller only
 * needs to hand it the raw activate/deactivate calls.
 */
const StatusToggle: React.FC<StatusToggleProps> = ({
  isActive,
  onActivate,
  onDeactivate,
  activateLabel,
  deactivateLabel,
  deactivateConfirmTitle,
  disabled = false,
  size = 'default',
}) => {
  const [isConfirmingDeactivate, setIsConfirmingDeactivate] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Every current caller already catches its own mutation errors (and shows
  // its own toast) before this promise settles, so it's expected to always
  // resolve — the `catch` here is only a backstop against a future caller
  // that doesn't, so a rejection can't surface as an unhandled promise
  // rejection out of a Switch's onChange (React doesn't await it).
  const handleChange = async (checked: boolean) => {
    if (!checked) {
      setIsConfirmingDeactivate(true);
      return;
    }
    setIsBusy(true);
    try {
      await onActivate();
    } catch {
      // Swallowed — see comment above.
    } finally {
      setIsBusy(false);
    }
  };

  const confirmDeactivate = async () => {
    setIsBusy(true);
    try {
      await onDeactivate();
    } catch {
      // Swallowed — see comment above.
    } finally {
      setIsBusy(false);
      setIsConfirmingDeactivate(false);
    }
  };

  return (
    <>
      <Tooltip title={isActive ? deactivateLabel : activateLabel}>
        <Switch
          checked={isActive}
          onChange={handleChange}
          disabled={disabled}
          loading={isBusy}
          size={size}
          aria-label={isActive ? deactivateLabel : activateLabel}
        />
      </Tooltip>
      {isConfirmingDeactivate && (
        <ConfirmationModal
          title={deactivateConfirmTitle}
          confirmText="DEACTIVATE"
          isLoading={isBusy}
          onConfirm={confirmDeactivate}
          onClose={() => setIsConfirmingDeactivate(false)}
        />
      )}
    </>
  );
};

export default StatusToggle;
