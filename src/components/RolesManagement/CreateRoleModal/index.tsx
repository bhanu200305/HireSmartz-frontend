import React, { useMemo, useState } from 'react';
import { Modal } from 'antd';
import { showToast } from '../../shared';
import TemplateStep from './TemplateStep';
import PermissionsStep from './PermissionsStep';
import { getAssignablePermissionCeiling } from '../../../shared/utils/auth/rbac.helpers';
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
  onCreate,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [roleName, setRoleName] = useState('');
  const [template, setTemplate] = useState<RoleTemplate | null>(null);
  const [permissions, setPermissions] = useState<Authorities[]>([]);
  const [locationOverrides, setLocationOverrides] = useState<RoleLocationPermissions[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actingPermissions = useEffectivePermissions();
  const ceiling = useMemo(
    () => getAssignablePermissionCeiling(actingPermissions),
    [actingPermissions]
  );

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
      });
      showToast({ message: `"${roleName.trim()}" created.`, type: 'success' });
      handleClose();
    } catch {
      showToast({ message: 'Failed to create role.', type: 'error' });
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
    >
      <div className="-mx-6 -mt-6 mb-5 px-6 py-4 rounded-t-2xl bg-gradient-to-r from-primary-700 via-primary-500 to-accent-500 text-white">
        <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/70 mb-0.5">
          Step {step} of {TOTAL_STEPS}
        </div>
        <h2 className="font-display text-base font-bold">
          {step === 1 ? 'Create Role' : `Permissions for "${roleName.trim() || 'Untitled Role'}"`}
        </h2>
        <div className="flex items-center gap-1.5 mt-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className={`h-[3px] w-5 rounded-full ${index + 1 <= step ? 'bg-white' : 'bg-white/30'}`}
            />
          ))}
        </div>
      </div>

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
          locationOverrides={locationOverrides}
          onLocationOverridesChange={setLocationOverrides}
          availableLocations={availableLocations}
          showLocationOverrides={scope === 'tenant'}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </Modal>
  );
};

export default CreateRoleModal;
