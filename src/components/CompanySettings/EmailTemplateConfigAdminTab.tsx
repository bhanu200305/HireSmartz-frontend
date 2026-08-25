import React, { useState } from 'react';
import { Select } from 'antd';
import { EmailBrandingEditor } from '../shared';
import { useGetCompaniesDropdownQuery } from '../../api/tenant-service/Company/companiesDropdown';

/**
 * Super Admin picks any company, then edits/publishes its candidate-facing
 * email branding via the shared `EmailBrandingEditor` (banner + 16 named
 * colors + live preview) — same component `MyCompany/EmailBrandingTab.tsx`
 * uses for a Company Admin's self-service version of this, extracted here
 * rather than duplicated since only "how is the company chosen" differs
 * between the two.
 */
const EmailTemplateConfigAdminTab: React.FC = () => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const { data: companiesRaw = [], isLoading: companiesLoading } = useGetCompaniesDropdownQuery();
  const companies = companiesRaw.filter((c) => !c.owner);

  return (
    <div>
      {/* Company selector */}
      <div className="mb-6">
        <span className="block text-sm font-medium text-gray-700 mb-2 roboto-font">Company</span>
        <Select
          placeholder="Select a company"
          loading={companiesLoading}
          value={selectedCompanyId ?? undefined}
          onChange={setSelectedCompanyId}
          showSearch
          filterOption={(input, option) =>
            String(option?.label ?? '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          options={companies.map((c) => ({ value: c.id, label: c.companyName }))}
          className="w-72"
          size="large"
        />
      </div>

      {selectedCompanyId === null ? (
        <div className="flex items-center justify-center h-64 text-gray-400 roboto-font text-sm">
          Select a company above to load its email template configuration.
        </div>
      ) : (
        // key forces a clean remount per company — the editor's internal
        // dirty/theme/banner state must not leak from one company to the
        // next, same as the old handleCompanyChange reset used to guarantee.
        <EmailBrandingEditor key={selectedCompanyId} companyId={selectedCompanyId} />
      )}
    </div>
  );
};

export default EmailTemplateConfigAdminTab;
