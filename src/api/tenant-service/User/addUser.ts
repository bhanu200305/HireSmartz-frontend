import { api } from '../../index';

type AddUserRequest = {
  profilePicture: string;
  profilePictureType: string;
  firstname: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  title: string;
  countryCode: string;
  roleId: number;
  status: boolean;
  isArchived: boolean;
};

type AddUserResponse = {
  profilePicture: string;
  profilePictureType: string;
  firstname: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  title: string;
  countryCode: string;
  roleId: number;
  status: boolean;
  isArchived: boolean;
  success: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    addUser: build.mutation<AddUserResponse, AddUserRequest>({
      query: (body) => ({
        url: '/orguserservice/cfp/user/save',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useAddUserMutation } = extendedApi;
