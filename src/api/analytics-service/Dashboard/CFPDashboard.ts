import { api } from '../../index';

type CFPDashboardRequest = {
  page?: number;
  value: {
    firstName?: string;
    lastName?: string;
    emailId?: string;
    phoneNumber?: string;
    title?: string;
    status?: boolean;
    isArchived?: boolean;
    searchQuery?: string;
    startDateTime?: string; // ISO 8601 date-time format
    endDateTime?: string;
    roleTypeMappingId: number;
  };
  pageSize?: number;
};
type CFPDashboardResponse = {
  success: boolean;
  message: string;
  data: any;
  totalElements?: number;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    CFPDashboard: build.query<CFPDashboardResponse, CFPDashboardRequest>({
      query: ({ page, pageSize, value }) => ({
        url: `/orguserservice/companies/dashboard/customers/filters?page=${page}&size=${pageSize}`,
        method: 'POST',
        body: value,
      }),
    }),
  }),
});

export const { useCFPDashboardQuery } = extendedApi;
