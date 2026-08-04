import React, { useState } from 'react';
import { Select, Switch, Tooltip, Modal } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Button } from './button';
export type QrCodeItem = {
  qrCodeImageBase64: string;
  active: boolean;
  publicUrl: string;
  companyId: number;
  name?: string;
};

const { Option } = Select;

type SelectOption = 'png' | 'svg' | 'html' | 'react';

export type QrCodeCardProps = {
  title?: string;
  subtitle?: string;
  qrItem?: QrCodeItem | null;
  isLoading?: boolean;
  onGenerate?: () => void;
  onToggleActive?: (active: boolean) => void;
  isTogglingActive?: boolean;
  showGenerateButton?: boolean;
  showToggle?: boolean;
};

const downloadBase64Image = (base64: string, format: 'png' | 'svg', fileName: string): void => {
  let dataUrl: string;
  if (format === 'svg') {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200"><image href="data:image/png;base64,${base64}" width="200" height="200"/></svg>`;
    dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  } else {
    const raw = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    dataUrl = raw;
  }
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${fileName}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const buildSnippet = (format: 'html' | 'react', publicUrl: string, companyId: number): string => {
  if (format === 'html') {
    return `<div id="jobs-qr-embed"></div>\n<script\n  src="${publicUrl}"\n  data-company="${companyId}"></script>`;
  }
  return `import QrEmbed from '@careerforcepro/qr-embed';\n\nexport default function JobsQr() {\n  return <QrEmbed url="${publicUrl}" companyId={${companyId}} />;\n}`;
};

const QrPlaceholderIcon: React.FC = () => {
  const grey = '#D1D5DB';
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="8" y="8" width="40" height="40" rx="4" stroke={grey} strokeWidth="4" fill="none" />
      <rect x="18" y="18" width="20" height="20" rx="2" fill={grey} />
      <rect x="72" y="8" width="40" height="40" rx="4" stroke={grey} strokeWidth="4" fill="none" />
      <rect x="82" y="18" width="20" height="20" rx="2" fill={grey} />
      <rect x="8" y="72" width="40" height="40" rx="4" stroke={grey} strokeWidth="4" fill="none" />
      <rect x="18" y="82" width="20" height="20" rx="2" fill={grey} />
      <rect x="72" y="56" width="8" height="8" fill={grey} />
      <rect x="88" y="56" width="8" height="8" fill={grey} />
      <rect x="104" y="56" width="8" height="8" fill={grey} />
      <rect x="72" y="72" width="8" height="8" fill={grey} />
      <rect x="88" y="72" width="24" height="8" fill={grey} />
      <rect x="72" y="88" width="8" height="8" fill={grey} />
      <rect x="88" y="88" width="8" height="8" fill={grey} />
      <rect x="104" y="88" width="8" height="8" fill={grey} />
      <rect x="56" y="8" width="8" height="8" fill={grey} />
      <rect x="56" y="24" width="8" height="8" fill={grey} />
      <rect x="56" y="40" width="8" height="8" fill={grey} />
      <rect x="8" y="56" width="8" height="8" fill={grey} />
      <rect x="24" y="56" width="8" height="8" fill={grey} />
      <rect x="40" y="56" width="8" height="8" fill={grey} />
      <rect x="56" y="56" width="8" height="8" fill={grey} />
    </svg>
  );
};

export const QrCodeCard: React.FC<QrCodeCardProps> = ({
  title = 'QR Code for Job Openings',
  subtitle,
  qrItem,
  isLoading = false,
  onGenerate,
  onToggleActive,
  isTogglingActive = false,
  showGenerateButton = true,
  showToggle = true,
}) => {
  const [selectedOption, setSelectedOption] = useState<SelectOption>('png');
  const [snippetModalOpen, setSnippetModalOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const hasQr = Boolean(qrItem?.qrCodeImageBase64);
  const isActive = qrItem?.active ?? false;
  const isSnippetOption = selectedOption === 'html' || selectedOption === 'react';

  const defaultSubtitle = hasQr
    ? 'Manage your unique gateway for Talent acquisition and job visibility.'
    : 'Create a secure, trackable entry point for recruitment partners. Configure the target entity and metadata to activate the gateway.';

  const snippetCode = qrItem
    ? buildSnippet(isSnippetOption ? selectedOption : 'html', qrItem.publicUrl, qrItem.companyId)
    : '';

  const handleAction = (): void => {
    if (!qrItem?.qrCodeImageBase64) return;
    if (isSnippetOption) {
      setSnippetModalOpen(true);
    } else {
      downloadBase64Image(
        qrItem.qrCodeImageBase64,
        selectedOption as 'png' | 'svg',
        qrItem.name || 'qr-code'
      );
    }
  };

  const handleCopy = (): void => {
    navigator.clipboard.writeText(snippetCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <div className="flex items-center justify-center py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-md flex flex-col items-center gap-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{subtitle ?? defaultSubtitle}</p>
          </div>

          {/* QR Image */}
          <div className="w-48 h-48 flex items-center justify-center">
            {isLoading ? (
              <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : hasQr && isActive ? (
              <img
                src={`data:image/png;base64,${qrItem!.qrCodeImageBase64}`}
                alt="QR Code"
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <QrPlaceholderIcon />
            )}
          </div>

          {/* Actions */}
          {hasQr ? (
            <>
              {/* Option selector */}
              <Select
                value={selectedOption}
                onChange={(val: SelectOption) => setSelectedOption(val)}
                className="w-full"
                placeholder="Select type"
                disabled={!isActive}
              >
                <Option value="png">Download as PNG</Option>
                <Option value="svg">Download as SVG</Option>
                <Option value="html">Generate Code Snippet (HTML)</Option>
                <Option value="react">Generate Code Snippet (React)</Option>
              </Select>

              {/* Action button */}
              <Button
                onClick={handleAction}
                disabled={!isActive}
                className="w-full h-11 bg-[#1B4DFF] text-white rounded-full font-semibold text-sm tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                {isSnippetOption ? 'GENERATE' : 'DOWNLOAD'}
              </Button>

              {/* Toggle active */}
              {showToggle && (
                <div className="flex items-center gap-3 self-start">
                  <Tooltip
                    title={isActive ? 'Click to deactivate QR Code' : 'Click to activate QR Code'}
                  >
                    <Switch
                      checked={!isActive}
                      onChange={(checked: boolean) => onToggleActive?.(!checked)}
                      loading={isTogglingActive}
                    />
                  </Tooltip>
                  <span className="text-sm text-gray-600">Mark QR Code Inactive</span>
                </div>
              )}
            </>
          ) : (
            showGenerateButton && (
              <Button
                onClick={onGenerate}
                disabled={isLoading}
                className="w-full h-11 bg-[#1B4DFF] text-white rounded-full font-semibold text-sm tracking-widest hover:opacity-90 transition-opacity"
              >
                GENERATE QR CODE
              </Button>
            )
          )}
        </div>
      </div>

      {/* Code Snippet Modal */}
      <Modal
        open={snippetModalOpen}
        onCancel={() => setSnippetModalOpen(false)}
        footer={null}
        centered
        width={520}
        closable={false}
      >
        <div className="flex flex-col items-center gap-6 py-2">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">QR Code for Job Openings</h2>
            <p className="text-sm text-gray-500">
              Paste this snippet into your careers page to display the QR code and direct link.
            </p>
          </div>

          {/* Code block */}
          <pre className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 font-mono whitespace-pre-wrap break-all select-all">
            {snippetCode}
          </pre>

          {/* Buttons */}
          <div className="flex gap-4 w-full">
            <Button
              onClick={() => setSnippetModalOpen(false)}
              className="flex-1 h-11 bg-white text-gray-700 border border-gray-300 rounded-full font-semibold text-sm tracking-widest hover:bg-gray-50 transition-colors"
            >
              CANCEL
            </Button>
            <Button
              onClick={handleCopy}
              className={`flex-1 h-11 rounded-full font-semibold text-sm tracking-widest flex items-center justify-center gap-2 transition-all ${
                copied ? 'bg-green-500 text-white' : 'bg-[#1B4DFF] text-white hover:opacity-90'
              }`}
            >
              {copied ? (
                <>
                  <CheckOutlined />
                  COPIED!
                </>
              ) : (
                <>
                  <CopyOutlined />
                  COPY CODE
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default QrCodeCard;
