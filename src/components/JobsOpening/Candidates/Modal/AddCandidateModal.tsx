import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Upload } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { FiUploadCloud, FiPhoneCall } from 'react-icons/fi';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { Button, Input, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { useSessionTenantId } from '../../../../hooks/useSessionTenantId';
import {
  useUploadCandidateResumeMutation,
  useCreateCandidateMutation,
  useStartInstantIntakeCallMutation,
} from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';

// Manual single-candidate entry, two options — mirrors the careers page's
// own apply choice (CareersApplyChoicePage: resume-first vs instant call),
// just surfaced inline instead of as separate pages:
//
//   * Resume Upload — the original flow. FRONTEND_INTEGRATION_DETAILS.md
//     §4.1: `POST /candidates/resume` first (gets a `resume_s3_key`), then
//     `POST /candidates` with that key plus whatever the recruiter typed.
//     Every field below except the resume itself is optional on the real
//     contract (`ApplyRequest`) — first/last name are required here only as
//     a client-side UX floor, not because the backend rejects their
//     absence. Now also attempts an instant Intake Call right after the
//     candidate is created, same as the QR apply page's resume-first path,
//     when a phone number was given (`ApplyResultView.call_placed`).
//   * Intake Call — no resume yet: `POST /candidates/instant-call`, which
//     creates the candidate and places the call immediately. Phone number
//     is required here (interview-service needs a real number to call).
//
// Same file-type/size limits as `UploadCvModal`'s bulk flow, single file.

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE_MB = 5;

type AddCandidateModalProps = {
  open: boolean;
  onClose: () => void;
};

type AddCandidateMode = 'resume' | 'call';

const AddCandidateModal = ({ open, onClose }: AddCandidateModalProps) => {
  const { id: jobOpeningId } = useParams<{ id: string }>();
  const organizationId = useSessionTenantId();

  const [mode, setMode] = useState<AddCandidateMode>('resume');
  const [file, setFile] = useState<File | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [address, setAddress] = useState('');

  const [uploadResume, { isLoading: isUploading }] = useUploadCandidateResumeMutation();
  const [createCandidate, { isLoading: isCreating }] = useCreateCandidateMutation();
  const [startInstantIntakeCall, { isLoading: isCalling }] = useStartInstantIntakeCallMutation();
  const isSubmitting = isUploading || isCreating || isCalling;

  const reset = () => {
    setMode('resume');
    setFile(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setQualification('');
    setAddress('');
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleFileSelect = (selected: File) => {
    if (!ALLOWED_TYPES.includes(selected.type)) {
      showToast({ message: `${selected.name} is not a valid file type.`, type: 'error' });
      return;
    }
    if (selected.size / 1024 / 1024 > MAX_SIZE_MB) {
      showToast({
        message: `${selected.name} exceeds ${MAX_SIZE_MB}MB size limit.`,
        type: 'error',
      });
      return;
    }
    setFile(selected);
  };

  /** `false` means validation failed and a toast was already shown — the
   * caller must not treat this as a submitted candidate. */
  const handleSubmitResume = async (): Promise<boolean> => {
    if (!file) {
      showToast({ message: 'A resume file is required.', type: 'error' });
      return false;
    }
    if (!jobOpeningId || !organizationId) return false;

    const { resume_s3_key } = await uploadResume({
      organizationId,
      jobOpeningId,
      file,
    }).unwrap();

    const { call_placed } = await createCandidate({
      organizationId,
      jobOpeningId,
      resumeS3Key: resume_s3_key,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailId: email.trim() || undefined,
      contactNo: phone.trim() || undefined,
      qualification: qualification.trim() || undefined,
      address: address.trim() || undefined,
    }).unwrap();

    showToast({
      message: call_placed ? 'Candidate added — intake call started.' : 'Candidate added.',
      type: 'success',
    });
    return true;
  };

  /** Same `false` convention as `handleSubmitResume`. */
  const handleSubmitInstantCall = async (): Promise<boolean> => {
    if (!phone.trim()) {
      showToast({ message: 'A phone number is required to start an intake call.', type: 'error' });
      return false;
    }
    if (!jobOpeningId || !organizationId) return false;

    const { call_placed } = await startInstantIntakeCall({
      organizationId,
      jobOpeningId,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      emailId: email.trim() || undefined,
      contactNo: phone.trim(),
    }).unwrap();

    showToast({
      message: call_placed
        ? 'Candidate added — intake call started.'
        : 'Candidate added, but the intake call could not be placed.',
      type: call_placed ? 'success' : 'error',
    });
    return true;
  };

  const handleSubmit = async () => {
    if (!jobOpeningId || !organizationId) {
      showToast({ message: 'Job opening or organization is missing.', type: 'error' });
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      showToast({ message: 'First and last name are required.', type: 'error' });
      return;
    }

    try {
      const submitted =
        mode === 'resume' ? await handleSubmitResume() : await handleSubmitInstantCall();
      if (!submitted) return;
      reset();
      onClose();
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not add candidate'), type: 'error' });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={handleClose}
      title="Add Candidate"
      subtitle="Manually add a candidate to this job"
      modalProps={{ width: 560 }}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-full bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMode('resume')}
            disabled={isSubmitting}
            className={`flex items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-semibold transition-colors ${
              mode === 'resume' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            <FiUploadCloud size={15} /> Resume Upload
          </button>
          <button
            type="button"
            onClick={() => setMode('call')}
            disabled={isSubmitting}
            className={`flex items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-semibold transition-colors ${
              mode === 'call' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            <FiPhoneCall size={15} /> Intake Call
          </button>
        </div>

        {mode === 'resume' ? (
          <div>
            <div className="mb-1 text-sm text-gray-800">
              Resume <span className="required-asterisk">*</span>
            </div>
            {file ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-green-600">
                <span className="truncate">{file.name}</span>
                <RiDeleteBin6Line
                  className="ml-2 shrink-0 cursor-pointer text-red-500"
                  onClick={() => setFile(null)}
                />
              </div>
            ) : (
              <Upload.Dragger
                beforeUpload={(f) => {
                  handleFileSelect(f);
                  return Upload.LIST_IGNORE;
                }}
                fileList={[]}
                showUploadList={false}
              >
                <div className="flex flex-col items-center py-2">
                  <FiUploadCloud size={28} className="mb-1 text-primary" />
                  <p className="text-xs text-gray-500">Click to upload or drag a resume here</p>
                  <p className="text-[11px] text-gray-400">PDF or DOCX, max {MAX_SIZE_MB}MB</p>
                </div>
              </Upload.Dragger>
            )}
          </div>
        ) : (
          <p className="rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-700">
            No resume needed — we&apos;ll call the candidate right away. Upload a resume for them
            later from their profile.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="add-candidate-first-name" className="mb-1 block text-sm text-gray-800">
              First name <span className="required-asterisk">*</span>
            </label>
            <Input
              id="add-candidate-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 text-sm"
            />
          </div>
          <div>
            <label htmlFor="add-candidate-last-name" className="mb-1 block text-sm text-gray-800">
              Last name <span className="required-asterisk">*</span>
            </label>
            <Input
              id="add-candidate-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="add-candidate-email" className="mb-1 block text-sm text-gray-800">
              Email
            </label>
            <Input
              id="add-candidate-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 text-sm"
            />
          </div>
          <div>
            <label htmlFor="add-candidate-phone" className="mb-1 block text-sm text-gray-800">
              Phone {mode === 'call' && <span className="required-asterisk">*</span>}
            </label>
            <Input
              id="add-candidate-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 text-sm"
            />
          </div>
        </div>

        {mode === 'resume' && (
          <>
            <div>
              <label
                htmlFor="add-candidate-qualification"
                className="mb-1 block text-sm text-gray-800"
              >
                Qualification
              </label>
              <Input
                id="add-candidate-qualification"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="add-candidate-address" className="mb-1 block text-sm text-gray-800">
                Address
              </label>
              <TextArea
                id="add-candidate-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="resize-y rounded-lg text-sm"
              />
            </div>
          </>
        )}

        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
          className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {isUploading
            ? 'UPLOADING…'
            : isCreating
              ? 'ADDING…'
              : isCalling
                ? 'STARTING CALL…'
                : mode === 'call'
                  ? 'START INTAKE CALL'
                  : 'ADD CANDIDATE'}
        </Button>
      </div>
    </AntdCommonModal>
  );
};

export default AddCandidateModal;
