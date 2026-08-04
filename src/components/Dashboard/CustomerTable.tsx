import React from 'react';
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
}) => {
  const navigate = useNavigate();
  return (
    <div className="bg-gray-50 rounded-xl shadow p-4 w-full">
      <TableHeadBar
        icon={icon}
        title={title}
        onStatusChange={onStatusChange}
        currentFilters={currentFilters}
        onTitleClick={onTitleClick}
        onIconClick={onIconClick}
      />

      <div className="overflow-x-auto overflow-y-auto max-h-[400px] max-w-full">
        <table className="min-w-[500px] text-sm text-left w-full">
          <thead className="sticky top-0 bg-white p-0 m-0">
            <tr className="text-black font-semibold">
              {headers?.map((item, index) => (
                <th key={index} className="py-2 px-1 whitespace-nowrap">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          {role === 'organization' && <OwnerTableBody data={data} title={title} />}

          {role === 'owner' && (
            <tbody>
              {data &&
                data?.data.slice(0, 5)?.map((customer: any) => (
                  <tr key={customer?.id}>
                    <td
                      className="py-2 px-1 text-primary underline hover:text-primary cursor-pointer"
                      onClick={() => navigate(`/view-company?companyId=${customer.id}`)}
                    >
                      {customer?.cfpCustomerName}
                    </td>
                    <td className="py-2 px-1">
                      {customer.countryCode}
                      {formatPhoneNumber(customer.phone)}
                    </td>
                    <td className="py-2 px-1">{customer.interviewCount || 0}</td>
                    <td className="py-2 px-1">{customer.packages || 0}</td>
                    <td className="py-2 px-1">{customer.recruiters || 0}</td>
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
