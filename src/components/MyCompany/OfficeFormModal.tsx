import React, { useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash-es';
import { MdMyLocation } from 'react-icons/md';
import { Button, Input, LocationCascadeFields, showToast } from '../shared';
import type { LocationCascadeValue } from '../shared';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import useGeolocateAddress from '../../hooks/useGeolocateAddress';
import { useEnterToSubmit } from '../../hooks/useEnterToSubmit';
import { SEARCH_DEBOUNCE_MS } from '../../constants/app.constants';
import type { TenantOffice } from '../../api/organization-service/Tenants/offices';

// Below this, a partial zip code would just fire misses at Nominatim on
// every keystroke — most real postal codes (US 5, India 6, UK ~5-7) are
// longer than this, so it's a floor, not a validation of any one country's
// format.
const MIN_POSTAL_CODE_LENGTH = 3;

export type OfficeFormValues = {
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  location_code: string;
};

type OfficeFormModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  initial?: TenantOffice | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: OfficeFormValues) => Promise<void>;
};

const emptyForm: OfficeFormValues = {
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  country: '',
  zip_code: '',
  location_code: '',
};

const OfficeFormModal: React.FC<OfficeFormModalProps> = ({
  open,
  mode,
  initial,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<OfficeFormValues>(emptyForm);
  const { locate, isLocating, lookupPostalCode, isLookingUpPostalCode } = useGeolocateAddress();
  // Discards a lookup's result if the zip field has changed again by the
  // time it resolves (fast typing, or the modal closed/reset) — the debounce
  // alone only prevents new lookups from starting, not a slower in-flight
  // one finishing after a newer one.
  const latestPostalCodeRef = useRef('');

  const debouncedPostalCodeLookup = useMemo(
    () =>
      debounce(async (postalCode: string, country: string) => {
        const value = await lookupPostalCode(postalCode, country);
        if (!value || latestPostalCodeRef.current !== postalCode) return;
        // Only fills in fields the user hasn't already set themselves — a
        // zip lookup shouldn't silently overwrite a state/city they already
        // picked by hand. Country is deliberately left alone: this only ever
        // runs once a country is already chosen (that's what it's scoped
        // by), so `prev.country` is always already set by the time this
        // fires.
        setForm((prev) => ({
          ...prev,
          state: prev.state || value.state,
          city: prev.city || value.city,
        }));
      }, SEARCH_DEBOUNCE_MS),
    [lookupPostalCode]
  );

  useEffect(() => () => debouncedPostalCodeLookup.cancel(), [debouncedPostalCodeLookup]);

  // Covers the reverse order from `handleZipCodeChange` below: a zip typed
  // BEFORE a country is picked can't be looked up yet (no country to scope
  // the search by — see `searchByPostalCode`'s own comment on why that
  // matters), so once the user does pick one, check whether there's already
  // a zip sitting there that still needs a state/city fill-in.
  useEffect(() => {
    if (!open || !form.country) return;
    const zip = form.zip_code.trim();
    if (zip.length < MIN_POSTAL_CODE_LENGTH || (form.state && form.city)) return;
    latestPostalCodeRef.current = zip;
    debouncedPostalCodeLookup(zip, form.country);
    // Reacts only to the country itself changing (a fresh Select pick), not
    // every keystroke of the zip/state/city fields — `handleZipCodeChange`
    // already covers typing once a country exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.country]);

  // This modal is rendered once and stays mounted for the page's lifetime
  // (the parent toggles `open`/`initial`, it doesn't mount/unmount the
  // component) — so `useState`'s initial value only ever applied on the
  // very first render. Re-syncing here on every open is what actually makes
  // "Edit" show that office's data instead of whatever was left over from
  // the last time the modal was used (or nothing, the first time).
  useEffect(() => {
    if (!open) return;
    debouncedPostalCodeLookup.cancel();
    latestPostalCodeRef.current = '';
    setForm(
      initial
        ? {
            address_line_1: initial.address_line_1,
            address_line_2: initial.address_line_2 || '',
            city: initial.city,
            state: initial.state || '',
            country: initial.country,
            zip_code: initial.zip_code || '',
            location_code: initial.location_code || '',
          }
        : emptyForm
    );
  }, [open, initial, debouncedPostalCodeLookup]);

  // `useEnterToSubmit` is a hook — it (and anything it depends on) must run
  // unconditionally on every render, same as every hook above. It used to
  // sit after the `if (!open) return null` guard below, which meant it was
  // skipped on every render while the modal was closed and only started
  // being called the moment `open` first flipped true — one hook more than
  // React had recorded for this component's previous render, which React
  // treats as a hard error ("Rendered more hooks than during the previous
  // render"), crashing the whole app the first time this modal was opened.
  const isFormValid =
    form.address_line_1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.country.trim().length > 0;

  const handleSubmit = async () => {
    if (!isFormValid) {
      showToast({ message: 'Address, city, and country are required.', type: 'error' });
      return;
    }
    await onSubmit(form);
  };

  const { onKeyDown: handleEnterToSubmit } = useEnterToSubmit(handleSubmit, {
    enabled: open && !isSaving && isFormValid,
  });

  if (!open) return null;

  const field = (key: keyof OfficeFormValues) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const zip = e.target.value;
    setForm((prev) => ({ ...prev, zip_code: zip }));
    latestPostalCodeRef.current = zip;
    const trimmed = zip.trim();
    if (trimmed.length >= MIN_POSTAL_CODE_LENGTH && form.country) {
      debouncedPostalCodeLookup(trimmed, form.country);
    } else {
      debouncedPostalCodeLookup.cancel();
    }
  };

  const handleLocationChange = (next: LocationCascadeValue) => {
    setForm((prev) => ({ ...prev, ...next }));
  };

  const handleUseMyLocation = async () => {
    const result = await locate();
    if (result.status === 'error') {
      showToast({ message: result.message, type: 'error' });
      return;
    }
    setForm((prev) => ({ ...prev, ...result.value }));
    // Country/state/city always come from this; zip code only when
    // Nominatim's reverse geocode happens to include a postcode for that
    // spot (not guaranteed everywhere). Street address is never returned —
    // a reverse geocode can't recover that. Without this toast, a click that
    // detects a location matching what's already selected changes nothing
    // visible, and silently doing nothing looks identical to silently
    // failing.
    showToast({
      message: result.value.zip_code
        ? 'Location detected — country, state, city, and zip code updated.'
        : 'Location detected — country, state, and city updated.',
      type: 'success',
    });
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add office location' : 'Edit office location'}
    >
      <div onKeyDown={handleEnterToSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input placeholder="Address line 1 *" maxLength={200} {...field('address_line_1')} />
          <Input placeholder="Address line 2" maxLength={200} {...field('address_line_2')} />
          <LocationCascadeFields
            value={{ country: form.country, state: form.state, city: form.city }}
            onChange={handleLocationChange}
            className="w-full"
          />
          <div>
            <Input
              placeholder="Zip code"
              maxLength={20}
              value={form.zip_code}
              onChange={handleZipCodeChange}
              suffix={
                isLookingUpPostalCode ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-500" />
                ) : undefined
              }
            />
            {!form.country && (
              <p className="mt-1 px-2 text-xs text-neutral-400">
                Pick a country above to auto-fill state &amp; city from this zip code.
              </p>
            )}
          </div>
          <Input placeholder="Location code" maxLength={50} {...field('location_code')} />
        </div>

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MdMyLocation size={14} />
          {isLocating ? 'Locating…' : 'Use my location'}
        </button>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Button
            className="w-full border border-gray-300 rounded-full py-2"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="w-full bg-button text-white rounded-full py-2"
            onClick={handleSubmit}
            disabled={isSaving || !isFormValid}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default OfficeFormModal;
