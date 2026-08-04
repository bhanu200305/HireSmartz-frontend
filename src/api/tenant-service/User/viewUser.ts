import { ViewUserTypes } from '../../../types';
import { api } from '../../index';

type UserDetailsRequest = {
  userId: number;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getUserDetails: build.query<ViewUserTypes, UserDetailsRequest>({
      query: ({ userId }) => ({
        url: `/orguserservice/cfp/user/get/userDetails?userId=${userId}`,
        method: 'GET',
      }),
    }),
  }),
});

export const { useGetUserDetailsQuery } = extendedApi;
