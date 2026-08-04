import { useEffect, useMemo, useState } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import { Checkbox, Form, Modal, Select } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import {
  useGenerateSmsContentMutation,
  useLazyGetCandidateMessagingDetailsQuery,
  useSendBulkCandidateEmailMutation,
  useSendCandidateEmailMutation,
} from '../../../../api/candidate-service/Candidates/Candidates';
import { useGetJobOpeningByIdQuery } from '../../../../api/job-service/JobOpening/GetJobOpeningById';
import {
  useGetEmailTemplateConfigQuery,
  useGetGenericCandidateEmailTemplateQuery,
  type EmailTemplateConfigResponse,
} from '../../../../api/tenant-service/MyCompany/emailTemplate';
import { jwtDecode } from 'jwt-decode';
import { LOCALSTORAGE_KEYS } from '../../../../constants/webAPI';
import { getLocalStorageItem } from '../../../../shared/utils/auth/localstorage.helpers';
import { formatPhoneNumber } from '../../../../shared/utils/methods';
import type { CandidateByIdResponse } from '../../../../types';
import { rtkErrorMessage } from '../../../../shared/utils/api/rtkErrorMessage';
import { getFormEmailValidationError } from '../../../../shared/utils/validation/input.helpers';
import { Button, Input, showToast } from '../../../shared';
import './Modal.css';
import {
  toTitleCase,
  getSmsInfoForCandidate,
  candidateDisplayName,
  SMS_NATIONAL_DIGIT_COUNT,
} from './smsHelpers';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal';

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const BULK_EMAIL_HEADER = 'Dear {{candidateName}},';

type SendEmailToCandidateModalProps = {
  open: boolean;
  onClose: () => void;
  candidate?: CandidateByIdResponse | null;
  jobOpeningId: number;
  /** Prefills To with these addresses (e.g. multiple selected candidates) */
  bulkRecipientEmails?: string[];
  /** When set (e.g. floating bar), drives single vs bulk API */
  bulkCandidateIds?: number[];
  hideSmsSection?: boolean;
  candidates?: any[];
};

function jobTitleFromCandidate(c: CandidateByIdResponse): string {
  const applied = (c as { appliedPosition?: string }).appliedPosition?.trim();
  if (applied) return applied;
  const roundName = c.nextRoundDetails?.nextRound?.round?.name?.trim();
  if (roundName) return roundName;
  if (c.currentJobTitle?.trim()) return c.currentJobTitle.trim();
  return 'the position';
}

function buildDefaults(c: CandidateByIdResponse, isBulk: boolean) {
  const first = (c.firstName ?? '').trim();
  const last = (c.lastName ?? '').trim();
  const fullName = `${first} ${last}`.trim() || 'Candidate';
  const company = (c.companyName ?? '').trim() || 'Company';
  const jobTitle = jobTitleFromCandidate(c);
  const subject = `${company} - Regarding Your Video Interview For ${jobTitle}`;
  const emailHeader = isBulk ? BULK_EMAIL_HEADER : `Dear ${fullName},`;
  const emailBody = `We're pleased to confirm your interview for the ${jobTitle} role.\n\nPlease join 5 minutes before your scheduled time.`;
  return {
    to: (c.email ?? '').trim(),
    cc: [] as string[],
    bcc: [] as string[],
    subject,
    emailHeader,
    emailBody,
  };
}

const inputClass =
  'bg-white w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-300 border-[var(--border)]';

function parseToAddressList(value: string): string[] {
  return String(value ?? '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Same rules as candidate details email field ({@link getFormEmailValidationError}). */
function validateFormEmailList(addresses: string[]): string | undefined {
  for (const addr of addresses) {
    const err = getFormEmailValidationError(addr);
    if (err) {
      return err === 'Email is required.' ? 'Enter a valid email address.' : err;
    }
  }
  return undefined;
}

function normalizeEmailList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return [];
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v).trim()).filter(Boolean);
        }
      } catch {
        /* fall through to comma split */
      }
    }
    return parseToAddressList(raw);
  }
  return [];
}

function detailsToFormValues(details: any): Partial<{
  to: string;
  cc: string[];
  bcc: string[];
  subject: string;
  emailHeader: string;
  emailBody: string;
}> {
  const candidates = [
    details,
    details?.data,
    details?.data?.data,
    details?.payload,
    details?.result,
    details?.template,
    details?.data?.template,
  ].filter(Boolean);

  const pick = (keys: string[]) => {
    for (const obj of candidates) {
      for (const key of keys) {
        if (obj && obj[key] !== undefined && obj[key] !== null) {
          return obj[key];
        }
        if (obj && typeof obj === 'object') {
          const matchKey = Object.keys(obj).find((k) => k.toLowerCase() === key.toLowerCase());
          if (matchKey && obj[matchKey] !== undefined && obj[matchKey] !== null) {
            return obj[matchKey];
          }
        }
      }
    }
    return undefined;
  };

  const toList =
    pick(['toEmails', 'recipientEmail', 'recipientEmails', 'candidateEmails', 'emails', 'to']) ??
    [];
  const ccList = pick(['ccEmails', 'ccemails', 'cc', 'ccEmail']) ?? [];
  const bccList = pick(['bccEmails', 'bccemails', 'bcc', 'bccEmail']) ?? [];
  const subject = pick(['subject']);
  const header = pick(['emailHeader', 'header']);
  const body = pick(['emailBody', 'body']);
  const mapped: Partial<{
    to: string;
    cc: string[];
    bcc: string[];
    subject: string;
    emailHeader: string;
    emailBody: string;
  }> = {};

  const toValue = Array.isArray(toList)
    ? toList.filter(Boolean).join(', ')
    : String(toList ?? '').trim();
  if (toValue) mapped.to = toValue;

  const ccValue = normalizeEmailList(ccList);
  if (ccValue.length) mapped.cc = ccValue;

  const bccValue = normalizeEmailList(bccList);
  if (bccValue.length) mapped.bcc = bccValue;

  if (subject) mapped.subject = String(subject);
  if (header) mapped.emailHeader = String(header);
  if (body) mapped.emailBody = String(body);

  return mapped;
}

function companyNameFromMessagingDetails(details: any): string {
  const sources = [
    details,
    details?.data,
    details?.data?.data,
    details?.payload,
    details?.result,
    details?.jobDetails,
    details?.data?.jobDetails,
    details?.data?.data?.jobDetails,
  ].filter(Boolean);
  for (const src of sources) {
    const val = src?.companyName;
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return '';
}

/** Plain-text blocks → simple HTML for API `body` */
function plainTextEmailToHtml(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const blocks = text
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) return '<p></p>';
  return blocks.map((block) => `<p>${escape(block).replace(/\n/g, '<br/>')}</p>`).join('');
}

/** When generic API template is unavailable — same layout as before API integration. */
function buildFallbackCandidateEmailPreviewHtml(
  config: EmailTemplateConfigResponse,
  content: { header: string; body: string; footer: string }
): string {
  const t = config.themeConfig;
  const bannerUrl = config.inlineImages?.bannerCid?.url ?? null;
  const bannerImg = bannerUrl
    ? `<img src="${bannerUrl}" style="width:100%;height:auto;display:block;" alt="Banner"/>`
    : `<img src="/cfpBanner.png" style="width:100%;height:auto;display:block;" alt="CareerForce Pro"/>`;

  const bodyHtml = content.body
    .split('\n\n')
    .map(
      (block) => `<p style="margin:0 0 12px;">${block.split('\n').map(escHtml).join('<br/>')}</p>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>* { box-sizing:border-box; } body { margin:0; padding:12px 0; background:${t.backgroundColor}; }</style>
</head>
<body>
  <table cellpadding="0" cellspacing="0" width="100%"
    style="max-width:600px;margin:0 auto;background:${t.backgroundColor};border-collapse:collapse;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:${t.primaryColor};padding:0;text-align:center;line-height:0;">
        ${bannerImg}
      </td>
    </tr>
    <tr>
      <td style="padding:22px 34px;border-bottom:1px solid ${t.secondaryColor}">
        <p style="font-size:22px;font-weight:600;margin:0 0 14px;color:${t.greetingColor};font-family:'Sora',Arial,sans-serif;">
          ${escHtml(content.header)}
        </p>
        <div style="font-size:15px;line-height:24px;color:${t.textColor};font-family:'Roboto',Arial,sans-serif;">
          ${bodyHtml}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 34px;border-bottom:1px solid ${t.secondaryColor}">
        <p style="font-size:15px;margin:0;color:${t.textColor};font-family:'Roboto',Arial,sans-serif;white-space:pre-wrap;">${escHtml(content.footer)}</p>
      </td>
    </tr>
    <tr>
      <td style="background:${t.footerBackground};color:${t.footerText};text-align:center;padding:20px 34px;">
        <p style="font-size:13px;font-family:'Roboto',Arial,sans-serif;margin:0 0 6px;font-weight:600;">
          Copyright &copy;2026 careerforce.pro All Rights Reserved.
        </p>
        <p style="font-size:11px;font-family:'Roboto',Arial,sans-serif;color:rgba(255,255,255,0.55);margin:0;line-height:16px;">
          This e-mail is intended for the use of the individual or entity to which it is addressed.
          If you are not the intended recipient, any disclosure or copying is strictly prohibited.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Merge `generic-candidate-email` HtmlBody (placeholders) with default template-config (theme + banner).
 */
function buildGenericCandidateEmailPreviewHtml(
  config: EmailTemplateConfigResponse,
  templateRowsHtml: string,
  vars: { subject: string; header: string; bodyPlain: string; companyName: string }
): string {
  const t = config.themeConfig;
  let inner = templateRowsHtml;

  inner = inner.replace(/\{\{\{body\}\}\}/g, () => plainTextEmailToHtml(vars.bodyPlain));
  inner = inner.replace(/\{\{body\}\}/g, escHtml(vars.bodyPlain));

  inner = inner.replace(/\{\{theme\.(\w+)\}\}/g, (_, key: string) => {
    const themeMap = t as unknown as Record<string, string | null | undefined>;
    const val = themeMap[key];
    return val != null && val !== '' ? String(val) : '';
  });

  inner = inner.replace(/\{\{subject\}\}/g, escHtml(vars.subject));
  inner = inner.replace(/\{\{header\}\}/g, escHtml(vars.header));
  inner = inner.replace(/\{\{companyName\}\}/g, escHtml(vars.companyName));

  const bannerUrl = config.inlineImages?.bannerCid?.url ?? null;
  const bannerImg = bannerUrl
    ? `<img src="${bannerUrl}" style="width:100%;height:auto;display:block;" alt="Banner"/>`
    : `<img src="/cfpBanner.png" style="width:100%;height:auto;display:block;" alt="CareerForce Pro"/>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>* { box-sizing:border-box; } body { margin:0; padding:12px 0; background:${t.backgroundColor}; }</style>
</head>
<body>
  <table cellpadding="0" cellspacing="0" width="100%"
    style="max-width:600px;margin:0 auto;background:${t.backgroundColor};border-collapse:collapse;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:${t.primaryColor};padding:0;text-align:center;line-height:0;">
        ${bannerImg}
      </td>
    </tr>
    ${inner}
    <tr>
      <td style="background:${t.footerBackground};color:${t.footerText};text-align:center;padding:20px 34px;">
        <p style="font-size:13px;font-family:'Roboto',Arial,sans-serif;margin:0 0 6px;font-weight:600;">
          Copyright &copy;2026 careerforce.pro All Rights Reserved.
        </p>
        <p style="font-size:11px;font-family:'Roboto',Arial,sans-serif;color:rgba(255,255,255,0.55);margin:0;line-height:16px;">
          This e-mail is intended for the use of the individual or entity to which it is addressed.
          If you are not the intended recipient, any disclosure or copying is strictly prohibited.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const SendEmailToCandidateModal = ({
  open,
  onClose,
  candidate,
  jobOpeningId,
  bulkRecipientEmails,
  bulkCandidateIds,
  hideSmsSection = false,
  candidates = [],
}: SendEmailToCandidateModalProps) => {
  const [getMessagingDetails] = useLazyGetCandidateMessagingDetailsQuery();
  const [generateSmsContent, { isLoading: isGeneratingSmsContent }] =
    useGenerateSmsContentMutation();
  const [sendEmail, { isLoading: isSendingSingle }] = useSendCandidateEmailMutation();
  const [sendBulkEmail, { isLoading: isSendingBulk }] = useSendBulkCandidateEmailMutation();
  const isSending = isSendingSingle || isSendingBulk;
  const [messagingDetails, setMessagingDetails] = useState<any>(null);
  const [notifyCandidateViaSms, setNotifyCandidateViaSms] = useState(!hideSmsSection);
  const [reviewBeforeSendingSms, setReviewBeforeSendingSms] = useState(false);
  const [smsDynamicAiContent, setSmsDynamicAiContent] = useState<string>('');
  const [smsPreviewMessage, setSmsPreviewMessage] = useState<string>('');
  const [checkedSmsCandidateIds, setCheckedSmsCandidateIds] = useState<Record<string, boolean>>({});

  const isBulk = useMemo(() => {
    const ids = bulkCandidateIds?.filter((id) => Number.isFinite(id) && id > 0) ?? [];
    return ids.length > 1;
  }, [bulkCandidateIds]);

  const [showSmsOptOutWarning, setShowSmsOptOutWarning] = useState(false);

  const smsOptOut = useMemo(() => {
    return !!(
      candidate?.smsOptOut === true ||
      (candidate?.smsOptOut &&
        typeof candidate.smsOptOut === 'object' &&
        candidate.smsOptOut.isOptedOut === true)
    );
  }, [candidate]);

  const hasOptedOutCandidate = useMemo(() => {
    if (!notifyCandidateViaSms) return false;
    if (isBulk) {
      return (candidates || []).some((c) => {
        const isChecked = checkedSmsCandidateIds[String(c.id)] !== false;
        const optedOut = !!(
          c.smsOptOut === true ||
          (c.smsOptOut && typeof c.smsOptOut === 'object' && c.smsOptOut.isOptedOut === true)
        );
        return isChecked && optedOut;
      });
    }
    return smsOptOut;
  }, [isBulk, candidates, checkedSmsCandidateIds, smsOptOut, notifyCandidateViaSms]);

  const { withPhone, invalidPhone, withoutPhone } = useMemo(() => {
    const wp: { candidate: any; info: ReturnType<typeof getSmsInfoForCandidate> }[] = [];
    const inv: { candidate: any; info: ReturnType<typeof getSmsInfoForCandidate> }[] = [];
    const wo: any[] = [];
    const candidatesList = candidates || [];
    for (const c of candidatesList) {
      const info = getSmsInfoForCandidate(c);
      if (info.canSms) wp.push({ candidate: c, info });
      else if (info.hasInvalidPhone) inv.push({ candidate: c, info });
      else wo.push(c);
    }
    return { withPhone: wp, invalidPhone: inv, withoutPhone: wo };
  }, [candidates]);

  useEffect(() => {
    if (!open || !isBulk || !candidates || candidates.length === 0) return;
    const next: Record<string, boolean> = {};
    for (const { candidate } of withPhone) {
      next[String(candidate.id)] = true;
    }
    for (const { candidate } of invalidPhone) {
      next[String(candidate.id)] = false;
    }
    setCheckedSmsCandidateIds(next);
  }, [open, isBulk, candidates, withPhone, invalidPhone]);

  const toggleSmsCandidateId = (id: string, checked: boolean) => {
    setCheckedSmsCandidateIds((prev) => ({ ...prev, [id]: checked }));
  };

  const { data: fetchedJobData } = useGetJobOpeningByIdQuery(
    { jobOpeningId },
    { skip: !jobOpeningId || !open }
  );

  const jobPosition = useMemo(() => {
    const titleName = fetchedJobData?.data?.jobTitle?.[0]?.jobTypeName?.trim();
    if (titleName) return titleName;
    if (candidate) {
      const cTitle = jobTitleFromCandidate(candidate);
      if (cTitle && cTitle !== 'the position') return cTitle;
    }
    return 'the position';
  }, [fetchedJobData, candidate]);

  const formattedJobPosition = useMemo(() => {
    let pos = jobPosition.trim();
    if (pos.toLowerCase() === 'the position') {
      return 'the';
    }
    if (pos.toLowerCase().endsWith(' position')) {
      pos = pos.slice(0, -9).trim();
    } else if (pos.toLowerCase().endsWith(' role')) {
      pos = pos.slice(0, -5).trim();
    }
    return pos;
  }, [jobPosition]);

  const candidateName = useMemo(() => {
    if (isBulk) {
      return '{{candidateName}}';
    }
    const first = (candidate?.firstName ?? '').trim();
    const last = (candidate?.lastName ?? '').trim();
    const name = `${first} ${last}`.trim() || 'Candidate';
    return toTitleCase(name);
  }, [candidate, isBulk]);

  /* ── Decode companyId from JWT to fetch email template ─────── */
  const companyId = useMemo<number | null>(() => {
    const token = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
    if (!token) return null;
    try {
      const decoded = jwtDecode<{ companyId?: number }>(token);
      return decoded.companyId ?? null;
    } catch {
      return null;
    }
  }, []);

  const { data: emailTemplateConfig, isLoading: isTemplateConfigLoading } =
    useGetEmailTemplateConfigQuery(companyId as number, {
      skip: companyId === null || !open,
    });

  const { data: genericCandidateTemplate, isLoading: isGenericCandidateTemplateLoading } =
    useGetGenericCandidateEmailTemplateQuery(companyId as number, {
      skip: companyId === null || !open,
    });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const [form] = Form.useForm<{
    to: string;
    cc: string[];
    bcc: string[];
    subject: string;
    emailHeader: string;
    emailBody: string;
  }>();
  const subjectWatched = Form.useWatch('subject', form);

  const displayCompanyName = useMemo(
    () =>
      companyNameFromMessagingDetails(messagingDetails) ||
      (candidate?.companyName ?? '').trim() ||
      String(subjectWatched ?? '')
        .split(' - ')[0]
        ?.trim() ||
      'Company',
    [messagingDetails, candidate, subjectWatched]
  );

  const bulkIdsKey = useMemo(
    () =>
      (bulkCandidateIds ?? [])
        .filter((id) => Number.isFinite(id) && id > 0)
        .slice()
        .sort((a, b) => a - b)
        .join(','),
    [bulkCandidateIds]
  );

  const smsPhoneDisplay = useMemo(() => {
    const code = (candidate?.countryCode ?? '').trim();
    const phone = (candidate?.phoneNumber ?? '').trim();
    const formattedPhone = formatPhoneNumber(phone);
    const combined = [code, formattedPhone].filter(Boolean).join(' ').trim();
    return combined || 'No phone number on file';
  }, [candidate?.countryCode, candidate?.phoneNumber]);

  const extractSmsText = (generatedContent: string): string => {
    // API now returns plain text string directly
    const text = String(generatedContent ?? '').trim();
    if (!text) return '';
    const prefix = `Hi ${candidateName}\nRegarding: ${formattedJobPosition} position\n`;
    if (text.startsWith(prefix)) {
      return text;
    }
    const oldPrefix1 = `Hi ${candidateName}.\n`;
    const oldPrefix2 = `Hi ${candidateName}. `;
    if (text.startsWith(oldPrefix1)) {
      return text.replace(oldPrefix1, prefix);
    }
    if (text.startsWith(oldPrefix2)) {
      return text.replace(oldPrefix2, prefix);
    }
    return `${prefix}${text}`;
  };

  const mergeSmsTextInContent = (generatedContent: string, textMessage: string): string => {
    // API now returns plain text; prefer edited text and fallback to generated text.
    const edited = String(textMessage ?? '').trim();
    if (edited) return edited;
    return String(generatedContent ?? '').trim();
  };

  const generateSmsFromInputs = async (
    subjectInput: string,
    bodyInput: string
  ): Promise<string | null> => {
    const subject = String(subjectInput ?? '').trim();
    const body = String(bodyInput ?? '').trim();
    if (!subject || !body) {
      return null;
    }
    const response = await generateSmsContent({ subject, body }).unwrap();
    const generated = String(response.generatedContent ?? '').trim();
    setSmsDynamicAiContent(generated);
    setSmsPreviewMessage(extractSmsText(generated));
    return generated;
  };

  const generateSmsFromForm = async (): Promise<string | null> => {
    const values = form.getFieldsValue();
    return generateSmsFromInputs(values.subject, values.emailBody);
  };

  useEffect(() => {
    if (!open || !candidate || !jobOpeningId) return;
    const shouldNotifySms = !hideSmsSection;
    setNotifyCandidateViaSms(shouldNotifySms);
    setReviewBeforeSendingSms(false);
    setSmsDynamicAiContent('');
    setSmsPreviewMessage('');
    const load = async () => {
      const ids = bulkCandidateIds?.filter((id) => Number.isFinite(id) && id > 0) ?? [
        Number(candidate.id),
      ];
      const isBulk = ids.length > 1;
      const defaults = buildDefaults(candidate, isBulk);
      try {
        const details = await getMessagingDetails({
          candidateIds: ids,
          jobOpeningId,
        }).unwrap();
        setMessagingDetails(details);
        const mapped = detailsToFormValues(details);
        const emailHeader = isBulk
          ? BULK_EMAIL_HEADER
          : mapped.emailHeader
            ? String(mapped.emailHeader)
            : defaults.emailHeader;
        const ccTags = mapped.cc?.length ? normalizeEmailList(mapped.cc) : defaults.cc;
        const bccTags = mapped.bcc?.length ? normalizeEmailList(mapped.bcc) : defaults.bcc;
        const initialValues = {
          ...defaults,
          ...mapped,
          emailHeader,
          cc: ccTags,
          bcc: bccTags,
          to:
            mapped.to ||
            (bulkRecipientEmails?.length ? bulkRecipientEmails.join(', ') : defaults.to),
        };
        form.setFieldsValue(initialValues);
        if (shouldNotifySms) {
          try {
            await generateSmsFromInputs(initialValues.subject, initialValues.emailBody);
          } catch (e) {
            showToast({ message: rtkErrorMessage(e), type: 'error' });
          }
        }
      } catch {
        setMessagingDetails(null);
        const fallbackValues = {
          ...defaults,
          to: bulkRecipientEmails?.length ? bulkRecipientEmails.join(', ') : defaults.to,
        };
        form.setFieldsValue(fallbackValues);
        if (shouldNotifySms) {
          try {
            await generateSmsFromInputs(fallbackValues.subject, fallbackValues.emailBody);
          } catch (e) {
            showToast({ message: rtkErrorMessage(e), type: 'error' });
          }
        }
      }
    };
    void load();
    // Depend on candidate id (not object identity) so parent re-renders do not reset Cc/Bcc while typing
  }, [
    open,
    candidate?.id,
    form,
    bulkRecipientEmails,
    bulkIdsKey,
    jobOpeningId,
    getMessagingDetails,
    hideSmsSection,
  ]);

  const handleClose = () => {
    setPreviewOpen(false);
    setNotifyCandidateViaSms(!hideSmsSection);
    setReviewBeforeSendingSms(false);
    setSmsDynamicAiContent('');
    setSmsPreviewMessage('');
    onClose();
  };

  const handleNotifySmsChange = (checked: boolean) => {
    setNotifyCandidateViaSms(checked);
    if (!checked) {
      setReviewBeforeSendingSms(false);
      setSmsDynamicAiContent('');
      setSmsPreviewMessage('');
      return;
    }
    void generateSmsFromForm().catch((e) => {
      showToast({ message: rtkErrorMessage(e), type: 'error' });
    });
  };

  const handlePreview = async () => {
    try {
      await form.validateFields(['to', 'cc', 'bcc', 'subject', 'emailBody']);
    } catch {
      return; /* validation messages shown */
    }
    if (companyId === null) {
      showToast({
        message: 'Company context is missing; cannot load email preview.',
        type: 'error',
      });
      return;
    }
    if (!emailTemplateConfig) {
      showToast({ message: 'Email template is still loading, please try again.', type: 'warning' });
      return;
    }
    const v = form.getFieldsValue();
    const subject = (v.subject ?? '').trim();
    const header = (v.emailHeader ?? '').trim();
    const bodyPlain = (v.emailBody ?? '').trim();
    const companyName = displayCompanyName;

    const html = genericCandidateTemplate?.HtmlBody?.trim()
      ? buildGenericCandidateEmailPreviewHtml(
          emailTemplateConfig,
          genericCandidateTemplate.HtmlBody,
          { subject, header, bodyPlain, companyName }
        )
      : buildFallbackCandidateEmailPreviewHtml(emailTemplateConfig, {
          header,
          body: bodyPlain,
          footer: `Best regards,\n${companyName}`,
        });
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const handleSend = async () => {
    let v: {
      to: string;
      cc: string[];
      bcc: string[];
      subject: string;
      emailHeader: string;
      emailBody: string;
    };
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    const to = (v.to ?? '').trim();
    if (!to) {
      showToast({ message: 'Recipient email (To) is required', type: 'error' });
      return;
    }
    if (!jobOpeningId) {
      showToast({ message: 'Job opening is missing', type: 'error' });
      return;
    }
    const cc = normalizeEmailList(v.cc);
    const bcc = normalizeEmailList(v.bcc);
    const toEmails = parseToAddressList(to);
    const subject = (v.subject ?? '').trim();
    const firstName = (candidate?.firstName ?? '').trim();
    const lastName = (candidate?.lastName ?? '').trim();
    const displayName = `${firstName} ${lastName}`.trim() || 'Candidate';
    const ids = bulkCandidateIds?.filter((id) => Number.isFinite(id) && id > 0) ?? [];
    const isBulkSend = ids.length > 1;
    const header =
      (v.emailHeader ?? '').trim() || (isBulkSend ? BULK_EMAIL_HEADER : `Dear ${displayName},`);
    const bodyOnly = (v.emailBody ?? '').trim();
    const htmlBody = plainTextEmailToHtml(bodyOnly);
    const subjectCompany = subject.split(' - ')[0]?.trim();
    const companyName =
      companyNameFromMessagingDetails(messagingDetails) ||
      (candidate?.companyName ?? '').trim() ||
      subjectCompany ||
      'Company';

    let dynamicAiContent: string | undefined;
    let smsCandidateIds: number[] | undefined;
    if (notifyCandidateViaSms) {
      const generated = smsDynamicAiContent || (await generateSmsFromForm()) || '';
      if (!generated) {
        showToast({ message: 'Failed to generate SMS content.', type: 'error' });
        return;
      }
      if (reviewBeforeSendingSms && smsPreviewMessage.trim()) {
        dynamicAiContent = smsPreviewMessage.trim();
      } else {
        const rawText = generated;
        const prefix = `Hi ${candidateName}\nRegarding: ${formattedJobPosition} position\n`;
        const oldPrefix1 = `Hi ${candidateName}.\n`;
        const oldPrefix2 = `Hi ${candidateName}. `;
        if (rawText.startsWith(prefix)) {
          dynamicAiContent = rawText;
        } else if (rawText.startsWith(oldPrefix1)) {
          dynamicAiContent = rawText.replace(oldPrefix1, prefix);
        } else if (rawText.startsWith(oldPrefix2)) {
          dynamicAiContent = rawText.replace(oldPrefix2, prefix);
        } else {
          dynamicAiContent = `${prefix}${rawText}`;
        }
      }

      if (isBulkSend) {
        smsCandidateIds = withPhone
          .filter(({ candidate }) => checkedSmsCandidateIds[String(candidate.id)] !== false)
          .map(({ candidate }) => Number(candidate.id))
          .filter(Number.isFinite);
      }
    }

    try {
      if (ids.length > 1) {
        await sendBulkEmail({
          candidateIds: ids,
          jobOpeningId,
          subject,
          header,
          body: htmlBody,
          companyName,
          toEmails,
          ccEmails: cc,
          bccEmails: bcc,
          dynamicAiContent,
          smsCandidateIds,
        }).unwrap();
        const n = ids.length;
        showToast({
          message: `Email sent successfully to ${n} Candidate${n === 1 ? '' : 's'}`,
          type: 'success',
        });
      } else {
        const candidateId = ids[0] ?? Number(candidate?.id);
        if (!Number.isFinite(candidateId) || candidateId <= 0) {
          showToast({ message: 'Candidate is missing', type: 'error' });
          return;
        }
        await sendEmail({
          candidateId,
          jobOpeningId,
          subject,
          header,
          body: htmlBody,
          companyName,
          toEmails,
          ccEmails: cc,
          bccEmails: bcc,
          dynamicAiContent,
        }).unwrap();
        const primaryEmail = toEmails[0] ?? (candidate?.email ?? '').trim() ?? '';
        showToast({
          message: `Email sent successfully to ${displayName} at ${primaryEmail}`,
          type: 'success',
        });
      }
      handleClose();
    } catch (e) {
      showToast({ message: rtkErrorMessage(e), type: 'error' });
    }
  };

  const handleSendWithOptOutCheck = () => {
    if (hasOptedOutCandidate) {
      setShowSmsOptOutWarning(true);
    } else {
      void handleSend();
    }
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={handleClose}
        footer={null}
        centered
        width={720}
        maskClosable={false}
        destroyOnClose
        title={null}
        className="send-email-candidate-modal"
      >
        <h2 className="text-center text-xl font-bold text-[#1a1a1a] mb-6">
          Send Email to Candidate
        </h2>
        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar px-1">
          <Form form={form} layout="vertical" className="space-y-1" requiredMark={false}>
            <Form.Item
              label={
                <span>
                  To <span className="required-asterisk">*</span>
                </span>
              }
              name="to"
              rules={[
                { required: true, message: 'Recipient email is required' },
                {
                  validator: async (_, value) => {
                    const parts = parseToAddressList(String(value ?? ''));
                    if (parts.length === 0) {
                      return Promise.reject(new Error('Recipient email is required'));
                    }
                    const listErr = validateFormEmailList(parts);
                    if (listErr) {
                      return Promise.reject(new Error(listErr));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                type="text"
                placeholder="candidate@email.com (comma-separated for multiple)"
                className={inputClass}
              />
            </Form.Item>

            <Form.Item
              label="Cc"
              name="cc"
              normalize={(v) => (v == null ? [] : normalizeEmailList(v))}
              rules={[
                {
                  validator: async (_, value) => {
                    const list = normalizeEmailList(value);
                    const listErr = validateFormEmailList(list);
                    if (listErr) {
                      return Promise.reject(new Error(listErr));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              extra={
                <span className="text-xs text-gray-500">
                  Type an email and press Enter to add; use the × on a chip to remove
                </span>
              }
            >
              <Select
                mode="tags"
                open={false}
                onOpenChange={() => undefined}
                suffixIcon={null}
                placeholder="Type an email and press Enter"
                className="w-full placeholder-style send-email-cc-bcc-select send-email-tags-only"
                tokenSeparators={[',', ';']}
                showSearch
                filterOption={false}
              />
            </Form.Item>

            <Form.Item
              label="Bcc"
              name="bcc"
              normalize={(v) => (v == null ? [] : normalizeEmailList(v))}
              rules={[
                {
                  validator: async (_, value) => {
                    const list = normalizeEmailList(value);
                    const listErr = validateFormEmailList(list);
                    if (listErr) {
                      return Promise.reject(new Error(listErr));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              extra={
                <span className="text-xs text-gray-500">
                  Type an email and press Enter to add; use the × on a chip to remove
                </span>
              }
            >
              <Select
                mode="tags"
                open={false}
                onOpenChange={() => undefined}
                suffixIcon={null}
                placeholder="Type an email and press Enter"
                className="w-full placeholder-style send-email-cc-bcc-select send-email-tags-only"
                tokenSeparators={[',', ';']}
                showSearch
                filterOption={false}
              />
            </Form.Item>

            <Form.Item
              label={
                <span>
                  Subject <span className="required-asterisk">*</span>
                </span>
              }
              name="subject"
              rules={[{ required: true, message: 'Subject is required' }]}
            >
              <Input type="text" placeholder="Email subject" className={inputClass} />
            </Form.Item>

            <Form.Item label="Email Header" name="emailHeader">
              <Input
                readOnly
                type="text"
                placeholder="Dear …"
                className={`${inputClass} cursor-default bg-gray-50 text-[#4f4f4f]`}
              />
            </Form.Item>

            <Form.Item
              label={
                <span>
                  Email Body <span className="required-asterisk">*</span>
                </span>
              }
              name="emailBody"
              rules={[{ required: true, message: 'Email body is required' }]}
            >
              <TextArea
                rows={8}
                placeholder="Email message"
                className={`${inputClass} resize-y min-h-30`}
              />
            </Form.Item>

            <Form.Item label="Email Footer">
              <TextArea
                readOnly
                rows={3}
                value={`Best regards,\n${displayCompanyName}`}
                className={`${inputClass} resize-none cursor-default bg-gray-50 text-[#4f4f4f]`}
              />
            </Form.Item>

            {!hideSmsSection && (
              <>
                <div className="mt-1 mb-3 space-y-2">
                  <Checkbox
                    checked={notifyCandidateViaSms}
                    onChange={(e) => handleNotifySmsChange(e.target.checked)}
                    disabled={isGeneratingSmsContent || isSending}
                  >
                    <span className="text-base font-medium">Notify Candidate Via SMS</span>
                  </Checkbox>
                  <Checkbox
                    checked={reviewBeforeSendingSms}
                    onChange={(e) => setReviewBeforeSendingSms(e.target.checked)}
                    disabled={!notifyCandidateViaSms || isGeneratingSmsContent || isSending}
                  >
                    <span className="text-base font-medium">
                      Review Before Sending SMS To Candidate
                    </span>
                  </Checkbox>
                </div>

                {notifyCandidateViaSms && reviewBeforeSendingSms && (
                  <div className="mb-2 rounded-2xl border-2 border-primary/40 bg-[#f7fbff] p-4">
                    <div className="mb-3 text-base font-semibold text-[#1a1a1a]">SMS Review</div>
                    <div className="space-y-3">
                      {isBulk ? (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">
                            Candidates with Phone Number
                          </label>
                          {withPhone.length === 0 && invalidPhone.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-4 text-center text-sm text-gray-500">
                              No phone numbers on file for the selected candidate(s).
                            </p>
                          ) : (
                            <div className="flex max-h-[160px] flex-col gap-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 mb-3">
                              {withPhone.length > 0 ? (
                                <div className="flex flex-wrap gap-2.5">
                                  {withPhone.map(({ candidate, info }) => {
                                    const id = String(candidate.id);
                                    return (
                                      <label
                                        key={id}
                                        className="flex min-w-[170px] max-w-full cursor-pointer items-start gap-2 rounded-md bg-gray-50 p-2 border border-gray-150"
                                      >
                                        <Checkbox
                                          className="mt-0.5"
                                          checked={checkedSmsCandidateIds[id] !== false}
                                          onChange={(e) =>
                                            toggleSmsCandidateId(id, e.target.checked)
                                          }
                                        />
                                        <span className="min-w-0">
                                          <span className="block text-sm font-medium text-[#1a1a1a] truncate">
                                            {candidateDisplayName(candidate)}
                                          </span>
                                          <span className="block text-xs text-gray-500">
                                            {info.smsPhoneDisplay}
                                          </span>
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : null}
                              {invalidPhone.length > 0 ? (
                                <div className="border-t border-gray-200 pt-3">
                                  <p className="mb-2 text-xs font-medium text-red-600">
                                    Invalid phone (exactly {SMS_NATIONAL_DIGIT_COUNT} digits
                                    required)
                                  </p>
                                  <div className="flex flex-wrap gap-2.5">
                                    {invalidPhone.map(({ candidate, info }) => {
                                      const id = String(candidate.id);
                                      return (
                                        <label
                                          key={id}
                                          className="flex min-w-[170px] max-w-full cursor-not-allowed items-start gap-2 rounded-md bg-gray-100 p-2 opacity-90"
                                        >
                                          <Checkbox className="mt-0.5" checked={false} disabled />
                                          <span className="min-w-0">
                                            <span className="block text-sm font-medium text-gray-500 truncate">
                                              {candidateDisplayName(candidate)}
                                            </span>
                                            <span className="block text-xs text-red-500">
                                              {info.smsPhoneDisplay}
                                            </span>
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                          {withoutPhone.length > 0 ? (
                            <div className="mb-2">
                              <p className="mb-1 text-xs text-red-600 font-medium">
                                Candidate(s) without phone number (will be skipped):
                              </p>
                              <div className="flex max-h-[80px] flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-white px-3 py-2">
                                {withoutPhone.map((c) => (
                                  <span
                                    key={String(c.id)}
                                    className="text-xs text-gray-400 line-through decoration-gray-300"
                                  >
                                    {candidateDisplayName(c)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">
                            To <span className="required-asterisk">*</span>
                          </label>
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-white px-3 py-2 text-sm">
                            <span className="truncate font-medium text-[#1a1a1a]">
                              {candidateName}
                            </span>
                            <span className="shrink-0 text-gray-600">{smsPhoneDisplay}</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">
                          Message <span className="required-asterisk">*</span>
                        </label>
                        <TextArea
                          rows={4}
                          value={smsPreviewMessage}
                          onChange={(e) => setSmsPreviewMessage(e.target.value)}
                          placeholder="Generated SMS message will appear here"
                          className={`${inputClass} resize-y`}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Note: If you uncheck review before sending, the default generated SMS will be
                      submitted.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="mt-2 flex w-full flex-row flex-wrap items-center justify-center gap-3 pt-4 pb-1">
              <Button
                type="button"
                onClick={handleClose}
                disabled={isSending}
                className="rounded-full border border-[#1a1a1a] bg-white px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#1a1a1a] hover:bg-gray-50 disabled:opacity-50"
              >
                CANCEL
              </Button>
              <Button
                type="button"
                onClick={() => void handlePreview()}
                disabled={isSending || isTemplateConfigLoading || isGenericCandidateTemplateLoading}
                className="rounded-full border border-[#1a1a1a] bg-white px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#1a1a1a] hover:bg-gray-50 disabled:opacity-50"
              >
                {isTemplateConfigLoading || isGenericCandidateTemplateLoading
                  ? 'LOADING…'
                  : 'PREVIEW'}
              </Button>
              <Button
                type="button"
                onClick={handleSendWithOptOutCheck}
                disabled={isSending}
                className="rounded-full border-0 bg-primary px-8 py-2.5 text-sm font-semibold uppercase tracking-wide text-white hover:opacity-95 disabled:opacity-60"
              >
                {isSending ? 'SENDING…' : 'SEND EMAIL'}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      <Modal
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        centered
        width={680}
        destroyOnClose
        title={<div className="text-center font-bold text-lg">Email Preview</div>}
      >
        <iframe
          srcDoc={previewHtml}
          title="Email Preview"
          sandbox="allow-same-origin"
          style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }}
        />
        <div className="flex justify-center mt-4">
          <Button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="px-8 py-2.5 bg-primary text-white rounded-full"
          >
            CLOSE PREVIEW
          </Button>
        </div>
      </Modal>

      {showSmsOptOutWarning && (
        <ConfirmationModal
          title="This candidate has opted out of SMS communication. Do you still want to continue sending SMS to this candidate?"
          confirmText="CONTINUE SENDING"
          cancelText="CANCEL"
          onClose={() => setShowSmsOptOutWarning(false)}
          onConfirm={() => {
            setShowSmsOptOutWarning(false);
            void handleSend();
          }}
        />
      )}
    </>
  );
};

export default SendEmailToCandidateModal;
