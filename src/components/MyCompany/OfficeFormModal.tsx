import React, { useState } from 'react';
import { Button, Input, showToast } from '../shared';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
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
  /** Add is deliberately a shorter form than Edit (address/city/country only)
   * — docs/frontend_guide.txt: "a shorter form than editing". */
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
  const [form, setForm] = useState<OfficeFormValues>(
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

  if (!open) return null;

  const field = (key: keyof OfficeFormValues) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

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
        {mode === 'edit' && <Input placeholder="Address line 2" {...field('address_line_2')} />}
        <Input placeholder="City *" {...field('city')} />
        {mode === 'edit' && <Input placeholder="State" {...field('state')} />}
        <Input placeholder="Country *" {...field('country')} />
        {mode === 'edit' && <Input placeholder="Zip code" {...field('zip_code')} />}
      </div>
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
