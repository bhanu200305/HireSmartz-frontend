import React, { useState, useRef, useEffect } from 'react';
import { Checkbox, Modal } from 'antd';
import { MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { IoClose } from 'react-icons/io5';
import { Button } from '../shared';
import { showToast } from '../shared/ui/toast';
import { useGetCompaniesDropdownQuery } from '../../api/tenant-service/Company/companiesDropdown';
import {
  usePushTemplatesToTenantsMutation,
  type ImpactedTenant,
} from '../../api/tenant-service/MyCompany/emailTemplate';

const PushTemplatesTab: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isPreConfirmModalOpen, setIsPreConfirmModalOpen] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [impactedTenants, setImpactedTenants] = useState<ImpactedTenant[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: companiesRaw = [], isLoading: companiesLoading } = useGetCompaniesDropdownQuery();
  const companies = companiesRaw.filter((c) => !c.owner);
  const [pushToTenants, { isLoading: isPushing }] = usePushTemplatesToTenantsMutation();

  /* ── Close dropdown on outside click ─────────────────────────── */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── Helpers ──────────────────────────────────────────────────── */
  const toggleCompany = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeCompany = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectedCompanies = companies.filter((c) => selectedIds.has(c.id));

  /**
   * Step 0 – Pre-confirmation: ask before any API call.
   */
  const handlePushClick = (): void => {
    if (selectedIds.size === 0) {
      showToast({ type: 'warning', message: 'Please select at least one company.' });
      return;
    }
    setIsPreConfirmModalOpen(true);
  };

  /**
   * Step 1 – Dry-run: performChanges=false, confirmed=false
   * If requiresConfirmation=true → show modal with impacted tenants
   * If requiresConfirmation=false → push succeeded immediately, done
   */
  const handleDryRun = async (): Promise<void> => {
    setIsPreConfirmModalOpen(false);
    try {
      const result = await pushToTenants({
        companyIds: Array.from(selectedIds),
        performChanges: false,
        confirmed: false,
      }).unwrap();

      if (result.data.requiresConfirmation) {
        setImpactedTenants(result.data.impactedTenants ?? []);
        setIsConfirmModalOpen(true);
      } else {
        // No custom templates to overwrite — do the real push immediately
        await handleFinalPush(false);
      }
    } catch {
      showToast({ type: 'error', message: 'Failed to check template status. Please try again.' });
    }
  };

  /**
   * Step 2 – Final push: performChanges=true, confirmed=true
   * Called either directly (no impacted tenants) or after user confirms.
   */
  const handleFinalPush = async (userConfirmed: boolean): Promise<void> => {
    try {
      await pushToTenants({
        companyIds: Array.from(selectedIds),
        performChanges: true,
        confirmed: userConfirmed,
      }).unwrap();
      showToast({ type: 'success', message: 'Email templates pushed successfully.' });
      setIsConfirmModalOpen(false);
      setSelectedIds(new Set());
      setImpactedTenants([]);
    } catch {
      showToast({ type: 'error', message: 'Failed to push email templates.' });
    }
  };

  return (
    <div className="mt-4">
      <p className="text-sm text-gray-500 mb-6 roboto-font">
        Select companies to assign email templates.
      </p>

      {/* Card */}
      <div className="border border-gray-200 rounded-xl p-6 bg-white max-w-2xl">
        <h3 className="heading-font text-base font-semibold text-gray-800 mb-5">
          Assign Email Templates to Companies
        </h3>

        {/* Company multi-select */}
        <div ref={dropdownRef} className="relative">
          <span className="block text-sm font-medium text-gray-700 mb-2 roboto-font">
            Company <span className="required-asterisk">*</span>
          </span>

          {/* Trigger */}
          <div
            className="border border-gray-300 rounded-full px-4 py-2.5 flex items-center justify-between cursor-pointer hover:border-brand-400 bg-white select-none"
            onClick={() => setIsDropdownOpen((v) => !v)}
          >
            <span className="text-sm text-gray-600 roboto-font">
              {selectedIds.size === 0
                ? 'Select companies'
                : `${selectedIds.size} of ${companies.length} companies selected`}
            </span>
            <MdOutlineKeyboardArrowDown
              className={`text-gray-500 text-xl flex-shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </div>

          {/* Dropdown list */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto custom-scrollbar">
              {companiesLoading ? (
                <div className="py-4 text-center text-sm text-gray-400 roboto-font">Loading...</div>
              ) : companies.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-400 roboto-font">
                  No companies found.
                </div>
              ) : (
                companies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompany(company.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') toggleCompany(company.id);
                    }}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={selectedIds.has(company.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(company.id)}
                      onChange={() => toggleCompany(company.id)}
                    />
                    <span className="text-sm text-gray-700 roboto-font">{company.companyName}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Selected tags */}
          {selectedCompanies.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 roboto-font">
                Selected Companies
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCompanies.map((c) => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1.5 bg-white border border-gray-300 text-sm text-gray-700 px-3 py-1 rounded-full roboto-font"
                  >
                    {c.companyName}
                    <button
                      type="button"
                      onClick={() => removeCompany(c.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <IoClose size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PUSH TEMPLATES button */}
      <div className="flex justify-center mt-8">
        <Button
          className="px-16 h-11 bg-[#004BE0] text-white hover:bg-brand-700 rounded-full font-semibold text-sm roboto-font disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handlePushClick}
          loading={isPushing}
          disabled={selectedIds.size === 0 || isPushing}
        >
          PUSH TEMPLATES
        </Button>
      </div>

      {/* PRE-CONFIRMATION modal — shown before any API call */}
      <Modal
        open={isPreConfirmModalOpen}
        onCancel={() => setIsPreConfirmModalOpen(false)}
        footer={null}
        centered
        closable={false}
        width={420}
        styles={{ content: { borderRadius: '16px', padding: '32px 24px 24px' } }}
      >
        <div className="text-center">
          <h3 className="heading-font text-xl font-semibold text-gray-900 mb-3">
            Push Email Templates
          </h3>
          <p className="text-sm text-gray-600 roboto-font mb-6">
            Are you sure you want to push email templates to the{' '}
            <span className="font-semibold">{selectedIds.size}</span> selected{' '}
            {selectedIds.size === 1 ? 'company' : 'companies'}?
          </p>
          <div className="flex gap-3">
            <Button
              className="flex-1 h-11 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-full font-semibold text-sm roboto-font"
              onClick={() => setIsPreConfirmModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              className="flex-1 h-11 bg-[#004BE0] text-white hover:bg-brand-700 rounded-full font-semibold text-sm roboto-font"
              onClick={handleDryRun}
            >
              CONFIRM
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation modal — shown only when requiresConfirmation=true */}
      <Modal
        open={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        footer={null}
        centered
        closable={false}
        width={480}
        styles={{ content: { borderRadius: '16px', padding: '32px 24px 24px' } }}
      >
        <div className="text-center">
          <h3 className="heading-font text-xl font-semibold text-gray-900 mb-3">
            Assign Email Template
          </h3>
          <p className="text-sm text-gray-600 roboto-font mb-4">
            Are you sure you want to assign the email templates across selected companies?
          </p>

          {impactedTenants.length > 0 && (
            <div className="text-left mb-4 px-1">
              <p className="text-sm text-gray-600 roboto-font mb-2">
                The companies listed below have customized email templates, which will be replaced.
              </p>
              <div className="space-y-1 mt-2">
                {impactedTenants.map((t) => (
                  <p key={t.companyId} className="text-sm text-gray-400 roboto-font pl-1">
                    {t.companyName}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button
              className="flex-1 h-11 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-full font-semibold text-sm roboto-font"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isPushing}
            >
              NO
            </Button>
            <Button
              className="flex-1 h-11 bg-[#004BE0] text-white hover:bg-brand-700 rounded-full font-semibold text-sm roboto-font"
              onClick={() => handleFinalPush(true)}
              loading={isPushing}
            >
              YES
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PushTemplatesTab;
