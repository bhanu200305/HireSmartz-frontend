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
 */
export const RowsPerPageSelect: React.FC<RowsPerPageSelectProps> = ({
  pageSize,
  options,
  onChange,
  className = 'w-20',
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
