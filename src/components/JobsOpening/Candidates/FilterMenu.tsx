import React from 'react';
import { Select, Tooltip, TreeSelect } from 'antd';
import {
  EXTERNAL_STATUS_OPTIONS,
  GROUPED_INTERNAL_STATUS_OPTIONS,
} from '../../../constants/candidateFilterStatus';
import { FilterState } from '../../../shared/utils/filters/filterService';

type FilterMenuProps = {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
};

const ALLOWED_EXTERNAL_WHEN_INTERNAL_SELECTED = ['IN_PROCESS', 'ACTIVE', 'ALL'];
const ALLOWED_EXTERNAL_FOR_INTERNAL = ['IN_PROCESS', 'ALL', 'ACTIVE'];
const ROUND_TYPE_VALUES = ['AI', 'VIDEO', 'IN_PERSON'];
// const NEW_FILTER_VALUE = 'NEW';

const FilterMenu: React.FC<FilterMenuProps> = ({ filters, onFilterChange }) => {
  const filterOption = (input: string, option?: { label: string; value: string }) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase());

  const externalOptionsWithRules = [...EXTERNAL_STATUS_OPTIONS].map((option) => {
    const isBlocked =
      (filters.internalStatus || filters.roundType) &&
      !ALLOWED_EXTERNAL_WHEN_INTERNAL_SELECTED.includes(option.value as string);

    return {
      ...option,
      disabled: !!isBlocked,
    };
  });

  // Transform grouped options for TreeSelect with disabled state
  const transformGroupedOptions = (options: typeof GROUPED_INTERNAL_STATUS_OPTIONS) => {
    const isExternalBlocked =
      filters.externalStatus && !ALLOWED_EXTERNAL_FOR_INTERNAL.includes(filters.externalStatus);

    return options.map((group) => {
      if (group.value === 'ALL') {
        // "All" option at root level
        return {
          title: group.label,
          label: group.label,
          value: group.value,
          disabled: isExternalBlocked,
          selectable: true,
        };
      }

      // Category groups with children
      const transformedNode: any = {
        title: group.label,
        label: group.label,
        value: group.value,
        disabled: isExternalBlocked,
        selectable: true,
      };

      // Only add children if they exist
      if (group.children && group.children.length > 0) {
        transformedNode.children = group.children.map((child: any) => ({
          title: child.label,
          label: `${group.label} - ${child.label}`,
          value: child.value,
          disabled: isExternalBlocked,
        }));
      }

      return transformedNode;
    });
  };

  const treeData = transformGroupedOptions(GROUPED_INTERNAL_STATUS_OPTIONS);
  return (
    <div className="py-2">
      <div className="flex gap-3 items-center">
        {/* External Status */}
        <div className="flex items-center justify-around gap-3">
          <div className="border-wrapper border border-[var(--border)] p-1 min-w-[200px] rounded-3xl">
            <Select
              placeholder="Candidate Status"
              value={filters.isNew ? 'NEW_FILTER_VALUE' : filters.externalStatus}
              onChange={(val) => {
                if (val === 'NEW_FILTER_VALUE') {
                  onFilterChange({ isNew: true, externalStatus: null });
                  return;
                }

                onFilterChange({
                  isNew: undefined,
                  externalStatus: val || 'ALL',
                });
              }}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={filterOption}
              className="w-full custom-select-jobs placeholder-style"
              dropdownClassName="rounded-3xl"
              variant="borderless"
              options={externalOptionsWithRules}
              optionRender={(option) => {
                const isBlocked =
                  (filters.internalStatus || filters.roundType) &&
                  !ALLOWED_EXTERNAL_WHEN_INTERNAL_SELECTED.includes(option.value as string);

                return (
                  <Tooltip
                    title={
                      isBlocked
                        ? "Only 'In Process', 'Active', or 'All' is allowed when Round Status filter is active"
                        : ''
                    }
                  >
                    <span
                      className={isBlocked ? 'text-gray-400 cursor-not-allowed' : ''}
                      style={{ pointerEvents: 'auto' }}
                    >
                      {option.label}
                    </span>
                  </Tooltip>
                );
              }}
            />
          </div>
        </div>
        {/* Internal Status */}
        <div className="flex items-center justify-around gap-3">
          <div className="border-wrapper border border-[var(--border)] p-1 min-w-[270px] rounded-3xl">
            <TreeSelect
              placeholder="Round Status"
              value={filters.internalStatus || filters.roundType}
              onChange={(val) => {
                if (val === null || val === undefined) {
                  onFilterChange({ internalStatus: null, roundType: undefined });
                } else {
                  const isRoundType = ROUND_TYPE_VALUES.includes(val);
                  // Clear the other field when setting one
                  if (isRoundType) {
                    onFilterChange({ roundType: val, internalStatus: null });
                  } else {
                    onFilterChange({ internalStatus: val, roundType: undefined });
                  }
                }
              }}
              allowClear
              showSearch
              treeDefaultExpandAll={false}
              treeData={treeData}
              dropdownStyle={{ maxHeight: 400, overflow: 'auto', minWidth: '300px' }}
              className="w-full custom-select-jobs placeholder-style"
              popupClassName="rounded-3xl"
              variant="borderless"
              treeNodeLabelProp="label"
              treeNodeFilterProp="title"
              filterTreeNode={(input, treeNode) => {
                const title = treeNode.title as string;
                return title.toLowerCase().includes(input.toLowerCase());
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterMenu;
