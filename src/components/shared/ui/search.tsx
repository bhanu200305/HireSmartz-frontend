import { ReactNode, useEffect, useState, forwardRef } from 'react';
import type { KeyboardEvent } from 'react';
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
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export const Search = forwardRef<HTMLInputElement, SearchProps>(
  (
    {
      children,
      className,
      onSearch,
      onChange,
      placeholder,
      allowClear = false,
      value,
      onFocus,
      onBlur,
      onKeyDown,
    },
    ref
  ) => {
    const [searchValue, setSearchValue] = useState(value || '');
    useEffect(() => {
      setSearchValue(value || '');
    }, [value]);

    const handleClear = () => {
      setSearchValue('');
      onSearch?.('');
    };

    return (
      <div className="relative">
        <div
          className={clsx(
            'search-input-wrapper relative flex items-center border border-[var(--border)] rounded-3xl px-4 py-2 w-full',
            className
          )}
        >
          <MdOutlineSearch className="text-primary text-lg" />
          <input
            ref={ref}
            type="text"
            // The browser's own address/contact autofill can otherwise pop
            // up over this exact spot and compete with the app's own
            // results dropdown — a click meant for one of our results can
            // land on the browser's suggestion instead, which does nothing
            // useful here and just closes our dropdown. `off` isn't honored
            // by every browser for every field, but Chrome respects it for
            // a plain text input like this one.
            autoComplete="off"
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
            onKeyDown={onKeyDown}
          />
          {allowClear && searchValue && (
            <button
              onClick={handleClear}
              className="ml-2 text-gray-500 focus:outline-none cursor-pointer"
            >
              <MdClose className="text-lg" />
            </button>
          )}
        </div>
        {children}
      </div>
    );
  }
);

Search.displayName = 'Search';
