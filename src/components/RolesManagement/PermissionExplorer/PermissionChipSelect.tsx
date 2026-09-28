import React, { useEffect, useRef, useState } from 'react';
import { MdClose, MdOutlineKeyboardArrowDown } from 'react-icons/md';

export type PermissionChipOption = { code: string; label: string };

type PermissionChipSelectProps = {
  options: PermissionChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Holder count per code (e.g. `permission_counts` from the matrix response)
   * — only meaningful for codes already selected, since the backend only
   * returns counts for the codes actually sent in the request. */
  counts?: Record<string, number>;
  placeholder?: string;
  className?: string;
};

/**
 * Search-to-add permission chips, with the picked set rendered as removable
 * pills below — purpose-built for permission codes (string ids with a
 * holder-count badge) rather than reusing `MultiSelectDropdown`, which is
 * numeric-id-only and has no notion of a per-option count.
 */
const PermissionChipSelect: React.FC<PermissionChipSelectProps> = ({
  options,
  selected,
  onChange,
  counts,
  placeholder = 'Add a permission…',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedSet = new Set(selected);
  const q = search.trim().toLowerCase();
  const filtered = options.filter(
    (option) =>
      !selectedSet.has(option.code) &&
      (option.label.toLowerCase().includes(q) || option.code.toLowerCase().includes(q))
  );

  const addCode = (code: string) => {
    onChange([...selected, code]);
    setSearch('');
  };

  const removeCode = (code: string) => {
    onChange(selected.filter((c) => c !== code));
  };

  const labelFor = (code: string) => options.find((o) => o.code === code)?.label ?? code;

  return (
    <div className={`flex flex-col gap-2 ${className}`} ref={containerRef}>
      <div className="relative">
        <div
          className="flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1.5 bg-white cursor-text"
          onClick={() => setOpen(true)}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="flex-1 min-w-0 text-sm outline-none bg-transparent"
          />
          <MdOutlineKeyboardArrowDown className="text-gray-400" size={16} />
        </div>

        {open && (
          <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400">No matching permissions.</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => addCode(option.code)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-2"
                >
                  <span className="text-gray-800">{option.label}</span>
                  <span className="text-xs text-gray-400 font-mono">{option.code}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {selected.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary-50 text-primary-700 rounded-full pl-3 pr-2 py-1"
            >
              {labelFor(code)}
              {counts?.[code] !== undefined && (
                <span className="text-primary-500 font-normal">({counts[code]})</span>
              )}
              <button
                type="button"
                onClick={() => removeCode(code)}
                aria-label={`Remove ${labelFor(code)}`}
                className="text-primary-400 hover:text-primary-700 cursor-pointer"
              >
                <MdClose size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PermissionChipSelect;
