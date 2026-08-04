import React, { useState } from 'react';
import { Modal } from 'antd';
import {
  useGetQrListQuery,
  useGenerateQrMutation,
  useToggleQrActiveMutation,
} from '../../api/tenant-service/MyCompany/qrCode';
import { QrCodeCard } from '../shared/ui/QrCodeCard';
import { showToast } from '../shared/ui/toast';
import { Button } from '../shared/ui/button';

type QrManagementTabProps = {
  companyId: number;
};

const QrManagementTab: React.FC<QrManagementTabProps> = ({ companyId }) => {
  const { data, isLoading } = useGetQrListQuery({ companyId, status: 'all' }, { skip: !companyId });

  const [toggleQrActive, { isLoading: isTogglingActive }] = useToggleQrActiveMutation();
  const [generateQr, { isLoading: isGenerating }] = useGenerateQrMutation();
  const [showDeactivateModal, setShowDeactivateModal] = useState<boolean>(false);

  const masterQr = data?.data?.find((qr) => qr.masterQr) ?? null;

  const handleGenerate = async (): Promise<void> => {
    try {
      const result = await generateQr({ companyId }).unwrap();
      showToast({ type: 'success', message: result.message || 'QR code generated successfully.' });
    } catch {
      showToast({ type: 'error', message: 'Failed to generate QR code. Please try again.' });
    }
  };

  const handleToggleActive = (active: boolean): void => {
    if (!active) {
      // toggling to inactive — show confirmation first
      setShowDeactivateModal(true);
      return;
    }
    void doToggle(active);
  };

  const doToggle = async (active: boolean): Promise<void> => {
    if (!masterQr) return;
    try {
      const result = await toggleQrActive({ qrId: masterQr.id, active }).unwrap();
      showToast({
        type: 'success',
        message: result.message || `QR code ${active ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch {
      showToast({ type: 'error', message: 'Failed to update QR code status. Please try again.' });
    }
  };

  return (
    <>
      <QrCodeCard
        qrItem={masterQr}
        isLoading={isLoading || isGenerating}
        isTogglingActive={isTogglingActive}
        onGenerate={handleGenerate}
        onToggleActive={handleToggleActive}
        showGenerateButton={!masterQr}
      />

      <Modal
        open={showDeactivateModal}
        onCancel={() => setShowDeactivateModal(false)}
        footer={null}
        centered
        closable={false}
        width={520}
      >
        <div className="flex flex-col items-center gap-6 py-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Deactivate QR Code</h2>
          <p className="text-gray-500 text-base leading-relaxed">
            Once deactivated, candidates will no longer be able to apply using this QR code.
            <br />
            Do you want to continue?
          </p>
          <div className="flex gap-4 w-full mt-2">
            <Button
              onClick={() => setShowDeactivateModal(false)}
              className="flex-1 h-12 bg-white text-gray-800 border border-gray-300 rounded-full font-bold text-sm tracking-widest hover:bg-gray-50 transition-colors"
            >
              NO
            </Button>
            <Button
              onClick={() => {
                setShowDeactivateModal(false);
                void doToggle(false);
              }}
              loading={isTogglingActive}
              className="flex-1 h-12 bg-[#1B4DFF] text-white rounded-full font-bold text-sm tracking-widest hover:opacity-90 transition-opacity"
            >
              YES
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default QrManagementTab;
