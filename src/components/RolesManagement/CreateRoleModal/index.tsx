import React, { useMemo, useState } from 'react';
import { Modal } from 'antd';
import { MdClose } from 'react-icons/md';
import { showToast } from '../../shared';
import TemplateStep from './TemplateStep';
import PermissionsStep from './PermissionsStep';
import { getAssignablePermissionCeiling } from '../../../shared/utils/auth/rbac.helpers';
import { getPlatformErrorMessage } from '../../../shared/utils/api/platformErrorEnvelope';
import useEffectivePermissions from '../../../hooks/useEffectivePermissions';
import type { LocationOption } from '../RolePermissionsEditor';
import type { RoleTemplate } from '../data/roleTemplates';
import type { Authorities } from '../../../constants/authorities.constant';
import type { CreateRolePayload, Role, RoleLocationPermissions, RoleScope } from '../../../types';

type CreateRoleModalProps = {
  open: boolean;
  onClose: () => void;
  scope: RoleScope;
  tenantId?: string;
  availableLocations: LocationOption[];
  /** This catalog's already-fetched roles — used to look up the selected
   * template's REAL system role and its actual permission set (see ceiling
   * below). */
  roles: Role[];
  onCreate: (payload: CreateRolePayload) => Promise<Role>;
};

const TOTAL_STEPS = 2;

/** Template-driven 2-step Create Role wizard. */
const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  open,
  onClose,
  scope,
  tenantId,
  availableLocations,
  roles,
  onCreate,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [roleName, setRoleName] = useState('');
  const [template, setTemplate] = useState<RoleTemplate | null>(null);
  const [permissions, setPermissions] = useState<Authorities[]>([]);
  const [locationOverrides, setLocationOverrides] = useState<RoleLocationPermissions[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actingPermissions = useEffectivePermissions();

  // The backend caps a custom role's permissions at its base role's OWN set
  // (PERMISSION_EXCEEDS_BASE_ROLE otherwise) — a narrower, second ceiling on
  // top of "what the acting user themself holds". A template's `key` is
  // exactly one of the 8 real system role names (see roleTemplates.ts), so
  // its true ceiling is that system role's own `permissions` in this
  // already-fetched catalog — not the frontend's hand-picked
  // ROLE_TEMPLATES.permissions suggestion, which is only a starting
  // checkbox state, not a validated ceiling.
  const baseRolePermissions = useMemo(() => {
    if (!template) return [];
    return (
      roles.find((role) => role.isSystemRole && role.roleName === template.key)?.permissions ?? []
    );
  }, [roles, template]);

  const ceiling = useMemo(() => {
    const acting = getAssignablePermissionCeiling(actingPermissions);
    if (!template) return acting;
    const baseSet = new Set(baseRolePermissions);
    return acting.filter((code) => baseSet.has(code));
  }, [actingPermissions, template, baseRolePermissions]);

  const reset = () => {
    setStep(1);
    setRoleName('');
    setTemplate(null);
    setPermissions([]);
    setLocationOverrides([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleContinue = () => {
    if (!template) return;
    const ceilingSet = new Set(ceiling);
    setPermissions(template.permissions.filter((code) => ceilingSet.has(code)));
    setLocationOverrides([]);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!template) return;
    setIsSubmitting(true);
    try {
      await onCreate({
        roleName: roleName.trim(),
        scope,
        tenantId,
        permissions,
        locationPermissions: locationOverrides,
        templateKey: template.key,
      });
      showToast({ message: `"${roleName.trim()}" created.`, type: 'success' });
      handleClose();
    } catch (err) {
      showToast({
        message: getPlatformErrorMessage(err, 'Failed to create role.'),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      maskClosable={false}
      width={760}
      className="ant-custom-modal"
      // The gradient header below has to stay outside the scrollable region
      // set up further down: it used to bleed to the modal's edges via
      // negative margins against the body's default padding, but a
      // scrollable ancestor (`overflow-y: auto`) clips anything a negative
      // margin pulls above its own top edge — that's what was cutting off
      // "Step X of Y" and crowding the close button once Step 2's matrix
      // needed a scroll cap. Zeroing the body padding here and letting the
      // header own its own padding sidesteps that entirely.
      styles={{ body: { padding: 0 } }}
      closeIcon={
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white">
          <MdClose size={18} />
        </span>
      }
    >
      <div className="rounded-t-2xl bg-gradient-to-r from-primary-700 via-primary-500 to-accent-500 px-6 py-4 text-white">
        <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/70 mb-0.5">
          Step {step} of {TOTAL_STEPS}
        </div>
        <h2 className="font-display text-base font-bold">
          {step === 1 ? 'Custom Role' : `Permissions for "${roleName.trim() || 'Untitled Role'}"`}
        </h2>
        <div className="flex items-center gap-1.5 mt-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <span
              key={index}
              className={`h-[3px] w-5 rounded-full ${index + 1 <= step ? 'bg-white' : 'bg-white/30'}`}
            />
          ))}
        </div>
      </div>

      {/* Only this region scrolls — the header above stays put. Step 2's
          permission matrix (every module, up to 2 columns each, plus any
          number of per-location overrides) is comfortably taller than most
          viewports at full height; without a cap the modal's own bottom
          edge (Back/Submit buttons included) ran off the browser window
          with no way to reach it. This box's cap plus the fixed header
          above it (~90px) has to stay comfortably under 100vh — `centered`
          only centers what fits; content taller than the viewport still
          pushes the modal itself past the top/bottom edge. 74vh leaves that
          margin even on a shorter laptop screen while still noticeably
          taller than before.
          `overflowX: 'hidden'` isn't decorative: per the CSS overflow spec,
          setting overflow-y to anything but `visible` while overflow-x is
          left at its default `visible` computes overflow-x to `auto` too
          (the "orthogonal overflow" rule) — that silently opened a
          horizontal scrollbar and clipped a sliver off this content's width. */}
      <div
        className="thin-scrollbar px-6 pt-4 pb-6"
        style={{ maxHeight: '74vh', overflowY: 'auto', overflowX: 'hidden' }}
      >
        {step === 1 ? (
          <TemplateStep
            scope={scope}
            roleName={roleName}
            onRoleNameChange={setRoleName}
            selectedTemplateKey={template?.key ?? null}
            onSelectTemplate={setTemplate}
            onCancel={handleClose}
            onContinue={handleContinue}
          />
        ) : (
          <PermissionsStep
            permissions={permissions}
            onPermissionsChange={setPermissions}
            ceiling={ceiling}
            scope={scope}
            locationOverrides={locationOverrides}
            onLocationOverridesChange={setLocationOverrides}
            availableLocations={availableLocations}
            showLocationOverrides={scope === 'tenant'}
            onBack={() => setStep(1)}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </Modal>
  );
};

export default CreateRoleModal;
