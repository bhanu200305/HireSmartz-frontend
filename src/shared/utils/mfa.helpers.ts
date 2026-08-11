/**
 * Client-side TOTP secret generation for the invite-accept MFA step.
 *
 * There is no QR-code rendering library in this repo yet, so the secret is
 * presented as a copy-able manual-entry key (plus the otpauth:// URI, for
 * anyone who wants to paste it into an authenticator app that accepts a
 * URI directly) rather than a scannable image. Swap in a QR library later
 * if that's wanted — `buildOtpAuthUri` already produces the string a QR
 * code would encode.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const SECRET_LENGTH = 32;

export const generateBase32Secret = (length: number = SECRET_LENGTH): string => {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let secret = '';
  for (let i = 0; i < bytes.length; i += 1) {
    secret += BASE32_ALPHABET[bytes[i] % BASE32_ALPHABET.length];
  }
  return secret;
};

export const buildOtpAuthUri = ({
  secret,
  accountEmail,
  issuer = 'CareerForce Pro',
}: {
  secret: string;
  accountEmail: string;
  issuer?: string;
}): string => {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const params = new URLSearchParams({ secret, issuer });
  return `otpauth://totp/${label}?${params.toString()}`;
};
