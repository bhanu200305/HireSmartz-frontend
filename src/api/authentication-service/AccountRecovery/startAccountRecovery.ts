import { authApi } from '../authApi';

// POST /api/v1/auth/account-recovery — anonymous. The "lost everything" last
// resort: the caller can't sign in AND can't use /forgot-password either,
// because their MFA method (or their primary mailbox) is gone too.
export type StartAccountRecoveryRequest = {
  recovery_email: string;
};

// 202, always — whether or not the address is known, and whether or not it's
// a verified recovery email yet. Deliberately uniform, same enumeration-safety
// reasoning as /forgot-password: never branch UI on anything but this shape.
export type StartAccountRecoveryResponse = {
  accepted: true;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    startAccountRecovery: build.mutation<StartAccountRecoveryResponse, StartAccountRecoveryRequest>(
      {
        query: (body) => ({
          url: '/auth/account-recovery',
          method: 'POST',
          body,
        }),
      }
    ),
  }),
});

export const { useStartAccountRecoveryMutation } = extendedApi;
