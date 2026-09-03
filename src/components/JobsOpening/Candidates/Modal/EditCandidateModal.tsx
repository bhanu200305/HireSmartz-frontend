import { useEffect, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { Button, Input, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import {
  useUpdateCandidateMutation,
  type CandidateView,
} from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';

// New — `PATCH /candidates/{id}` (`UpdateCandidateRequest`). Every field is
// a genuine partial update: only fields that actually changed are sent, so
// this never clobbers a field the recruiter didn't touch. Deliberately
// excludes `is_referal`/`referred_by`/`referal_code`/`referal_note` and
// `applied_job_location_id` — those describe how/where the candidate
// applied, not something a recruiter edits after the fact; editing them
// here would misrepresent the application's own history.

type EditCandidateModalProps = {
  open: boolean;
  onClose: () => void;
  candidate: CandidateView;
};

const EditCandidateModal = ({ open, onClose, candidate }: EditCandidateModalProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [address, setAddress] = useState('');
  const [updateCandidate, { isLoading }] = useUpdateCandidateMutation();

  useEffect(() => {
    if (open) {
      setFirstName(candidate.first_name ?? '');
      setLastName(candidate.last_name ?? '');
      setEmail(candidate.email_id ?? '');
      setPhone(candidate.contact_no ?? '');
      setQualification(candidate.qualification ?? '');
      setAddress(candidate.address ?? '');
    }
  }, [open, candidate]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showToast({ message: 'First and last name are required.', type: 'error' });
      return;
    }

    // Only send fields that actually changed against the record this modal
    // opened with — a genuine partial update, not "resend everything."
    const body: Record<string, string> = {};
    const nextFirst = firstName.trim();
    const nextLast = lastName.trim();
    const nextEmail = email.trim();
    const nextPhone = phone.trim();
    const nextQualification = qualification.trim();
    const nextAddress = address.trim();
    if (nextFirst !== (candidate.first_name ?? '')) body.first_name = nextFirst;
    if (nextLast !== (candidate.last_name ?? '')) body.last_name = nextLast;
    if (nextEmail !== (candidate.email_id ?? '')) body.email_id = nextEmail;
    if (nextPhone !== (candidate.contact_no ?? '')) body.contact_no = nextPhone;
    if (nextQualification !== (candidate.qualification ?? ''))
      body.qualification = nextQualification;
    if (nextAddress !== (candidate.address ?? '')) body.address = nextAddress;

    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }

    try {
      await updateCandidate({ candidateId: candidate.id, body }).unwrap();
      showToast({ message: 'Candidate updated.', type: 'success' });
      onClose();
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not update candidate'),
        type: 'error',
      });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title="Edit Candidate"
      modalProps={{ width: 560 }}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-candidate-first-name" className="mb-1 block text-sm text-gray-800">
              First name <span className="required-asterisk">*</span>
            </label>
            <Input
              id="edit-candidate-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 text-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-candidate-last-name" className="mb-1 block text-sm text-gray-800">
              Last name <span className="required-asterisk">*</span>
            </label>
            <Input
              id="edit-candidate-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-candidate-email" className="mb-1 block text-sm text-gray-800">
              Email
            </label>
            <Input
              id="edit-candidate-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 text-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-candidate-phone" className="mb-1 block text-sm text-gray-800">
              Phone
            </label>
            <Input
              id="edit-candidate-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 text-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="edit-candidate-qualification"
            className="mb-1 block text-sm text-gray-800"
          >
            Qualification
          </label>
          <Input
            id="edit-candidate-qualification"
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 text-sm"
          />
        </div>

        <div>
          <label htmlFor="edit-candidate-address" className="mb-1 block text-sm text-gray-800">
            Address
          </label>
          <TextArea
            id="edit-candidate-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="resize-y rounded-lg text-sm"
          />
        </div>

        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={isLoading}
          className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {isLoading ? 'SAVING…' : 'SAVE CHANGES'}
        </Button>
      </div>
    </AntdCommonModal>
  );
};

export default EditCandidateModal;
