import api from '../../index';

export type QrCodeItem = {
  id: number;
  companyId: number;
  name: string;
  qrType: string;
  masterQr: boolean;
  qrToken: string;
  publicUrl: string;
  active: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  mappedJobIds: number[];
  qrCodeImageBase64: string;
};

export type QrListResponse = {
  success: boolean;
  message: string;
  data: QrCodeItem[];
};

export type ToggleQrActiveResponse = {
  success: boolean;
  message: string;
  data: {
    success: boolean;
    message: string;
    qrCode: QrCodeItem;
  };
};

type QrListParams = {
  companyId: number;
  status?: 'all' | 'active' | 'inactive';
};

type ToggleQrActiveParams = {
  qrId: number;
  active: boolean;
};

export type GenerateQrResponse = {
  success: boolean;
  message: string;
  data: {
    id: number;
    companyId: number;
    qrToken: string;
    publicUrl: string;
    qrCodeImageBase64: string;
    alreadyExisted: boolean;
  };
};

const qrCodeApi = api.injectEndpoints({
  endpoints: (build) => ({
    getQrList: build.query<QrListResponse, QrListParams>({
      query: ({ companyId, status = 'all' }) => ({
        url: '/company/qr/list',
        method: 'GET',
        params: { companyId, status },
      }),
      providesTags: ['QrCodes'],
    }),
    generateQr: build.mutation<GenerateQrResponse, { companyId: number }>({
      query: ({ companyId }) => ({
        url: '/company/qr/generate',
        method: 'POST',
        params: { companyId },
      }),
      invalidatesTags: ['QrCodes'],
    }),
    toggleQrActive: build.mutation<ToggleQrActiveResponse, ToggleQrActiveParams>({
      query: ({ qrId, active }) => ({
        url: `/company/qr/${qrId}/active`,
        method: 'PATCH',
        params: { active },
      }),
      invalidatesTags: ['QrCodes'],
    }),
  }),
});

export const { useGetQrListQuery, useGenerateQrMutation, useToggleQrActiveMutation } = qrCodeApi;
