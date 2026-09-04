import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Upload } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { FiUploadCloud } from 'react-icons/fi';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { Button, Input, PhoneNumberField, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { useSessionTenantId } from '../../../../hooks/useSessionTenantId';
import {
  useUploadCandidateResumeMutation,
  useCreateCandidateMutation,
} from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import {
  isPhoneValidForCountry,
  PHONE_VALIDATION_MESSAGE,
  toE164,
} from '../../../../shared/utils/validation/phoneValidation';

// Same default every other phone field in this app starts from.
const DEFAULT_COUNTRY_CODE = '+1';

// New — manual single-candidate entry, the two-step flow
// FRONTEND_INTEGRATION_DETAILS.md §4.1 describes: `POST /candidates/resume`
// first (gets a `resume_s3_key`), then `POST /candidates` with that key plus
// whatever the recruiter typed. Every field below except the resume itself
// is optional on the real contract (`ApplyRequest`) — first/last name are
// required here only as a client-side UX floor (an unnamed candidate row is
// impractical to work with), not because the backend rejects their absence.
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

const AddCandidateModal = ({ open, onClose }: AddCandidateModalProps) => {
  const { id: jobOpeningId } = useParams<{ id: string }>();
  const organizationId = useSessionTenantId();

  const [file, setFile] = useState<File | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [address, setAddress] = useState('');

  const [uploadResume, { isLoading: isUploading }] = useUploadCandidateResumeMutation();
  const [createCandidate, { isLoading: isCreating }] = useCreateCandidateMutation();
  const isSubmitting = isUploading || isCreating;

  const reset = () => {
    setFile(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setCountryCode(DEFAULT_COUNTRY_CODE);
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

  const handleSubmit = async () => {
    if (!jobOpeningId || !organizationId) {
      showToast({ message: 'Job opening or organization is missing.', type: 'error' });
      return;
    }
    if (!file) {
      showToast({ message: 'A resume file is required.', type: 'error' });
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      showToast({ message: 'First and last name are required.', type: 'error' });
      return;
    }
    if (phone.trim() && !isPhoneValidForCountry(phone, countryCode)) {
      showToast({ message: PHONE_VALIDATION_MESSAGE, type: 'error' });
      return;
    }

    try {
      const { resume_s3_key } = await uploadResume({
        organizationId,
        jobOpeningId,
        file,
      }).unwrap();

      await createCandidate({
        organizationId,
        jobOpeningId,
        resumeS3Key: resume_s3_key,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailId: email.trim() || undefined,
        contactNo: phone.trim() ? toE164(countryCode, phone) : undefined,
        qualification: qualification.trim() || undefined,
        address: address.trim() || undefined,
      }).unwrap();

      showToast({ message: 'Candidate added.', type: 'success' });
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              Phone
            </label>
            <PhoneNumberField
              countryCode={countryCode}
              onCountryCodeChange={setCountryCode}
              phoneNumber={phone}
              onPhoneNumberChange={setPhone}
              className="h-10 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label htmlFor="add-candidate-qualification" className="mb-1 block text-sm text-gray-800">
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

        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
          className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {isUploading ? 'UPLOADING…' : isCreating ? 'ADDING…' : 'ADD CANDIDATE'}
        </Button>
      </div>
    </AntdCommonModal>
  );
};

export default AddCandidateModal;
