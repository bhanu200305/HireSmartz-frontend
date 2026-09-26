import React, { useEffect, useState } from 'react';
import { Button, Textarea, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useGetTenantCultureIntroQuery,
  useUpdateTenantCultureIntroMutation,
} from '../../api/organization-service/Tenants/cultureIntro';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

/**
 * GET/PUT /v1/tenants/{tenant_id}/culture-intro — a genuinely separate
 * resource from the general Company Details profile (that endpoint's
 * request body has no `culture_intro` field and never did; see
 * CompanyProfileTab.tsx's own history). The script this tenant's AI
 * interviewer reads aloud before the Q&A portion of every AUDIO round —
 * seeded once from the platform default at tenant creation, then owned
 * independently from here on. Same `interview:read`/`interview:write`
 * permission strings InterviewQuestionsTab.tsx already gates on — the
 * backend reuses that pair rather than minting a dedicated one (see
 * organization-service's API_CONTRACT.md notes).
 */
const CultureIntroTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useGetTenantCultureIntroQuery(tenantId);
  const [updateIntro, { isLoading: isSaving }] = useUpdateTenantCultureIntroMutation();
  const canEdit = useHasAccess(Authorities.INTERVIEW_QUESTIONS_EDIT);

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setDraft(data.intro_text);
    }
  }, [data]);

  const isDirty = data !== undefined && draft.trim() !== data.intro_text.trim();

  const handleSave = async () => {
    const text = draft.trim();
    if (!text) {
      showToast({ message: 'The culture intro cannot be empty.', type: 'error' });
      return;
    }
    setError(null);
    try {
      await updateIntro({ tenantId, intro_text: text }).unwrap();
      showToast({ message: 'Culture intro updated.', type: 'success' });
    } catch (err) {
      const message = getOrgErrorMessage(err, 'Failed to update culture intro.');
      setError(message);
      showToast({ message, type: 'error' });
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="p-4">
      <Typography variant="h5" className="mb-1">
        Culture Intro
      </Typography>
      <Typography variant="body2" className="mb-6 block max-w-2xl">
        The opening script your AI interviewer reads aloud before the Q&amp;A in every audio
        interview round.
      </Typography>

      <div className="max-w-2xl">
        <Textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          rows={6}
          disabled={!canEdit}
          className="rounded-2xl text-sm"
          error={error ?? undefined}
        />
        <Typography variant="body2" className="mt-1 text-gray-400">
          Do not include discriminatory, abusive, or hateful language.
        </Typography>
        {canEdit && (
          <div className="flex justify-end mt-3">
            <Button
              className="rounded-full bg-button text-white px-6 py-2 disabled:opacity-50"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CultureIntroTab;
