import React, { useState } from 'react';
import { Select } from 'antd';
import EmailBrandingEditor from '../shared/EmailBrandingEditor';
import { useGetCompaniesDropdownQuery } from '../../api/tenant-service/Company/companiesDropdown';

/**
 * Super Admin's platform-wide tool: pick any company, edit its own
 * candidate-facing email banner/brand colors. The actual editor (banner
 * upload, grouped color fields, live preview, save/publish) lives in
 * shared/EmailBrandingEditor.tsx, pre-scoped to one companyId — this file
 * only adds the company picker around it. The same editor, pre-scoped to a
 * fixed company instead of a picker, also appears on:
 *   - MyCompany/EmailTemplateBrandingTab.tsx (a Company Admin's own, via
 *     their session's tenantId)
 *   - CustomerDashboard/ViewCustomer/panels/EmailTemplatesPanel.tsx (Super
 *     Admin editing one specific company's branding on their behalf, via
 *     the tenant_id already fixed by that page's URL)
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
        <EmailBrandingEditor key={selectedCompanyId} companyId={selectedCompanyId} />
      )}
    </div>
  );
};

export default EmailTemplateConfigAdminTab;
