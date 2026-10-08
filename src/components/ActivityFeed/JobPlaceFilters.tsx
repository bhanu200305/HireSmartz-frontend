import { useMemo } from 'react';
import { Select } from 'antd';
import { useListTenantDepartmentsQuery } from '../../api/organization-service/Tenants/departments';
import {
  officeDisplayName,
  useListTenantOfficesQuery,
} from '../../api/organization-service/Tenants/offices';
import { useSessionTenantId } from '../../hooks/useSessionTenantId';
import { FilterSelectIcon } from '../shared/ui/FilterSelectIcon';

export type PlaceOption = { value: string; label: string };

type Props = {
  departmentId?: string;
  locationId?: string;
  onDepartmentChange: (option: PlaceOption | null) => void;
  onLocationChange: (option: PlaceOption | null) => void;
};

/**
 * Department and Location filters — audit-service narrows the feed to jobs
 * recorded in that department / at that location (department_id,
 * location_id). A list this user can't read, or an empty one, hides its
 * dropdown rather than offering a filter with nothing to pick.
 */
const JobPlaceFilters = ({
  departmentId,
  locationId,
  onDepartmentChange,
  onLocationChange,
}: Props) => {
  const tenantId = useSessionTenantId();
  const { data: departments } = useListTenantDepartmentsQuery(tenantId ?? '', {
    skip: !tenantId,
  });
  const { data: offices } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '', isMaster: false },
    { skip: !tenantId }
  );

  const departmentOptions = useMemo<PlaceOption[]>(
    () => (departments ?? []).map((d) => ({ value: d.org_department_id, label: d.name })),
    [departments]
  );
  const locationOptions = useMemo<PlaceOption[]>(
    () => (offices ?? []).map((o) => ({ value: o.office_id, label: officeDisplayName(o) })),
    [offices]
  );

  const renderSelect = (
    placeholder: string,
    options: PlaceOption[],
    value: string | undefined,
    onChange: (option: PlaceOption | null) => void
  ) =>
    options.length > 0 && (
      <div className="cfp-dropdown-trigger">
        <FilterSelectIcon />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={placeholder}
          options={options}
          value={value}
          onChange={(id?: string) => onChange(options.find((o) => o.value === id) ?? null)}
          className="w-full custom-select"
          variant="borderless"
          style={{ minWidth: 170, fontSize: 14 }}
        />
      </div>
    );

  return (
    <>
      {renderSelect('Department', departmentOptions, departmentId, onDepartmentChange)}
      {renderSelect('Location', locationOptions, locationId, onLocationChange)}
    </>
  );
};

export default JobPlaceFilters;
