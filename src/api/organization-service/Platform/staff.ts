import { orgApi } from '../orgApi';

// PlatformStaffSummaryView — GET /v1/platform/staff. One row per
// Membership with tenant_id IS NULL — Super Admins and internal staff.
export type PlatformStaffMember = {
  membership_id: string;
  email: string;
  role: string;
  department_id: string | null;
  department_name: string | null;
  status: string;
  created_at: string | null;
};

export type PlatformDepartment = {
  department_id: string;
  name: string;
};

// OwnPlatformProfileView — GET/PATCH /v1/platform/staff/me. Self-service:
// email/role are read-only display (email isn't editable here — changing a
// platform login identifier is out of scope, same reasoning the tenant
// self-service PATCH already applies to its own email field).
export type OwnPlatformProfile = {
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  country_code: string | null;
  phone_no: string | null;
  /** Resolved download URL for the storage key set via `avatar` on
   * PATCH /platform/staff/me — `null` until one has ever been uploaded. */
  avatar_url: string | null;
};

export type UpdateOwnPlatformProfileRequest = {
  first_name?: string;
  last_name?: string;
  country_code?: string;
  phone_no?: string;
  /** Storage key from POST /platform/staff/me/avatar/upload — PATCH
   * semantics apply, same as Users/users.ts's UpdateUserRequest.avatar:
   * omitted leaves the current avatar alone, there is no way to CLEAR one
   * via this field. */
  avatar?: string;
};

export type UploadOwnPlatformAvatarResult = {
  storage_key: string;
};

export type InviteSuperAdminRequest = {
  email: string;
};

export type InviteSuperAdminResponse = {
  invitation_id: string;
  expires_at: string;
  previously_suppressed: boolean;
};

export type InvitePlatformStaffRequest = {
  email: string;
  department_id?: string;
  /** Free text — there's no fixed list of internal roles yet. */
  role: string;
};

export type InvitePlatformStaffResponse = {
  invitation_id: string;
  previously_suppressed: boolean;
};

export type CreatePlatformDepartmentResponse = {
  department_id: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformStaff: build.query<PlatformStaffMember[], void>({
      query: () => '/v1/platform/staff',
      transformResponse: (response: { staff: PlatformStaffMember[] }) => response.staff,
      providesTags: ['PlatformStaff'],
    }),
    listPlatformDepartments: build.query<PlatformDepartment[], void>({
      query: () => '/v1/platform/departments',
      transformResponse: (response: { departments: PlatformDepartment[] }) => response.departments,
      providesTags: ['PlatformDepartments'],
    }),
    createPlatformDepartment: build.mutation<CreatePlatformDepartmentResponse, string>({
      query: (department_name) => ({
        url: '/v1/platform/departments',
        method: 'POST',
        body: { department_name },
      }),
      invalidatesTags: ['PlatformDepartments'],
    }),
    inviteSuperAdmin: build.mutation<InviteSuperAdminResponse, InviteSuperAdminRequest>({
      query: (body) => ({
        url: '/v1/platform/super-admins/invitations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PlatformStaff'],
    }),
    invitePlatformStaff: build.mutation<InvitePlatformStaffResponse, InvitePlatformStaffRequest>({
      query: (body) => ({
        url: '/v1/platform/staff/invitations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PlatformStaff'],
    }),
    // Response is {status}, not 204 — revokes sessions immediately.
    offboardPlatformStaff: build.mutation<{ status: string }, string>({
      query: (staffId) => ({
        url: `/v1/platform/staff/${staffId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformStaff'],
    }),
    getOwnPlatformProfile: build.query<OwnPlatformProfile, void>({
      query: () => '/v1/platform/staff/me',
      providesTags: ['OwnProfile'],
    }),
    // Same cache-invalidation reasoning as Users/users.ts's
    // updateOwnUserProfile — Header is a persistent layout component that
    // never remounts on navigation, so without this it kept showing
    // whatever it fetched once at app load regardless of saves made here.
    updateOwnPlatformProfile: build.mutation<OwnPlatformProfile, UpdateOwnPlatformProfileRequest>({
      query: (body) => ({
        url: '/v1/platform/staff/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['OwnProfile'],
    }),
    // POST /v1/platform/staff/me/avatar/upload — server-mediated, same
    // reasoning as Users/users.ts's uploadOwnAvatar (the tenant-user
    // equivalent). Returns only the storage_key; the caller persists it via
    // updateOwnPlatformProfile's `avatar` field right after.
    uploadOwnPlatformAvatar: build.mutation<UploadOwnPlatformAvatarResult, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/v1/platform/staff/me/avatar/upload',
          method: 'POST',
          body: formData,
        };
      },
    }),
    // DELETE /v1/platform/staff/me/avatar — the only way to actually remove
    // a saved avatar, same reasoning as Users/users.ts's clearOwnAvatar:
    // updateOwnPlatformProfile's `avatar` field can only ever SET one.
    clearOwnPlatformAvatar: build.mutation<OwnPlatformProfile, void>({
      query: () => ({
        url: '/v1/platform/staff/me/avatar',
        method: 'DELETE',
      }),
      invalidatesTags: ['OwnProfile'],
    }),
  }),
});

export const {
  useListPlatformStaffQuery,
  useListPlatformDepartmentsQuery,
  useCreatePlatformDepartmentMutation,
  useInviteSuperAdminMutation,
  useInvitePlatformStaffMutation,
  useOffboardPlatformStaffMutation,
  useGetOwnPlatformProfileQuery,
  useUpdateOwnPlatformProfileMutation,
  useUploadOwnPlatformAvatarMutation,
  useClearOwnPlatformAvatarMutation,
} = extendedApi;
