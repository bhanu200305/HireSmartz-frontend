import { Select, Switch } from 'antd';
import AntdCommonModal from './AntdCommonModal';
import { Button } from './button';
import { Input } from './input';
import { restrictPhoneDigitsForCountry } from '../../../shared/utils/validation/phoneValidation';
import { countryCodes } from '../../../constants/countryCode';

const { Option } = Select;

export type LocationOption = {
  label: string;
  value: string;
};

export type LocationFormState = {
  locationName: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  countryCode: string;
  phoneNumber: string;
  status: boolean;
  primary: boolean;
};

export type LocationFormValidationErrors = Partial<
  Record<
    | 'locationName'
    | 'addressLine1'
    | 'country'
    | 'state'
    | 'city'
    | 'zipCode'
    | 'countryCode'
    | 'phoneNumber',
    string
  >
>;

type LocationFormModalProps = {
  open: boolean;
  title: string;
  formState: LocationFormState;
  countryOptions: LocationOption[];
  stateOptions: LocationOption[];
  cityOptions: LocationOption[];
  onCountryChange: (countryName: string) => void;
  onStateChange: (stateName: string) => void;
  onCityChange: (cityName: string) => void;
  onFormChange: (updater: (previous: LocationFormState) => LocationFormState) => void;
  onPhoneNumberBlur?: () => void;
  onPrimaryToggleChange?: (checked: boolean) => void;
  showPrimaryToggle?: boolean;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  isSaveDisabled: boolean;
  validationErrors: LocationFormValidationErrors;
};

const LocationFormModal = ({
  open,
  title,
  formState,
  countryOptions,
  stateOptions,
  cityOptions,
  onCountryChange,
  onStateChange,
  onCityChange,
  onFormChange,
  onPhoneNumberBlur,
  onPrimaryToggleChange,
  showPrimaryToggle = true,
  onClose,
  onSave,
  isSaving,
  isSaveDisabled,
  validationErrors,
}: LocationFormModalProps) => (
  <AntdCommonModal open={open} onClose={onClose} modalProps={{ width: 920, closable: false }}>
    <div className="rounded-3xl p-3">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-semibold text-[#2D323A]">{title}</h2>
        <p className="text-sm text-[#5F6368] mt-1">Please enter the following details</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="location-name" className="text-sm text-[#2D323A]">
            Location Name <span className="required-asterisk">*</span>
          </label>
          <Input
            id="location-name"
            value={formState.locationName}
            onChange={(event) =>
              onFormChange((previous) => ({
                ...previous,
                locationName: event.target.value,
              }))
            }
            placeholder="Location Name"
            className="w-full mt-1 px-4 py-2 border rounded-3xl border-[var(--border)]"
          />
          {validationErrors.locationName && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.locationName}</p>
          )}
        </div>
        <div>
          <label htmlFor="location-code" className="text-sm text-[#2D323A]">
            Location Code
          </label>
          <Input
            id="location-code"
            value={formState.code}
            onChange={(event) =>
              onFormChange((previous) => ({
                ...previous,
                code: event.target.value,
              }))
            }
            placeholder="Location Code"
            className="w-full mt-1 px-4 py-2 border rounded-3xl border-[var(--border)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="address-line-1" className="text-sm text-[#2D323A]">
            Address Line 1 <span className="required-asterisk">*</span>
          </label>
          <Input
            id="address-line-1"
            value={formState.addressLine1}
            onChange={(event) =>
              onFormChange((previous) => ({
                ...previous,
                addressLine1: event.target.value,
              }))
            }
            placeholder="Address Line 1"
            className="w-full mt-1 px-4 py-2 border rounded-3xl border-[var(--border)]"
          />
          {validationErrors.addressLine1 && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.addressLine1}</p>
          )}
        </div>
        <div>
          <label htmlFor="address-line-2" className="text-sm text-[#2D323A]">
            Address Line 2
          </label>
          <Input
            id="address-line-2"
            value={formState.addressLine2}
            onChange={(event) =>
              onFormChange((previous) => ({
                ...previous,
                addressLine2: event.target.value,
              }))
            }
            placeholder="Address Line 2"
            className="w-full mt-1 px-4 py-2 border rounded-3xl border-[var(--border)]"
          />
        </div>
        <div>
          <label htmlFor="location-phone-number" className="text-sm text-[#2D323A]">
            Phone Number
          </label>
          <div
            className={`phone-input-wrapper flex items-center bg-white w-full px-4 mt-1 border rounded-3xl ${
              validationErrors.phoneNumber
                ? 'border-red-500 bg-red-50/30'
                : 'border-[var(--border)]'
            }`}
          >
            <Select
              value={formState.countryCode}
              onChange={(value) => {
                onFormChange((previous) => ({
                  ...previous,
                  countryCode: value,
                  phoneNumber: restrictPhoneDigitsForCountry(previous.phoneNumber, value),
                }));
              }}
              className="border-none focus:ring-0 focus:outline-none bg-transparent"
              dropdownStyle={{ minWidth: 'min(300px, 92vw)' }}
              variant="borderless"
              style={{ width: '80px', fontSize: '14px' }}
              options={countryCodes.map(({ label, value, short }) => ({
                label: `${short} - ${label}`,
                value,
              }))}
              optionLabelProp="value"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder="Search..."
              tabIndex={-1}
            />
            <div className="border-l-2 border-gray-300 h-6 mx-2"></div>
            <Input
              id="location-phone-number"
              type="tel"
              value={formState.phoneNumber}
              onChange={(event) => {
                onFormChange((previous) => ({
                  ...previous,
                  phoneNumber: restrictPhoneDigitsForCountry(
                    event.target.value,
                    previous.countryCode
                  ),
                }));
              }}
              placeholder="Phone number"
              className="border-none focus:ring-0 focus:outline-none w-full"
              maxLength={15}
              onBlur={() => {
                onPhoneNumberBlur?.();
              }}
            />
          </div>
          {validationErrors.countryCode && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.countryCode}</p>
          )}
          {validationErrors.phoneNumber && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.phoneNumber}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label htmlFor="location-country" className="text-sm text-[#2D323A]">
            Country <span className="required-asterisk">*</span>
          </label>
          <div className="border-wrapper border border-[var(--border)] p-1 mt-1 w-full rounded-3xl">
            <Select
              id="location-country"
              showSearch
              optionFilterProp="children"
              placeholder="Select Country"
              className="w-full custom-select-jobs placeholder-style"
              value={formState.country || undefined}
              onChange={onCountryChange}
            >
              {countryOptions.map((country) => (
                <Option key={country.value} value={country.value}>
                  {country.label}
                </Option>
              ))}
            </Select>
          </div>
          {validationErrors.country && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.country}</p>
          )}
        </div>
        <div>
          <label htmlFor="location-state" className="text-sm text-[#2D323A]">
            State <span className="required-asterisk">*</span>
          </label>
          <div className="border-wrapper border border-[var(--border)] p-1 mt-1 w-full rounded-3xl">
            <Select
              id="location-state"
              showSearch
              placeholder="Select State"
              disabled={!formState.country}
              className="w-full custom-select-jobs placeholder-style"
              value={formState.state || undefined}
              onChange={onStateChange}
            >
              {stateOptions.map((state) => (
                <Option key={state.value} value={state.value}>
                  {state.label}
                </Option>
              ))}
            </Select>
          </div>
          {validationErrors.state && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.state}</p>
          )}
        </div>
        <div>
          <label htmlFor="location-city" className="text-sm text-[#2D323A]">
            City <span className="required-asterisk">*</span>
          </label>
          <div className="border-wrapper border border-[var(--border)] p-1 mt-1 w-full rounded-3xl">
            <Select
              id="location-city"
              showSearch
              optionFilterProp="children"
              placeholder="Select City"
              disabled={!formState.state}
              className="w-full custom-select-jobs placeholder-style"
              value={formState.city || undefined}
              onChange={onCityChange}
            >
              {cityOptions.map((city) => (
                <Option key={city.value} value={city.value}>
                  {city.label}
                </Option>
              ))}
            </Select>
          </div>
          {validationErrors.city && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.city}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div>
          <label htmlFor="location-zip-code" className="text-sm text-[#2D323A]">
            Zip Code <span className="required-asterisk">*</span>
          </label>
          <Input
            id="location-zip-code"
            value={formState.zipCode}
            onChange={(event) =>
              onFormChange((previous) => ({
                ...previous,
                zipCode: event.target.value,
              }))
            }
            placeholder="Zip Code"
            className="w-full mt-1 px-4 py-2 border rounded-3xl border-[var(--border)]"
          />
          {validationErrors.zipCode && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.zipCode}</p>
          )}
        </div>
      </div>

      {showPrimaryToggle && (
        <div className="flex items-center gap-2 mb-8">
          <Switch
            checked={formState.primary}
            disabled={!formState.status}
            onChange={(checked) => {
              if (onPrimaryToggleChange) {
                if (formState.primary && !checked) {
                  return;
                }
                onPrimaryToggleChange(checked);
                return;
              }

              onFormChange((previous) => ({
                ...previous,
                primary: checked,
              }));
            }}
          />
          <span className="text-sm text-[#2D323A]">Primary Location</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[520px] mx-auto">
        <Button
          className="w-full border border-gray-300 text-[#2D323A] py-2 rounded-3xl"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          className="w-full bg-button text-white py-2 rounded-3xl"
          onClick={onSave}
          disabled={isSaving || isSaveDisabled}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  </AntdCommonModal>
);

export default LocationFormModal;
