import { useGetPublicBrandingQuery } from '../api/job-service/PublicCareers/index';

/**
 * Company name/logo for the QR-board pages (CareersListingPage,
 * CareersJobDetailPage, CareersApplyPage) — same organizationId as the
 * page's own route param. Falls back to the plain "CFP" header the pages
 * always showed before this existed, so a lookup failure (unknown org,
 * organization-service unreachable, or a tenant with no logo set) never
 * blocks the page itself from rendering.
 */
export const usePublicCareersBranding = (organizationId: string | undefined) => {
  const { data, isLoading } = useGetPublicBrandingQuery(organizationId ?? '', {
    skip: !organizationId,
  });

  return {
    companyName: data?.company_name ?? null,
    logoUrl: data?.logo_url ?? null,
    isLoading,
  };
};
