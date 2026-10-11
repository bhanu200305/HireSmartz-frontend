import { useState } from 'react';
import { MdChevronLeft, MdChevronRight, MdClose } from 'react-icons/md';
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

/** The job's locations as chips; the address of one shows at a time, with arrows to step through. */
const SelectedLocations = ({ offices, onRemove, disabled = false }: Props) => {
  const [index, setIndex] = useState(0);
  if (offices.length === 0) return null;
  const current = Math.min(index, offices.length - 1);
  const office = offices[current];
  const canRemove = Boolean(onRemove) && !disabled;
  return (
    <div className="mt-2 space-y-3" data-testid="selected-locations">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="mb-2 text-sm font-medium text-gray-700">Selected Locations</div>
        <div className="flex flex-wrap gap-2">
          {offices.map((item, i) => (
            <span
              key={item.office_id}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                i === current
                  ? 'border-brand-500 bg-brand-100 text-brand-800'
                  : 'border-brand-200 bg-white text-brand-800'
              }`}
            >
              <button
                type="button"
                className="cursor-pointer"
                aria-current={i === current}
                onClick={() => setIndex(i)}
              >
                {officeDisplayName(item)}
              </button>
              {canRemove && (
                <button
                  type="button"
                  className="ml-2 cursor-pointer"
                  aria-label={`Remove ${officeDisplayName(item)}`}
                  onClick={() => onRemove?.(item.office_id)}
                >
                  <MdClose size={14} />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>
      <section
        aria-label={officeDisplayName(office)}
        className="rounded-xl border border-gray-200 bg-white p-4"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="m-0 text-sm font-semibold text-gray-800">{officeDisplayName(office)}</h4>
          {offices.length > 1 && (
            <div className="flex items-center gap-1 text-xs font-medium text-brand-800">
              <button
                type="button"
                aria-label="Previous location"
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                disabled={current === 0}
                onClick={() => setIndex(current - 1)}
              >
                <MdChevronLeft size={26} />
              </button>
              <span>
                {current + 1} of {offices.length}
              </span>
              <button
                type="button"
                aria-label="Next location"
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                disabled={current === offices.length - 1}
                onClick={() => setIndex(current + 1)}
              >
                <MdChevronRight size={26} />
              </button>
            </div>
          )}
        </div>
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
    </div>
  );
};

export default SelectedLocations;
