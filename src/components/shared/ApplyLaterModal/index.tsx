import { useRef, useState } from 'react';
import { Input, Modal } from 'antd';
import ReCAPTCHA from 'react-google-recaptcha';
import { toast } from 'react-toastify';
import { useApplyLaterMutation } from '../../../api/candidate-service/PublicQr/index';

interface ApplyLaterModalProps {
  open: boolean;
  qrCode: string;
  jobId?: number;
  onClose: () => void;
}

export const ApplyLaterModal = ({ open, qrCode, jobId, onClose }: ApplyLaterModalProps) => {
  const [applyLater, { isLoading }] = useApplyLaterMutation();
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [captchaError, setCaptchaError] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleClose = () => {
    setEmail('');
    setCaptchaToken(null);
    setEmailError(false);
    setCaptchaError(false);
    recaptchaRef.current?.reset();
    onClose();
  };

  const handleSubmit = async () => {
    const noEmail = !email.trim();
    const noCaptcha = !captchaToken;
    setEmailError(noEmail);
    setCaptchaError(noCaptcha);
    if (noEmail || noCaptcha) return;

    try {
      const res = await applyLater({
        qrCode,
        body: {
          email: email.trim(),
          ...(jobId !== undefined ? { jobId } : {}),
          captchaToken,
        },
      }).unwrap();
      toast.success(res.message || 'Job link has been sent to your email.');
      handleClose();
    } catch (err) {
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      setCaptchaError(false);
      const apiMessage = (err as { data?: { message?: string } })?.data?.message;
      toast.error(apiMessage ?? 'Failed. Please try again.');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      closable
      width={380}
      styles={{ content: { borderRadius: 24, padding: '28px 24px' } }}
      title={<span className="text-xl font-bold text-gray-900">APPLY LATER</span>}
    >
      <div className="flex flex-col gap-5 pt-1">
        <p className="text-sm text-gray-500 leading-relaxed">
          Enter your email address and we&apos;ll send you a direct link to this list so you can
          apply when you&apos;re ready.
        </p>

        <div>
          <label htmlFor="al-email" className="block text-sm font-medium text-gray-800 mb-2">
            Email<span className="text-brand-500">*</span>
          </label>
          <Input
            id="al-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (e.target.value.trim()) setEmailError(false);
            }}
            placeholder="john.doe@example.com"
            className="rounded-full"
            style={{
              height: 48,
              paddingLeft: 18,
              paddingRight: 18,
              borderColor: emailError ? '#ef4444' : undefined,
            }}
            onPressEnter={() => void handleSubmit()}
          />
          {emailError && <p className="text-sm text-red-500 mt-1">Email is required</p>}
        </div>

        <div>
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY as string}
            onChange={(token) => {
              setCaptchaToken(token);
              if (token) setCaptchaError(false);
            }}
            onExpired={() => setCaptchaToken(null)}
          />
          {captchaError && (
            <p className="text-sm text-red-500 mt-1">Please confirm you are not a robot</p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => void handleSubmit()}
            disabled={isLoading}
            className="w-full bg-black text-white font-bold tracking-widest text-sm py-3.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-60"
          >
            {isLoading ? 'SENDING...' : 'SEND EMAIL LINK'}
          </button>
          <button
            onClick={handleClose}
            className="w-full border-2 border-gray-900 text-gray-900 font-bold tracking-widest text-sm py-3.5 rounded-full hover:bg-gray-50 active:scale-95 transition-all"
          >
            CANCEL
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ApplyLaterModal;
