import { Select } from 'antd';
import {
  useListCandidateStatusesQuery,
  useListApplicationSourcesQuery,
} from '../../../api/candidate-service/Master/master';
import { FilterSelectIcon } from '../../shared/ui/FilterSelectIcon';

// Rewritten against candidate-service's real master data
// (`GET /master/candidate-statuses`, `GET /master/application-sources`) —
// the legacy version filtered by a fictional internal/external status split
// and a round-type (AI/VIDEO/IN_PERSON) tree that has no equivalent on the
// real backend (candidate-service tracks one flat `status_code`, sourced
// from `master_candidate_status` — see FRONTEND_INTEGRATION_DETAILS.md §4.6:
// fetch codes, never hardcode them). Sole consumer is `CandidatesListing.tsx`
// — safe to replace in place, unlike the other legacy modal components in
// this folder that `CandidateDetails.tsx` still depends on.

export type CandidateListFilterValues = {
  statusCode?: string;
  source?: string;
};

type FilterMenuProps = {
  filters: CandidateListFilterValues;
  onFilterChange: (newFilters: Partial<CandidateListFilterValues>) => void;
};

const FilterMenu = ({ filters, onFilterChange }: FilterMenuProps) => {
  const { data: statuses = [] } = useListCandidateStatusesQuery();
  const { data: sources = [] } = useListApplicationSourcesQuery();

  return (
    <div className="py-2">
      <div className="flex gap-3 items-center">
        <div className="cfp-dropdown-trigger min-w-[200px]">
          <FilterSelectIcon />
          <Select
            placeholder="Status"
            value={filters.statusCode}
            onChange={(val) => onFilterChange({ statusCode: val || undefined })}
            allowClear
            showSearch
            optionFilterProp="label"
            className="w-full custom-select-jobs placeholder-style"
            dropdownClassName="rounded-3xl"
            variant="borderless"
            options={statuses.map((s) => ({ label: s.label, value: s.code }))}
          />
        </div>
        <div className="cfp-dropdown-trigger min-w-[200px]">
          <FilterSelectIcon />
          <Select
            placeholder="Source"
            value={filters.source}
            onChange={(val) => onFilterChange({ source: val || undefined })}
            allowClear
            showSearch
            optionFilterProp="label"
            className="w-full custom-select-jobs placeholder-style"
            dropdownClassName="rounded-3xl"
            variant="borderless"
            options={sources.map((s) => ({ label: s.label, value: s.code }))}
          />
        </div>
      </div>
    </div>
  );
};

export default FilterMenu;
