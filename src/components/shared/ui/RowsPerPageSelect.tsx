import React from 'react';
import { Select } from 'antd';

interface RowsPerPageSelectProps {
  pageSize: number;
  options: number[];
  onChange: (size: number) => void;
  /** Overrides the select's width when a caller needs it wider (e.g. 3-digit options). */
  className?: string;
}

/**
 * The "Rows per page" control shown above every paginated list-modal's data
 * card (TeamMembersListModal, CandidatesListModal, TenantUsersListModal,
 * PlatformTenantsListModal, JobOpeningsListModal). Kept as one component so
 * the five copies of this row can't drift from each other again — they used
 * to be independent inline markup with no bottom/right inset, so the select's
 * own boundary sat flush against the data card's border directly beneath it.
 *
 * Default class matches every other page's own "Rows per page" select
 * (DepartmentsTab, CompanyLocationsTab, CfpUsers, etc., which build the same
 * row inline rather than through this component) — `w-20` used to leave a
 * much wider dead gap between the value and the arrow than that shared
 * `.rows-per-page-select` styling in index.css, so the two never looked the
 * same.
 */
export const RowsPerPageSelect: React.FC<RowsPerPageSelectProps> = ({
  pageSize,
  options,
  onChange,
  className = 'rows-per-page-select',
}) => (
  <div className="flex items-center justify-end gap-2 pb-2 pr-1 text-sm text-neutral-500">
    <span>Rows per page</span>
    <Select
      size="small"
      value={pageSize}
      className={className}
      options={options.map((size) => ({ label: size, value: size }))}
      onChange={onChange}
    />
  </div>
);

export default RowsPerPageSelect;
