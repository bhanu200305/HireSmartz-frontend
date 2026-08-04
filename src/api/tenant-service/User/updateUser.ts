import { api } from '../../index';

type UpdateUserRequest = {
  userId: number;
  profilePicture?: string;
  profilePictureType?: string;
  firstname?: string;
  lastName?: string;
  emailId?: string;
  phoneNumber?: string;
  title?: string;
  countryCode?: string;
  roleTypeMappingId?: number;
  status?: boolean;
  isArchived?: boolean;
};

type UpdateUserResponse = {
  success: boolean;
  message: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    updateUser: build.mutation<UpdateUserResponse, UpdateUserRequest>({
      query: ({ userId, ...body }) => ({
        url: `/orguserservice/cfp/user/update?userId=${userId}`,
        method: 'PUT',
        body,
      }),
    }),
  }),
});

export const { useUpdateUserMutation } = extendedApi;
