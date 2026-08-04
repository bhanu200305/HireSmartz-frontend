import { api } from '../../index';

export interface InlineImageConfig {
  cid: string;
  url: string;
}

export interface ThemeConfigResponse {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  titleColor: string;
  greetingColor: string;
  buttonBackground: string;
  buttonText: string;
  buttonBorderColor: string;
  buttonBorderRadius: string;
  highlightBackground: string;
  highlightText: string;
  footerBackground: string;
  footerText: string;
  actionButtonText: string;
  actionButtonBackground: string;
  actionButtonBorderColor: string;
  actionButtonBorderRadius: string;
  tableHeaderBackground: string | null;
  tableHeaderText: string | null;
}

export interface EmailTemplateConfigResponse {
  id: number;
  companyId: number;
  template: string;
  enabled: boolean;
  inlineImages: {
    bannerCid?: InlineImageConfig;
    [key: string]: InlineImageConfig | undefined;
  };
  themeConfig: ThemeConfigResponse;
}

export interface SaveEmailTemplateConfigRequest {
  companyId: number;
  template: string;
  enabled: boolean;
  themeConfig: Record<string, string>;
  bannerFile?: File;
}

/* ── Push-to-tenants types ─────────────────────────────────── */
export interface PushTemplateAction {
  templateId: number;
  name: string;
  alias: string;
  action: string;
}

export interface ImpactedTenant {
  companyId: number;
  companyName: string;
  message: string;
}

export interface PushToTenantsResponse {
  success: boolean;
  message: string;
  data: {
    requiresConfirmation: boolean;
    impactedTenants: ImpactedTenant[] | null;
    pushResult: {
      totalAffected: number;
      templateActions: PushTemplateAction[];
    } | null;
  };
}

export interface PushToTenantsRequest {
  companyIds: number[];
  performChanges: boolean;
  confirmed: boolean;
}

/** GET /mail/template-config/templates/generic-candidate-email?companyId=… */
export interface GenericCandidateEmailTemplateData {
  Name: string;
  Alias: string;
  Subject: string;
  HtmlBody: string;
  TextBody: string;
}

export interface GenericCandidateEmailTemplateApiResponse {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: GenericCandidateEmailTemplateData;
}

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getEmailTemplateConfig: build.query<EmailTemplateConfigResponse, number>({
      query: (companyId) => ({
        url: `/mail/template-config/${companyId}/default`,
        method: 'GET',
      }),
      providesTags: ['EmailTemplateConfig'],
    }),
    getGenericCandidateEmailTemplate: build.query<GenericCandidateEmailTemplateData, number>({
      query: (companyId) => ({
        url: '/mail/template-config/templates/generic-candidate-email',
        method: 'GET',
        params: { companyId },
      }),
      transformResponse: (raw: GenericCandidateEmailTemplateApiResponse) =>
        raw?.data ?? {
          Name: '',
          Alias: '',
          Subject: '',
          HtmlBody: '',
          TextBody: '',
        },
    }),
    saveEmailTemplateConfig: build.mutation<
      EmailTemplateConfigResponse,
      SaveEmailTemplateConfigRequest
    >({
      query: ({ companyId, template, enabled, themeConfig, bannerFile }) => {
        const formData = new FormData();
        formData.append('companyId', String(companyId));
        formData.append('template', template);
        formData.append('enabled', String(enabled));
        formData.append('themeConfig', JSON.stringify(themeConfig));
        if (bannerFile) {
          formData.append('bannerCid', bannerFile);
        }
        return {
          url: '/mail/template-config/create',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['EmailTemplateConfig'],
    }),
    pushTemplatesToTenants: build.mutation<PushToTenantsResponse, PushToTenantsRequest>({
      query: (body) => ({
        url: '/mail/template-config/templates/push-to-tenants',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetEmailTemplateConfigQuery,
  useGetGenericCandidateEmailTemplateQuery,
  useSaveEmailTemplateConfigMutation,
  usePushTemplatesToTenantsMutation,
} = extendedApi;
