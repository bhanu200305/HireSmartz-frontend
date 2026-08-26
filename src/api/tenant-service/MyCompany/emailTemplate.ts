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
  companyId: string;
  template: string;
  enabled: boolean;
  inlineImages: {
    bannerCid?: InlineImageConfig;
    [key: string]: InlineImageConfig | undefined;
  };
  themeConfig: ThemeConfigResponse;
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
    getEmailTemplateConfig: build.query<EmailTemplateConfigResponse, string>({
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
  }),
});

export const { useGetEmailTemplateConfigQuery, useGetGenericCandidateEmailTemplateQuery } =
  extendedApi;
