/**
 * Local, browser-persisted stand-in for user invitation + credential
 * provisioning — same rationale as devRoleStore.ts: there is no real invite
 * email pipeline wired up yet (notification-service isn't connected, and
 * /internal/v1/users/{id}/credentials has no caller — see the API docs'
 * known gaps), so in dev-bypass mode this generates a temporary password
 * locally and stores the invite, instead of pretending to send an email
 * that would never arrive.
 *
 * The generated credentials are then accepted by the login flow (see
 * Login/index.tsx's completeInvitedUserLogin), so the person the role was
 * built for can actually sign in and see a portal scoped to exactly the
 * role (and location) they were invited with.
 */

const STORAGE_KEY = 'cfp_dev_invited_users_v1';

export type InvitedUser = {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  tempPassword: string;
  roleId: string;
  locationId: string | null;
  createdAt: string;
};

export class DevUserStoreError extends Error {}

const readStore = (): InvitedUser[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InvitedUser[]) : [];
  } catch {
    return [];
  }
};

const writeStore = (users: InvitedUser[]): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

const PASSWORD_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const PASSWORD_LOWER = 'abcdefghijkmnopqrstuvwxyz';
const PASSWORD_DIGITS = '23456789';
const PASSWORD_SYMBOLS = '!@#$%';

const pickChar = (chars: string): string => chars[Math.floor(Math.random() * chars.length)];

/** Not cryptographically hardened — this is a local dev/demo credential, not a real one. */
const generateTempPassword = (): string => {
  const body = Array.from({ length: 6 }, () =>
    pickChar(PASSWORD_UPPER + PASSWORD_LOWER + PASSWORD_DIGITS)
  ).join('');
  return `${pickChar(PASSWORD_UPPER)}${body}${pickChar(PASSWORD_SYMBOLS)}${pickChar(PASSWORD_DIGITS)}`;
};

export const devUserStore = {
  list: (): InvitedUser[] => readStore().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  invite: (input: {
    firstName: string;
    lastName?: string;
    email: string;
    roleId: string;
    locationId: string | null;
  }): InvitedUser => {
    const all = readStore();
    const normalizedEmail = input.email.trim().toLowerCase();

    if (all.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      throw new DevUserStoreError('An invite for this email already exists.');
    }

    const user: InvitedUser = {
      id: `dev-user-${Date.now()}`,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.trim(),
      tempPassword: generateTempPassword(),
      roleId: input.roleId,
      locationId: input.locationId,
      createdAt: new Date().toISOString(),
    };

    writeStore([...all, user]);
    return user;
  },

  findByCredentials: (email: string, password: string): InvitedUser | undefined => {
    const normalizedEmail = email.trim().toLowerCase();
    return readStore().find(
      (user) => user.email.toLowerCase() === normalizedEmail && user.tempPassword === password
    );
  },
};
