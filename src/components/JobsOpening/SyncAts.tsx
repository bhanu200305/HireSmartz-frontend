import { Form, Select } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { useGetAllAtsNamesByCompanyIdQuery } from '../../api/job-service/JobOpening/JobOpeningSync';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { updateATS } from '../../redux/slices/jobOpeningSlice';
import { MdClose } from 'react-icons/md';

const { Option } = Select;

const atsSchema = z.object({
  ats: z.string().min(1, 'Please select an ATS'),
  jobBoards: z.array(z.string()).optional(),
});
export type ATSFormValues = z.infer<typeof atsSchema>;

const SyncAts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: atsData, isLoading: atsLoading } = useGetAllAtsNamesByCompanyIdQuery();
  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ATSFormValues>({
    resolver: zodResolver(atsSchema),
    mode: 'onChange',
    defaultValues: {
      jobBoards: [],
    },
  });
  const onSubmit = (data: ATSFormValues) => {
    dispatch(updateATS({ name: data.ats }));
    navigate(-1);
    // onSuccess?.()
  };
  // `jobBoards` was only used by the commented-out "Select Job Boards" UI below.
  return (
    <div className="fixed ats inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-[#FAFAFA] p-6 rounded-lg shadow-lg w-[500px] relative">
        <h2 className="text-lg font-semibold text-center mb-6">Job Posting Configuration</h2>
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <Form.Item label="Select ATS">
            <Controller
              name="ats"
              control={control}
              render={({ field }) => (
                <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
                  <Select
                    {...field}
                    value={field.value || undefined}
                    onChange={(value) => setValue('ats', value, { shouldValidate: true })}
                    className="w-full custom-select placeholder-style"
                    showSearch
                    allowClear
                    placeholder="Select ATS"
                    popupClassName="rounded-3xl"
                    loading={atsLoading}
                    filterOption={(input, option) =>
                      (option?.children ?? '')
                        .toString()
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    {atsData?.success ? (
                      atsData.data.map((ats) => (
                        <Option key={ats.id} value={ats.name}>
                          {ats.name}
                        </Option>
                      ))
                    ) : (
                      <Option value="no-data" disabled>
                        No ATS available
                      </Option>
                    )}
                  </Select>
                </div>
              )}
            />
            {errors.ats && <p className="text-red-500 text-sm mt-1">{errors.ats.message}</p>}
          </Form.Item>
          {/* <div className="mb-4">
            <span className="block bold-lg text-lg mb-2">Select Job Boards</span>
            <p className="text-sm mb-3">Select when you want to post this job:</p>

            <Controller
              name="jobBoards"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  {jobBoards.map((board) => (
                    <Checkbox
                      key={board.id}
                      checked={field.value?.includes(board.id)}
                      onChange={(e) => {
                        const newValue = e.target.checked
                          ? [...(field.value || []), board.id]
                          : field.value?.filter((v) => v !== board.id) || []
                        field.onChange(newValue)
                      }}
                    >
                      {board.name}
                    </Checkbox>
                  ))}
                </div>
              )}
            />
          </div> */}

          <button
            type="submit"
            className="bg-primary text-white py-2 w-full rounded-3xl cursor-pointer transition"
          >
            SAVE NOW
          </button>
        </Form>
        <button
          className="absolute top-4 right-4 text-primary cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <MdClose size={20} />
        </button>
      </div>
    </div>
  );
};

export default SyncAts;
