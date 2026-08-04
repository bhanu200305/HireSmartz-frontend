import { api } from '../../index';

type ArchiveUserRequest = {
  userId: number;
  isArchived: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    archiveUser: build.mutation<void, ArchiveUserRequest>({
      query: ({ userId, isArchived }) => ({
        url: `/orguserservice/cfp/user/archive?userId=${userId}`,
        method: 'PUT',
        body: { isArchived },
      }),
    }),
  }),
});

export const { useArchiveUserMutation } = extendedApi;
