import React, { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { MdOutlineRecordVoiceOver } from 'react-icons/md';
import { Badge, Button, Textarea, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useGetPlatformDefaultCultureIntroQuery,
  useUpdatePlatformDefaultCultureIntroMutation,
  useGetPlatformTenantCultureIntroQuery,
  useUpdatePlatformTenantCultureIntroMutation,
} from '../../api/organization-service/Platform/cultureIntro';
import { useGetCompaniesDropdownQuery } from '../../api/tenant-service/Company/companiesDropdown';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

/**
 * Super Admin's "Culture Intro" tab — same company-picker pattern
 * IntakeQuestionsTab.tsx already uses for questions: GET/PUT
 * /v1/platform/culture-intro (the platform default) and GET/PUT
 * /v1/platform/tenants/{tenant_id}/culture-intro (one company's own copy,
 * picked from the dropdown below).
 *
 * A company's own copy is seeded from the platform default ONCE, at
 * creation — editing the default here never retroactively changes an
 * existing company's already-diverged copy, unlike Intake Questions'
 * live-inherit-until-first-edit shape. Both are still full read/write from
 * here regardless.
 */
const CultureIntroTab: React.FC = () => {
  // null = editing the platform-wide default; a tenant id = that one
  // company's own script.
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const isPlatformDefault = selectedTenantId === null;

  const { data: companies, isLoading: isCompaniesLoading } = useGetCompaniesDropdownQuery();

  const { data: platformData, isLoading: isPlatformLoading } =
    useGetPlatformDefaultCultureIntroQuery(undefined, { skip: !isPlatformDefault });
  const { data: tenantData, isLoading: isTenantLoading } = useGetPlatformTenantCultureIntroQuery(
    selectedTenantId as string,
    { skip: isPlatformDefault }
  );

  const [updatePlatformDefault, { isLoading: isSavingPlatform }] =
    useUpdatePlatformDefaultCultureIntroMutation();
  const [updateTenantIntro, { isLoading: isSavingTenant }] =
    useUpdatePlatformTenantCultureIntroMutation();
  const isSaving = isPlatformDefault ? isSavingPlatform : isSavingTenant;

  const data = isPlatformDefault ? platformData : tenantData;
  const isLoading = isPlatformDefault ? isPlatformLoading : isTenantLoading;

  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft(data?.intro_text ?? '');
  }, [data]);

  const isDirty = data !== undefined && draft.trim() !== data.intro_text.trim();

  const companyOptions = useMemo(
    () => [
      { value: 'platform', label: 'Platform Default (all companies)' },
      ...(companies ?? []).map((company) => ({ value: company.id, label: company.companyName })),
    ],
    [companies]
  );

  const selectedCompanyLabel = isPlatformDefault
    ? null
    : (companies ?? []).find((c) => c.id === selectedTenantId)?.companyName;

  const handleSave = async () => {
    const text = draft.trim();
    if (!text) {
      showToast({ message: 'The culture intro cannot be empty.', type: 'error' });
      return;
    }
    try {
      if (isPlatformDefault) {
        await updatePlatformDefault(text).unwrap();
      } else {
        await updateTenantIntro({
          tenantId: selectedTenantId as string,
          intro_text: text,
        }).unwrap();
      }
      showToast({ message: 'Culture intro updated.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to update culture intro.'),
        type: 'error',
      });
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-1.5 rounded-full flex items-center justify-center shrink-0">
          <MdOutlineRecordVoiceOver size={14} />
        </span>
        <h2 className="text-lg font-semibold text-gray-800 m-0">Culture Intro</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4 max-w-3xl">
        The opening script the AI interviewer reads aloud before the Q&amp;A in every audio
        interview round. Pick a company below to view or override its own script.
      </p>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select
          id="cultureIntroCompany"
          size="middle"
          className="w-[240px]"
          popupClassName="cultureIntroCompanySelectDropdown"
          loading={isCompaniesLoading}
          showSearch
          value={isPlatformDefault ? 'platform' : selectedTenantId}
          onChange={(value) => setSelectedTenantId(value === 'platform' ? null : value)}
          options={companyOptions}
          filterOption={(input, option) =>
            String(option?.label ?? '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
        />
        <Badge status={isPlatformDefault ? 'info' : 'neutral'} dot={false}>
          {isPlatformDefault ? 'Platform default' : (selectedCompanyLabel ?? 'Company')}
        </Badge>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="max-w-2xl">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="rounded-2xl text-sm"
          />
          <div className="flex justify-end mt-3">
            <Button
              className="rounded-full bg-primary-600 text-white px-6 py-2 disabled:opacity-50"
              onClick={() => void handleSave()}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CultureIntroTab;
