import React from 'react';
import clsx from 'clsx';
import { formatPhoneNumber } from '../../shared/utils/methods';
import TableHeadBar, { StatusFilters } from '../shared/ui/tableHeadbar';
import OwnerTableBody from '../OwnerDashboard/OwnerTableBody';
import TableFooter from '../shared/ui/tableFooter';
import { useNavigate } from 'react-router-dom';

type CustomerTableProps = {
  data: any;
  headers: string[];
  title?: string;
  showFooter?: boolean;
  role?: string;
  icon?: any;
  onViewAll?: () => void;
  getData?: () => void;
  onStatusChange?: (filters: StatusFilters) => void;
  currentFilters?: StatusFilters;
  count?: number;
  onTitleClick?: () => void;
  onIconClick?: () => void;
  /** When true, the card stretches to fill its parent's height instead of sizing to content. */
  fillHeight?: boolean;
};

const CustomerTable: React.FC<CustomerTableProps> = ({
  data,
  headers,
  title,
  role,
  icon,
  onViewAll,
  onStatusChange,
  currentFilters,
  count,
  onTitleClick,
  onIconClick,
  fillHeight,
}) => {
  const navigate = useNavigate();
  return (
    <div
      className={clsx(
        'bg-white rounded-xl p-6 w-full border shadow-xs',
        fillHeight && 'h-full flex flex-col'
      )}
      style={{ borderColor: 'var(--border)' }}
    >
      <TableHeadBar
        icon={icon}
        title={title}
        onStatusChange={onStatusChange}
        currentFilters={currentFilters}
        onTitleClick={onTitleClick}
        onIconClick={onIconClick}
      />

      <div
        className={clsx(
          'overflow-x-auto overflow-y-auto max-w-full mt-4',
          fillHeight ? 'flex-1 min-h-0' : 'max-h-[400px]'
        )}
      >
        <table className="min-w-[500px] text-sm text-left w-full">
          <thead className="sticky top-0 bg-neutral-50 p-0 m-0">
            <tr className="text-neutral-500">
              {headers?.map((item, index) => (
                <th
                  key={index}
                  className="py-2.5 px-3 whitespace-nowrap text-xs font-semibold tracking-wide"
                >
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          {role === 'organization' && <OwnerTableBody data={data} title={title} />}

          {role === 'owner' && (
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {data &&
                data?.data.slice(0, 5)?.map((customer: any) => (
                  <tr key={customer?.id} className="hover:bg-neutral-50 transition-colors">
                    <td
                      className="py-3 px-3 text-primary hover:text-primary-700 cursor-pointer font-semibold transition-colors"
                      onClick={() => navigate(`/view-company?companyId=${customer.id}`)}
                    >
                      {customer?.cfpCustomerName}
                    </td>
                    <td className="py-3 px-3 text-neutral-600">
                      {customer.countryCode}
                      {formatPhoneNumber(customer.phone)}
                    </td>
                    <td className="py-3 px-3 text-neutral-700 font-medium">
                      {customer.interviewCount || 0}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand-100 text-primary">
                        {customer.packages || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-600">{customer.recruiters || 0}</td>
                  </tr>
                ))}
            </tbody>
          )}
        </table>
      </div>

      <TableFooter onViewAll={onViewAll} title={title} count={count} />
    </div>
  );
};

export default CustomerTable;
