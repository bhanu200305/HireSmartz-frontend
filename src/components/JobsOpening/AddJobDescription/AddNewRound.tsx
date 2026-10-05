import { Form, Radio, Select } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, showToast } from '../../shared';
import { MdClose, MdInfoOutline } from 'react-icons/md';
import TextArea from 'antd/es/input/TextArea';
import { useState } from 'react';
import RoundInfoModal from '../../shared/ui/RoundInfoModal';
import { useSaveInterviewRoundMutation } from '../../../api/job-service/JobOpening/AddInterviewRound';
import { SaveInterviewRoundRequest } from '../../../types';
import { Controller, useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import { useGetInterviewRoundsByJobIdQuery } from '../../../api/job-service/JobOpening/GetInterviewRound';
import { Loader } from '../../shared/ui/loader';
import useJobOpeningDropdown, {
  JobOpeningDropdownOption,
} from '../../../hooks/useJobOpeningDropdown';
import { asJobId } from '../../../api/job-service/jobId';
import {
  toInterviewRoundRequest,
  toInterviewSequencePayload,
} from '../../../api/job-service/interviewSequenceHelpers';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import { slotOptions } from '../../../shared/utils/business-logic';
import { resolveVariantLabel as formatVariantLabel } from '../../../shared/utils/variantLabel';
import {
  type IntakePosition,
  isRoundOfType,
  placeIntakeRound,
  roundTypeIdsOfKind,
} from '../intakeRoundPlacement';

const { Option } = Select;

const AddNewRound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const { jobOpeningDropdown: interviewRounds, loading: interviewRoundsLoading } =
    useJobOpeningDropdown('ROUNDS', 'create');
  const [saveInterviewRound, { isLoading }] = useSaveInterviewRoundMutation();
  const jobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);
  const jobFromPath = location.pathname.match(/\/jobs\/edit\/([^/]+)/)?.[1];
  // This page is also mounted create-mode at /interview-setup/add-new-round
  // (no /jobs/edit/ prefix, so `jobFromPath` is undefined there) — where
  // `jobOpeningId` (JobSlice, set when the wizard started) is the only
  // correct source. `EditJobSlice`'s own jobOpeningId used to be consulted
  // here too, ahead of it — a stale value left over from a previous
  // Edit-mode visit silently overrode a freshly-created job's real id on
  // this page, since Edit-mode never needs that fallback in the first
  // place (`jobFromPath` already covers it). Same fix as
  // AiQuestionsSetup.tsx's `activeJobOpeningId` — see that comment for the
  // full "already published" report this addresses.
  const resolvedJobId = asJobId(jobFromPath) || asJobId(jobOpeningId);
  const { data: rounds = [] } = useGetInterviewRoundsByJobIdQuery(resolvedJobId, {
    skip: !resolvedJobId,
  });
  // Resume is auto-seeded and mandatory — never addable here. The optional
  // Intake Call is addable once per job (it's capped at one), placed as
  // round 1 or 2 via the position choice below.
  const resumeTypeIds = roundTypeIdsOfKind(interviewRounds, 'resume');
  const intakeTypeIds = roundTypeIdsOfKind(interviewRounds, 'intake_call');
  const jobHasIntake = rounds.some((round) => isRoundOfType(round, intakeTypeIds));
  const addableInterviewRounds = interviewRounds.filter(
    (round) =>
      round.special_kind !== 'resume' && (round.special_kind !== 'intake_call' || !jobHasIntake)
  );

  const [selectedRoundType, setSelectedRoundType] = useState<JobOpeningDropdownOption | null>(null);
  const [showRoundInfo, setShowRoundInfo] = useState(false);
  const [intakePosition, setIntakePosition] = useState<IntakePosition>('after_resume');
  const isIntakeSelected = selectedRoundType?.special_kind === 'intake_call';

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
      duration: null,
      variant: null,
    },
  });

  const handleRoundChange = (value: string | number | null) => {
    if (value === null || value === undefined) {
      setSelectedRoundType(null);
      setValue('description', '', { shouldValidate: true });
      setValue('roundType', '', { shouldValidate: true });
      setValue('duration', null, { shouldValidate: true });
      setValue('variant', null, { shouldValidate: true });
    } else {
      const selectedRound = interviewRounds.find((round) => String(round.id) === String(value));
      setSelectedRoundType(selectedRound ?? null);
      if (selectedRound) {
        setValue('description', selectedRound.description || '', { shouldValidate: true });
        setValue('roundType', selectedRound.roundType || '', { shouldValidate: true });
        // Pre-fill with a sensible default the recruiter can still change,
        // same way the round name/description get pre-filled above —
        // rather than silently defaulting to 30 min / the first variant
        // on submit with no way for the recruiter to see or change it.
        setValue('duration', selectedRound.requires_duration ? 30 : null, {
          shouldValidate: true,
        });
        setValue('variant', selectedRound.available_variants?.[0] ?? null, {
          shouldValidate: true,
        });
      }
    }
  };

  const onSubmit = async (data: SaveInterviewRoundRequest) => {
    if (isLoading) return;
    if (!resolvedJobId) {
      // Previously a silent no-op — clicking Save did nothing and gave no
      // indication why. This only happens when the job's own details were
      // never saved (no draft job id in JobSlice or the URL yet), so there
      // is nothing for a round to attach to on the backend.
      showToast({
        message: 'Please save the job details first before adding an interview round.',
        type: 'error',
      });
      return;
    }

    const existing = toInterviewSequencePayload(rounds);
    const newRound = toInterviewRoundRequest(
      {
        roundId: String(data.round),
        sequence: existing.length + 1,
        description: data.description,
        duration: selectedRoundType?.requires_duration ? Number(data.duration) : null,
        variant: selectedRoundType?.available_variants?.length ? data.variant : null,
      },
      { isNew: true }
    );
    // Intake Call goes in at round 1 or right after Resume (round 2), never
    // at the end; every other round type is appended.
    const payload = isIntakeSelected
      ? placeIntakeRound(existing, newRound, intakePosition, (round) =>
          resumeTypeIds.has(String(round.round_id))
        )
      : [...existing, newRound];

    saveInterviewRound({
      jobOpeningId: resolvedJobId,
      rounds: payload,
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
      <div className="app-modal-overlay fixed inset-0 flex items-center justify-center bg-black/60 z-50">
        <div className="app-modal-panel bg-white p-0 rounded-2xl shadow-xl w-[500px] max-w-[92vw] relative overflow-hidden">
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
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
                    Round Name <span className="required-asterisk">*</span>
                    <button
                      type="button"
                      disabled={!selectedRoundType}
                      onClick={() => setShowRoundInfo(true)}
                      aria-label="About this round"
                      className={`inline-flex p-0.5 ${
                        selectedRoundType
                          ? 'text-neutral-400 hover:text-primary-600 cursor-pointer'
                          : 'text-neutral-200 cursor-not-allowed'
                      }`}
                    >
                      <MdInfoOutline size={16} />
                    </button>
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
                        loading={interviewRoundsLoading}
                        filterOption={(input, option) =>
                          typeof option?.children === 'string' &&
                          (option.children as string).toLowerCase().includes(input.toLowerCase())
                        }
                        optionFilterProp="children"
                      >
                        {addableInterviewRounds.length > 0 ? (
                          addableInterviewRounds.map((round) => (
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

              {isIntakeSelected && (
                <Form.Item
                  label={
                    <span className="text-sm font-semibold text-neutral-700">
                      Position <span className="required-asterisk">*</span>
                    </span>
                  }
                >
                  <Radio.Group
                    value={intakePosition}
                    onChange={(e) => setIntakePosition(e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                    className="w-full"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(
                        [
                          ['before_resume', 'Round 1 · Before Resume'],
                          ['after_resume', 'Round 2 · After Resume'],
                        ] as const
                      ).map(([value, label]) => (
                        <Radio.Button
                          key={value}
                          value={value}
                          className={`text-center ${
                            intakePosition === value
                              ? '!bg-primary !text-white !border-primary'
                              : 'bg-gray-100'
                          }`}
                        >
                          {label}
                        </Radio.Button>
                      ))}
                    </div>
                  </Radio.Group>
                  <p className="mt-1.5 text-xs text-neutral-500">
                    {intakePosition === 'before_resume'
                      ? 'Candidates applying from the careers page start with the Intake Call and upload their resume afterwards.'
                      : 'Candidates upload their resume first, then book the Intake Call.'}
                  </p>
                </Form.Item>
              )}

              {/* Catalog-driven, not hardcoded to any one round type — shows
                  up for whichever round type has `available_variants` set
                  (currently just Hiring Panel: Online/Offline), the same
                  way this drives duration below. */}
              {!!selectedRoundType?.available_variants?.length && (
                <Form.Item
                  label={
                    <span className="text-sm font-semibold text-neutral-700">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedRoundType.available_variants!.map((variant) => (
                            <Radio.Button
                              key={variant}
                              value={variant}
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

              {/* Catalog-driven (`requires_duration`) — applies to Video,
                  Hiring Panel and Audio rounds today, but shows for any
                  round type the catalogue marks as needing one. */}
              {selectedRoundType?.requires_duration && (
                <Form.Item
                  label={
                    <span className="text-sm font-semibold text-neutral-700">
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
      {showRoundInfo && selectedRoundType && (
        <RoundInfoModal
          roundName={selectedRoundType.name}
          description={selectedRoundType.description}
          onClose={() => setShowRoundInfo(false)}
        />
      )}
    </>
  );
};

export default AddNewRound;
