import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector } from 'react-redux';
import { Select as AntSelect } from 'antd';
import { MdAdd, MdDeleteOutline } from 'react-icons/md';
import { Button, Input, PermissionMatrix } from '..';
import { Loader } from '../shared/ui/loader';
import roleFormSchema, { RoleFormValues } from './AddRole/AddRoleSchema';
import useRoleManagementContext from '../../hooks/useRoleManagementContext';
import { useGetLocationsQuery } from '../../api/job-service/JobOpening/getLocations';
import { getAssignablePermissionCeiling } from '../../shared/utils/auth/rbac.helpers';
import type { Authorities } from '../../constants/authorities.constant';
import type { RootState } from '../../redux/provider/store';

type LocationOption = { id: number; name: string };

type RoleFormProps = {
  initialValues?: Partial<RoleFormValues>;
  readOnly?: boolean;
  isSubmitting?: boolean;
  submitLabel: string;
  onSubmit: (values: RoleFormValues) => void;
  onCancel: () => void;
};

const DEFAULT_VALUES: RoleFormValues = {
  roleName: '',
  permissions: [],
  locationPermissions: [],
};

/**
 * Shared by AddRole and EditRole — one form, one set of rules (escalation
 * ceiling, location overrides), so the two screens cannot silently drift.
 */
const RoleForm = ({
  initialValues,
  readOnly = false,
  isSubmitting = false,
  submitLabel,
  onSubmit,
  onCancel,
}: RoleFormProps) => {
  const { tenantId, ceiling: rawCeiling } = useRoleManagementContext();
  const ceiling = getAssignablePermissionCeiling(rawCeiling);
  const [pendingLocationId, setPendingLocationId] = useState<string | undefined>(undefined);

  const { register, watch, setValue, handleSubmit, formState } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { ...DEFAULT_VALUES, ...initialValues },
    mode: 'onChange',
  });
  const { errors, isValid } = formState;

  const permissions = watch('permissions');
  const locationPermissions = watch('locationPermissions');

  // The tenant's full location list, when there's a real company to ask.
  const { data: companyLocations } = useGetLocationsQuery(
    { companyId: tenantId as number, activeOnly: true },
    { skip: !tenantId }
  );
  // Fallback for platform-scope roles (no company to query) and for
  // dev-bypass sessions with no backend at all: the acting user's own role
  // already carries the locations it was seeded/assigned at.
  const resolvedRole = useSelector((state: RootState) => state.LoginSlice.resolvedRole);

  const candidateLocations: LocationOption[] =
    tenantId && companyLocations && companyLocations.length > 0
      ? companyLocations.map((location) => ({ id: location.id, name: location.locationName }))
      : (resolvedRole?.locationPermissions || []).map((entry) => ({
          id: entry.locationId,
          name: entry.locationName || `Location ${entry.locationId}`,
        }));

  const overriddenLocationIds = new Set(locationPermissions.map((entry) => entry.locationId));
  const availableLocations = candidateLocations.filter(
    (location) => !overriddenLocationIds.has(location.id)
  );

  const handleAddLocationOverride = () => {
    if (!pendingLocationId) return;
    const location = candidateLocations.find((l) => String(l.id) === pendingLocationId);
    if (!location) return;

    setValue(
      'locationPermissions',
      [
        ...locationPermissions,
        {
          locationId: location.id,
          locationName: location.name,
          permissions: [...permissions],
        },
      ],
      { shouldDirty: true }
    );
    setPendingLocationId(undefined);
  };

  const handleRemoveLocationOverride = (locationId: number) => {
    setValue(
      'locationPermissions',
      locationPermissions.filter((entry) => entry.locationId !== locationId),
      { shouldDirty: true }
    );
  };

  const handleLocationPermissionsChange = (locationId: number, next: Authorities[]) => {
    setValue(
      'locationPermissions',
      locationPermissions.map((entry) =>
        entry.locationId === locationId ? { ...entry, permissions: next } : entry
      ),
      { shouldDirty: true }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-6 max-w-4xl">
      <div>
        <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 mb-2">
          Role name <span className="required-asterisk">*</span>
        </label>
        <Input
          id="roleName"
          placeholder="e.g. Regional Hiring Manager"
          disabled={readOnly}
          {...register('roleName')}
        />
        {errors.roleName && <p className="text-red-500 text-sm mt-1">{errors.roleName.message}</p>}
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">Permissions</h3>
        <p className="text-sm text-gray-500 mb-3">
          Every box starts checked to your own permissions — uncheck anything this role
          shouldn&apos;t have. You can&apos;t grant a permission you don&apos;t hold yourself.
        </p>
        <PermissionMatrix
          value={permissions}
          ceiling={ceiling}
          disabled={readOnly}
          onChange={(next) =>
            setValue('permissions', next, { shouldDirty: true, shouldValidate: true })
          }
        />
        {errors.permissions && (
          <p className="text-red-500 text-sm mt-1">{errors.permissions.message as string}</p>
        )}
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">Location-specific overrides</h3>
        <p className="text-sm text-gray-500 mb-3">
          Optional — give this role a different permission set at a specific location. Any location
          without an override uses the baseline set above.
        </p>

        {candidateLocations.length === 0 && locationPermissions.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            No locations available to scope this role by yet.
          </p>
        )}

        {locationPermissions.map((entry) => (
          <div key={entry.locationId} className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-800">{entry.locationName}</span>
              {!readOnly && (
                <button
                  type="button"
                  className="text-red-500 flex items-center gap-1 text-sm cursor-pointer"
                  onClick={() => handleRemoveLocationOverride(entry.locationId)}
                >
                  <MdDeleteOutline size={16} /> Remove override
                </button>
              )}
            </div>
            <PermissionMatrix
              value={entry.permissions}
              ceiling={ceiling}
              disabled={readOnly}
              onChange={(next) => handleLocationPermissionsChange(entry.locationId, next)}
            />
          </div>
        ))}

        {!readOnly && availableLocations.length > 0 && (
          <div className="flex items-center gap-3">
            <AntSelect
              showSearch
              placeholder="Select a location"
              value={pendingLocationId}
              onChange={(value) => setPendingLocationId(value)}
              className="w-64"
              options={availableLocations.map((location) => ({
                value: String(location.id),
                label: location.name,
              }))}
              optionFilterProp="label"
            />
            <Button
              appname="add location override"
              type="button"
              onClick={handleAddLocationOverride}
              disabled={!pendingLocationId}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-3xl text-sm disabled:opacity-50"
            >
              <MdAdd size={16} /> Add location override
            </Button>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex gap-4 pt-2">
          <Button
            appname="cancel"
            type="button"
            onClick={onCancel}
            className="px-8 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-3xl font-medium"
          >
            CANCEL
          </Button>
          <Button
            appname="save role"
            type="submit"
            disabled={!isValid || isSubmitting}
            className="px-10 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-3xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && <Loader />}
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
};

export default RoleForm;
