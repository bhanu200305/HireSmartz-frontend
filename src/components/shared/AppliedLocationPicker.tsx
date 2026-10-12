import { ConfigProvider, Select } from 'antd';
import { publicLocationLabels } from '../../shared/utils/publicJobDisplay';

export type ApplyLocation = {
  job_location_id?: string | null;
  address_line_1?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

/** The job's offices a candidate can be recorded under (an address typed by hand has no id). */
export const locationsToChoose = <T extends ApplyLocation>(locations?: T[] | null): T[] =>
  (locations ?? []).filter((location) => location.job_location_id);

/** A job at two or more offices makes the choice required; at one or none the server fills it in. */
export const mustPickLocation = (locations?: ApplyLocation[] | null): boolean =>
  locationsToChoose(locations).length > 1;

type AppliedLocationPickerProps = {
  id: string;
  label: string;
  locations: ApplyLocation[];
  value: string;
  onChange: (locationId: string) => void;
  hasError?: boolean;
  placeholder?: string;
};

/**
 * "Which office?" for the places that create a candidate on a job with several
 * offices. Renders nothing for a job with fewer than two, so callers can place
 * it unconditionally.
 */
const AppliedLocationPicker = ({
  id,
  label,
  locations,
  value,
  onChange,
  hasError = false,
  placeholder = 'Select a location',
}: AppliedLocationPickerProps) => {
  const choices = locationsToChoose(locations);
  if (choices.length < 2) return null;
  const labels = publicLocationLabels(
    choices.map((location) => ({
      address_line_1: location.address_line_1 ?? null,
      city: location.city ?? null,
      state: location.state ?? null,
      country: location.country ?? null,
    }))
  );

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-800 mb-2">
        {label} <span className="text-red-500">*</span>
      </label>
      <ConfigProvider theme={{ components: { Select: { controlHeightLG: 44 } } }}>
        <Select
          id={id}
          value={value || undefined}
          placeholder={placeholder}
          onChange={onChange}
          status={hasError ? 'error' : undefined}
          size="large"
          className="w-full [&_.ant-select-selector]:!rounded-full [&_.ant-select-selector]:!px-4 [&_.ant-select-selection-placeholder]:!top-0 [&_.ant-select-selection-placeholder]:!bottom-0 [&_.ant-select-selection-placeholder]:!translate-y-0 [&_.ant-select-selection-placeholder]:!transform-none"
          options={choices.map((location, index) => ({
            value: location.job_location_id ?? '',
            label: labels[index],
            address: location.address_line_1,
            place: [location.city, location.state, location.country].filter(Boolean).join(', '),
          }))}
          optionRender={(option) => (
            <div className="py-0.5">
              <div className="text-sm font-medium text-gray-800">
                {option.data.address || option.data.place}
              </div>
              {option.data.address && (
                <div className="text-xs text-gray-500">{option.data.place}</div>
              )}
            </div>
          )}
        />
      </ConfigProvider>
      {hasError && <p className="mt-1 text-sm text-red-500">Please choose a location.</p>}
    </div>
  );
};

export default AppliedLocationPicker;
