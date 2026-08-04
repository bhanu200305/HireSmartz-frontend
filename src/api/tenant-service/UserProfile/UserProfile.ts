import { api } from '../../index';

export type ChangePasswordRequest = {
  oldPassword: string;
  newPassword: string;
};

export type ChangePasswordResponse = {
  message: string;
  success: boolean;
};

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  countryCode: string;
  country?: string;
  state?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  pinCode?: string;
  profilePicture?: string;
  profilePictureType?: string;
  roleName?: string;
  companyName: string;
  companyId?: number;
};

export type UpdateProfileRequest = {
  id: string;
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  countryCode: string;
  country?: string;
  state?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  pinCode?: string;
  profilePicture?: string;
  profilePictureType?: string;
  roleName?: string;
};

export type ProfileResponse = UserProfile & {
  message?: string;
  success?: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    changePassword: build.mutation<ChangePasswordResponse, ChangePasswordRequest>({
      query: (body) => ({
        url: '/auth/password/change',
        method: 'POST',
        body,
      }),
    }),
    getUserProfile: build.query<ProfileResponse, string>({
      query: (userId) => ({
        url: `orguserservice/user/profile/getById?userId=${userId}`,
        method: 'GET',
      }),
    }),
    updateUserProfile: build.mutation<ProfileResponse, UpdateProfileRequest>({
      query: ({ id, ...body }) => ({
        url: `orguserservice/user/profile/update?userId=${id}`,
        method: 'PUT',
        body,
      }),
    }),
  }),
});

export const { useChangePasswordMutation, useGetUserProfileQuery, useUpdateUserProfileMutation } =
  extendedApi;
