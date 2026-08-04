import { Select } from 'antd';
import { MdOutlineFilterAlt } from 'react-icons/md';
import { Status } from '../../../shared/utils/enums';

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
        <div
          className={`w-13 h-13 flex items-center justify-center `}
          // onClick={onIconClick}
          //  ${onIconClick ? 'cursor-pointer hover:opacity-70' : ''}
        >
          <img src={icon} />
        </div>
        <h2
          className={`text-xl font-medium ${onTitleClick ? 'cursor-pointer hover:underline hover:text-primary' : ''}`}
          onClick={onTitleClick}
        >
          {title}
        </h2>
      </div>
      <div className="flex flex-wrap justify-between items-center gap-2">
        {title === 'Job Openings' && (
          <>
            <div className="border border-[var(--border)] p-1 rounded-3xl w-full flex items-center gap-1 bg-white">
              <Select
                style={{ width: '120px', fontSize: '14px' }}
                prefix={<MdOutlineFilterAlt className="ml-2 text-lg text-primary self-center" />}
                placeholder="Status"
                allowClear
                className="w-full custom-select"
                popupClassName="rounded-3xl"
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
