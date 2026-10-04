import { FC } from 'react';
import { Form } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { Input } from '..';
import { MdClose } from 'react-icons/md';

interface AddableDropdownProps {
  title: string;
  label: string;
  placeholder: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

const AddableDropdown: FC<AddableDropdownProps> = ({
  title,
  label,
  placeholder,
  onClose,
  onSubmit,
}) => {
  const { control, handleSubmit, reset } = useForm<{ value: string }>();

  const handleFormSubmit = (data: { value: string }) => {
    onSubmit(data.value);
    reset();
    onClose();
  };

  return (
    <div className="app-modal-overlay fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="app-modal-panel bg-[#FAFAFA] p-6 rounded-lg shadow-lg w-[500px] max-w-[92vw] relative">
        <h2 className="text-lg font-semibold text-center mb-6">{title}</h2>
        <div>
          <Form.Item label={label}>
            <Controller
              name="value"
              control={control}
              rules={{ required: `${label} is required` }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder={placeholder}
                  className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                />
              )}
            />
          </Form.Item>

          <button
            type="button"
            onClick={handleSubmit(handleFormSubmit)}
            className="bg-primary text-white py-2 w-full rounded-3xl cursor-pointer transition"
          >
            Submit
          </button>
        </div>

        <button className="absolute top-4 right-4 text-primary cursor-pointer" onClick={onClose}>
          <MdClose size={20} />
        </button>
      </div>
    </div>
  );
};

export default AddableDropdown;
