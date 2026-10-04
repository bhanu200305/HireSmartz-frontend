import { Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { Button } from '../shared';

type StepDoneProps = {
  companyName: string;
  adminEmail: string;
  invitationId: string | null;
};

const StepDone = ({ companyName, adminEmail, invitationId }: StepDoneProps) => {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <FaCheckCircle className="text-5xl text-brand-600 mb-4" />
      <h3 className="text-xl font-semibold mb-1">Invite Sent</h3>
      <p className="text-gray-500 max-w-sm">
        <span className="font-medium text-gray-700">{companyName}</span> has been created and an
        invite was sent to <span className="font-medium text-gray-700">{adminEmail}</span>. They
        will set up their profile, offices, departments, and team once they accept.
      </p>
      {invitationId && <p className="text-xs text-gray-400 mt-2">Invitation ID: {invitationId}</p>}
      <Link to="/company" className="mt-6 w-full max-w-xs">
        <Button
          appname="back to customers"
          className="w-full text-white bg-[var(--color-primary)] rounded-3xl py-3"
        >
          Back
        </Button>
      </Link>
    </div>
  );
};

export default StepDone;
