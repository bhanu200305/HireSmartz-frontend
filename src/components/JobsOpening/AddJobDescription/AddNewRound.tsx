import { Form, Select } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, showToast } from '../../shared';
import { MdClose } from 'react-icons/md';
import TextArea from 'antd/es/input/TextArea';
import { useSaveInterviewRoundMutation } from '../../../api/job-service/JobOpening/AddInterviewRound';
import { SaveInterviewRoundRequest } from '../../../types';
import { Controller, useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import { useGetInterviewRoundsByJobIdQuery } from '../../../api/job-service/JobOpening/GetInterviewRound';
import { Loader } from '../../shared/ui/loader';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import { asJobId } from '../../../api/job-service/jobId';
import {
  toInterviewRoundRequest,
  toInterviewSequencePayload,
} from '../../../api/job-service/interviewSequenceHelpers';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';

const { Option } = Select;

const AddNewRound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const { jobOpeningDropdown: interviewRounds, loading: interviewRoundsLoading } =
    useJobOpeningDropdown('ROUNDS', 'create');
  const [saveInterviewRound, { isLoading }] = useSaveInterviewRoundMutation();
  const jobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);
  const editJobOpeningId = useSelector((state: RootState) => state.EditJobSlice.jobOpeningId);
  const jobFromPath = location.pathname.match(/\/jobs\/edit\/([^/]+)/)?.[1];
  const resolvedJobId = asJobId(jobFromPath) || asJobId(editJobOpeningId) || asJobId(jobOpeningId);
  const { data: rounds = [] } = useGetInterviewRoundsByJobIdQuery(resolvedJobId, {
    skip: !resolvedJobId,
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SaveInterviewRoundRequest>({
    defaultValues: {
      sequence: rounds.length + 1,
      jobId: resolvedJobId,
      roundType: '',
      description: '',
    },
  });

  const handleRoundChange = (value: string | number | null) => {
    if (value === null || value === undefined) {
      setValue('description', '', { shouldValidate: true });
      setValue('roundType', '', { shouldValidate: true });
    } else {
      const selectedRound = interviewRounds.find((round) => String(round.id) === String(value));
      if (selectedRound) {
        setValue('description', selectedRound.description || '', { shouldValidate: true });
        setValue('roundType', selectedRound.roundType || '', { shouldValidate: true });
      }
    }
  };

  const onSubmit = async (data: SaveInterviewRoundRequest) => {
    if (isLoading || !resolvedJobId) return;

    const existing = toInterviewSequencePayload(rounds);
    const nextSequence = existing.length + 1;
    const selectedType = interviewRounds.find((round) => String(round.id) === String(data.round));

    saveInterviewRound({
      jobOpeningId: resolvedJobId,
      rounds: [
        ...existing,
        toInterviewRoundRequest(
          {
            roundId: String(data.round),
            sequence: nextSequence,
            description: data.description,
            duration: selectedType?.requires_duration ? 30 : null,
            variant: selectedType?.available_variants?.[0] ?? null,
          },
          { isNew: true }
        ),
      ],
    })
      .unwrap()
      .then((res) => {
        showToast({
          message: res?.message || 'Interview round has been saved successfully',
          type: 'success',
        });
        if (jobFromPath) {
          navigate(`/jobs/edit/${jobFromPath}/interview`, { state: { refresh: true } });
        } else {
          navigate('/interview-setup', { state: { refresh: true } });
        }
      })
      .catch((err) => {
        showToast({
          message: getJobErrorMessage(
            err,
            'Something went wrong while saving the interview round.'
          ),
          type: 'error',
        });
      });
  };
  return (
    <>
      {/* Modal Overlay */}
      {isLoading && <Loader />}
      <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
        <div className="bg-white p-0 rounded-2xl shadow-xl w-[500px] relative overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <h2 className="text-base font-bold text-neutral-900 font-display">
              Add New Interview Round
            </h2>
            <Button
              className="text-neutral-400 hover:text-neutral-700 cursor-pointer p-0 min-w-0 h-auto shadow-none border-none bg-transparent"
              onClick={() =>
                jobFromPath
                  ? navigate(`/jobs/edit/${jobFromPath}/interview`)
                  : navigate('/interview-setup')
              }
            >
              <MdClose size={20} />
            </Button>
          </div>
          <div className="px-6 pt-5 pb-6">
            <Form form={form} layout="vertical" onFinish={handleSubmit(onSubmit)}>
              <Form.Item
                label={
                  <span className="text-sm font-semibold text-neutral-700">
                    Round Name <span className="required-asterisk">*</span>
                  </span>
                }
              >
                <Controller
                  name="round"
                  control={control}
                  rules={{ required: 'Round name is required' }}
                  render={({ field }) => (
                    <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
                      <Select
                        {...field}
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          handleRoundChange(value);
                        }}
                        className="w-full custom-select placeholder-style"
                        showSearch
                        allowClear
                        placeholder="Select Interview Round"
                        popupClassName="rounded-3xl"
                        loading={interviewRoundsLoading}
                        filterOption={(input, option) =>
                          typeof option?.children === 'string' &&
                          (option.children as string).toLowerCase().includes(input.toLowerCase())
                        }
                        optionFilterProp="children"
                      >
                        {interviewRounds.length > 0 ? (
                          interviewRounds.map((round) => (
                            <Option key={round.id} value={round.id}>
                              {round.name}
                            </Option>
                          ))
                        ) : (
                          <Option value="No Rounds Found" disabled>
                            No Interview Rounds Found
                          </Option>
                        )}
                      </Select>
                    </div>
                  )}
                />
                {errors.round && (
                  <p className="text-red-500 text-sm mt-1">{errors.round.message}</p>
                )}
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-sm font-semibold text-neutral-700">
                    Description <span className="required-asterisk">*</span>
                  </span>
                }
              >
                <Controller
                  name="description"
                  control={control}
                  rules={{
                    required: 'Description is required',
                    maxLength: {
                      value: 1000,
                      message: 'Question cannot exceed 1000 characters',
                    },
                  }}
                  render={({ field }) => (
                    <TextArea
                      {...field}
                      placeholder="Description"
                      rows={4}
                      className="w-full px-4 py-2 border border-neutral-200 rounded-2xl"
                      maxLength={1000}
                      showCount={{
                        formatter: ({ count, maxLength }) => `${count}/${maxLength} characters`,
                      }}
                    />
                  )}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </Form.Item>
              <Controller
                name="jobId"
                control={control}
                render={({ field }) => <input type="hidden" {...field} />}
              />
              <Controller
                name="sequence"
                control={control}
                render={({ field }) => <input type="hidden" {...field} />}
              />
              <Controller
                name="roundType"
                control={control}
                render={({ field }) => <input type="hidden" {...field} />}
              />
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  className="flex-1 border border-neutral-200 bg-white text-neutral-700 py-2 rounded-3xl cursor-pointer transition hover:bg-neutral-50"
                  onClick={() =>
                    jobFromPath
                      ? navigate(`/jobs/edit/${jobFromPath}/interview`)
                      : navigate('/interview-setup')
                  }
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-primary text-white py-2 rounded-3xl cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader />}
                  Save Round
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddNewRound;
