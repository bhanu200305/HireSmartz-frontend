import { api } from '../../index';

type OwnerDashboardRequest = {
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
    roleTypeMappingId: string | number;
  };
  pageSize?: number;
};
type OwnerDashboardResponse = {
  success: boolean;
  message: string;
  data: any;
  totalElements?: number;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    OwnerDashboard: build.mutation<OwnerDashboardResponse, OwnerDashboardRequest>({
      query: ({ page, pageSize, value }) => ({
        url: `/orguserservice/org/user/dashboard/filters?page=${page}&size=${pageSize}`,
        method: 'POST',
        body: value,
      }),
    }),
  }),
});

export const { useOwnerDashboardMutation } = extendedApi;
