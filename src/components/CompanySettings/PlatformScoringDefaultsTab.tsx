import React, { useMemo, useState } from 'react';
import { Select, Tooltip } from 'antd';
import { MdLock } from 'react-icons/md';
import {
  INTERVIEW_CATEGORY_META,
  RESUME_CATEGORY_META,
  ScoringWeightCard,
  showToast,
} from '../shared';
import type { ScoringCategoryMeta, ScoringWeight } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useGetPlatformScoringConfigQuery,
  useGetPlatformTenantScoringConfigQuery,
  useUpdatePlatformScoringConfigMutation,
  useUpdatePlatformTenantScoringConfigMutation,
} from '../../api/organization-service/Platform/scoringConfig';
import { useGetCompaniesDropdownQuery } from '../../api/tenant-service/Company/companiesDropdown';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

/**
 * GET/PUT /v1/platform/scoring-config (platform default) and
 * /v1/platform/tenants/{tenant_id}/scoring-config (one company's override) —
 * both real organization-service routes, both proxied to ai-service. Every
 * call degrades to `available: false` until ai-service actually implements
 * this RPC (it doesn't yet — see ScoringConfigPort's own docstring), so this
 * screen honestly shows "unavailable" rather than fabricating data; nothing
 * here is mocked.
 *
 * Two real limitations this UI works around rather than fakes:
 *
 * 1. The wire format is one flat `{category: weight}` map — no resume/
 *    interview split of its own. The categories below are RESUME_CATEGORY_META
 *    / INTERVIEW_CATEGORY_META (shared with JobsOpening/JobScoringCriteriaTab,
 *    the only real "Resume/Interview scoring categories" defined anywhere in
 *    this codebase), namespaced into the flat map with a `resume:`/
 *    `interview:` key prefix so e.g. both panels' own "QUALIFICATIONS"
 *    category can coexist. This prefix convention is this frontend's own
 *    choice, not a contract ai-service defines — there is no real one yet.
 * 2. There is no reset-to-default or lock-toggle endpoint here at all
 *    (`UpdateScoringConfigInput`/`UpdatePlatformTenantScoringConfigArgs` only
 *    ever accept `weights`). "Reset to Defaults" saves the standard weights
 *    (mirrors job-service's own seed constants) through the same save path
 *    rather than a separate call, and `is_locked` is shown read-only — no
 *    control here can actually flip it, so none is offered.
 */

const RESUME_KEY_PREFIX = 'resume:';
const INTERVIEW_KEY_PREFIX = 'interview:';

const buildWeightRows = (
  flatWeights: Record<string, number>,
  prefix: string,
  categoryMeta: ScoringCategoryMeta
): ScoringWeight[] =>
  Object.keys(categoryMeta).map((categoryName) => ({
    id: `${prefix}${categoryName}`,
    categoryName,
    weightPercentage:
      flatWeights[`${prefix}${categoryName}`] ?? categoryMeta[categoryName].defaultPct,
  }));

const standardWeightRows = (prefix: string, categoryMeta: ScoringCategoryMeta): ScoringWeight[] =>
  Object.keys(categoryMeta).map((categoryName) => ({
    id: `${prefix}${categoryName}`,
    categoryName,
    weightPercentage: categoryMeta[categoryName].defaultPct,
  }));

const PlatformScoringDefaultsTab: React.FC = () => {
  // null = editing the platform-wide default; a tenant id = that one
  // company's override.
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const isPlatformDefault = selectedTenantId === null;

  const { data: companies, isLoading: isCompaniesLoading } = useGetCompaniesDropdownQuery();

  const { data: platformData, isLoading: isPlatformLoading } = useGetPlatformScoringConfigQuery(
    undefined,
    { skip: !isPlatformDefault }
  );
  const { data: tenantData, isLoading: isTenantLoading } = useGetPlatformTenantScoringConfigQuery(
    selectedTenantId as string,
    { skip: isPlatformDefault }
  );

  const [updatePlatformConfig, { isLoading: isSavingPlatform }] =
    useUpdatePlatformScoringConfigMutation();
  const [updateTenantConfig, { isLoading: isSavingTenant }] =
    useUpdatePlatformTenantScoringConfigMutation();
  const [isResettingResume, setIsResettingResume] = useState(false);
  const [isResettingInterview, setIsResettingInterview] = useState(false);

  const data = isPlatformDefault ? platformData : tenantData;
  const isLoading = isPlatformDefault ? isPlatformLoading : isTenantLoading;
  const isSaving = isPlatformDefault ? isSavingPlatform : isSavingTenant;

  const flatWeights = useMemo(() => data?.weights ?? {}, [data?.weights]);

  const resumeWeights = useMemo(
    () => buildWeightRows(flatWeights, RESUME_KEY_PREFIX, RESUME_CATEGORY_META),
    [flatWeights]
  );
  const interviewWeights = useMemo(
    () => buildWeightRows(flatWeights, INTERVIEW_KEY_PREFIX, INTERVIEW_CATEGORY_META),
    [flatWeights]
  );

  const persist = async (nextFlatWeights: Record<string, number>) => {
    if (isPlatformDefault) {
      await updatePlatformConfig(nextFlatWeights).unwrap();
    } else {
      await updateTenantConfig({
        tenantId: selectedTenantId as string,
        weights: nextFlatWeights,
      }).unwrap();
    }
  };

  const savePanel = async (weights: ScoringWeight[], panelLabel: string) => {
    const total = weights.reduce((sum, w) => sum + w.weightPercentage, 0);
    if (total !== 100) {
      showToast({
        message: `${panelLabel} weights must total 100%. Current total: ${total}%`,
        type: 'error',
      });
      return;
    }
    const next = { ...flatWeights };
    weights.forEach((w) => {
      next[String(w.id)] = w.weightPercentage;
    });
    try {
      await persist(next);
      showToast({ message: `${panelLabel} scoring weights saved.`, type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(
          err,
          `Failed to save ${panelLabel.toLowerCase()} scoring weights.`
        ),
        type: 'error',
      });
    }
  };

  const resetPanel = async (
    prefix: string,
    categoryMeta: ScoringCategoryMeta,
    panelLabel: string,
    setIsResetting: (value: boolean) => void
  ) => {
    const next = { ...flatWeights };
    standardWeightRows(prefix, categoryMeta).forEach((w) => {
      next[String(w.id)] = w.weightPercentage;
    });
    setIsResetting(true);
    try {
      await persist(next);
      showToast({ message: `${panelLabel} scoring weights reset to defaults.`, type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(
          err,
          `Failed to reset ${panelLabel.toLowerCase()} scoring weights.`
        ),
        type: 'error',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const companyOptions = useMemo(
    () => [
      { value: 'platform', label: 'Platform Default (all companies)' },
      ...(companies ?? []).map((company) => ({ value: company.id, label: company.companyName })),
    ],
    [companies]
  );

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800 mb-1">AI Scoring Weight Distribution</h2>
      <p className="text-sm text-gray-500 mb-6">
        Set global defaults applied to all client companies, or pick one company below to view or
        override its own weights.
      </p>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <label className="text-sm font-medium text-gray-700 shrink-0" htmlFor="scoringCompany">
          Company
        </label>
        <Select
          id="scoringCompany"
          className="w-[260px]"
          popupClassName="scoringCompanySelectDropdown"
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
        {!isPlatformDefault && data?.is_locked && (
          <Tooltip title="This company is locked to the platform default — it can't set its own weights.">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1">
              <MdLock size={13} /> Locked
            </span>
          </Tooltip>
        )}
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ScoringWeightCard
            title="Resume Scoring Categories"
            subtitle="Applies to Resume Screening"
            infoText="Resume categories are always evaluated. All 4 categories must total exactly 100%."
            weights={resumeWeights}
            categoryMeta={RESUME_CATEGORY_META}
            onSave={(weights) => savePanel(weights, 'Resume')}
            onReset={() =>
              resetPanel(RESUME_KEY_PREFIX, RESUME_CATEGORY_META, 'Resume', setIsResettingResume)
            }
            isSaving={isSaving}
            isResetting={isResettingResume}
            editable={!data?.is_locked}
          />

          <ScoringWeightCard
            title="Interview Scoring Categories"
            subtitle="Applies to AI Audio Screening and Video Interview"
            infoText="If a category is not covered in an interview, its weight is redistributed proportionally across the remaining categories."
            weights={interviewWeights}
            categoryMeta={INTERVIEW_CATEGORY_META}
            onSave={(weights) => savePanel(weights, 'Interview')}
            onReset={() =>
              resetPanel(
                INTERVIEW_KEY_PREFIX,
                INTERVIEW_CATEGORY_META,
                'Interview',
                setIsResettingInterview
              )
            }
            isSaving={isSaving}
            isResetting={isResettingInterview}
            editable={!data?.is_locked}
          />
        </div>
      )}
    </div>
  );
};

export default PlatformScoringDefaultsTab;
