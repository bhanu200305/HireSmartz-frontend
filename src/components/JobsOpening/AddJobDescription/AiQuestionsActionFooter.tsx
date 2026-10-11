import React from 'react';
import { Tooltip } from 'antd';
import { Button } from '../../shared';
import JobActionFooter from './JobActionFooter';

export interface AiQuestionsActionFooterProps {
  canPublishHere: boolean;
  isEditingAlreadyPublishedJob: boolean;
  isLastSection: boolean;
  isPublishing: boolean;
  activeJobOpeningId: string | number | null | undefined;
  publishDisabledReason?: string | null;
  onSaveDraft: () => void;
  onCancel: () => void;
  onSaveAndNext: () => void | Promise<void>;
  onPublishOrFinish: () => void | Promise<void>;
}

export const AiQuestionsActionFooter: React.FC<AiQuestionsActionFooterProps> = ({
  canPublishHere,
  isEditingAlreadyPublishedJob,
  isLastSection,
  isPublishing,
  activeJobOpeningId,
  publishDisabledReason,
  onSaveDraft,
  onCancel,
  onSaveAndNext,
  onPublishOrFinish,
}) => {
  const isVisible = !isLastSection || canPublishHere;

  if (!isVisible) {
    return null;
  }

  return (
    <JobActionFooter label="Questions actions">
      {/* Tertiary: Cancel (destructive action, visually de-emphasized with warning hover) */}
      {canPublishHere && !isEditingAlreadyPublishedJob && (
        <Tooltip title="Delete this job opening and everything in it.">
          <Button
            type="button"
            className="border border-neutral-300 bg-white text-neutral-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 rounded-full px-5 py-2 text-sm font-medium transition-colors cursor-pointer flex items-center justify-center"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </Tooltip>
      )}

      {canPublishHere && !isEditingAlreadyPublishedJob && (
        <Tooltip title="Save progress and come back later.">
          <Button
            type="button"
            className="bg-primary hover:bg-brand-700 text-white rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-colors cursor-pointer flex items-center justify-center"
            onClick={onSaveDraft}
          >
            Save As Draft
          </Button>
        </Tooltip>
      )}

      {/* Primary: Save & Next OR Publish Job Opening / Save & Finish (solid brand fill) */}
      {!isLastSection ? (
        <Tooltip title="Questions are saved. Continue to the next round.">
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-white rounded-full px-5 py-2 text-sm font-semibold shadow-xs hover:shadow transition-all cursor-pointer flex items-center justify-center"
            onClick={() => void onSaveAndNext()}
          >
            Save &amp; Next
          </Button>
        </Tooltip>
      ) : (
        <Tooltip
          title={
            publishDisabledReason ??
            (isEditingAlreadyPublishedJob
              ? 'Save changes to this published job.'
              : 'Publish this job opening live.')
          }
        >
          <span className="block sm:inline-block">
            <Button
              type="button"
              className="bg-primary hover:bg-primary-hover text-white rounded-full px-5 py-2 text-sm font-semibold shadow-xs hover:shadow transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => void onPublishOrFinish()}
              disabled={isPublishing || !activeJobOpeningId || !!publishDisabledReason}
            >
              {isPublishing
                ? 'Publishing…'
                : isEditingAlreadyPublishedJob
                  ? 'Save & Finish'
                  : 'Publish Job Opening'}
            </Button>
          </span>
        </Tooltip>
      )}
    </JobActionFooter>
  );
};

export default AiQuestionsActionFooter;
