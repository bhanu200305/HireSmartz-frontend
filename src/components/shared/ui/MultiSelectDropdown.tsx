import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { Checkbox } from 'antd';
import { MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { IoClose } from 'react-icons/io5';

export interface MultiSelectOption {
  id: number;
  name: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  showSelectedChips?: boolean;
  disabled?: boolean;
  className?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedIds,
  onChange,
  label,
  placeholder,
  searchPlaceholder = 'Search...',
  showSelectedChips = true,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const instanceId = useId();

  const filtered = options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));

  /* ── Close on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Focus search when opening ── */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setFocusedIndex(-1);
    } else {
      setSearch('');
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  /* ── Scroll focused item into view ── */
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  const toggle = useCallback(
    (id: number) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(next);
    },
    [selectedIds, onChange]
  );

  const remove = useCallback(
    (id: number) => {
      const next = new Set(selectedIds);
      next.delete(id);
      onChange(next);
    },
    [selectedIds, onChange]
  );

  /* ── Keyboard handler for trigger button ── */
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((v) => !v);
    }
    if (e.key === 'Escape') {
      if (isOpen) {
        e.stopPropagation();
        setIsOpen(false);
      }
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  /* ── Keyboard handler for search input & list navigation ── */
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    }
    if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0) {
      e.preventDefault();
      const item = filtered[focusedIndex];
      if (item) toggle(item.id);
    }
    if (e.key === 'Tab' && !e.shiftKey && focusedIndex === filtered.length - 1) {
      setIsOpen(false);
    }
  };

  const selectedItems = options.filter((o) => selectedIds.has(o.id));
  const displayText =
    selectedIds.size === 0
      ? (placeholder ?? `0 of ${options.length} selected`)
      : `${selectedIds.size} of ${options.length} selected`;

  return (
    <div className={`${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2" id={`${instanceId}-label`}>
          {label}
        </label>
      )}

      {/* Trigger */}
      <div className="relative">
        <div
          ref={triggerRef}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-labelledby={label ? `${instanceId}-label` : undefined}
          aria-controls={`${instanceId}-listbox`}
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && setIsOpen((v) => !v)}
          onKeyDown={handleTriggerKeyDown}
          className={`border rounded-full px-4 py-2 min-h-[36px] w-full bg-white flex items-center justify-between cursor-pointer select-none transition-colors
            ${isOpen ? 'border-brand-500 ring-1 ring-brand-500' : 'border-[var(--border)] hover:border-gray-400'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span className="text-gray-800 text-sm truncate">{displayText}</span>
          <MdOutlineKeyboardArrowDown
            className={`text-gray-800 text-lg transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Dropdown panel */}
        {isOpen && (
          <div
            id={`${instanceId}-listbox`}
            className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 flex flex-col"
            style={{ maxHeight: '280px' }}
          >
            {/* Search */}
            <div className="p-2 border-b border-gray-100 shrink-0">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setFocusedIndex(-1);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                aria-label="Search options"
              />
            </div>

            {/* Options list */}
            <ul
              ref={listRef}
              role="listbox"
              aria-multiselectable="true"
              aria-labelledby={label ? `${instanceId}-label` : undefined}
              className="overflow-y-auto p-2 flex-1"
            >
              {filtered.length === 0 ? (
                <li className="p-3 text-center text-sm text-gray-500">No results found</li>
              ) : (
                filtered.map((opt, idx) => {
                  const isSelected = selectedIds.has(opt.id);
                  const isFocused = focusedIndex === idx;
                  return (
                    <li
                      key={opt.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => toggle(opt.id)}
                      className={`flex items-center gap-3 px-2 py-2 rounded cursor-pointer text-sm transition-colors
                        ${isSelected ? 'bg-brand-50/60' : 'hover:bg-gray-50'}
                        ${isFocused ? 'ring-1 ring-brand-400 bg-brand-50' : ''}
                      `}
                    >
                      <Checkbox checked={isSelected} tabIndex={-1} />
                      <span className="text-gray-700">{opt.name}</span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Selected chips */}
      {showSelectedChips && selectedItems.length > 0 && (
        <div className="mt-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">
            Selected
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => remove(item.id)}
                className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-sm font-medium border border-brand-100 transition-colors hover:bg-brand-100 focus:outline-none focus:ring-1 focus:ring-brand-400"
                aria-label={`Remove ${item.name}`}
              >
                <span className="max-w-[150px] truncate">{item.name}</span>
                <IoClose className="text-brand-500 hover:text-brand-800 text-base shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
