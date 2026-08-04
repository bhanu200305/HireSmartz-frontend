import { useGetPublicEmailTemplateConfigQuery } from '../api/candidate-service/PublicQr/index';

const LOGO_BASE_URL = `${import.meta.env.VITE_BACKEND_ENDPOINT}/v1`;

export interface PublicBrandingResult {
  bannerUrl: string | null;
  primaryColor: string | null;
  /** Inline style to apply to the header element (replaces bg-black) */
  headerStyle: React.CSSProperties;
}

export const usePublicBranding = (companyId: number | null | undefined): PublicBrandingResult => {
  const { data } = useGetPublicEmailTemplateConfigQuery(companyId as number, {
    skip: !companyId,
  });

  // Company logo endpoint returns raw binary PNG — use URL directly as img src
  const bannerUrl = companyId
    ? `${LOGO_BASE_URL}/orguserservice/companies/public/preview/companyLogo?companyId=${companyId}`
    : null;

  const primaryColor = data?.themeConfig?.primaryColor ?? null;

  return {
    bannerUrl,
    primaryColor,
    headerStyle: { backgroundColor: primaryColor ?? '#000000' },
  };
};
