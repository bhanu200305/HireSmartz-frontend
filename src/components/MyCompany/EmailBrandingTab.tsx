import React from 'react';
import { useSelector } from 'react-redux';
import { EmailBrandingEditor, Typography } from '../shared';
import { RootState } from '../../redux/provider/store';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

/**
 * Company Admin's self-service version of `CompanySettings/EmailTemplateConfigAdminTab.tsx`
 * (Super Admin's own version, which picks any company) — no picker here,
 * always the caller's own tenant. `EmailBrandingEditor`'s `companyId` prop
 * is the same tenant UUID this session already uses everywhere else (see
 * that component's own docstring for why the legacy backend already
 * accepts it with no changes needed). Reuses `EMAIL_TEMPLATE_EDIT`, the
 * same permission this whole "Email Templates" tab already gates its other
 * sections on.
 */
const EmailBrandingTab: React.FC = () => {
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const canEdit = useHasAccess(Authorities.EMAIL_TEMPLATE_EDIT);

  if (!tenantId) return null;

  return (
    <section className="mt-8 pt-8 border-t border-[var(--border)]">
      <Typography variant="h6" className="mb-1 block">
        Candidate Email Branding
      </Typography>
      <Typography variant="caption" className="mb-4 block text-gray-500">
        Banner and colors used in candidate-facing recruiting emails (interview invites, scheduling
        links) — separate from the notification copy above.
      </Typography>

      <EmailBrandingEditor companyId={tenantId} editable={canEdit} />
    </section>
  );
};

export default EmailBrandingTab;
