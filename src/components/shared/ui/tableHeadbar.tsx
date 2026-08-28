import { Select } from 'antd';
import { Status } from '../../../shared/utils/enums';
import { FilterSelectIcon } from './FilterSelectIcon';

export interface StatusFilters {
  status?: boolean | undefined;
  isDraft?: boolean | undefined;
  isClosed?: boolean | undefined;
  isAll?: boolean | undefined;
}

type TableHeadBarProps = {
  icon: any;
  title?: string;
  onStatusChange?: (filters: StatusFilters) => void;
  currentFilters?: StatusFilters;
  onTitleClick?: () => void;
  onIconClick?: () => void;
};
const TableHeadBar: React.FC<TableHeadBarProps> = ({
  icon,
  title,
  onStatusChange,
  currentFilters,
  onTitleClick,
  // onIconClick
}) => {
  const { Option } = Select;

  const handleStatusChange = (value: string) => {
    if (!onStatusChange) return;

    let newFilters: StatusFilters = {};

    if (value === 'ACTIVE') {
      newFilters = { status: true, isDraft: undefined, isClosed: undefined, isAll: undefined };
    } else if (value === 'INACTIVE') {
      newFilters = { status: false, isDraft: undefined, isClosed: undefined, isAll: undefined };
    } else if (value === 'DRAFT') {
      newFilters = { status: undefined, isDraft: true, isClosed: undefined, isAll: undefined };
    } else if (value === 'CLOSED') {
      newFilters = { status: undefined, isDraft: undefined, isClosed: true, isAll: undefined };
    } else if (value === 'ALL') {
      newFilters = { status: undefined, isDraft: undefined, isClosed: undefined, isAll: true };
    } else {
      newFilters = { status: undefined, isDraft: undefined, isClosed: undefined, isAll: true };
    }

    onStatusChange(newFilters);
  };

  const getSelectValue = (): string | undefined => {
    if (currentFilters?.isDraft) return Status.DRAFT;
    if (currentFilters?.isClosed) return Status.CLOSED;
    if (currentFilters?.isAll) return Status.ALL;
    if (currentFilters?.status === true) return Status.ACTIVE;
    if (currentFilters?.status === false) return Status.INACTIVE;
    return undefined;
  };
  return (
    <div className="flex justify-between items-center gap-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-primary-50">
          <img src={icon} alt="" className="w-6 h-6 object-contain" />
        </div>
        <h2
          className={`font-display text-lg font-semibold text-neutral-900 ${onTitleClick ? 'cursor-pointer transition-colors hover:text-primary' : ''}`}
          onClick={onTitleClick}
        >
          {title}
        </h2>
      </div>
      <div className="flex flex-wrap justify-between items-center gap-2">
        {title === 'Job Openings' && (
          <>
            <div className="cfp-dropdown-trigger w-full">
              <FilterSelectIcon />
              <Select
                style={{ width: '120px', fontSize: '14px' }}
                placeholder="Status"
                allowClear
                className="w-full custom-select"
                popupClassName="rounded-xl"
                variant="borderless"
                onChange={handleStatusChange}
                value={getSelectValue()}
              >
                <Option value={Status.ALL}>All</Option>
                <Option value={Status.ACTIVE}>Active</Option>
                <Option value={Status.DRAFT}>Draft</Option>
                <Option value={Status.CLOSED}>Closed</Option>
              </Select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TableHeadBar;
