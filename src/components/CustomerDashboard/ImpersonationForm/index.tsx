import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Select, Form } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Button } from '../../shared';
import { ImpersonateUser } from '../../../api/authentication-service/Impersonation/index';

const { Option } = Select;

// Validation schema
const impersonationSchema = z.object({
  userId: z
    .string()
    .optional()
    .refine((val) => !!val, {
      message: 'User is required.',
    }),

  reason: z.string().superRefine((val, ctx) => {
    if (!val || val.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason is required.',
      });
    } else if (val.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason must be at least 10 characters.',
      });
    } else if (val.length > 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason cannot exceed 1000 characters.',
      });
    }
  }),
});

export type ImpersonationFormData = z.infer<typeof impersonationSchema>;

interface ImpersonationFormProps {
  onSubmit: (data: ImpersonationFormData) => void;
  onCancel: () => void;
  users: ImpersonateUser[];
  usersLoading?: boolean;
  isLoading?: boolean;
}

const ImpersonationForm: React.FC<ImpersonationFormProps> = ({
  onSubmit,
  onCancel,
  users,
  usersLoading = false,
  isLoading = false,
}) => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ImpersonationFormData>({
    resolver: zodResolver(impersonationSchema),
    mode: 'onChange',
    defaultValues: {
      userId: undefined,
      reason: '',
    },
  });

  const userValue = watch('userId');
  const reasonValue = watch('reason');

  const isFormValid = userValue && reasonValue && reasonValue.length >= 10;

  const onFormSubmit = handleSubmit((data) => {
    onSubmit(data);
  });

  return (
    <Form layout="vertical" onFinish={onFormSubmit}>
      <div className="space-y-4">
        <Form.Item
          label={
            <span>
              User <span className="required-asterisk">*</span>
            </span>
          }
          colon={false}
        >
          <Controller
            name="userId"
            control={control}
            render={({ field: { onChange, value } }) => (
              <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                <Select
                  value={value}
                  onChange={(val) => onChange(val)}
                  placeholder="Select user"
                  loading={usersLoading}
                  showSearch
                  allowClear
                  className="w-full custom-select placeholder-style"
                  popupClassName="rounded-3xl"
                  filterOption={(input, option) =>
                    typeof option?.children === 'string' &&
                    (option.children as string).toLowerCase().includes(input.toLowerCase())
                  }
                  optionFilterProp="children"
                >
                  {users.map((user) => (
                    <Option key={user.userId} value={user.userId.toString()}>
                      {`${user.firstName} ${user.lastName} (${user.roleName})`}
                    </Option>
                  ))}
                </Select>
              </div>
            )}
          />
          {errors.userId && <p className="text-red-500 text-sm mt-1">{errors.userId.message}</p>}
        </Form.Item>

        <Form.Item
          label={
            <span>
              Reason <span className="required-asterisk">*</span>
            </span>
          }
          colon={false}
        >
          <Controller
            name="reason"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                placeholder="Enter reason for impersonation."
                rows={4}
                className="w-full px-4 py-2 border rounded-lg"
                maxLength={1000}
                showCount={{
                  formatter: ({ count, maxLength }) => `${count}/${maxLength} characters`,
                }}
              />
            )}
          />
          {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>}
        </Form.Item>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
            className="border border-[var(--border)] bg-white text-black py-2 w-full rounded-3xl cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CANCEL
          </Button>

          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting || isLoading}
            className="bg-primary text-white py-2 w-full rounded-3xl cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || isSubmitting ? 'IMPERSONATING...' : 'IMPERSONATE'}
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default ImpersonationForm;
