import { ReactNode, useEffect, useState } from 'react';
import clsx from 'clsx';
import { MdOutlineSearch, MdClose } from 'react-icons/md';

interface SearchProps {
  children?: ReactNode;
  className?: string;
  appname: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  value?: string; // Add this to accept external value
  onChange?: (value: string) => void; // Add this to notify external changes
  onFocus?: () => void;
  onBlur?: () => void;
}

export const Search = ({
  children,
  className,
  onSearch,
  onChange,
  placeholder,
  allowClear = false,
  value,
  onFocus,
  onBlur,
}: SearchProps) => {
  const [searchValue, setSearchValue] = useState(value || '');
  useEffect(() => {
    setSearchValue(value || '');
  }, [value]);

  const handleClear = () => {
    setSearchValue('');
    onSearch?.('');
  };

  return (
    <div className={clsx('relative', className)}>
      <div className="search-input-wrapper relative flex items-center border border-[var(--border)] rounded-3xl px-4 py-2 w-full">
        <MdOutlineSearch className="text-primary text-lg" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          className="ml-2 w-full bg-transparent text-base border-none outline-none"
          onChange={(e) => {
            const nextValue = e.target.value;
            setSearchValue(nextValue);
            onChange?.(nextValue);
            onSearch?.(nextValue);
          }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {allowClear && searchValue && (
          <button onClick={handleClear} className="ml-2 text-gray-500 focus:outline-none">
            <MdClose className="text-lg" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
};
