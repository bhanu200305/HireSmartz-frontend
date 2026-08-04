import { FC } from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  entityLabel: string;
  totalItems: number;
  onPageChange: (page: number) => void;
}

const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  entityLabel,
  onPageChange,
}) => {
  // const recordsPerPage = 10
  const maxVisiblePages = 5;

  const getPageNumbers = () => {
    if (totalPages <= maxVisiblePages) return Array.from({ length: totalPages }, (_, i) => i + 1);

    if (currentPage <= 3) return [1, 2, 3, '...', totalPages];
    if (currentPage >= totalPages - 2)
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className="flex justify-between items-center mt-4 p-4 bg-[#F0F0F0]">
      <span className="text-gray-600 font-medium">
        {/* {totalUsers} users (Showing {recordsPerPage} per page) */}
        Showing {totalItems} {entityLabel}.
      </span>
      <div className="flex items-center space-x-2">
        {currentPage > 1 && (
          <button
            className="w-10 h-10 flex items-center bg-white justify-center rounded-full border border-gray-400 text-gray-700 hover:bg-gray-200"
            onClick={() => onPageChange(currentPage - 1)}
          >
            <LeftOutlined />
          </button>
        )}
        <div className="flex space-x-2">
          {getPageNumbers().map((page, index) => (
            <span
              key={index}
              className={`w-10 h-10 flex items-center justify-center rounded-full border border-gray-400 font-medium cursor-pointer
                ${page === currentPage ? 'bg-primary text-white' : 'bg-white hover:bg-gray-200 text-gray-700'}`}
              onClick={() => typeof page === 'number' && onPageChange(page)}
            >
              {page}
            </span>
          ))}
        </div>
        {totalPages > 1 && currentPage < totalPages && (
          <button
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full border border-gray-400 text-gray-700 hover:bg-gray-200"
            onClick={() => onPageChange(currentPage + 1)}
          >
            <RightOutlined />
          </button>
        )}
      </div>
    </div>
  );
};

export default Pagination;
