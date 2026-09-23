const MASK_CHAR = '•';
const ALREADY_MASKED = /[•*]/;

/**
 * Redacts a phone number or email before it's shown on screen after an
 * OTP/MFA code is sent — e.g. "Code sent to {this}". The backend already
 * sends these pre-masked (see `MfaMethod.destination_hint` /
 * `SendInviteMfaCodeUseCase` on authentication-service), so in the normal
 * case this is a no-op passthrough. It exists as a second, independent
 * layer purely so this screen can never leak a full destination even if a
 * particular backend deployment/path is out of sync with that contract —
 * defense in depth, not a substitute for the backend's own masking.
 */
export const maskDeliveryHint = (value: string | null | undefined): string => {
  if (!value) return '';
  if (ALREADY_MASKED.test(value)) return value;

  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    if (!domain) return value;
    const visible = local.slice(0, 2);
    return `${visible}${MASK_CHAR.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
  }

  // Last 4 digits visible, matching the backend's own "+•••••••1234" shape
  // (MfaMethod.destination_hint / SendInviteMfaCodeUseCase) so this fallback
  // looks identical to the normal, already-masked case if it ever fires.
  const hasPlus = value.trim().startsWith('+');
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return MASK_CHAR.repeat(Math.max(value.length, 3));
  const visibleTail = digits.slice(-4);
  return `${hasPlus ? '+' : ''}${MASK_CHAR.repeat(Math.max(digits.length - visibleTail.length, 3))}${visibleTail}`;
};
