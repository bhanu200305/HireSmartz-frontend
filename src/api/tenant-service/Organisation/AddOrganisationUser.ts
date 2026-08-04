import { AddOrgUserRequest, AddOrgUserResponse, ViewOrgUserTypes } from '../../../types';
import { api } from '../../index';

type UserDetailsRequest = {
  userId: number;
  isArchived?: boolean;
  companyId?: number;
};

type UpdateOrgUserResponse = {
  success: boolean;
  message: string;
};

type CompanyScopedAddOrgUserRequest = AddOrgUserRequest & {
  companyId?: number;
};

type UpdateOrgUserRequestType = AddOrgUserRequest & {
  userId: number;
  companyId?: number;
};

const getCompanyIdQuery = (companyId?: number): string =>
  companyId && Number.isFinite(companyId) && companyId > 0 ? `companyId=${companyId}` : '';

const appendQuery = (path: string, query: string): string => (query ? `${path}?${query}` : path);

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    addOrgUser: build.mutation<AddOrgUserResponse, CompanyScopedAddOrgUserRequest>({
      query: ({ companyId, ...body }) => ({
        url: appendQuery('/orguserservice/org/user/save', getCompanyIdQuery(companyId)),
        method: 'POST',
        body,
      }),
    }),
    getViewOrgUserDetails: build.query<ViewOrgUserTypes, UserDetailsRequest>({
      query: ({ userId, companyId }) => {
        const query = new URLSearchParams({ userId: String(userId) });

        if (companyId && Number.isFinite(companyId) && companyId > 0) {
          query.set('companyId', String(companyId));
        }

        return {
          url: `/orguserservice/org/user/findById?${query.toString()}`,
          method: 'GET',
        };
      },
    }),
    updateOrgUser: build.mutation<UpdateOrgUserResponse, UpdateOrgUserRequestType>({
      query: ({ userId, companyId, ...body }) => {
        const query = new URLSearchParams({ userId: String(userId) });

        if (companyId && Number.isFinite(companyId) && companyId > 0) {
          query.set('companyId', String(companyId));
        }

        return {
          url: `/orguserservice/org/user/update?${query.toString()}`,
          method: 'PUT',
          body,
        };
      },
    }),
    archiveOrgUser: build.mutation<void, UserDetailsRequest>({
      query: ({ userId, isArchived, companyId }) => {
        const query = new URLSearchParams({ userId: String(userId) });

        if (companyId && Number.isFinite(companyId) && companyId > 0) {
          query.set('companyId', String(companyId));
        }

        return {
          url: `/orguserservice/org/user/archive?${query.toString()}`,
          method: 'PUT',
          body: { isArchived },
        };
      },
    }),
  }),
});

export const {
  useAddOrgUserMutation,
  useGetViewOrgUserDetailsQuery,
  useUpdateOrgUserMutation,
  useArchiveOrgUserMutation,
} = extendedApi;
