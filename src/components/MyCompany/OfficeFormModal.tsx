import React, { useEffect, useState } from 'react';
import { MdMyLocation } from 'react-icons/md';
import { Button, Input, LocationCascadeFields, showToast } from '../shared';
import type { LocationCascadeValue } from '../shared';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import useGeolocateAddress from '../../hooks/useGeolocateAddress';
import type { TenantOffice } from '../../api/organization-service/Tenants/offices';

export type OfficeFormValues = {
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
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
  const { locate, isLocating } = useGeolocateAddress();

  // This modal is rendered once and stays mounted for the page's lifetime
  // (the parent toggles `open`/`initial`, it doesn't mount/unmount the
  // component) — so `useState`'s initial value only ever applied on the
  // very first render. Re-syncing here on every open is what actually makes
  // "Edit" show that office's data instead of whatever was left over from
  // the last time the modal was used (or nothing, the first time).
  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            address_line_1: initial.address_line_1,
            address_line_2: initial.address_line_2 || '',
            city: initial.city,
            state: initial.state || '',
            country: initial.country,
            zip_code: initial.zip_code || '',
          }
        : emptyForm
    );
  }, [open, initial]);

  if (!open) return null;

  const field = (key: keyof OfficeFormValues) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

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
  };

  const handleSubmit = async () => {
    if (!form.address_line_1.trim() || !form.city.trim() || !form.country.trim()) {
      showToast({ message: 'Address, city, and country are required.', type: 'error' });
      return;
    }
    await onSubmit(form);
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add office location' : 'Edit office location'}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input placeholder="Address line 1 *" {...field('address_line_1')} />
        <Input placeholder="Address line 2" {...field('address_line_2')} />
        <LocationCascadeFields
          value={{ country: form.country, state: form.state, city: form.city }}
          onChange={handleLocationChange}
          className="w-full"
        />
        <Input placeholder="Zip code" {...field('zip_code')} />
      </div>

      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={isLocating}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          disabled={isSaving}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </AntdCommonModal>
  );
};

export default OfficeFormModal;
