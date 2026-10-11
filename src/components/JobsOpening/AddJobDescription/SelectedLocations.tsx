import { MdClose } from 'react-icons/md';
import {
  officeDisplayName,
  type TenantOffice,
} from '../../../api/organization-service/Tenants/offices';

type Props = {
  /** The offices picked for this job, in the order they were picked. */
  offices: TenantOffice[];
  /** Left out (or `disabled`) hides the remove buttons. */
  onRemove?: (officeId: string) => void;
  disabled?: boolean;
};

const Detail = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="min-w-0">
    <dt className="text-xs text-gray-500">{label}</dt>
    <dd className="m-0 break-words text-sm text-gray-800">{value || '-'}</dd>
  </div>
);

/** The job's locations as chips, each with its address in a read-only card. */
const SelectedLocations = ({ offices, onRemove, disabled = false }: Props) => {
  if (offices.length === 0) return null;
  const canRemove = Boolean(onRemove) && !disabled;
  return (
    <div className="mt-2 space-y-3" data-testid="selected-locations">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="mb-2 text-sm font-medium text-gray-700">Selected Locations</div>
        <div className="flex flex-wrap gap-2">
          {offices.map((office) => (
            <span
              key={office.office_id}
              className="inline-flex items-center rounded-full border border-brand-200 bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800"
            >
              {officeDisplayName(office)}
              {canRemove && (
                <button
                  type="button"
                  className="ml-2 cursor-pointer"
                  aria-label={`Remove ${officeDisplayName(office)}`}
                  onClick={() => onRemove?.(office.office_id)}
                >
                  <MdClose size={14} />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {offices.map((office) => (
          <section
            key={office.office_id}
            aria-label={officeDisplayName(office)}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <h4 className="m-0 mb-2 text-sm font-semibold text-gray-800">
              {officeDisplayName(office)}
            </h4>
            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2">
              <Detail label="Location Code" value={office.location_code || 'Not set'} />
              <Detail label="Address Line 1" value={office.address_line_1} />
              <Detail label="Address Line 2" value={office.address_line_2} />
              <Detail label="City" value={office.city} />
              <Detail label="State" value={office.state} />
              <Detail label="Zip Code" value={office.zip_code} />
              <Detail label="Country" value={office.country} />
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
};

export default SelectedLocations;
