import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Select, Switch, Tooltip } from 'antd';
import { MdLock } from 'react-icons/md';
import { ScoringWeightCard, showToast, toOptionalWeight } from '../shared';
import type { ScoringWeight } from '../shared';
import { Loader } from '../shared/ui/loader';
import { RESUME_CATEGORY_META, INTERVIEW_CATEGORY_META } from '../shared/scoringCategories';
import {
  masterScoringCategoriesApi,
  useListMasterScoringCategoriesQuery,
  useSaveMasterScoringCategoryWeightsMutation,
} from '../../api/job-service/Platform/masterScoringCategories';
import {
  organizationScoringConfigApi,
  useGetPlatformOrganizationScoringCriteriaQuery,
  useResetPlatformOrganizationScoringCriteriaMutation,
  useSavePlatformOrganizationScoringCriteriaMutation,
  useSetOrganizationScoringLockMutation,
} from '../../api/job-service/JobOpening/organizationScoringConfig';
import type {
  CategoryWeightOverride,
  MasterScoringCategory,
  OrganizationScoringCriteriaResponse,
} from '../../api/job-service/types';
import { useGetCompaniesDropdownQuery } from '../../api/tenant-service/Company/companiesDropdown';
import { getJobErrorMessage } from '../../shared/utils/auth/jobError.helpers';
import { AppDispatch } from '../../redux/provider/store';

/**
 * Two data sources: "Platform Default" edits master_scoring_category
 * weights directly; a picked company edits that tenant's own override.
 */

const toMasterWeights = (categories: MasterScoringCategory[] | undefined): ScoringWeight[] =>
  (categories ?? []).map((c) => ({
    id: c.category_code,
    categoryName: c.category_code,
    displayName: c.display_name,
    description: c.description,
    weightPercentage: Number(c.default_weight_pct),
    defaultWeightPercentage: toOptionalWeight(c.default_weight_pct),
  }));

const toTenantWeights = (
  panel: OrganizationScoringCriteriaResponse['resume'] | undefined
): ScoringWeight[] =>
  (panel?.weights ?? []).map((w) => ({
    id: w.category_code,
    categoryName: w.category_code,
    displayName: w.display_name,
    description: w.description,
    weightPercentage: Number(w.weight_pct),
    defaultWeightPercentage: toOptionalWeight(w.default_weight_pct),
  }));

const toOverrides = (weights: ScoringWeight[]): CategoryWeightOverride[] =>
  weights.map((w) => ({ category_code: w.categoryName, weight_pct: w.weightPercentage }));

const PlatformScoringDefaultsTab: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  // null = editing the platform-wide default; a tenant id = that one
  // company's override.
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const isPlatformDefault = selectedTenantId === null;

  const { data: companies, isLoading: isCompaniesLoading } = useGetCompaniesDropdownQuery();

  const { data: platformResume, isLoading: isPlatformResumeLoading } =
    useListMasterScoringCategoriesQuery('RESUME', { skip: !isPlatformDefault });
  const { data: platformInterview, isLoading: isPlatformInterviewLoading } =
    useListMasterScoringCategoriesQuery('INTERVIEW', { skip: !isPlatformDefault });
  const { data: tenantData, isLoading: isTenantLoading } =
    useGetPlatformOrganizationScoringCriteriaQuery(selectedTenantId as string, {
      skip: isPlatformDefault,
    });

  const [saveMasterWeights, { isLoading: isSavingMaster }] =
    useSaveMasterScoringCategoryWeightsMutation();
  const [saveTenantScoring, { isLoading: isSavingTenant }] =
    useSavePlatformOrganizationScoringCriteriaMutation();
  const [resetTenantScoring, { isLoading: isResettingTenant }] =
    useResetPlatformOrganizationScoringCriteriaMutation();
  const [setLock, { isLoading: isTogglingLock }] = useSetOrganizationScoringLockMutation();

  const [savingSection, setSavingSection] = useState<'resume' | 'interview' | null>(null);

  const isLoading = isPlatformDefault
    ? isPlatformResumeLoading || isPlatformInterviewLoading
    : isTenantLoading;
  const isSaving = isPlatformDefault ? isSavingMaster : isSavingTenant;

  const resumeWeights = useMemo(
    () =>
      isPlatformDefault ? toMasterWeights(platformResume) : toTenantWeights(tenantData?.resume),
    [isPlatformDefault, platformResume, tenantData]
  );
  const interviewWeights = useMemo(
    () =>
      isPlatformDefault
        ? toMasterWeights(platformInterview)
        : toTenantWeights(tenantData?.interview),
    [isPlatformDefault, platformInterview, tenantData]
  );

  const patchTenantCache = useCallback(
    (result: OrganizationScoringCriteriaResponse) => {
      dispatch(
        organizationScoringConfigApi.util.updateQueryData(
          'getPlatformOrganizationScoringCriteria',
          selectedTenantId as string,
          () => result
        )
      );
    },
    [dispatch, selectedTenantId]
  );

  const savePanel = async (
    weights: ScoringWeight[],
    panelLabel: string,
    stage: 'RESUME' | 'INTERVIEW',
    section: 'resume' | 'interview'
  ) => {
    const total = weights.reduce((sum, w) => sum + w.weightPercentage, 0);
    if (total !== 100) {
      showToast({
        message: `${panelLabel} weights must total 100%. Current total: ${total}%`,
        type: 'error',
      });
      return;
    }
    setSavingSection(section);
    try {
      if (isPlatformDefault) {
        const result = await saveMasterWeights({
          stage,
          weights: weights.map((w) => ({
            category_code: w.categoryName,
            weight_pct: w.weightPercentage,
          })),
        }).unwrap();
        dispatch(
          masterScoringCategoriesApi.util.updateQueryData(
            'listMasterScoringCategories',
            stage,
            () => result
          )
        );
      } else {
        const result = await saveTenantScoring({
          organizationId: selectedTenantId as string,
          resume_weights: toOverrides(section === 'resume' ? weights : resumeWeights),
          interview_weights: toOverrides(section === 'interview' ? weights : interviewWeights),
        }).unwrap();
        patchTenantCache(result);
      }
      showToast({ message: `${panelLabel} scoring weights saved.`, type: 'success' });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(
          err,
          `Failed to save ${panelLabel.toLowerCase()} scoring weights.`
        ),
        type: 'error',
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleToggleLock = async (nextLocked: boolean) => {
    if (isPlatformDefault) return;
    try {
      await setLock({
        organizationId: selectedTenantId as string,
        stage: 'INTERVIEW',
        is_locked: nextLocked,
      }).unwrap();
      await setLock({
        organizationId: selectedTenantId as string,
        stage: 'RESUME',
        is_locked: nextLocked,
      }).unwrap();
      dispatch(
        organizationScoringConfigApi.util.invalidateTags([
          { type: 'PlatformOrganizationScoringCriteria', id: selectedTenantId as string },
        ])
      );
      showToast({
        message: nextLocked
          ? 'Company locked to its current weights.'
          : 'Company unlocked; it can set its own weights again.',
        type: 'success',
      });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to update lock state.'),
        type: 'error',
      });
    }
  };

  const handleReset = async (section: 'resume' | 'interview') => {
    if (isPlatformDefault) {
      showToast({
        message: 'This is the platform default; there is nothing to reset it to.',
        type: 'info',
      });
      return;
    }
    setSavingSection(section);
    try {
      const result = await resetTenantScoring({
        organizationId: selectedTenantId as string,
      }).unwrap();
      patchTenantCache(result);
      showToast({ message: 'Scoring weights reset to platform defaults.', type: 'success' });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to reset scoring weights.'),
        type: 'error',
      });
    } finally {
      setSavingSection(null);
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
      <h2 className="text-2xl font-semibold text-gray-800 mb-1">Scoring Weight Distribution</h2>
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
          className="w-full sm:w-[260px]"
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
        {!isPlatformDefault && !isLoading && (
          <Tooltip title="Locked means this company can't edit its own weights; only Super Admin can change them here.">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1">
              <MdLock size={13} />
              Locked
              <Switch
                size="small"
                checked={Boolean(tenantData?.is_locked)}
                loading={isTogglingLock}
                onChange={handleToggleLock}
              />
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
            infoText="Resume categories are always evaluated. All categories must total exactly 100%."
            weights={resumeWeights}
            categoryMeta={RESUME_CATEGORY_META}
            onSave={(weights) => savePanel(weights, 'Resume', 'RESUME', 'resume')}
            onReset={() => handleReset('resume')}
            isSaving={isSaving && savingSection === 'resume'}
            isResetting={isResettingTenant && savingSection === 'resume'}
            editable={isPlatformDefault || !tenantData?.is_locked}
          />

          <ScoringWeightCard
            title="Interview Scoring Categories"
            subtitle="Applies to AI Audio Screening and Video Interview"
            infoText="If a category is not covered in an interview, its weight is redistributed proportionally across the remaining categories."
            weights={interviewWeights}
            categoryMeta={INTERVIEW_CATEGORY_META}
            onSave={(weights) => savePanel(weights, 'Interview', 'INTERVIEW', 'interview')}
            onReset={() => handleReset('interview')}
            isSaving={isSaving && savingSection === 'interview'}
            isResetting={isResettingTenant && savingSection === 'interview'}
            editable={isPlatformDefault || !tenantData?.is_locked}
          />
        </div>
      )}
    </div>
  );
};

export default PlatformScoringDefaultsTab;
