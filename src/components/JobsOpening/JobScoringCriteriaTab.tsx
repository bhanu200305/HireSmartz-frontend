import React, { useEffect, useState, useCallback } from 'react';
import { Slider } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { showToast } from '../shared/ui/toast';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import { safeDecodeToken } from '../../shared/utils/methods';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import {
  useGetJobScoringConfigQuery,
  useUpdateJobScoringConfigMutation,
  useResetJobScoringConfigMutation,
} from '../../api/job-service/JobOpening/jobScoringConfig';
import type { JobScoringWeight } from '../../api/job-service/JobOpening/jobScoringConfig';
import { useNavigate } from 'react-router-dom';
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

const clampWeight = (value: unknown): number => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return 0;
  if (normalized < 0) return 0;
  if (normalized > 100) return 100;
  return normalized;
};

const normalizeWeights = (weights: unknown): JobScoringWeight[] => {
  if (!Array.isArray(weights)) return [];

  return weights
    .map((item, index) => {
      if (!item || typeof item !== 'object') return undefined;

      const candidate = item as Partial<JobScoringWeight>;
      const id = Number(candidate.id);
      const categoryName =
        typeof candidate.categoryName === 'string' ? candidate.categoryName : `CATEGORY_${index}`;

      return {
        id: Number.isFinite(id) ? id : index + 1,
        categoryName,
        weightPercentage: clampWeight(candidate.weightPercentage),
      } as JobScoringWeight;
    })
    .filter((weight): weight is JobScoringWeight => Boolean(weight));
};

/* ─────────────────────── Distribution bar ─────────────────────── */

interface DistributionBarProps {
  weights: JobScoringWeight[];
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
        {weights?.map((w) => {
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
        {weights?.map((w) => {
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
  weights: JobScoringWeight[];
  categoryMeta: Record<
    string,
    { label: string; description: string; defaultPct: number; color: string }
  >;
  onSave: (weights: JobScoringWeight[]) => Promise<void>;
  onReset: () => Promise<void>;
  isSaving: boolean;
  isResetting: boolean;
  editable: boolean;
}

const ScoringCard: React.FC<ScoringCardProps> = ({
  title,
  subtitle,
  infoText,
  weights,
  categoryMeta,
  onSave,
  onReset,
  isSaving,
  isResetting,
  editable,
}) => {
  const [localWeights, setLocalWeights] = useState<JobScoringWeight[]>(() =>
    normalizeWeights(weights)
  );

  useEffect(() => {
    setLocalWeights(normalizeWeights(weights));
  }, [weights]);

  const total = localWeights.reduce((sum, w) => sum + w.weightPercentage, 0);

  const handleSliderChange = useCallback((id: number, value: number) => {
    setLocalWeights((prev) =>
      prev.map((w) => (w.id === id ? { ...w, weightPercentage: value } : w))
    );
  }, []);

  const handleReset = async () => {
    try {
      await onReset();
    } catch {
      // Fallback to local reset on failure
      setLocalWeights(
        weights.map((w) => ({
          ...w,
          weightPercentage: categoryMeta[w.categoryName]?.defaultPct ?? w.weightPercentage,
        }))
      );
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
      <div className="flex items-start gap-2 bg-brand-50 text-brand-700 text-xs rounded-lg px-3 py-2">
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
                  <p className="text-xs text-brand-500 mt-0.5">
                    Default: {meta?.defaultPct ?? '—'}%
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={w.weightPercentage}
                  disabled={!editable}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, Number(e.target.value)));
                    handleSliderChange(w.id, val);
                  }}
                  className={`ml-4 w-16 text-center text-sm font-semibold border rounded-lg py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    editable
                      ? 'text-gray-700 border-gray-200'
                      : 'text-gray-400 border-gray-100 bg-gray-50 cursor-not-allowed'
                  }`}
                />
              </div>
              <Slider
                min={0}
                max={100}
                value={w.weightPercentage}
                disabled={!editable}
                onChange={(val) => {
                  if (typeof val === 'number') {
                    handleSliderChange(w.id, val);
                  }
                }}
                trackStyle={{ backgroundColor: meta?.color ?? '#6366f1' }}
                handleStyle={{ borderColor: meta?.color ?? '#6366f1' }}
                tooltip={{ formatter: (val) => `${val}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Footer actions — hidden in view/read-only mode */}
      {editable && (
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className={`text-xs font-semibold tracking-widest uppercase border px-5 py-1.5 rounded-lg transition-colors ${
              isResetting
                ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400'
            }`}
          >
            {isResetting ? 'Resetting...' : 'Reset to Defaults'}
          </button>
          <Button
            onClick={handleSave}
            disabled={total !== 100 || isSaving}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-1.5 rounded-lg transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────── Main component ─────────────────────── */

interface JobScoringCriteriaTabProps {
  jobId: number;
  isViewMode?: boolean;
}

const JobScoringCriteriaTab: React.FC<JobScoringCriteriaTabProps> = ({
  jobId,
  isViewMode = false,
}) => {
  const { loginToken } = useSelector((state: RootState) => state.LoginSlice, shallowEqual);
  const tokenFromStorage = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) as string | null;
  const authToken = loginToken || tokenFromStorage;
  const decodedToken = safeDecodeToken<{ isScoringConfigEditable?: boolean }>(authToken);
  const isTokenEditable = decodedToken?.isScoringConfigEditable ?? false;

  // Editable only in create/edit mode AND token allows it
  const navigate = useNavigate();
  const isEditable = !isViewMode && isTokenEditable;

  const { data: jobScoringData, isLoading } = useGetJobScoringConfigQuery(jobId, {
    skip: !jobId,
  });

  const [updateResume, { isLoading: isSavingResume }] = useUpdateJobScoringConfigMutation();
  const [updateInterview, { isLoading: isSavingInterview }] = useUpdateJobScoringConfigMutation();
  const [resetResume, { isLoading: isResettingResume }] = useResetJobScoringConfigMutation();
  const [resetInterview, { isLoading: isResettingInterview }] = useResetJobScoringConfigMutation();

  const handleSaveResume = useCallback(
    async (weights: JobScoringWeight[]) => {
      try {
        await updateResume({ jobId, stage: 'RESUME', weights }).unwrap();
        showToast({ message: 'Resume scoring configuration saved successfully.', type: 'success' });
      } catch {
        showToast({ message: 'Failed to save resume scoring configuration.', type: 'error' });
      }
    },
    [jobId, updateResume]
  );

  const handleSaveInterview = useCallback(
    async (weights: JobScoringWeight[]) => {
      try {
        await updateInterview({ jobId, stage: 'INTERVIEW', weights }).unwrap();
        showToast({
          message: 'Interview scoring configuration saved successfully.',
          type: 'success',
        });
      } catch {
        showToast({ message: 'Failed to save interview scoring configuration.', type: 'error' });
      }
    },
    [jobId, updateInterview]
  );

  const handleResetResume = useCallback(async () => {
    try {
      const res = await resetResume({ jobId, stage: 'RESUME' }).unwrap();
      showToast({
        message: res?.message || 'Resume scoring configuration reset successfully.',
        type: 'success',
      });
    } catch {
      showToast({ message: 'Failed to reset resume scoring configuration.', type: 'error' });
    }
  }, [jobId, resetResume]);

  const handleResetInterview = useCallback(async () => {
    try {
      const res = await resetInterview({ jobId, stage: 'INTERVIEW' }).unwrap();
      showToast({
        message: res?.message || 'Interview scoring configuration reset successfully.',
        type: 'success',
      });
    } catch {
      showToast({ message: 'Failed to reset interview scoring configuration.', type: 'error' });
    }
  }, [jobId, resetInterview]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading scoring configuration...
      </div>
    );
  }

  if (!jobScoringData?.data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No scoring configuration found for this job.
      </div>
    );
  }

  const resumeWeights = normalizeWeights(jobScoringData?.data?.resumeConfig?.weights);
  const interviewWeights = normalizeWeights(jobScoringData?.data?.interviewConfig?.weights);

  if (!resumeWeights.length && !interviewWeights.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Scoring configuration is unavailable for this job.
      </div>
    );
  }

  return (
    <div className="py-4">
      <h2 className="text-2xl font-semibold text-gray-800 mb-1">AI Scoring Weight Distribution</h2>
      <p className="text-sm text-gray-500 mb-6">
        {isEditable
          ? 'Customize scoring weights for this specific job opening.'
          : 'Scoring weights configured for this job opening.'}
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ScoringCard
          title="Resume Scoring Categories"
          subtitle="Applies to Resume Screening"
          infoText="Resume categories are always evaluated. All 4 categories must total exactly 100%."
          weights={resumeWeights}
          categoryMeta={RESUME_CATEGORY_META}
          onSave={handleSaveResume}
          onReset={handleResetResume}
          isSaving={isSavingResume}
          isResetting={isResettingResume}
          editable={isEditable}
        />

        <ScoringCard
          title="Interview Scoring Categories"
          subtitle="Applies to AI Audio Screening and Video Interview"
          infoText="If a category is not covered in an interview, its weight is redistributed proportionally"
          weights={interviewWeights}
          categoryMeta={INTERVIEW_CATEGORY_META}
          onSave={handleSaveInterview}
          onReset={handleResetInterview}
          isSaving={isSavingInterview}
          isResetting={isResettingInterview}
          editable={isEditable}
        />
      </div>

      {!isViewMode && (
        <div className="mt-8 flex justify-center">
          <Button
            className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
            onClick={() => navigate('/jobs')}
          >
            SAVE &amp; NEXT
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobScoringCriteriaTab;
