import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatMarkdownResponse,
  sanitizeImagePreview,
  sanitizedPath,
  verifyAuthToken,
  handleArchive,
  handleResendInvite,
} from '../../src/helpers';
import { LOCALSTORAGE_KEYS } from '../../src/constants/webAPI';

describe('formatMarkdownResponse', () => {
  it('strips leading spaces on each line', () => {
    expect(formatMarkdownResponse('   Hello\n   World')).toBe('Hello\nWorld');
  });

  it('inserts a space after a heading hash run with no space', () => {
    expect(formatMarkdownResponse('##Summary')).toBe('## Summary');
    expect(formatMarkdownResponse('###Skills')).toBe('### Skills');
  });

  it('leaves a correctly formatted heading untouched', () => {
    expect(formatMarkdownResponse('## Summary')).toBe('## Summary');
  });
});

describe('sanitizeImagePreview', () => {
  it('allows a base64 png/jpeg data URI', () => {
    const uri = 'data:image/png;base64,AAAA';
    expect(sanitizeImagePreview(uri)).toBe(uri);
  });

  it('allows a blob URI', () => {
    const uri = 'blob:https://app.example.com/abc-123';
    expect(sanitizeImagePreview(uri)).toBe(uri);
  });

  it('allows an https URL', () => {
    const uri = 'https://cdn.example.com/avatar.jpg';
    expect(sanitizeImagePreview(uri)).toBe(uri);
  });

  it('rejects a javascript: URI', () => {
    expect(sanitizeImagePreview('javascript:alert(1)')).toBe('');
  });

  it('rejects a non-string value', () => {
    expect(sanitizeImagePreview(undefined as unknown as string)).toBe('');
  });
});

describe('sanitizedPath', () => {
  it('accepts a normal relative path', () => {
    expect(sanitizedPath('/dashboard/jobs')).toBe('/dashboard/jobs');
  });

  it('rejects a protocol-relative URL (open-redirect vector)', () => {
    expect(sanitizedPath('//evil.com/phish')).toBe('/');
  });

  it('rejects an absolute external URL', () => {
    expect(sanitizedPath('https://evil.com')).toBe('/');
  });

  it('rejects a path with no leading slash', () => {
    expect(sanitizedPath('dashboard')).toBe('/');
  });

  it('falls back to the current host for an empty path', () => {
    expect(sanitizedPath('')).toBe(`${window.location.host}/`);
  });

  it('decodes a URL-encoded path before checking it', () => {
    expect(sanitizedPath('%2Fdashboard')).toBe('/dashboard');
  });
});

describe('verifyAuthToken', () => {
  const makeToken = (exp: number) => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
    return `${header}.${payload}.signature`;
  };

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns false when no access token is stored', () => {
    expect(verifyAuthToken()).toBe(false);
  });

  it('returns true for a token that has not expired', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem(LOCALSTORAGE_KEYS.ACCESS, makeToken(futureExp));

    expect(verifyAuthToken()).toBe(true);
  });

  it('returns false for an expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    localStorage.setItem(LOCALSTORAGE_KEYS.ACCESS, makeToken(pastExp));

    expect(verifyAuthToken()).toBe(false);
  });
});

describe('handleArchive', () => {
  it('does nothing when recordId is missing', async () => {
    const archiveFn = vi.fn();
    const showToast = vi.fn();
    const refetch = vi.fn();

    await handleArchive({
      type: 'user',
      recordId: 0,
      archiveFn,
      showToast,
      refetch,
      isArchived: true,
    });

    expect(archiveFn).not.toHaveBeenCalled();
  });

  it('shows a success toast and refetches on success', async () => {
    const archiveFn = vi.fn(() => ({
      unwrap: () => Promise.resolve({ message: 'Company archived.' }),
    }));
    const showToast = vi.fn();
    const refetch = vi.fn();

    await handleArchive({
      type: 'company',
      recordId: 42,
      archiveFn,
      showToast,
      refetch,
      isArchived: true,
    });

    expect(archiveFn).toHaveBeenCalledWith({ companyId: 42, isArchived: true });
    expect(showToast).toHaveBeenCalledWith({ message: 'Company archived.', type: 'success' });
    expect(refetch).toHaveBeenCalled();
  });

  it('shows an error toast and does not refetch on failure', async () => {
    const archiveFn = vi.fn(() => ({
      unwrap: () => Promise.reject({ data: { message: 'Archive failed.' } }),
    }));
    const showToast = vi.fn();
    const refetch = vi.fn();

    await handleArchive({
      type: 'user',
      recordId: 7,
      archiveFn,
      showToast,
      refetch,
      isArchived: false,
    });

    expect(archiveFn).toHaveBeenCalledWith({ userId: 7, isArchived: false });
    expect(showToast).toHaveBeenCalledWith({ message: 'Archive failed.', type: 'error' });
    expect(refetch).not.toHaveBeenCalled();
  });
});

describe('handleResendInvite', () => {
  it('does nothing when recordId is missing', async () => {
    const resendInviteFn = vi.fn();

    await handleResendInvite({
      type: 'user',
      recordId: 0,
      resendInviteFn,
      showToast: vi.fn(),
      refetch: vi.fn(),
      firstName: 'Jane',
      emailId: 'jane@example.com',
    });

    expect(resendInviteFn).not.toHaveBeenCalled();
  });

  it('builds a user payload and shows a success toast', async () => {
    const resendInviteFn = vi.fn(() => ({
      unwrap: () => Promise.resolve({ message: 'Invite resent.' }),
    }));
    const showToast = vi.fn();
    const refetch = vi.fn();

    await handleResendInvite({
      type: 'user',
      recordId: 5,
      resendInviteFn,
      showToast,
      refetch,
      firstName: 'Jane',
      emailId: 'jane@example.com',
    });

    expect(resendInviteFn).toHaveBeenCalledWith({
      userId: 5,
      firstName: 'Jane',
      emailId: 'jane@example.com',
    });
    expect(showToast).toHaveBeenCalledWith({ message: 'Invite resent.', type: 'success' });
    expect(refetch).toHaveBeenCalled();
  });

  it('builds a company payload on failure and shows an error toast', async () => {
    const resendInviteFn = vi.fn(() => ({
      unwrap: () => Promise.reject({ data: { message: 'Could not resend.' } }),
    }));
    const showToast = vi.fn();
    const refetch = vi.fn();

    await handleResendInvite({
      type: 'company',
      recordId: 9,
      resendInviteFn,
      showToast,
      refetch,
      firstName: 'Acme',
      emailId: 'ops@acme.com',
    });

    expect(resendInviteFn).toHaveBeenCalledWith({
      companyId: 9,
      firstName: 'Acme',
      emailId: 'ops@acme.com',
    });
    expect(showToast).toHaveBeenCalledWith({ message: 'Could not resend.', type: 'error' });
    expect(refetch).not.toHaveBeenCalled();
  });
});
