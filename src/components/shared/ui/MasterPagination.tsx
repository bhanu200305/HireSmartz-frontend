import React, { useEffect, useRef, useState } from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { PAGINATION_DEBOUNCE_DELAY } from '../../../constants/app.constants';

interface MasterPaginationProps {
  current: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
}

/** Clamps a numeric value between min and max (inclusive). */
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const MasterPagination: React.FC<MasterPaginationProps> = ({
  current,
  pageSize,
  total,
  onPageChange,
  itemLabel = 'items',
}) => {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = total > 0 ? (current - 1) * pageSize + 1 : 0;
  const end = total > 0 ? Math.min(current * pageSize, total) : 0;

  // Local string state so the input feels responsive while the user is typing
  const [inputValue, setInputValue] = useState<string>(String(current));
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync input when current changes externally (prev/next arrows, external setter)
  useEffect(() => {
    setInputValue(String(current));
  }, [current]);

  const navigate = (page: number): void => {
    const clamped = clamp(page, 1, totalPages);
    setInputValue(String(clamped));
    onPageChange(clamped);
  };

  const scheduleNavigation = (raw: number): void => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      navigate(raw);
    }, PAGINATION_DEBOUNCE_DELAY);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value;
    setInputValue(raw);

    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      scheduleNavigation(parsed);
    }
  };

  const commitImmediately = (): void => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const parsed = parseInt(inputValue, 10);
    navigate(isNaN(parsed) ? current : parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitImmediately();
    }
    if (e.key === 'Escape') {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      setInputValue(String(current));
    }
  };

  const handlePrevClick = (): void => {
    if (current > 1) onPageChange(current - 1);
  };

  const handleNextClick = (): void => {
    if (current < totalPages) onPageChange(current + 1);
  };

  return (
    <div className="flex flex-wrap justify-between items-center gap-y-2 mt-4 p-4 bg-[#F0F0F0]">
      {/* Left: Showing X-Y of Z label */}
      <span className="text-gray-600 font-medium text-sm">
        Showing {start}-{end} of {total} {itemLabel}
      </span>

      {/* Right: Go to page controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePrevClick}
          disabled={current <= 1}
          className={`w-7 h-7 flex items-center justify-center border border-gray-400 bg-white rounded-full text-gray-600 text-xs ${
            current <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'
          }`}
          aria-label="Previous page"
        >
          <LeftOutlined style={{ fontSize: '10px' }} />
        </button>

        <span className="text-gray-600 text-sm">Go to page</span>

        <input
          type="number"
          min={1}
          max={totalPages}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-10 h-7 text-center border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-500 bg-white"
        />

        <span className="text-gray-600 text-sm">of {totalPages} pages</span>

        <button
          type="button"
          onClick={handleNextClick}
          disabled={current >= totalPages}
          className={`w-7 h-7 flex items-center justify-center border border-gray-400 bg-white rounded-full text-gray-600 text-xs ${
            current >= totalPages
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-gray-100 cursor-pointer'
          }`}
          aria-label="Next page"
        >
          <RightOutlined style={{ fontSize: '10px' }} />
        </button>
      </div>
    </div>
  );
};

export default MasterPagination;
