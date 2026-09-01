import { orgApi } from './orgApi';

// GET /v1/masters/resume-template-fields — the platform's fixed, ordered
// resume-template field schema (Introduction/Education/Experience/...).
// Dual-scope (require_permission_any_scope): reachable by a tenant user's
// own token OR a platform caller's, unlike the older
// GET /v1/platform/resume-template-fields (Super Admin only) — added
// specifically so a Company Admin's own Intake Questions tab can populate
// the "Resume Field" picker every question is now required to have one of.
export type ResumeTemplateField = {
  field_id: string;
  field_key: string;
  field_label: string;
  order_index: number;
};

export type ListResumeTemplateFieldsResponse = {
  fields: ResumeTemplateField[];
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listResumeTemplateFields: build.query<ListResumeTemplateFieldsResponse, void>({
      query: () => '/v1/masters/resume-template-fields',
      providesTags: ['ResumeTemplateFields'],
    }),
  }),
});

export const { useListResumeTemplateFieldsQuery } = extendedApi;
