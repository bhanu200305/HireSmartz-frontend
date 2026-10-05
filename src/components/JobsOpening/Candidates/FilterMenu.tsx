import { Select } from 'antd';
import { useListApplicationSourcesQuery } from '../../../api/candidate-service/Master/master';
import type { CandidateDisplayStatus } from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import { FilterSelectIcon } from '../../shared/ui/FilterSelectIcon';
import { CANDIDATE_DISPLAY_STATUS_OPTIONS } from './candidateDisplay';

// Rewritten against candidate-service's real master data
// (`GET /candidate-master/candidate-statuses`, `GET /candidate-master/application-sources`) —
// the legacy version filtered by a fictional internal/external status split
// and a round-type (AI/VIDEO/IN_PERSON) tree that has no equivalent on the
// real backend (candidate-service tracks one flat `status_code`, sourced
// from `master_candidate_status` — see FRONTEND_INTEGRATION_DETAILS.md §4.6:
// fetch codes, never hardcode them). Sole consumer is `CandidatesListing.tsx`
// — safe to replace in place, unlike the other legacy modal components in
// this folder that `CandidateDetails.tsx` still depends on.
//
// The status filter sends `display_status` (the list's four top-level
// states), not `status_code`, so the dropdown labels match the status column.

export type CandidateListFilterValues = {
  displayStatus?: CandidateDisplayStatus;
  source?: string;
};

// Sentinel for the "All" option — never sent to the API; selecting it clears
// the filter (`undefined`), so the list goes back to every candidate.
const ALL = '__all__';

type FilterMenuProps = {
  filters: CandidateListFilterValues;
  onFilterChange: (newFilters: Partial<CandidateListFilterValues>) => void;
};

const FilterMenu = ({ filters, onFilterChange }: FilterMenuProps) => {
  const { data: sources = [] } = useListApplicationSourcesQuery();

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="cfp-dropdown-trigger w-full sm:w-auto sm:min-w-[200px]">
          <FilterSelectIcon />
          <Select
            placeholder="Status"
            value={filters.displayStatus ?? ALL}
            onChange={(val) =>
              onFilterChange({
                displayStatus: val && val !== ALL ? (val as CandidateDisplayStatus) : undefined,
              })
            }
            allowClear={Boolean(filters.displayStatus)}
            showSearch
            optionFilterProp="label"
            className="w-full custom-select-jobs placeholder-style"
            dropdownClassName="rounded-3xl"
            variant="borderless"
            options={[{ label: 'All Statuses', value: ALL }, ...CANDIDATE_DISPLAY_STATUS_OPTIONS]}
            popupMatchSelectWidth={false}
          />
        </div>
        <div className="cfp-dropdown-trigger w-full sm:w-auto sm:min-w-[200px]">
          <FilterSelectIcon />
          <Select
            placeholder="Source"
            value={filters.source ?? ALL}
            onChange={(val) => onFilterChange({ source: val && val !== ALL ? val : undefined })}
            allowClear={Boolean(filters.source)}
            showSearch
            optionFilterProp="label"
            className="w-full custom-select-jobs placeholder-style"
            dropdownClassName="rounded-3xl"
            variant="borderless"
            options={[
              { label: 'All Sources', value: ALL },
              ...sources.map((s) => ({ label: s.label, value: s.code })),
            ]}
            popupMatchSelectWidth={false}
          />
        </div>
      </div>
    </div>
  );
};

export default FilterMenu;
