import React, { useCallback, useEffect, useState } from 'react';
import { Slider } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Button } from './button';
import type { ScoringCategoryMeta } from '../scoringCategories';
import { normalizeScoringWeights } from '../scoringWeight';
import type { ScoringWeight } from '../scoringWeight';

/**
 * The "Resume/Interview Scoring Categories" card - shared across every
 * scoring-weight editing screen.
 */

interface DistributionBarProps {
  weights: ScoringWeight[];
  categoryMeta: ScoringCategoryMeta;
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
              {w.displayName ?? meta?.label ?? w.categoryName}: {w.weightPercentage}%
            </span>
          );
        })}
      </div>
    </div>
  );
};

export interface ScoringWeightCardProps {
  title: string;
  subtitle: string;
  infoText: string;
  weights: ScoringWeight[];
  categoryMeta: ScoringCategoryMeta;
  onSave: (weights: ScoringWeight[]) => Promise<void>;
  onReset: () => Promise<void>;
  isSaving: boolean;
  isResetting: boolean;
  editable: boolean;
}

export const ScoringWeightCard: React.FC<ScoringWeightCardProps> = ({
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
  const [localWeights, setLocalWeights] = useState<ScoringWeight[]>(() =>
    normalizeScoringWeights(weights)
  );
  // Raw typed text for each score input, kept separate from the derived number
  // so a mid-edit empty field survives unrelated re-renders.
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalWeights(normalizeScoringWeights(weights));
    setRawInputs({});
  }, [weights]);

  const total = localWeights.reduce((sum, w) => sum + w.weightPercentage, 0);

  const handleSliderChange = useCallback((id: string | number, value: number) => {
    setLocalWeights((prev) =>
      prev.map((w) => (w.id === id ? { ...w, weightPercentage: value } : w))
    );
  }, []);

  const handleReset = async () => {
    await onReset();
  };

  const handleSave = async () => {
    await onSave(localWeights);
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 flex flex-col gap-4">
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
      <div className="flex items-start gap-2 bg-primary-50 text-primary-700 text-xs rounded-lg px-3 py-2">
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
          // Budget left for this field so the total can't exceed 100.
          const maxForThis = Math.max(0, 100 - (total - w.weightPercentage));
          return (
            <div key={w.id}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {w.displayName ?? meta?.label ?? w.categoryName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {w.description ?? meta?.description ?? ''}
                  </p>
                  <p className="text-xs text-primary-500 mt-0.5">
                    Default: {w.defaultWeightPercentage ?? meta?.defaultPct ?? '-'}%
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={maxForThis}
                  value={rawInputs[String(w.id)] ?? String(w.weightPercentage)}
                  disabled={!editable}
                  onChange={(e) => {
                    // Digits only — blocks negatives/decimals/exponents outright.
                    const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                    if (digitsOnly === '') {
                      setRawInputs((prev) => ({ ...prev, [String(w.id)]: '' }));
                      return;
                    }
                    const val = Math.min(maxForThis, Math.max(0, Number(digitsOnly)));
                    setRawInputs((prev) => ({ ...prev, [String(w.id)]: String(val) }));
                    handleSliderChange(w.id, val);
                  }}
                  onBlur={() => {
                    const key = String(w.id);
                    // Empty on blur commits 0 instead of a stray leftover digit.
                    if (rawInputs[key] === '') {
                      handleSliderChange(w.id, 0);
                    }
                    setRawInputs((prev) => {
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                  }}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className={`ml-4 w-16 text-center text-sm font-semibold border rounded-lg py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
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
                  // Track stays a true 0-100 scale (so a 10% value visibly
                  // fills 10%, not the whole bar) - the cap is enforced
                  // here instead of via `max`, same budget as the input.
                  if (typeof val === 'number') {
                    handleSliderChange(w.id, Math.min(val, maxForThis));
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
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className={`text-xs font-semibold tracking-widest uppercase border px-5 py-1.5 rounded-lg transition-colors cursor-pointer ${
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
            className="bg-button hover:opacity-90 text-white text-sm font-medium px-5 py-1.5 rounded-lg transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
};
