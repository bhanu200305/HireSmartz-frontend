import { MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';
import { PASSWORD_REQUIREMENTS } from '../../../shared/utils/validation/passwordPolicy';

/**
 * Live readout of the platform's password policy (see passwordPolicy.ts),
 * shown WHILE the user types a new password rather than only after a
 * rejected submit — a password that will fail the backend's policy should
 * never be a surprise three fields later. Every requirement starts
 * unmet/grey; each ticks green the moment the current value satisfies it.
 */
export const PasswordRequirementsChecklist = ({ password }: { password: string }) => (
  <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
    {PASSWORD_REQUIREMENTS.map((requirement) => {
      const met = requirement.test(password);
      return (
        <li
          key={requirement.key}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            met ? 'text-green-600' : 'text-gray-400'
          }`}
        >
          {met ? (
            <MdCheckCircle className="shrink-0 text-sm" />
          ) : (
            <MdRadioButtonUnchecked className="shrink-0 text-sm" />
          )}
          <span>{requirement.label}</span>
        </li>
      );
    })}
  </ul>
);

export default PasswordRequirementsChecklist;
