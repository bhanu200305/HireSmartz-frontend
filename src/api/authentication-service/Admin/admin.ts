import { authApi, noContentResponseHandler } from '../authApi';

// /api/v1/admin/* — both authenticated, both permission-checked SERVER-SIDE
// (docs/API_CONTRACT.md §8): unlock needs `auth:update` (Company Admin for
// their own tenant, or platform support for anybody); rotate needs
// `auth:approve` and is platform-only. Neither is gated client-side here —
// see AdminTools/index.tsx for why.

export type UnlockUserRequest = {
  userId: string;
};

export type RotateSigningKeysResponse = {
  new_kid: string;
  previous_kid: string;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    // 204 No Content. Clears both the lock and the failure counter — the
    // backend does both in one call deliberately (clearing only the lock
    // would re-lock on the very next mistyped password).
    unlockUser: build.mutation<undefined, UnlockUserRequest>({
      query: ({ userId }) => ({
        url: `/admin/users/${userId}/unlock`,
        method: 'POST',
        responseHandler: noContentResponseHandler,
      }),
    }),
    // Re-keys every token the entire fleet verifies against. The previous
    // public key stays in JWKS for the retirement grace period (~90 min by
    // default), so existing sessions don't all 401 at once.
    rotateSigningKeys: build.mutation<RotateSigningKeysResponse, void>({
      query: () => ({
        url: '/admin/signing-keys/rotate',
        method: 'POST',
      }),
    }),
  }),
});

export const { useUnlockUserMutation, useRotateSigningKeysMutation } = extendedApi;
