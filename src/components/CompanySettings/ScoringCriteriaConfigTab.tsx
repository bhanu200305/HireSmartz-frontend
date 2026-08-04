import React, { useEffect, useState, useCallback } from 'react';
import { Select, Slider, Switch, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { showToast } from '../shared/ui/toast';
import { useGetCompaniesDropdownQuery } from '../../api/tenant-service/Company/companiesDropdown';
import { useGetCompanyDetailsQuery } from '../../api/tenant-service/Company/viewCompany';
import {
  useGetScoringConfigQuery,
  useUpdateScoringConfigMutation,
  useCreateScoringConfigMutation,
  useResetScoringConfigMutation,
  useUpdateAllowCompanyToConfigureScoringMutation,
  useGetDefaultScoringConfigsQuery,
} from '../../api/tenant-service/CompanySettings/scoringConfig';
import type { ScoringWeight } from '../../api/tenant-service/CompanySettings/scoringConfig';
import { Button } from '../shared';

/* ─────────────────────── Constants ─────────────────────── */

const RESUME_CATEGORY_META: Record<
  string,
  { label: string; description: string; defaultPct: number; color: string }
> = {
  SKILLS_MATCH: {
    label: 'Skills Match',
    description: 'Match between candidate skills and JD requirements',
    defaultPct: 30,
    color: '#22c55e',
  },
  EXPERIENCE_MATCH: {
    label: 'Experience Match',
    description: 'Relevance and depth of professional experience',
    defaultPct: 30,
    color: '#6366f1',
  },
  QUALIFICATIONS: {
    label: 'Qualifications',
    description: 'Education, certifications, formal qualifications',
    defaultPct: 20,
    color: '#f97316',
  },
  KEYWORD_PRESENCE: {
    label: 'Keyword Presence',
    description: 'Presence of key JD-specific terms',
    defaultPct: 20,
    color: '#14b8a6',
  },
};

const INTERVIEW_CATEGORY_META: Record<
  string,
  { label: string; description: string; defaultPct: number; color: string }
> = {
  SKILLS: {
    label: 'Skills Match',
    description: 'Technical skills, soft skills, and communication',
    defaultPct: 25,
    color: '#22c55e',
  },
  QUALIFICATIONS: {
    label: 'Qualifications',
    description: 'Education, qualifications, experience',
    defaultPct: 20,
    color: '#6366f1',
  },
  PERSONALITY_TRAITS: {
    label: 'Personality Traits',
    description: 'Behavioral traits, adaptability, teamwork',
    defaultPct: 20,
    color: '#f97316',
  },
  CAREER_GOALS: {
    label: 'Career Goals',
    description: 'Motivation, growth mindset, aspirations',
    defaultPct: 20,
    color: '#22c55e',
  },
  COMPANY_FIT: {
    label: 'Company Fit',
    description: 'Cultural alignment, role understanding',
    defaultPct: 15,
    color: '#f59e0b',
  },
};

/* ─────────────────────── Weight distribution bar ─────────────────────── */

interface DistributionBarProps {
  weights: ScoringWeight[];
  categoryMeta: Record<
    string,
    { label: string; color: string; defaultPct: number; description: string }
  >;
}

const DistributionBar: React.FC<DistributionBarProps> = ({ weights, categoryMeta }) => {
  const total = weights.reduce((sum, w) => sum + w.weightPercentage, 0);

  return (
    <div className="mb-4">
      <div className="flex rounded-full overflow-hidden h-2.5 mb-2">
        {weights.map((w) => {
          const meta = categoryMeta[w.categoryName];
          const pct = total > 0 ? (w.weightPercentage / total) * 100 : 0;
          return (
            <div
              key={w.id}
              style={{ width: `${pct}%`, backgroundColor: meta?.color ?? '#94a3b8' }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {weights.map((w) => {
          const meta = categoryMeta[w.categoryName];
          return (
            <span key={w.id} className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: meta?.color ?? '#94a3b8' }}
              />
              {meta?.label ?? w.categoryName}: {w.weightPercentage}%
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────── Scoring card ─────────────────────── */

interface ScoringCardProps {
  title: string;
  subtitle: string;
  infoText: string;
  weights: ScoringWeight[];
  categoryMeta: Record<
    string,
    { label: string; description: string; defaultPct: number; color: string }
  >;
  defaultWeights?: ScoringWeight[];
  onSave: (weights: ScoringWeight[]) => Promise<void>;
  onReset: () => Promise<void>;
  isSaving: boolean;
  isDefault: boolean;
}

const ScoringCard: React.FC<ScoringCardProps> = ({
  title,
  subtitle,
  infoText,
  weights,
  categoryMeta,
  defaultWeights,
  onSave,
  onReset,
  isSaving,
  isDefault,
}) => {
  const [localWeights, setLocalWeights] = useState<ScoringWeight[]>(weights);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setLocalWeights(weights);
  }, [weights]);

  const total = localWeights.reduce((sum, w) => sum + w.weightPercentage, 0);

  const handleSliderChange = useCallback((id: number, value: number) => {
    setLocalWeights((prev) =>
      prev.map((w) => (w.id === id ? { ...w, weightPercentage: value } : w))
    );
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await onReset();
    } finally {
      setIsResetting(false);
    }
  };

  const handleSave = async () => {
    if (total !== 100) {
      showToast({ message: `Total must equal 100%. Current total: ${total}%`, type: 'error' });
      return;
    }
    await onSave(localWeights);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            total === 100 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'
          }`}
        >
          Total: {total}%
        </span>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 bg-blue-50 text-blue-700 text-xs rounded-lg px-3 py-2">
        <InfoCircleOutlined className="mt-0.5 shrink-0" />
        <span>{infoText}</span>
      </div>

      {/* Distribution bar */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Weight Distribution
        </p>
        <DistributionBar weights={localWeights} categoryMeta={categoryMeta} />
      </div>

      {/* Total warning */}
      {total !== 100 && (
        <div className="flex items-start gap-2 bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2 border border-red-200">
          <InfoCircleOutlined className="mt-0.5 shrink-0" />
          <span>
            {total < 100
              ? 'Total weight is less than 100%. Increase one or more category weights to continue.'
              : 'Total weight exceeds 100%. Reduce one or more category weights to continue.'}
          </span>
        </div>
      )}

      {/* Sliders */}
      <div className="flex flex-col gap-5">
        {localWeights.map((w) => {
          const meta = categoryMeta[w.categoryName];
          return (
            <div key={w.id}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {meta?.label ?? w.categoryName}
                  </p>
                  <p className="text-xs text-gray-400">{meta?.description ?? ''}</p>
                  <p className="text-xs text-blue-500 mt-0.5">
                    Default:{' '}
                    {defaultWeights?.find((d) => d.categoryName === w.categoryName)
                      ?.weightPercentage ??
                      meta?.defaultPct ??
                      '—'}
                    %
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={w.weightPercentage}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, Number(e.target.value)));
                    handleSliderChange(w.id, val);
                  }}
                  className="ml-4 w-16 text-center text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={w.weightPercentage}
                onChange={(val) => handleSliderChange(w.id, val)}
                trackStyle={{ backgroundColor: meta?.color ?? '#6366f1' }}
                handleStyle={{ borderColor: meta?.color ?? '#6366f1' }}
                tooltip={{ formatter: (val) => `${val}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          onClick={handleReset}
          disabled={isDefault || isResetting}
          className={`text-xs font-semibold tracking-widest uppercase border px-5 py-1.5 rounded-lg transition-colors ${
            isDefault || isResetting
              ? 'text-gray-300 border-gray-200 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400'
          }`}
        >
          {isResetting ? 'Resetting…' : 'Reset to Defaults'}
        </button>
        <Button
          onClick={handleSave}
          disabled={total !== 100 || isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-1.5 rounded-lg transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
};

/* ─────────────────────── Main Tab ─────────────────────── */

const ScoringCriteriaConfigTab: React.FC = () => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [allowConfigure, setAllowConfigure] = useState(false);
  const [isTogglingAllow, setIsTogglingAllow] = useState(false);

  const { data: companiesData } = useGetCompaniesDropdownQuery();

  const companyOptions = (companiesData ?? [])
    .filter((c) => c.owner === false)
    .map((c) => ({
      label: c.companyName,
      value: c.id,
    }));

  /* ── Fetch company details (for isScoringConfigEditable init) ── */
  const { data: companyDetails } = useGetCompanyDetailsQuery(
    { companyId: selectedCompanyId! },
    { skip: !selectedCompanyId }
  );

  useEffect(() => {
    if (companyDetails) {
      setAllowConfigure(
        companyDetails.scoringConfigEditable ?? companyDetails.isScoringConfigEditable ?? false
      );
    }
  }, [companyDetails]);

  /* ── Fetch resume & interview configs ── */
  const { data: resumeData, isLoading: resumeLoading } = useGetScoringConfigQuery(
    { companyId: selectedCompanyId!, stage: 'RESUME' },
    { skip: !selectedCompanyId }
  );

  const { data: interviewData, isLoading: interviewLoading } = useGetScoringConfigQuery(
    { companyId: selectedCompanyId!, stage: 'INTERVIEW' },
    { skip: !selectedCompanyId }
  );

  /* ── Fetch default weights ── */
  const { data: defaultsData } = useGetDefaultScoringConfigsQuery();

  const [updateConfig, { isLoading: isSavingResume }] = useUpdateScoringConfigMutation();
  const [updateInterviewConfig, { isLoading: isSavingInterview }] =
    useUpdateScoringConfigMutation();
  const [createConfig] = useCreateScoringConfigMutation();
  const [createInterviewConfig] = useCreateScoringConfigMutation();
  const [resetConfig] = useResetScoringConfigMutation();
  const [resetInterviewConfig] = useResetScoringConfigMutation();
  const [updateAllowConfig] = useUpdateAllowCompanyToConfigureScoringMutation();

  const handleToggleAllow = useCallback(
    async (checked: boolean) => {
      if (!selectedCompanyId) return;
      setIsTogglingAllow(true);
      try {
        await updateAllowConfig({
          companyId: selectedCompanyId,
          isScoringConfigEditable: checked,
        }).unwrap();
        setAllowConfigure(checked);
        showToast({
          message: checked
            ? 'Company can now configure their own scoring criteria.'
            : 'Company scoring criteria configuration has been disabled.',
          type: 'success',
        });
      } catch {
        showToast({ message: 'Failed to update scoring configuration permission.', type: 'error' });
      } finally {
        setIsTogglingAllow(false);
      }
    },
    [selectedCompanyId, updateAllowConfig]
  );

  const handleResetResume = useCallback(async () => {
    if (!resumeData?.data || resumeData.data.isDefault) return;
    try {
      await resetConfig({ id: resumeData.data.id }).unwrap();
      showToast({ message: 'Resume scoring configuration reset to default.', type: 'success' });
    } catch {
      showToast({ message: 'Failed to reset resume scoring configuration.', type: 'error' });
    }
  }, [resumeData, resetConfig]);

  const handleResetInterview = useCallback(async () => {
    if (!interviewData?.data || interviewData.data.isDefault) return;
    try {
      await resetInterviewConfig({ id: interviewData.data.id }).unwrap();
      showToast({ message: 'Interview scoring configuration reset to default.', type: 'success' });
    } catch {
      showToast({ message: 'Failed to reset interview scoring configuration.', type: 'error' });
    }
  }, [interviewData, resetInterviewConfig]);

  const handleSaveResume = useCallback(
    async (weights: ScoringWeight[]) => {
      if (!resumeData?.data) return;
      try {
        if (resumeData.data.isDefault) {
          await createConfig({
            companyId: selectedCompanyId!,
            stage: 'RESUME',
            weights,
          }).unwrap();
        } else {
          await updateConfig({
            id: resumeData.data.id,
            companyId: resumeData.data.companyId,
            stage: resumeData.data.stage,
            weights,
          }).unwrap();
        }
        showToast({ message: 'Resume scoring configuration saved successfully.', type: 'success' });
      } catch {
        showToast({ message: 'Failed to save resume scoring configuration.', type: 'error' });
      }
    },
    [resumeData, selectedCompanyId, createConfig, updateConfig]
  );

  const handleSaveInterview = useCallback(
    async (weights: ScoringWeight[]) => {
      if (!interviewData?.data) return;
      try {
        if (interviewData.data.isDefault) {
          await createInterviewConfig({
            companyId: selectedCompanyId!,
            stage: 'INTERVIEW',
            weights,
          }).unwrap();
        } else {
          await updateInterviewConfig({
            id: interviewData.data.id,
            companyId: interviewData.data.companyId,
            stage: interviewData.data.stage,
            weights,
          }).unwrap();
        }
        showToast({
          message: 'Interview scoring configuration saved successfully.',
          type: 'success',
        });
      } catch {
        showToast({ message: 'Failed to save interview scoring configuration.', type: 'error' });
      }
    },
    [interviewData, selectedCompanyId, createInterviewConfig, updateInterviewConfig]
  );

  return (
    <div className="py-4">
      {/* Page heading */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-1">
        AI Scoring Weight Distribution For Company
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Set global defaults applied to all client companies. Companies can override these unless
        locked.
      </p>

      {/* Company selector + toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Company</label>
          <Select
            showSearch
            placeholder="Select a company"
            options={companyOptions}
            value={selectedCompanyId}
            onChange={(val: number) => setSelectedCompanyId(val)}
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            className="w-48"
          />
        </div>

        {selectedCompanyId && companyDetails && (
          <div className="flex items-center gap-2">
            <Tooltip title="Allow the selected company to modify their own scoring criteria">
              <Switch
                checked={allowConfigure}
                onChange={handleToggleAllow}
                loading={isTogglingAllow}
                className={allowConfigure ? 'bg-blue-600' : ''}
              />
            </Tooltip>
            <span className="text-sm text-gray-600">
              Allow Company to Configure Scoring Criteria
            </span>
          </div>
        )}
      </div>

      {!selectedCompanyId && (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          Select a company above to load its scoring configuration.
        </div>
      )}

      {selectedCompanyId && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Resume card */}
          {resumeLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-64 text-gray-400">
              Loading resume configuration…
            </div>
          ) : resumeData?.data ? (
            <ScoringCard
              title="Resume Scoring Categories"
              subtitle="Applies to Resume Screening"
              infoText="Resume categories are always evaluated. All resume category weights must total 100%."
              weights={resumeData.data.weights}
              categoryMeta={RESUME_CATEGORY_META}
              defaultWeights={defaultsData?.data?.resume?.weights}
              onSave={handleSaveResume}
              onReset={handleResetResume}
              isSaving={isSavingResume}
              isDefault={resumeData.data.isDefault}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-400 text-sm flex items-center justify-center h-40">
              No resume scoring configuration found.
            </div>
          )}

          {/* Interview card */}
          {interviewLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-64 text-gray-400">
              Loading interview configuration…
            </div>
          ) : interviewData?.data ? (
            <ScoringCard
              title="Interview Scoring Categories"
              subtitle="Applies to AI Audio Screening and Video Interview"
              infoText="All interview category weights must total 100%. If a category is not covered in an interview, its weight is redistributed proportionally across the remaining categories."
              weights={interviewData.data.weights}
              categoryMeta={INTERVIEW_CATEGORY_META}
              defaultWeights={defaultsData?.data?.interview?.weights}
              onSave={handleSaveInterview}
              onReset={handleResetInterview}
              isSaving={isSavingInterview}
              isDefault={interviewData.data.isDefault}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-400 text-sm flex items-center justify-center h-40">
              No interview scoring configuration found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScoringCriteriaConfigTab;
