import React, { useState, useRef } from 'react';
import { Select, Tooltip } from 'antd';
import type { SelectProps } from 'antd';
import { MdOutlineAddCircleOutline, MdEdit, MdDelete, MdReplay } from 'react-icons/md';
import { AiFillStar } from 'react-icons/ai';
import ConfirmationModal from './ConfirmationModal';
import EditModal from './EditModalForDropdown';
import StatusToggle from './StatusToggle';

interface DropdownOption {
  id: string | number;
  name: string;
  used?: boolean;
  isDeleted?: boolean;
  isPrimary?: boolean;
  /** False hides edit/delete for this option even when `enableEditDelete` is on
   * for the whole dropdown - e.g. a platform-shared skill vs. an org's own. */
  isEditable?: boolean;
  /** Real is_active status, shown as a Switch matching PlatformCatalogTab -
   * defaults true (via `??`) wherever a catalogue doesn't supply it yet. */
  isActive?: boolean;
}
interface DropdownWithAddOptionProps {
  value: any;
  onChange: (value: any) => void;
  onSearchChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  options: DropdownOption[];
  loading?: boolean;
  placeholder?: string;
  onAddOption?: (value: string, type: string) => void;
  onEditOption?: (id: string | number, newName: string, type: string) => void;
  onDeleteOption?: (id: string | number, type: string) => void;
  onReuseOption?: (id: string | number, type: string) => void;
  /** Status Switch next to Edit/Delete - flips is_active, independent of the
   * isDeleted/reuse soft-delete path above. */
  onToggleActive?: (id: string | number, nextActive: boolean, type: string) => void;
  type: string;
  error?: string;
  /** Overrides "No options available", e.g. with a permission-denied reason. */
  emptyMessage?: string;
  label?: string;
  mode?: 'multiple' | 'tags' | undefined;
  maxTagCount?: number | 0 | 'responsive';
  className?: string;
  disabled?: boolean;
  enableEditDelete?: boolean;
  autoFocus?: boolean;
  maxTagPlaceholder?: null | ((omittedValues: any) => React.ReactNode);
  tagRender?: SelectProps['tagRender'];
}

const DropdownWithAddOption: React.FC<DropdownWithAddOptionProps> = ({
  value,
  onChange,
  onSearchChange,
  onOpenChange,
  options,
  loading = false,
  placeholder = 'Select',
  onAddOption,
  onEditOption,
  onDeleteOption,
  onReuseOption,
  onToggleActive,
  type,
  error,
  emptyMessage,
  mode,
  maxTagCount = 'responsive',
  disabled,
  className = '',
  enableEditDelete = true,
  autoFocus = false,
  maxTagPlaceholder,
  tagRender,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReuseModal, setShowReuseModal] = useState(false);
  const [showEditConfirmationModal, setShowEditConfirmationModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DropdownOption | null>(null);
  const [newNameValue, setNewNameValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectRef = useRef<any>(null);

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchValue.toLowerCase())
  );
  const handleChange = (newValue: any) => {
    onChange(newValue);
    setSearchValue('');
    onSearchChange?.('');
  };
  const handleAddOption = () => {
    if (!searchValue || typeof onAddOption !== 'function') return;
    onAddOption(searchValue, type);
    setSearchValue('');
    onSearchChange?.('');
    closeDropdown();
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearchChange?.(value);
  };

  const closeDropdown = () => {
    setDropdownOpen(false);
    onOpenChange?.(false);
    if (selectRef.current) {
      selectRef.current.blur();
    }
  };

  const hasActiveSelectableOption = (): boolean => {
    // Scoped to a visible dropdown - other closed instances on this page
    // stay mounted with a stale active item during their close animation.
    const activeOption = document.querySelector(
      '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-active:not(.ant-select-item-option-disabled)'
    );
    return Boolean(activeOption);
  };

  const handleEditClick = (option: DropdownOption, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOption(option);
    setNewNameValue(option.name);
    if (option.used) {
      setShowEditConfirmationModal(true);
    } else {
      setShowEditModal(true);
    }
    closeDropdown();
  };
  const handleConfirmEdit = () => {
    setShowEditConfirmationModal(false);
    setShowEditModal(true);
  };
  const handleCancelEdit = () => {
    setShowEditConfirmationModal(false);
    setSelectedOption(null);
    setNewNameValue('');
  };

  const handleSaveEdit = async (newName: string) => {
    if (!selectedOption || !onEditOption) return;

    setIsLoading(true);
    try {
      await onEditOption(selectedOption.id, newName, type);
      setShowEditModal(false);
      setSelectedOption(null);
      setNewNameValue('');
      setSearchValue('');
      onSearchChange?.('');
    } catch (error) {
      console.error('Error editing option:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (option: DropdownOption, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOption(option);
    setShowDeleteModal(true);
    closeDropdown();
  };

  const handleConfirmDelete = async () => {
    if (!selectedOption || !onDeleteOption) return;

    setIsLoading(true);
    try {
      await onDeleteOption(selectedOption.id, type);
      setShowDeleteModal(false);
      setSelectedOption(null);
      setSearchValue('');
      onSearchChange?.('');
    } catch (error) {
      console.error('Error deleting option:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleReuseClick = (option: DropdownOption, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOption(option);
    setShowReuseModal(true);
    closeDropdown();
  };
  const handleConfirmReuse = async () => {
    if (!selectedOption || !onReuseOption) return;

    setIsLoading(true);
    try {
      await onReuseOption(selectedOption.id, type);
      setShowReuseModal(false);
      setSelectedOption(null);
      setSearchValue('');
      onSearchChange?.('');
    } catch (error) {
      console.error('Error reusing option:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedOption(null);
    setNewNameValue('');
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedOption(null);
  };
  const handleCloseReuseModal = () => {
    setShowReuseModal(false);
    setSelectedOption(null);
  };

  const showAddOption =
    typeof onAddOption === 'function' &&
    searchValue &&
    !options.some((opt) => opt.name.toLowerCase() === searchValue.toLowerCase());

  const shouldShowEditDeleteActions = (option: DropdownOption) => {
    return enableEditDelete && !option.isDeleted && option.isEditable !== false;
  };
  const shouldShowReuseAction = (option: DropdownOption) => {
    return option.isDeleted && onReuseOption;
  };

  const destructiveActionLabel = 'Delete';
  const destructiveActionLabelUpper = 'Remove';
  const destructiveActionVerb = 'remove';
  const actionTooltipProps = {
    placement: 'top' as const,
    color: '#0f172a',
    mouseEnterDelay: 0.1,
    overlayInnerStyle: {
      borderRadius: 8,
      padding: '6px 10px',
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  };

  return (
    <div className="dropdown-with-add-option-wrapper">
      <div className="border-wrapper dropdown-focus-ring border border-[var(--border)] p-1 w-full rounded-3xl relative">
        <Select
          ref={selectRef}
          // Hidden during the first load (no raw-id flash), not while searching (no flicker).
          value={loading && !searchValue ? (mode === 'multiple' ? [] : undefined) : value}
          onChange={handleChange}
          className={`w-full capitalize ${className}`}
          popupClassName="custom-select-jobs-dropdown"
          placeholder={placeholder}
          variant="borderless"
          loading={loading}
          // Never null - antd won't open the popup at all if this is falsy.
          notFoundContent={
            <div className="p-2 text-gray-400">
              {options.length === 0 ? (emptyMessage ?? 'No options available') : 'No matches found'}
            </div>
          }
          showSearch
          onSearch={handleSearch}
          searchValue={searchValue}
          filterOption={false}
          mode={mode}
          maxTagCount={maxTagCount}
          maxTagPlaceholder={maxTagPlaceholder}
          tagRender={tagRender}
          disabled={disabled}
          // Caller-controlled via the `autoFocus` prop, not hardcoded here.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          // onBlur={() => setSearchValue('')}
          open={dropdownOpen}
          onDropdownVisibleChange={(open) => {
            setDropdownOpen(open);
            onOpenChange?.(open);
          }}
          onClear={() => {
            setSearchValue('');
            onSearchChange?.('');
            onChange(mode === 'multiple' ? [] : undefined);
          }}
          onInputKeyDown={(e) => {
            if (e.key === 'Tab') {
              setDropdownOpen(false);
              onOpenChange?.(false);
              e.stopPropagation();
              return;
            }
            if (e.key !== 'Enter') return;

            // Let AntD select the active option if one exists; otherwise
            // Enter adds the typed value, same as clicking "Add".
            if (!hasActiveSelectableOption()) {
              e.preventDefault();
              e.stopPropagation();
              if (showAddOption) handleAddOption();
            }
          }}
          dropdownRender={(menu) => (
            <>
              {menu}

              {/* Add option */}
              {showAddOption && (
                <div
                  className="pl-3 pr-2 py-2 cursor-pointer bg-white hover:font-medium flex items-center text-primary capitalize"
                  key="add-new-option"
                  // onClick={() => onAddOption(searchValue, type)}
                  onClick={handleAddOption}
                >
                  <MdOutlineAddCircleOutline size={18} className="mr-2 flex-shrink-0" />
                  Add &quot;{searchValue}&quot;
                </div>
              )}
              {/* Empty state comes from notFoundContent above, not here. */}
            </>
          )}
        >
          {filteredOptions.map((option) => (
            <Select.Option
              key={option.id}
              value={option.id}
              className="truncate"
              // A switched-off option stays listed (to switch back on) but can't be picked.
              disabled={option.isDeleted || option.isActive === false}
            >
              <div className="flex justify-between items-center w-full hover-actions-container group">
                <div className="flex-1 flex items-center min-w-0 gap-1">
                  {option.name.length > 55 ? (
                    <Tooltip title={option.name}>
                      <span className="truncate">{option.name}</span>
                    </Tooltip>
                  ) : (
                    <span className="truncate">{option.name}</span>
                  )}
                  {option.isPrimary && (
                    <AiFillStar className="flex-shrink-0 text-amber-400" title="Primary Location" />
                  )}
                  {option.isDeleted && (
                    <span className="ml-2 text-xs italic flex-shrink-0">(Deactivated)</span>
                  )}
                </div>
                {shouldShowEditDeleteActions(option) &&
                  (onEditOption || onDeleteOption || onToggleActive) && (
                    <div
                      className="flex items-center gap-1 ml-2 mr-1 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
                      // Stops a Switch click from also toggling the Select option.
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onToggleActive && (
                        <StatusToggle
                          isActive={option.isActive ?? true}
                          activateLabel="Activate"
                          deactivateLabel="Deactivate"
                          deactivateConfirmTitle={`Deactivate "${option.name}"?`}
                          onActivate={async () => onToggleActive(option.id, true, type)}
                          onDeactivate={async () => onToggleActive(option.id, false, type)}
                          size="small"
                        />
                      )}
                      {onEditOption && (
                        <Tooltip title="Edit" {...actionTooltipProps}>
                          <button
                            type="button"
                            className="p-1 hover:bg-gray-200 rounded text-brand-600 transition-colors cursor-pointer"
                            onClick={(e) => handleEditClick(option, e)}
                            tabIndex={-1}
                          >
                            <MdEdit size={14} />
                          </button>
                        </Tooltip>
                      )}
                      {onDeleteOption && (
                        <Tooltip title={destructiveActionLabel} {...actionTooltipProps}>
                          <button
                            type="button"
                            className="group p-1 hover:bg-gray-200 rounded transition-colors mr-2 cursor-pointer"
                            onClick={(e) => handleDeleteClick(option, e)}
                            tabIndex={-1}
                          >
                            <MdDelete
                              size={16}
                              className="text-gray-600 transition-colors group-hover:text-red-600"
                            />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  )}
                {shouldShowReuseAction(option) && (
                  <div className="flex items-center ml-2 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity">
                    <Tooltip title="Activate" {...actionTooltipProps}>
                      <button
                        type="button"
                        className="p-1 hover:bg-gray-200 rounded text-green-600 transition-colors mr-2 flex-shrink-0 cursor-pointer"
                        onClick={(e) => handleReuseClick(option, e)}
                        tabIndex={-1}
                      >
                        <MdReplay size={14} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </Select.Option>
          ))}
        </Select>
      </div>
      {/* Edit Confirmation Modal - Only for used options */}
      {showEditConfirmationModal && selectedOption && (
        <ConfirmationModal
          onClose={handleCancelEdit}
          onConfirm={handleConfirmEdit}
          title={` <strong>"${selectedOption.name}"</strong> is currently being used in existing job openings. Editing this option will affect all job openings using it. Are you sure you want to continue?`}
          confirmText="Continue Editing"
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedOption && (
        <EditModal
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
          title="Edit Option"
          initialValue={newNameValue}
          isLoading={isLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedOption && (
        <ConfirmationModal
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          title={`Are you sure you want to ${destructiveActionVerb}  <strong>"${selectedOption.name}"</strong>?`}
          confirmText={destructiveActionLabelUpper}
          isLoading={isLoading}
        />
      )}
      {/* Reuse Confirmation Modal */}
      {showReuseModal && selectedOption && (
        <ConfirmationModal
          onClose={handleCloseReuseModal}
          onConfirm={handleConfirmReuse}
          title={`Are you sure you want to reactivate <strong>"${selectedOption.name}"</strong>?`}
          confirmText="Reactivate"
          isLoading={isLoading}
        />
      )}

      {error && <p className="text-red-500 text-sm mt-1 break-words">{error}</p>}

      <style>{`
      .hover-actions-container:hover .hover-actions {
      opacity: 1;
      }
      .ant-select-item-option-disabled {
      opacity: 0.6;
      }
      .ant-select-item-option-content {
      display: flex;
      align-items: center;
      width: 100%;
      }
`}</style>
    </div>
  );
};

export default DropdownWithAddOption;
