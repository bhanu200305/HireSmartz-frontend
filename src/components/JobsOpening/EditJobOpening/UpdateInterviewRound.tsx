import { isRoundOfType, retypableRoundTypes, roundTypeIdsOfKind } from '../intakeRoundPlacement';
import { Form, Radio, Select } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, showToast } from '../../shared';
import { MdClose } from 'react-icons/md';
import TextArea from 'antd/es/input/TextArea';
import { EditInterviewRoundRequest } from '../../../types';
import { Controller, useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import { useEditInterviewRoundMutation } from '../../../api/job-service/JobOpening/EditInterviewRound';
import { useGetInterviewRoundsByJobIdQuery } from '../../../api/job-service/JobOpening/GetInterviewRound';
import { Loader } from '../../shared/ui/loader';
import useJobOpeningDropdown, {
  JobOpeningDropdownOption,
} from '../../../hooks/useJobOpeningDropdown';
import { asJobId } from '../../../api/job-service/jobId';
import { toInterviewSequencePayload } from '../../../api/job-service/interviewSequenceHelpers';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import { slotOptions } from '../../../shared/utils/business-logic';
import { useEffect, useState } from 'react';
import { resolveVariantLabel as formatVariantLabel } from '../../../shared/utils/variantLabel';
import {
  firstAvailableVariant,
  isUnavailableVariant,
} from '../../../shared/utils/roundInfoContent';

const { Option } = Select;

const UpdateInterviewRound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const roundData = location.state;
  const [form] = Form.useForm();
  const [editInterviewRound, { isLoading: isEditing }] = useEditInterviewRoundMutation();
  const jobOpeningId = asJobId(useSelector((state: RootState) => state.EditJobSlice.jobOpeningId));
  const { jobOpeningDropdown: interviewRounds, loading: interviewRoundsLoading } =
    useJobOpeningDropdown('ROUNDS', 'create');
  const { data: currentRounds = [] } = useGetInterviewRoundsByJobIdQuery(jobOpeningId, {
    skip: !jobOpeningId,
  });
  // Resume is never selectable. Intake Call is offered when the job has none and
  // this round is round 2; this round's own type always stays listed.
  const intakeTypeIds = roundTypeIdsOfKind(interviewRounds, 'intake_call');
  const jobHasIntake = currentRounds.some((round) => isRoundOfType(round, intakeTypeIds));
  const roundPosition =
    [...currentRounds]
      .sort((a, b) => a.sequence - b.sequence)
      .findIndex((round) => String(round.id) === String(roundData?.roundId)) + 1;
  const selectableInterviewRounds = retypableRoundTypes(interviewRounds, {
    currentTypeId: roundData?.round,
    jobHasIntake,
    position: roundPosition || Number.MAX_SAFE_INTEGER,
  });
  const [selectedRoundType, setSelectedRoundType] = useState<JobOpeningDropdownOption | null>(
    () => interviewRounds.find((round) => String(round.id) === String(roundData?.round)) ?? null
  );

  // The round types may finish loading after this opened; pick up this round's
  // type then, so its duration / format fields show with the saved values.
  useEffect(() => {
    if (selectedRoundType) return;
    const match = interviewRounds.find((round) => String(round.id) === String(roundData?.round));
    if (match) setSelectedRoundType(match);
  }, [interviewRounds, roundData?.round, selectedRoundType]);

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
      duration: roundData?.duration ?? null,
      variant: roundData?.variant ?? null,
    },
  });
  const handleRoundChange = (value: string | number | null) => {
    if (value === null || value === undefined) {
      setSelectedRoundType(null);
      setValue('description', '');
      setValue('roundType', '');
      setValue('duration', null);
      setValue('variant', null);
    } else {
      const selectedRound = interviewRounds.find((round) => String(round.id) === String(value));
      setSelectedRoundType(selectedRound ?? null);
      if (selectedRound) {
        setValue('description', selectedRound.description || '');
        setValue('roundType', selectedRound.roundType || '');
        setValue('duration', selectedRound.requires_duration ? 30 : null);
        setValue('variant', firstAvailableVariant(selectedRound.available_variants));
      }
    }
  };
  const onSubmit = async (editedRound: EditInterviewRoundRequest) => {
    if (isEditing || !jobOpeningId) return;

    const rounds = toInterviewSequencePayload(
      currentRounds.map((round) =>
        String(round.id) === String(editedRound.id)
          ? {
              ...round,
              roundId: String(editedRound.round),
              description: editedRound.description,
              sequence: editedRound.sequence,
              duration: selectedRoundType?.requires_duration ? Number(editedRound.duration) : null,
              variant: selectedRoundType?.available_variants?.length ? editedRound.variant : null,
            }
          : round
      )
    );

    editInterviewRound({ jobOpeningId, rounds })
      .unwrap()
      .then((res) => {
        showToast({
          message: res.message || 'Interview round has been updated',
          type: 'success',
        });
        navigate(`/jobs/edit/${jobOpeningId}/interview`, { state: { refresh: true } });
      })
      .catch((err) => {
        showToast({
          message: getJobErrorMessage(err, 'Something went wrong while updating.'),
          type: 'error',
        });
      });
  };
  return (
    <>
      {/* Modal Overlay */}
      {isEditing && <Loader />}
      <div className="app-modal-overlay fixed inset-0 flex items-center justify-center bg-black/60 z-50">
        <div className="app-modal-panel bg-[#FAFAFA] p-6 rounded-lg shadow-lg w-[500px] max-w-[92vw] relative">
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
                      filterOption={(input, option) =>
                        typeof option?.children === 'string' &&
                        (option.children as string).toLowerCase().includes(input.toLowerCase())
                      }
                      optionFilterProp="children"
                    >
                      {selectableInterviewRounds.length > 0 ? (
                        selectableInterviewRounds.map((round) => (
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

            {!!selectedRoundType?.available_variants?.length && (
              <Form.Item
                label={
                  <span>
                    Round Format <span className="required-asterisk">*</span>
                  </span>
                }
              >
                <Controller
                  name="variant"
                  control={control}
                  rules={{ required: 'Please select a round format' }}
                  render={({ field }) => (
                    <Radio.Group
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      optionType="button"
                      buttonStyle="solid"
                      className="w-full"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {selectedRoundType.available_variants!.map((variant) => (
                          <Radio.Button
                            key={variant}
                            value={variant}
                            disabled={isUnavailableVariant(variant)}
                            title={isUnavailableVariant(variant) ? 'Not available yet' : undefined}
                            className={`text-center ${
                              field.value === variant
                                ? '!bg-primary !text-white !border-primary'
                                : 'bg-gray-100'
                            }`}
                          >
                            {formatVariantLabel(variant, selectedRoundType.variant_labels)}
                          </Radio.Button>
                        ))}
                      </div>
                    </Radio.Group>
                  )}
                />
                {errors.variant && (
                  <p className="text-red-500 text-sm mt-1">{errors.variant.message}</p>
                )}
              </Form.Item>
            )}

            {selectedRoundType?.requires_duration && (
              <Form.Item
                label={
                  <span>
                    Duration <span className="required-asterisk">*</span>
                  </span>
                }
              >
                <Controller
                  name="duration"
                  control={control}
                  rules={{ required: 'Duration is required for this round type' }}
                  render={({ field }) => (
                    <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                      <Select
                        value={field.value ? String(field.value) : undefined}
                        onChange={(value) => field.onChange(Number(value))}
                        className="w-full custom-select placeholder-style"
                        placeholder="Select Duration"
                        options={slotOptions}
                      />
                    </div>
                  )}
                />
                {errors.duration && (
                  <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>
                )}
              </Form.Item>
            )}

            <Button
              type="submit"
              disabled={isEditing}
              className="bg-primary text-white py-2 w-full rounded-3xl cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isEditing && <Loader />}
              <span className="roboto-font">Submit</span>
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
