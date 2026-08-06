import React, { useState, useEffect, useMemo } from 'react';
import { Button, showToast, Input } from '../../../shared';
import { CandidateByIdResponse } from '../../../../types';
import { Loader } from '../../../shared/ui/loader';
import { Form, Modal, Select } from 'antd';
import { useForm } from 'react-hook-form';
import {
  useGetFollowupNoteEmailQuery,
  useSendFollowupNoteEmailMutation,
} from '../../../../api/candidate-service/Candidates/FollowUpNotes';
import {
  useGetEmailTemplateConfigQuery,
  type EmailTemplateConfigResponse,
} from '../../../../api/tenant-service/MyCompany/emailTemplate';
import { jwtDecode } from 'jwt-decode';
import { LOCALSTORAGE_KEYS } from '../../../../constants/webAPI';
import { getLocalStorageItem } from '../../../../shared/utils/auth/localstorage.helpers';
import './Modal.css';
import TextArea from 'antd/es/input/TextArea';

/* ─── Build styled preview HTML from template config + content ──────────── */
const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildFollowupPreviewHtml(
  config: EmailTemplateConfigResponse,
  content: {
    header: string;
    details: string;
    keyNotes: string;
    footer: string;
  }
): string {
  const t = config.themeConfig;
  const bannerUrl = config.inlineImages?.bannerCid?.url ?? null;
  const bannerImg = bannerUrl
    ? `<img src="${bannerUrl}" style="width:100%;height:auto;display:block;" alt="Banner"/>`
    : `<img src="/cfpBanner.png" style="width:100%;height:auto;display:block;" alt="CareerForce Pro"/>`;

  const notesHtml = content.keyNotes
    .split('\n')
    .map((line) => `<p style="margin:4px 0;">${escHtml(line) || '&nbsp;'}</p>`)
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
        <p style="font-size:22px;font-weight:600;margin:0 0 12px;color:${t.greetingColor};font-family:'Sora',Arial,sans-serif;">
          ${escHtml(content.header)}
        </p>
        <p style="font-size:15px;line-height:24px;margin:0;color:${t.textColor};font-family:'Roboto',Arial,sans-serif;">
          ${escHtml(content.details)}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 34px;border-bottom:1px solid ${t.secondaryColor}">
        <h3 style="font-size:18px;font-weight:600;margin:0 0 10px;color:${t.titleColor};font-family:'Sora',Arial,sans-serif;">
          Follow-up Notes
        </h3>
        <div style="font-size:15px;line-height:24px;color:${t.textColor};font-family:'Roboto',Arial,sans-serif;">
          ${notesHtml}
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

interface NotifyCandidateModalProps {
  candidate?: CandidateByIdResponse;
  interviewRoundName: string;
  interviewMode?: string;
  onClose: () => void;
  onSuccess: () => void;
  interviewBookingId?: number;
}

const NotifyCandidateModal: React.FC<NotifyCandidateModalProps> = ({
  candidate,
  interviewRoundName,
  //   interviewMode,
  onClose,
  onSuccess,
  interviewBookingId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [keyNotes, setKeyNotes] = useState('');

  const { data: emailTemplateData, isLoading: isTemplateLoading } = useGetFollowupNoteEmailQuery(
    interviewBookingId!,
    {
      skip: !interviewBookingId,
      refetchOnMountOrArgChange: true,
    }
  );
  const templateData = emailTemplateData?.data;

  const [sendFollowupNoteEmail, { isLoading: isSending }] = useSendFollowupNoteEmailMutation();

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
    useGetEmailTemplateConfigQuery(companyId as number, { skip: companyId === null });

  const fixedHeader = `Dear ${templateData?.interviewDetails?.name || candidate?.firstName || 'Candidate'},`;

  const fixedDetails = `Your ${templateData?.interviewDetails?.roundName || interviewRoundName} round for the position of ${templateData?.interviewDetails?.position || candidate?.appliedPosition || 'the position'} at ${templateData?.interviewDetails?.companyName || candidate?.companyName || 'our company'} has been successfully completed.`;

  const fixedFooter = `Thank you for your time and support in the hiring process.

Best regards,
${templateData?.interviewDetails?.companyName || 'Company Name'}`;

  const getFullBody = (currentKeyNotes: string = keyNotes) => {
    return `${fixedHeader}

${fixedDetails}

Follow-up Notes:
${currentKeyNotes}

${fixedFooter}`;
  };

  const {
    handleSubmit,
    setValue,
    watch,
    register,
    formState: { errors },
  } = useForm({
    defaultValues: {
      from: '',
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (templateData) {
      const initialKeyNotes =
        templateData.followupNotes?.filter((note: string) => note.trim()).join('\n') || '';
      setKeyNotes(initialKeyNotes);

      setValue('from', 'recruitment@company.com');
      setValue('to', templateData.recipientEmail || candidate?.email || '');
      setValue('cc', templateData.ccemails?.join(', ') || '');
      setValue('bcc', templateData.bccemails?.join(', ') || '');
      setValue('subject', templateData.subject || '');
      setValue('body', getFullBody(initialKeyNotes));
    } else {
      setKeyNotes('');
      setValue('from', 'recruitment@company.com');
      setValue('to', candidate?.email || '');
      setValue('cc', '');
      setValue('bcc', '');
      setValue('subject', '');
      setValue('body', getFullBody(''));
    }
  }, [templateData, candidate, interviewRoundName, setValue]);

  const handleInputChange = (field: string, value: string) => {
    setValue(field as any, value);
  };

  const handleKeyNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newKeyNotes = e.target.value;
    setKeyNotes(newKeyNotes);
    setValue('body', getFullBody(newKeyNotes));
  };

  const handlePreview = () => {
    if (!emailTemplateConfig) {
      showToast({ message: 'Email template is still loading, please try again.', type: 'warning' });
      return;
    }
    const html = buildFollowupPreviewHtml(emailTemplateConfig, {
      header: fixedHeader,
      details: fixedDetails,
      keyNotes,
      footer: fixedFooter,
    });
    setPreviewHtml(html);
    setShowPreview(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (!data.to.trim()) {
      showToast({
        message: 'Recipient email (To) is required',
        type: 'error',
      });
      return;
    }

    if (!data.subject.trim()) {
      showToast({
        message: 'Email subject is required',
        type: 'error',
      });
      return;
    }

    if (!data.body.trim()) {
      showToast({
        message: 'Email body is required',
        type: 'error',
      });
      return;
    }

    if (!interviewBookingId) {
      showToast({
        message: 'Interview booking ID is required',
        type: 'error',
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        interviewBookingId: interviewBookingId,
        subject: data.subject,
        followupNotes: keyNotes.split('\n').filter((note) => note.trim()),
        recipientEmail: data.to,
        ccemails: data.cc
          ? data.cc
              .split(',')
              .map((email: string) => email.trim())
              .filter(Boolean)
          : [],
        bccemails: data.bcc
          ? data.bcc
              .split(',')
              .map((email: string) => email.trim())
              .filter(Boolean)
          : [],
      };

      const response = await sendFollowupNoteEmail(payload).unwrap();

      if (response.status === 'OK' || response.code === 'Success') {
        showToast({
          message: response.message || 'Email sent successfully!',
          type: 'success',
        });
        onSuccess();
      } else if (response.message) {
        showToast({
          message: response.message || 'Failed to send email',
          type: 'error',
        });
      }
    } catch (error: any) {
      showToast({
        message: error?.data?.message || 'Failed to send email',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isOverallLoading = isLoading || isSending || isTemplateLoading;
  return (
    <>
      {isTemplateLoading && <Loader />}
      <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
        <Form layout="vertical" className="space-y-4">
          {/* To Field */}
          <Form.Item
            label={
              <span>
                To <span className="required-asterisk">*</span>
              </span>
            }
            style={{ marginBottom: '16px' }}
          >
            <Input
              type="email"
              placeholder="candidate@email.com"
              className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              value={watch('to')}
              onChange={(e) => handleInputChange('to', e.target.value)}
              disabled
            />
            <p className="text-red-500 text-sm mt-1">{errors.to?.message}</p>
          </Form.Item>

          {/* CC Field */}
          <Form.Item label={<span>CC</span>} style={{ marginBottom: '16px' }}>
            <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
              <Select
                mode="tags"
                placeholder="Add CC emails"
                className="w-full custom-select-jobs placeholder-style"
                value={
                  watch('cc')
                    ? watch('cc')
                        .split(',')
                        .map((email: string) => email.trim())
                    : []
                }
                onChange={(values) => {
                  const validEmails = values
                    .filter((v: string) => v.trim() !== '')
                    .map((v: string) => v.trim());
                  handleInputChange('cc', validEmails.join(', '));
                }}
                disabled={isOverallLoading}
                tokenSeparators={[',', ' ']}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 roboto-font">
              Separate multiple emails with commas or space.
            </p>
            <p className="text-red-500 text-sm mt-1">{errors.cc?.message}</p>
          </Form.Item>

          {/* BCC Field */}
          <Form.Item label="BCC" style={{ marginBottom: '16px' }} className="custom-form-item">
            <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
              <Select
                mode="tags"
                placeholder="Add BCC emails"
                className="w-full custom-select-jobs placeholder-style"
                value={
                  watch('bcc')
                    ? watch('bcc')
                        .split(',')
                        .map((email: string) => email.trim())
                    : []
                }
                onChange={(values) => {
                  const validEmails = values
                    .filter((v: string) => v.trim() !== '')
                    .map((v: string) => v.trim());
                  handleInputChange('bcc', validEmails.join(', '));
                }}
                disabled={isOverallLoading}
                tokenSeparators={[',', ' ']}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 roboto-font">
              Separate multiple emails with commas or space.
            </p>
            <p className="text-red-500 text-sm mt-1">{errors.bcc?.message}</p>
          </Form.Item>

          {/* Subject Field */}
          <Form.Item
            label={
              <span>
                Subject <span className="required-asterisk">*</span>
              </span>
            }
            style={{ marginBottom: '16px' }}
          >
            <Input
              type="text"
              placeholder="Email Subject"
              className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              value={watch('subject')}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              disabled
            />
            <p className="text-red-500 text-sm mt-1">{errors.subject?.message}</p>
          </Form.Item>

          {/* Body Preview (Read-only) */}
          <Form.Item
            label="Email Header"
            style={{ marginBottom: '16px' }}
            className="custom-form-item"
          >
            <div className="w-full p-4 border border-[var(--border)] rounded-[10px] text-sm whitespace-pre-wrap roboto-font">
              <div className="text-gray-500">{fixedHeader}</div>
              <br />
              <div className="text-gray-500">{fixedDetails}</div>
            </div>
          </Form.Item>

          {/* Editable Key Notes Section */}
          <Form.Item
            label={
              <span>
                Follow-up Notes <span className="required-asterisk">*</span>
              </span>
            }
            style={{ marginBottom: '16px' }}
          >
            <TextArea
              value={keyNotes}
              onChange={handleKeyNotesChange}
              rows={10}
              style={{ borderRadius: '10px' }}
              className="w-full p-4 py-2 border border-[var(--border)] rounded-xl bg-white resize-none roboto-font custom-scrollbar"
              placeholder="Enter follow-up notes"
              disabled={isOverallLoading}
            />
          </Form.Item>

          {/* Footer Preview (Read-only) */}
          <Form.Item
            label="Email Footer"
            style={{ marginBottom: '16px' }}
            className="custom-form-item"
          >
            <div className="w-full p-4 border border-[var(--border)] rounded-[10px] text-sm whitespace-pre-wrap roboto-font">
              <div className="text-gray-500">{fixedFooter}</div>
            </div>
          </Form.Item>

          {/* Full Body Hidden Field */}
          <div className="hidden">
            <Form.Item name="body">
              <TextArea {...register('body')} readOnly />
            </Form.Item>
          </div>

          {/* Buttons */}
          <Form.Item style={{ marginBottom: '10px' }}>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={onClose}
                className="px-7 py-3 border border-[var(--border)] rounded-4xl cursor-pointer !bg-white"
                disabled={isOverallLoading}
              >
                CANCEL
              </Button>
              <Button
                onClick={handlePreview}
                className="px-7 py-3 border border-[var(--border)] rounded-4xl cursor-pointer !bg-white"
                disabled={isOverallLoading || isTemplateConfigLoading}
              >
                {isTemplateConfigLoading ? 'LOADING…' : 'PREVIEW'}
              </Button>
              <Button
                onClick={handleSubmit(handleFormSubmit)}
                className="px-10 py-3 bg-primary text-white border rounded-4xl cursor-pointer"
                disabled={isOverallLoading}
              >
                {isOverallLoading ? <Loader /> : 'SEND EMAIL'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>

      {/* Preview Modal — iframe */}
      <Modal
        open={showPreview}
        onCancel={() => setShowPreview(false)}
        footer={null}
        width={680}
        centered
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
            onClick={() => setShowPreview(false)}
            className="px-10 py-3 bg-primary text-white border rounded-4xl cursor-pointer"
          >
            CLOSE PREVIEW
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default NotifyCandidateModal;
