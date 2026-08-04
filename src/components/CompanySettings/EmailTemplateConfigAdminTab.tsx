import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { AiOutlineCloudUpload } from 'react-icons/ai';
import { ColorPicker, Modal, Select, Spin } from 'antd';
import { Button } from '../shared';
import { showToast } from '../shared/ui/toast';
import { useGetCompaniesDropdownQuery } from '../../api/tenant-service/Company/companiesDropdown';
import {
  useGetEmailTemplateConfigQuery,
  useSaveEmailTemplateConfigMutation,
} from '../../api/tenant-service/MyCompany/emailTemplate';

/* ─────────────────────────────── Types ─────────────────────────────── */

interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  titleColor: string;
  highlightText: string;
  greetingColor: string;
  buttonText: string;
  actionButtonText: string;
  buttonBackground: string;
  buttonBorderColor: string;
  actionButtonBackground: string;
  actionButtonBorderColor: string;
  footerText: string;
  footerBackground: string;
  backgroundColor: string;
  highlightBackground: string;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/* ─────────────────────────────── Constants ──────────────────────────── */

const DEFAULT_THEME: ThemeColors = {
  primaryColor: '#000000',
  secondaryColor: '#CCCCCC',
  textColor: '#222222',
  titleColor: '#000000',
  highlightText: '#000000',
  greetingColor: '#000000',
  buttonText: '#FFFFFF',
  actionButtonText: '#FFFFFF',
  buttonBackground: '#000000',
  buttonBorderColor: '#FFFFFF',
  actionButtonBackground: '#004BE0',
  actionButtonBorderColor: '#004BE0',
  footerText: '#FFFFFF',
  footerBackground: '#000000',
  backgroundColor: '#FFFFFF',
  highlightBackground: '#EEEEEE',
};

const BUTTON_BORDER_RADIUS = '6px';

const COLOR_FIELDS: Array<{ key: keyof ThemeColors; label: string }> = [
  { key: 'primaryColor', label: 'Primary Color' },
  { key: 'secondaryColor', label: 'Secondary Color' },
  { key: 'textColor', label: 'Text Color' },
  { key: 'titleColor', label: 'Title Color' },
  { key: 'highlightText', label: 'Highlight Text' },
  { key: 'greetingColor', label: 'Greeting Color' },
  { key: 'buttonText', label: 'Button Text' },
  { key: 'actionButtonText', label: 'Action Button Text' },
  { key: 'buttonBackground', label: 'Button Background' },
  { key: 'buttonBorderColor', label: 'Button Border Color' },
  { key: 'actionButtonBackground', label: 'Action Button Background' },
  { key: 'actionButtonBorderColor', label: 'Action Button Border Color' },
  { key: 'footerText', label: 'Footer Text' },
  { key: 'footerBackground', label: 'Footer Background' },
  { key: 'backgroundColor', label: 'Background Color' },
  { key: 'highlightBackground', label: 'Highlight Background' },
];

const EMAIL_BODY_TEMPLATE = `
<!-- GREETING -->
<tr>
  <td style="padding:22px 34px; border-bottom:1px solid {{theme.secondaryColor}}">
    <p style="font-size:23px; font-weight:600; margin:0 0 10px; color:{{theme.greetingColor}}; font-family:'Sora',Arial,sans-serif;">
      Dear {{name}},
    </p>
    <p style="font-size:16px; line-height:24px; margin:0 0 8px; color:{{theme.textColor}}; font-family:'Roboto',Arial,sans-serif;">
      Thank you for applying for the <b>{{position}}</b> position at
      <b>{{companyName}}</b>. After reviewing your profile, we would like to invite you to a
      screening call with our AI agent <b>Iris</b>.
    </p>
    <p style="font-size:16px; line-height:24px; margin:0; color:{{theme.textColor}}; font-family:'Roboto',Arial,sans-serif;">
      This phone interview will be recorded and analyzed to help us understand your
      communication skills and experience.
    </p>
  </td>
</tr>

<!-- SCHEDULING -->
<tr>
  <td style="padding:22px 34px; border-bottom:1px solid {{theme.secondaryColor}}">
    <h3 style="font-size:20px; font-weight:600; margin:0 0 8px; color:{{theme.titleColor}}; font-family:'Sora',Arial,sans-serif;">
      Next Steps &ndash; {{templateType}} Your Interview
    </h3>
    <p style="font-size:15px; margin:0 0 10px; color:{{theme.textColor}}; font-family:'Roboto',Arial,sans-serif;">
      Please select a time slot that works best for you.
    </p>
    <div style="margin:10px 0;">
      <span
         style="background:{{theme.actionButtonBackground}}; color:{{theme.actionButtonText}}; border:2px solid {{theme.actionButtonBorderColor}}; padding:12px 32px; display:inline-block; border-radius:{{actionButtonBorderRadius}}; text-decoration:none; font-size:15px; font-weight:600; margin-right:8px; font-family:'Roboto',Arial,sans-serif; cursor:default;">
        Call Now
      </span>
      <span
         style="background:{{theme.buttonBackground}}; color:{{theme.buttonText}}; border:2px solid {{theme.buttonBorderColor}}; padding:12px 32px; display:inline-block; border-radius:{{buttonBorderRadius}}; text-decoration:none; font-size:15px; font-weight:600; font-family:'Roboto',Arial,sans-serif; cursor:default;">
        Schedule Interview
      </span>
    </div>
    <p style="font-size:15px; margin:8px 0; color:{{theme.textColor}}; font-family:'Roboto',Arial,sans-serif;">
      <strong>Or paste this link:</strong>
      <span style="word-break:break-word; color:{{theme.actionButtonBackground}};">
        {{schedulingLink}}
      </span>
    </p>
    <div style="background:{{theme.highlightBackground}}; padding:12px; border-radius:6px; text-align:center; font-size:15px; color:{{theme.highlightText}}; font-family:'Roboto',Arial,sans-serif;">
      Please schedule your interview within <b>{{hoursToRespond}}</b> hours.
    </div>
  </td>
</tr>

<!-- INTERVIEW DETAILS -->
<tr>
  <td style="padding:22px 34px; border-bottom:1px solid {{theme.secondaryColor}}">
    <h3 style="font-size:20px; font-weight:600; margin:0 0 8px; color:{{theme.titleColor}}; font-family:'Sora',Arial,sans-serif;">
      Interview Round Details
    </h3>
    <p style="margin:4px 0; color:{{theme.textColor}}; font-family:'Roboto',Arial,sans-serif;">Duration: <b>{{duration}}</b></p>
    <p style="margin:4px 0; color:{{theme.textColor}}; font-family:'Roboto',Arial,sans-serif;">Mode: <b>{{interviewMode}}</b></p>
    <p style="margin:4px 0; color:{{theme.textColor}}; font-family:'Roboto',Arial,sans-serif;">Phone Number: <b>{{phoneCode}}</b> <b>{{phoneNumber}}</b></p>
    <p style="margin-top:6px; color:{{theme.textColor}}; font-family:'Roboto',Arial,sans-serif;">
      Iris will call you at your scheduled time.
    </p>
  </td>
</tr>

<!-- WHAT TO EXPECT -->
<tr>
  <td style="padding:22px 34px; border-bottom:1px solid {{theme.secondaryColor}}">
    <h3 style="font-size:20px; font-weight:600; margin:0 0 6px; color:{{theme.titleColor}}; font-family:'Sora',Arial,sans-serif;">
      What to Expect from Iris
    </h3>
    <ul style="font-size:15px; line-height:22px; margin:6px 0 0; padding-left:20px; color:{{theme.textColor}}; font-family:'Roboto',Arial,sans-serif;">
      <li>AI-guided interview</li>
      <li>Audio-only phone conversation</li>
      <li>Focus on communication</li>
      <li>Reviewed by hiring team</li>
    </ul>
  </td>
</tr>

<!-- TIPS -->
<tr>
  <td style="padding:22px 34px; border-bottom:1px solid {{theme.secondaryColor}}">
    <h3 style="font-size:20px; font-weight:600; margin:0 0 6px; color:{{theme.titleColor}}; font-family:'Sora',Arial,sans-serif;">
      Tips to Prepare
    </h3>
    <ul style="font-size:15px; line-height:22px; margin:6px 0 0; padding-left:20px; color:{{theme.textColor}}; font-family:'Roboto',Arial,sans-serif;">
      <li>Quiet environment</li>
      <li>Phone fully charged</li>
      <li>No installation needed</li>
      <li>Wait until call ends</li>
    </ul>
  </td>
</tr>

<!-- CLOSING -->
<tr>
  <td style="padding:18px 34px;">
    <p style="font-size:15px; margin:0; color:{{theme.textColor}}; font-family:'Roboto',Arial,sans-serif;">
      Best Regards,<br/>
      <b>{{companyName}}</b>
    </p>
  </td>
</tr>
`;

/* ─────────────────────────────── Helpers ────────────────────────────── */

const replaceTokens = (template: string, tokens: Record<string, string>): string =>
  Object.entries(tokens).reduce((acc, [key, val]) => acc.split(`{{${key}}}`).join(val), template);

const buildFullHTML = (theme: ThemeColors, bannerUrl: string | null): string => {
  const tokens: Record<string, string> = {
    'theme.primaryColor': theme.primaryColor,
    'theme.secondaryColor': theme.secondaryColor,
    'theme.textColor': theme.textColor,
    'theme.titleColor': theme.titleColor,
    'theme.highlightText': theme.highlightText,
    'theme.greetingColor': theme.greetingColor,
    'theme.buttonText': theme.buttonText,
    'theme.actionButtonText': theme.actionButtonText,
    'theme.buttonBackground': theme.buttonBackground,
    'theme.buttonBorderColor': theme.buttonBorderColor,
    'theme.buttonBorderRadius': BUTTON_BORDER_RADIUS,
    'theme.actionButtonBackground': theme.actionButtonBackground,
    'theme.actionButtonBorderColor': theme.actionButtonBorderColor,
    'theme.actionButtonBorderRadius': BUTTON_BORDER_RADIUS,
    'theme.footerText': theme.footerText,
    'theme.footerBackground': theme.footerBackground,
    'theme.backgroundColor': theme.backgroundColor,
    'theme.highlightBackground': theme.highlightBackground,
    buttonBorderRadius: BUTTON_BORDER_RADIUS,
    actionButtonBorderRadius: BUTTON_BORDER_RADIUS,
    name: '#Candidate Name',
    position: '#Position Name',
    companyName: '#Company Name',
    schedulingLink: 'https://interview.careerforcepro.com/schedule/abc123',
    callMeNowPrivateLink: 'https://interview.careerforcepro.com/call/abc123',
    hoursToRespond: '48',
    duration: 'Approximately 15 minutes',
    interviewMode: 'Phone (audio-only)',
    phoneCode: '+1',
    phoneNumber: '(555) 123-4567',
    templateType: 'Reschedule',
  };

  const body = replaceTokens(EMAIL_BODY_TEMPLATE, tokens);

  const bannerContent = bannerUrl
    ? `<img src="${bannerUrl}" style="width:100%; height:auto; display:block;" alt="Banner"/>`
    : `<img src="/cfpBanner.png" style="width:100%; height:auto; display:block;" alt="CareerForce Pro"/>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 12px 0; background: ${theme.backgroundColor}; }
    a { text-decoration: none; }
  </style>
</head>
<body>
  <table cellpadding="0" cellspacing="0" width="100%"
    style="max-width:600px; margin:0 auto; background:${theme.backgroundColor}; border-collapse:collapse; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
    <!-- BANNER -->
    <tr>
      <td style="background:${theme.primaryColor}; padding:0; text-align:center; line-height:0;">
        ${bannerContent}
      </td>
    </tr>

    ${body}

    <!-- FOOTER -->
    <tr>
      <td style="background:${theme.footerBackground}; color:${theme.footerText}; text-align:center; padding:20px 34px;">
        <p style="font-size:13px; font-family:'Roboto',Arial,sans-serif; margin:0 0 10px; font-weight:600;">
          Copyright &copy;2026 careerforce.pro All Rights Reserved.
        </p>
        <p style="font-size:11px; font-family:'Roboto',Arial,sans-serif; color:rgba(255,255,255,0.55); margin:0; line-height:16px;">
          Disclaimer: This e-mail message is intended for the use of the individual or entity to
          which it is addressed and may contain confidential information or the results of the
          message or of the attachments. If you are not the intended recipient, you are hereby
          notified that any disclosure, distribution, or copying of this communication or its
          attachments is strictly prohibited.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/* ─────────────────────────────── ColorField ─────────────────────────── */

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange }) => {
  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    let v = e.target.value;
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-gray-500 font-medium roboto-font">{label}</span>
      <div className="flex items-center gap-3">
        <ColorPicker
          value={value}
          format="hex"
          disabledAlpha
          onChange={(color) => onChange(color.toHexString())}
        >
          <div
            className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer flex-shrink-0 shadow-sm hover:scale-105 transition-transform"
            style={{ backgroundColor: value }}
          />
        </ColorPicker>
        <div className="flex-1 border border-gray-200 rounded-full h-10 flex items-center px-4 bg-white hover:border-gray-300 transition-colors">
          <input
            type="text"
            value={value.toUpperCase()}
            onChange={handleHexInput}
            className="w-full text-sm text-gray-700 font-mono bg-transparent outline-none roboto-font"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────── EmailTemplateConfigAdminTab ───────────────── */

const EmailTemplateConfigAdminTab: React.FC = () => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [theme, setTheme] = useState<ThemeColors>(DEFAULT_THEME);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerFileName, setBannerFileName] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerError, setBannerError] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [iframeContentHeight, setIframeContentHeight] = useState<number>(1200);
  const [isBannerImageLoading, setIsBannerImageLoading] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedThemeRef = useRef<ThemeColors>(DEFAULT_THEME);
  const savedBannerUrlRef = useRef<string | null>(null);

  const [saveEmailTemplateConfig, { isLoading: isSaving }] = useSaveEmailTemplateConfigMutation();

  /* ── Companies dropdown ─────────────────────────────────────── */
  const { data: companiesRaw = [], isLoading: companiesLoading } = useGetCompaniesDropdownQuery();
  const companies = companiesRaw.filter((c) => !c.owner);

  /* ── Fetch config for selected company ──────────────────────── */
  const {
    data: configData,
    isLoading: isConfigLoading,
    isError: isConfigError,
  } = useGetEmailTemplateConfigQuery(selectedCompanyId as number, {
    skip: selectedCompanyId === null,
  });

  /* ── Reset all state when company changes ───────────────────── */
  const handleCompanyChange = (companyId: number): void => {
    setSelectedCompanyId(companyId);
    setTheme(DEFAULT_THEME);
    setBannerUrl(null);
    setBannerFileName(null);
    setBannerFile(null);
    setBannerError(false);
    setIsDirty(false);
    setIsBannerImageLoading(false);
    setIsPreviewLoading(false);
    savedThemeRef.current = DEFAULT_THEME;
    savedBannerUrlRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Populate state from API response ───────────────────────── */
  useEffect(() => {
    if (!configData) return;
    const t = configData.themeConfig;
    const loaded: ThemeColors = {
      primaryColor: t.primaryColor ?? DEFAULT_THEME.primaryColor,
      secondaryColor: t.secondaryColor ?? DEFAULT_THEME.secondaryColor,
      backgroundColor: t.backgroundColor ?? DEFAULT_THEME.backgroundColor,
      textColor: t.textColor ?? DEFAULT_THEME.textColor,
      titleColor: t.titleColor ?? DEFAULT_THEME.titleColor,
      greetingColor: t.greetingColor ?? DEFAULT_THEME.greetingColor,
      buttonBackground: t.buttonBackground ?? DEFAULT_THEME.buttonBackground,
      buttonText: t.buttonText ?? DEFAULT_THEME.buttonText,
      buttonBorderColor: t.buttonBorderColor ?? DEFAULT_THEME.buttonBorderColor,
      highlightBackground: t.highlightBackground ?? DEFAULT_THEME.highlightBackground,
      highlightText: t.highlightText ?? DEFAULT_THEME.highlightText,
      footerBackground: t.footerBackground ?? DEFAULT_THEME.footerBackground,
      footerText: t.footerText ?? DEFAULT_THEME.footerText,
      actionButtonText: t.actionButtonText ?? DEFAULT_THEME.actionButtonText,
      actionButtonBackground: t.actionButtonBackground ?? DEFAULT_THEME.actionButtonBackground,
      actionButtonBorderColor: t.actionButtonBorderColor ?? DEFAULT_THEME.actionButtonBorderColor,
    };
    setTheme(loaded);
    savedThemeRef.current = loaded;

    const bannerImageUrl = configData.inlineImages?.bannerCid?.url ?? null;
    setBannerUrl(bannerImageUrl);
    setBannerFileName(bannerImageUrl ? 'Banner Image' : null);
    savedBannerUrlRef.current = bannerImageUrl;
    if (bannerImageUrl) {
      setIsBannerImageLoading(true);
      setIsPreviewLoading(true);
    }
    setIsDirty(false);
  }, [configData]);

  const previewHTML = useMemo(() => buildFullHTML(theme, bannerUrl), [theme, bannerUrl]);

  const handleColorChange = useCallback(
    (key: keyof ThemeColors, value: string): void => {
      setTheme((prev) => {
        const next = { ...prev, [key]: value };
        const saved = savedThemeRef.current;
        const themeChanged = (Object.keys(next) as (keyof ThemeColors)[]).some(
          (k) => next[k] !== saved[k]
        );
        setIsDirty(themeChanged || bannerFile !== null);
        return next;
      });
    },
    [bannerFile]
  );

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast({ type: 'error', message: 'File size must be less than 5 MB' });
      return;
    }
    if (bannerUrl && bannerFile) URL.revokeObjectURL(bannerUrl);
    setBannerFile(file);
    setBannerUrl(URL.createObjectURL(file));
    setBannerFileName(file.name);
    setBannerError(false);
    setIsDirty(true);
  };

  const handleReset = (): void => {
    setTheme(savedThemeRef.current);
    if (bannerUrl && bannerFile) URL.revokeObjectURL(bannerUrl);
    setBannerUrl(savedBannerUrlRef.current);
    setBannerFileName(savedBannerUrlRef.current ? 'Banner Image' : null);
    setBannerFile(null);
    setBannerError(false);
    setIsDirty(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSavePublish = (): void => {
    if (!selectedCompanyId) {
      showToast({ type: 'error', message: 'Please select a company first.' });
      return;
    }
    if (!bannerUrl) {
      setBannerError(true);
      showToast({ type: 'error', message: 'Please upload a banner image.' });
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = async (): Promise<void> => {
    try {
      await saveEmailTemplateConfig({
        companyId: selectedCompanyId as number,
        template: 'default',
        enabled: true,
        themeConfig: {
          ...theme,
          buttonBorderRadius: '60px',
          actionButtonBorderRadius: '60px',
        },
        bannerFile: bannerFile ?? undefined,
      }).unwrap();
      showToast({ type: 'success', message: 'Email template config saved successfully.' });
      savedThemeRef.current = { ...theme };
      savedBannerUrlRef.current = bannerUrl as string;
      setBannerFile(null);
      setIsDirty(false);
      setIsConfirmModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      showToast({ type: 'error', message: 'Failed to save email template config.' });
    }
  };

  const handleFullScreen = (): void => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(previewHTML);
      win.document.close();
    }
  };

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>): void => {
    try {
      const h = e.currentTarget.contentDocument?.documentElement?.scrollHeight ?? 1200;
      setIframeContentHeight(Math.max(h, 600));
    } catch {
      setIframeContentHeight(1200);
    }
    setIsPreviewLoading(false);
  };

  return (
    <div>
      {/* Company selector */}
      <div className="mb-6">
        <span className="block text-sm font-medium text-gray-700 mb-2 roboto-font">Company</span>
        <Select
          placeholder="Select a company"
          loading={companiesLoading}
          value={selectedCompanyId ?? undefined}
          onChange={handleCompanyChange}
          showSearch
          filterOption={(input, option) =>
            String(option?.label ?? '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          options={companies.map((c) => ({ value: c.id, label: c.companyName }))}
          className="w-72"
          size="large"
        />
      </div>

      <Spin spinning={isConfigLoading}>
        {selectedCompanyId === null && (
          <div className="flex items-center justify-center h-64 text-gray-400 roboto-font text-sm">
            Select a company above to load its email template configuration.
          </div>
        )}

        {selectedCompanyId !== null && isConfigError && !isConfigLoading && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm roboto-font">
            No saved configuration found for this company. You can set up the email template below
            and save it.
          </div>
        )}

        {selectedCompanyId !== null && (
          <>
            {/* Two-column layout */}
            <div className="flex gap-6 items-start">
              {/* ── Left panel ─────────────────────────────────────────── */}
              <div className="flex-1 min-w-0 border border-gray-200 rounded-2xl p-6 bg-white">
                {/* Banner Image */}
                <section className="mb-8">
                  <h3 className="heading-font text-base font-semibold text-gray-800 mb-1">
                    Banner Image
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 roboto-font">
                    A banner image displayed at the top of your emails. Upload email banner image.
                    Recommended file size: less than 5 MB | File Resolution: 1200x500 pixels.
                  </p>

                  <div
                    className={`border-2 border-dashed rounded-xl py-10 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                      bannerError
                        ? 'border-red-400 bg-red-50/30 hover:border-red-500'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/20'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {bannerUrl ? (
                      <Spin spinning={isBannerImageLoading}>
                        <img
                          src={bannerUrl}
                          alt="Banner preview"
                          className="max-h-24 max-w-full object-contain rounded"
                          onLoad={() => setIsBannerImageLoading(false)}
                          onError={() => setIsBannerImageLoading(false)}
                        />
                      </Spin>
                    ) : (
                      <AiOutlineCloudUpload
                        className={`text-4xl ${bannerError ? 'text-red-400' : 'text-gray-400'}`}
                      />
                    )}
                    <p
                      className={`text-sm roboto-font ${bannerError ? 'text-red-400' : 'text-gray-500'}`}
                    >
                      {bannerFileName ?? 'Upload Banner Image'}
                    </p>
                  </div>
                  {bannerError && (
                    <p className="text-xs text-red-500 mt-1 roboto-font">
                      Banner image is required.
                    </p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleBannerUpload}
                  />
                </section>

                {/* Brand Color */}
                <section>
                  <h3 className="heading-font text-base font-semibold text-gray-800 mb-1">
                    Brand Color
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 roboto-font">
                    Define the colors for Email Template. These colors will be used throughout your
                    email templates for buttons, headings, text and other design elements.
                  </p>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-5">
                    {COLOR_FIELDS.map(({ key, label }) => (
                      <ColorField
                        key={key}
                        label={label}
                        value={theme[key]}
                        onChange={(val) => handleColorChange(key, val)}
                      />
                    ))}
                  </div>
                </section>
              </div>

              {/* ── Right panel – Live Preview ─────────────────────────── */}
              <div className="w-[360px] flex-shrink-0 sticky top-4">
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm relative">
                  {isPreviewLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-2xl">
                      <Spin size="large" />
                    </div>
                  )}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="heading-font text-sm font-semibold text-gray-700">
                      Live Preview
                    </span>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: Math.round(iframeContentHeight * (360 / 600)),
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: 600,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transformOrigin: 'top left',
                        transform: `scale(${360 / 600})`,
                      }}
                    >
                      <iframe
                        srcDoc={previewHTML}
                        title="Email Live Preview"
                        style={{
                          width: 600,
                          height: iframeContentHeight,
                          border: 'none',
                          display: 'block',
                        }}
                        sandbox="allow-same-origin"
                        onLoad={handleIframeLoad}
                      />
                    </div>
                  </div>

                  <div className="p-3 border-t border-gray-100 bg-gray-50">
                    <Button
                      className="w-full rounded-full h-10 bg-[#004BE0] text-white text-sm font-semibold hover:bg-blue-700 roboto-font flex items-center justify-center"
                      onClick={handleFullScreen}
                    >
                      FULL SCREEN PREVIEW
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom action buttons */}
            <div className="flex justify-center gap-4 mt-8 pb-4">
              <Button
                className="px-14 h-11 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-full font-semibold text-sm roboto-font"
                onClick={handleReset}
                disabled={!isDirty || isSaving}
              >
                RESET
              </Button>
              <Button
                className="px-14 h-11 bg-[#004BE0] text-white hover:bg-blue-700 rounded-full font-semibold text-sm roboto-font disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSavePublish}
                loading={isSaving}
                disabled={!isDirty || isSaving}
              >
                SAVE &amp; PUBLISH
              </Button>
            </div>
          </>
        )}

        <Modal
          open={isConfirmModalOpen}
          onCancel={() => setIsConfirmModalOpen(false)}
          footer={null}
          centered
          closable={false}
          width={480}
          styles={{ content: { borderRadius: '16px', padding: '32px 24px 24px' } }}
        >
          <div className="text-center">
            <h3 className="heading-font text-xl font-semibold text-gray-900 mb-3">
              Publish Email Template
            </h3>
            <p className="text-sm text-gray-600 roboto-font mb-6">
              Are you sure you want to publish the changes across all Email Templates?
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1 h-11 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-full font-semibold text-sm roboto-font"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSaving}
              >
                NO
              </Button>
              <Button
                className="flex-1 h-11 bg-[#004BE0] text-white hover:bg-blue-700 rounded-full font-semibold text-sm roboto-font"
                onClick={handleConfirmSave}
                loading={isSaving}
              >
                YES
              </Button>
            </div>
          </div>
        </Modal>
      </Spin>
    </div>
  );
};

export default EmailTemplateConfigAdminTab;
