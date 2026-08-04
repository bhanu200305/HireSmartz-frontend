import { Form, Select } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, showToast } from '../../shared';
import { MdClose } from 'react-icons/md';
import TextArea from 'antd/es/input/TextArea';
import { EditInterviewRoundRequest } from '../../../types';
import { Controller, useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import { get } from 'lodash-es';
import { useEditInterviewRoundMutation } from '../../../api/job-service/JobOpening/EditInterviewRound';
import { Loader } from '../../shared/ui/loader';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';

const { Option } = Select;
const UpdateInterviewRound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const roundData = location.state;
  const [form] = Form.useForm();
  const [editInterviewRound, { isLoading: isEditing }] = useEditInterviewRoundMutation();
  const jobOpeningId = useSelector((state: RootState) => state.EditJobSlice.jobOpeningId);
  const { jobOpeningDropdown: interviewRounds, loading: interviewRoundsLoading } =
    useJobOpeningDropdown('ROUNDS', 'create');

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EditInterviewRoundRequest>({
    defaultValues: {
      id: roundData?.roundId,
      round: roundData?.round || null,
      description: roundData?.description || '',
      jobId: jobOpeningId,
      sequence: roundData?.sequence || 1,
      roundType: roundData?.roundType || 'MANUAL',
    },
  });
  const handleRoundChange = (value: number | null) => {
    if (value === null || value === undefined) {
      setValue('description', '');
      setValue('roundType', '');
    } else {
      const selectedRound = interviewRounds.find((round) => round.id === value);
      if (selectedRound) {
        setValue('description', selectedRound.description || '');
        setValue('roundType', selectedRound.roundType || '');
      }
    }
  };
  const onSubmit = async (editedRound: EditInterviewRoundRequest) => {
    if (isEditing) return;

    const payload: EditInterviewRoundRequest = {
      ...editedRound,
      jobId: jobOpeningId,
      roundType: editedRound.roundType || 'MANUAL',
      sequence: roundData?.sequence || 1,
    };
    editInterviewRound([payload])
      .unwrap()
      .then((res) => {
        if (res.status === 'OK') {
          showToast({
            message: res.message || 'Interview round has been updated',
            type: 'success',
          });
          navigate(`/jobs/edit/${jobOpeningId}/interview`, { state: { refresh: true } });
        } else {
          showToast({ message: res.message || 'Failed to update round.', type: 'error' });
        }
      })
      .catch((err) => {
        showToast({
          message: get(err, 'data.message', 'Something went wrong while updating.'),
          type: 'error',
        });
      });
  };
  return (
    <>
      {/* Modal Overlay */}
      {isEditing && <Loader />}
      <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
        <div className="bg-[#FAFAFA] p-6 rounded-lg shadow-lg w-[500px] relative">
          <h2 className="text-lg font-semibold text-center mb-6">Update Interview Round</h2>
          <Form form={form} layout="vertical" onFinish={handleSubmit(onSubmit)}>
            <Form.Item
              label={
                <span>
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
                      placeholder="Select Interview Round"
                      loading={interviewRoundsLoading}
                      popupClassName="rounded-3xl"
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
              {errors.round && <p className="text-red-500 text-sm mt-1">{errors.round.message}</p>}
            </Form.Item>

            <Form.Item
              label={
                <span>
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
                    className="w-full px-4 py-2 border rounded-lg"
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
            <Button
              type="submit"
              disabled={isEditing}
              className="bg-primary text-white py-2 w-full rounded-3xl cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isEditing && <Loader />}
              <span className="roboto-font">SUBMIT</span>
            </Button>
          </Form>
          <button
            className="absolute top-4 right-4 text-primary cursor-pointer"
            onClick={() => navigate(`/jobs/edit/${jobOpeningId}/interview`)}
          >
            <MdClose size={20} />
          </button>
        </div>
      </div>
    </>
  );
};

export default UpdateInterviewRound;
