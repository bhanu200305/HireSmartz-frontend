import './addJob.css';
import { Form } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import {
  Button,
  // Input,
  showToast,
} from '../../shared';
import { useLocation, useNavigate } from 'react-router-dom';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import { useStreamManager } from '../../../hooks/useStreamManager';
import { RootState } from '../../../redux/provider/store';
import { useDispatch, useSelector } from 'react-redux';
import { JobDescriptionState } from '../../../types';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  resetJobState,
  setAiJobDescriptionId,
  setJobOpeningId,
  updateJobDescription,
} from '../../../redux/slices/jobOpeningSlice';
import { jobDescriptionDraftSchema, jobDescriptionSchema } from './AddJobSchema';
import { get } from 'lodash-es';
import { useSaveJobOpeningMutation } from '../../../api/job-service/JobOpening/AddJobOpening';
import { buildSaveJobDetailsPayload } from '../../../api/job-service/buildSaveJobDetailsPayload';
import { capitalizeWordsAdvanced, validateDraft } from '../../../shared/utils/methods';
import { Loader } from '../../shared/ui/loader';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import {
  useEffect,
  //  useRef,
  useState,
} from 'react';
import { useUpdateJobOpeningMutation } from '../../../api/job-service/JobOpening/UpdateJobOpening';
import { useCreateOrganizationSkillMutation } from '../../../api/job-service/JobOpening/catalogs';
import {
  useUpdateEducationPreferenceMutation,
  useDeleteEducationPreferenceMutation,
} from '../../../api/job-service/JobOpening/educationPreferences';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import { useNavigationBlocker } from '../../../hooks/useNavigationBlocker';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';

const JobDescription = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { startStream } = useStreamManager();
  const [openModalFor, setOpenModalFor] = useState<
    null | 'educationPreference' | 'mandatorySkills' | 'optionalSkills'
  >(null);
  const [updateEducationPreference] = useUpdateEducationPreferenceMutation();
  const [deleteEducationPreference] = useDeleteEducationPreferenceMutation();
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [isAddingToDropdown, setIsAddingToDropdown] = useState<string | null>(null);
  const [, setIsMandatoryFocused] = useState(false);

  const [, setIsOptionalFocused] = useState(false);

  const atsJobData = location.state?.jobData;
  const isFromAts = location.state?.refresh;
  const atsJobOpeningId = location.state?.atsJobOpeningId;
  const { details, jobOpeningId } = useSelector((state: RootState) => state.JobSlice);
  const [saveJobOpening, { isLoading }] = useSaveJobOpeningMutation();
  const [updateJobOpening, { isLoading: isUpdating }] = useUpdateJobOpeningMutation();
  const [createOrganizationSkill] = useCreateOrganizationSkillMutation();
  const {
    jobOpeningDropdown: educationPreference,
    loading: educationPreferenceLoading,
    refetch: refetchEducationPreference,
  } = useJobOpeningDropdown('EDUCATION_PREFERENCE', 'create');
  const {
    jobOpeningDropdown: mandatorySkills,
    loading: mandatorySkillsLoading,
    refetch: refetchMandatorySkills,
    searchSkills: searchMandatorySkills,
  } = useJobOpeningDropdown('MANDATORY_SKILLS', 'create');
  const {
    jobOpeningDropdown: optionalSkills,
    loading: optionalSkillsLoading,
    refetch: refetchOptionalSkills,
    searchSkills: searchOptionalSkills,
  } = useJobOpeningDropdown('OPTIONAL_SKILLS', 'create');

  const { jobDescription, aiJobDescriptionId } = useSelector((state: RootState) => ({
    jobOpeningId: state.JobSlice.jobOpeningId,
    jobDescription: state.JobSlice.description,
    aiJobDescriptionId: state.JobSlice.aiJobDescriptionId,
  }));
  const defaultVals = {
    educationPreference: jobDescription?.educationPreference || [],
    //communicationSkills: jobDescription?.communicationSkills || '',
    mandatorySkills: jobDescription?.mandatorySkills || [],
    optionalSkills: jobDescription?.optionalSkills || [],
    otherRequirements: jobDescription?.otherRequirements || '',
  };

  const {
    // register,
    handleSubmit,
    setValue,
    watch,
    setError,
    control,
    formState: { errors },
  } = useForm<JobDescriptionState>({
    resolver: zodResolver(jobDescriptionSchema) as Resolver<JobDescriptionState>,
    defaultValues: defaultVals,
  });
  const formValues = watch();
  const isFormDirty = JSON.stringify(formValues) !== JSON.stringify(jobDescription);

  const { isBlocked, confirmNavigation, cancelNavigation } = useNavigationBlocker(
    true,
    isFormDirty && !allowNavigation
  );

  useEffect(() => {
    if (atsJobData && isFromAts) {
      const transformedAtsData = {
        educationPreference: atsJobData.educationPreference?.map((item: any) => item.id) || [],
        communicationSkills: atsJobData.communicationSkills || '',
        mandatorySkills: atsJobData.mandatorySkills?.map((item: any) => item.id) || [],
        optionalSkills: atsJobData.optionalSkills?.map((item: any) => item.id) || [],
      };

      Object.entries(transformedAtsData).forEach(([key, value]) => {
        setValue(key as keyof JobDescriptionState, value as any);
      });
      refetchEducationPreference?.();
      refetchMandatorySkills?.();
      refetchOptionalSkills?.();
    }
  }, [
    atsJobData,
    isFromAts,
    setValue,
    refetchEducationPreference,
    refetchMandatorySkills,
    refetchOptionalSkills,
  ]);

  const handleAddOption = async (
    newValue: string,
    type: 'educationPreference' | 'mandatorySkills' | 'optionalSkills'
  ) => {
    const addType = type || openModalFor;
    if (!addType) return;

    const typeMapping: Record<string, string> = {
      educationPreference: 'EDUCATION_PREFERENCE',
      mandatorySkills: 'MANDATORY_SKILLS',
      optionalSkills: 'OPTIONAL_SKILLS',
    };

    const mappedType = typeMapping[addType];
    if (!mappedType) return;

    const formattedValue = capitalizeWordsAdvanced(newValue);
    const normalizedValue = formattedValue.toLowerCase();
    setIsAddingToDropdown(addType);

    try {
      if (addType === 'educationPreference') {
        setValue('educationPreference', [formattedValue], { shouldValidate: true });
        showToast({ message: 'Education preference added', type: 'success' });
        return;
      }

      const currentSkillIds = (watch(addType) || []).map(String);
      const existingSkill = [...mandatorySkills, ...optionalSkills].find(
        (skill) => skill.name.toLowerCase() === normalizedValue
      );
      if (existingSkill) {
        setValue(addType, [...currentSkillIds, existingSkill.id], { shouldValidate: true });
        return;
      }
      const createdSkill = await createOrganizationSkill({ name: formattedValue }).unwrap();
      showToast({ message: 'Skill added successfully', type: 'success' });
      setValue(addType, [...currentSkillIds, createdSkill.skill_id], { shouldValidate: true });
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Something went wrong while updating dropdown.'),
        type: 'error',
      });
    } finally {
      setIsAddingToDropdown(null);
      setOpenModalFor(null);
    }
  };
  const handleReuseOption = async (_id: string | number, _type: string) => {
    // Education preferences and skill-catalog entries are soft-deleted on
    // the current backend, but none of them expose a restore/reactivate
    // endpoint (only create/list/update/delete) — the old generic
    // /job-opening/{type}/reuse/{id} this used to call doesn't exist on
    // this backend at all.
    showToast({
      message: 'Removed options cannot be restored from this screen.',
      type: 'error',
    });
  };
  const handleEditOption = async (id: string | number, newName: string, type: string) => {
    if (type === 'educationPreference') {
      try {
        await updateEducationPreference({
          preferenceId: String(id),
          name: capitalizeWordsAdvanced(newName),
        }).unwrap();

        showToast({ message: 'Education preference updated successfully', type: 'success' });
        refetchEducationPreference?.();
      } catch (err) {
        showToast({
          message: getJobErrorMessage(
            err,
            'Something went wrong while updating education preference.'
          ),
          type: 'error',
        });
      }

      return;
    }

    // No update endpoint exists for a tenant's own skill-catalog entries —
    // /skills only supports POST (create) and /skills/search (read).
    showToast({
      message: 'Skills cannot be renamed from this screen.',
      type: 'error',
    });
  };

  const handleDeleteOption = async (id: string | number, type: string) => {
    if (type === 'educationPreference') {
      try {
        await deleteEducationPreference(String(id)).unwrap();
        showToast({ message: 'Education preference removed successfully', type: 'success' });

        const currentValue = watch(type as keyof JobDescriptionState);
        if (Array.isArray(currentValue)) {
          const updatedValues = currentValue.filter((value) => String(value) !== String(id));
          setValue(type as keyof JobDescriptionState, updatedValues, { shouldValidate: true });
        } else if (String(currentValue) === String(id)) {
          setValue(type as keyof JobDescriptionState, undefined, { shouldValidate: true });
        }

        refetchEducationPreference?.();
      } catch (err) {
        showToast({
          message: getJobErrorMessage(
            err,
            'Something went wrong while removing education preference.'
          ),
          type: 'error',
        });
      }

      return;
    }

    // No delete endpoint exists for a tenant's own skill-catalog entries —
    // same gap as handleEditOption above.
    showToast({
      message: 'Skills cannot be removed from this screen.',
      type: 'error',
    });
  };

  const onSaveDraft = async (data: Partial<JobDescriptionState>) => {
    const { errors } = validateDraft<JobDescriptionState>(data, jobDescriptionDraftSchema);

    if (errors) {
      const fieldErrors = Object.entries(errors).reduce(
        (acc, [key, value]) => {
          acc[key] = { type: 'manual', message: value.message };
          return acc;
        },
        {} as Record<string, { type: string; message: string }>
      );
      Object.entries(fieldErrors).forEach(([name, error]) => {
        setError(name as keyof JobDescriptionState, error);
      });

      return;
    }

    try {
      const detailsPayload = buildSaveJobDetailsPayload({
        data: {
          ...details,
          ...data,
          useCultureIntro: Boolean(details.useCultureIntro),
        },
      });

      if (jobOpeningId) {
        await updateJobOpening({ jobOpeningId, body: detailsPayload }).unwrap();
      } else {
        await saveJobOpening({ details: detailsPayload }).unwrap();
      }

      showToast({
        message: 'Job saved as draft successfully',
        type: 'success',
      });
      dispatch(resetJobState());
      setAllowNavigation(true);
      setTimeout(() => {
        navigate('/jobs');
      }, 0);
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to save draft'),
        type: 'error',
      });
    }
  };

  const onSubmit = async (data: JobDescriptionState) => {
    dispatch(updateJobDescription(data));
    setAllowNavigation(true);

    const detailsPayload = buildSaveJobDetailsPayload({
      data: {
        ...details,
        ...data,
        useCultureIntro: Boolean(details.useCultureIntro),
      },
    });

    try {
      let savedId = jobOpeningId;
      if (jobOpeningId) {
        const res = await updateJobOpening({
          jobOpeningId,
          body: detailsPayload,
        }).unwrap();
        savedId = res.org_job_opening_id || jobOpeningId;
      } else {
        const res = await saveJobOpening({ details: detailsPayload }).unwrap();
        savedId = res.org_job_opening_id;
      }

      showToast({
        message: jobOpeningId
          ? 'Job opening has been updated successfully'
          : 'Job opening has been saved successfully',
        type: 'success',
      });
      dispatch(setJobOpeningId(savedId));
      dispatch(setAiJobDescriptionId(savedId));

      if (savedId) {
        startStream(savedId);
      }

      navigate(`/ai-job-description?aiJobDescriptionId=${savedId}`, {
        state: {
          jobData: atsJobData,
          refresh: isFromAts,
          atsJobOpeningId: atsJobOpeningId,
          isUpdate: !!jobOpeningId,
        },
      });
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Something went wrong while saving job opening.'),
        type: 'error',
      });
    }
  };
  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      {(isLoading || isUpdating) && <Loader />}
      <div className="grid grid-cols-2 gap-x-4">
        {/* <Form.Item
          label={
            <span>
              Communication Skills <span className="required-asterisk">*</span>
            </span>
          }
        >
          <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
            <Select
              value={watch('communicationSkills') || undefined}
              onChange={(value) =>
                setValue('communicationSkills', value, {
                  shouldValidate: true,
                })
              }
              placeholder="Select Communication Skill Level"
              className="w-full custom-select-jobs placeholder-style"
              variant="borderless"
            >
              <Select.Option value="Basic">Basic</Select.Option>
              <Select.Option value="Intermediate">Intermediate</Select.Option>
              <Select.Option value="Advanced">Advanced</Select.Option>
              <Select.Option value="Fluent / Native-like">Fluent / Native-like</Select.Option>
            </Select>
          </div>
          {errors.communicationSkills && (
            <p className="text-red-500 text-sm mt-1">{errors.communicationSkills.message}</p>
          )}
        </Form.Item> */}
        <Form.Item label={<span>Required Skills</span>}>
          <div className="space-y-3">
            <div
              className="relative"
              onFocus={() => setIsMandatoryFocused(true)}
              onBlur={() => setIsMandatoryFocused(false)}
            >
              <DropdownWithAddOption
                className="w-full custom-select-jobs placeholder-style [&_.ant-select-selector]:min-h-auto [&_.ant-select-selector]:h-auto [&_.ant-select-selection-item]:!flex [&_.ant-select-selection-item]:!flex-wrap [&_.ant-select-selection-item]:!word-break"
                value={watch('mandatorySkills')}
                onChange={(value) =>
                  setValue('mandatorySkills', value, {
                    shouldValidate: true,
                  })
                }
                options={mandatorySkills}
                loading={mandatorySkillsLoading || isAddingToDropdown === 'mandatorySkills'}
                mode="multiple"
                placeholder="Select Required Skills"
                label="Required Skills"
                onAddOption={(value) => handleAddOption(value, 'mandatorySkills')}
                onSearchChange={searchMandatorySkills}
                type="mandatorySkills"
                error={errors.mandatorySkills?.message}
                enableEditDelete
                onEditOption={handleEditOption}
                onDeleteOption={handleDeleteOption}
                onReuseOption={handleReuseOption}
                maxTagCount={0}
                maxTagPlaceholder={(omittedValues: any) => (
                  <span>
                    {omittedValues.length} of {mandatorySkills?.length || 20} skills selected
                  </span>
                )}
              />
            </div>

            {watch('mandatorySkills') && watch('mandatorySkills').length > 0 && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Selected Skills</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mandatorySkills
                    ?.filter((skill: any) =>
                      (watch('mandatorySkills') || []).map(String).includes(String(skill.id))
                    )
                    ?.map((skill: any) => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-800 border border-brand-200"
                      >
                        {skill.name}
                        <Button
                          size="small"
                          onClick={() => {
                            const newValue = (watch('mandatorySkills') || []).filter(
                              (id: any) => String(id) !== String(skill.id)
                            );
                            setValue('mandatorySkills', newValue, { shouldValidate: true });
                          }}
                          className="ml-1 w-4 h-4 p-0 text-brand-500 hover:text-brand-700"
                        >
                          ×
                        </Button>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </Form.Item>

        <Form.Item label="Optional Skills">
          <div className="space-y-3">
            <div
              className="relative"
              onFocus={() => setIsOptionalFocused(true)}
              onBlur={() => setIsOptionalFocused(false)}
            >
              <DropdownWithAddOption
                className="w-full custom-select-jobs placeholder-style"
                value={watch('optionalSkills') || []}
                onChange={(value) =>
                  setValue('optionalSkills', value || [], {
                    shouldValidate: true,
                  })
                }
                options={optionalSkills}
                loading={optionalSkillsLoading || isAddingToDropdown === 'optionalSkills'}
                mode="multiple"
                placeholder="Select Optional Skills"
                label="Optional Skills"
                onAddOption={(value) => handleAddOption(value, 'optionalSkills')}
                onSearchChange={searchOptionalSkills}
                type="optionalSkills"
                error={errors.optionalSkills?.message}
                enableEditDelete
                onEditOption={handleEditOption}
                onDeleteOption={handleDeleteOption}
                onReuseOption={handleReuseOption}
                maxTagCount={0}
                maxTagPlaceholder={(omittedValues: any) => (
                  <span>
                    {omittedValues.length} of {optionalSkills?.length || 20} skills selected
                  </span>
                )}
              />
            </div>

            {(watch('optionalSkills') || []).length > 0 && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-3 max-h-40 overflow-auto pr-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Selected Skills</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {optionalSkills
                    ?.filter((skill: any) =>
                      (watch('optionalSkills') || []).map(String).includes(String(skill.id))
                    )
                    ?.map((skill: any) => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-800 border border-brand-200"
                      >
                        {skill.name}
                        <Button
                          size="small"
                          onClick={() => {
                            const newValue = (watch('optionalSkills') || []).filter(
                              (id: any) => String(id) !== String(skill.id)
                            );
                            setValue('optionalSkills', newValue, { shouldValidate: true });
                          }}
                          className="ml-1 w-4 h-4 p-0 text-brand-500 hover:text-brand-700"
                        >
                          ×
                        </Button>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </Form.Item>
      </div>

      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item label={<span>Responsibilities</span>}>
          <Controller
            name="responsibilities"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                placeholder="Enter responsibilities"
                rows={4}
                maxLength={1000}
                showCount={{
                  formatter: ({ count, maxLength }) => `${count}/${maxLength} characters`,
                }}
                className="w-full px-4 py-2 border rounded-lg"
              />
            )}
          />
          {/* {errors.responsibilities && (
                  <p className="text-red-500 text-sm mt-1">{errors.responsibilities.message}</p>
                )} */}
        </Form.Item>
        <Form.Item label={<span>Education Preference</span>}>
          <DropdownWithAddOption
            className="w-full custom-select-jobs placeholder-style"
            value={watch('educationPreference')[0]}
            onChange={(value) =>
              setValue('educationPreference', [value], {
                shouldValidate: true,
              })
            }
            options={educationPreference}
            loading={educationPreferenceLoading || isAddingToDropdown === 'educationPreference'}
            placeholder="Select Education Preference"
            label="Education Preference"
            onAddOption={(value) => handleAddOption(value, 'educationPreference')}
            type="educationPreference"
            error={errors.educationPreference?.message}
            enableEditDelete
            onEditOption={handleEditOption}
            onDeleteOption={handleDeleteOption}
            onReuseOption={handleReuseOption}
          />
        </Form.Item>
      </div>

      <div className="grid grid-cols gap-x-4">
        <Form.Item label={<span>Other Requirements</span>}>
          <Controller
            name="otherRequirements"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                placeholder="Enter other requirements"
                rows={4}
                maxLength={1000}
                showCount={{
                  formatter: ({ count, maxLength }) => `${count}/${maxLength} characters`,
                }}
                className="w-full px-4 py-2 border rounded-lg"
              />
            )}
          />
          {errors.otherRequirements && (
            <p className="text-red-500 text-sm mt-1">{errors.otherRequirements.message}</p>
          )}
        </Form.Item>
      </div>
      <div className="flex items-center justify-center mt-6 gap-6">
        {!aiJobDescriptionId && (
          <Button
            type="button"
            className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
            onClick={() => onSaveDraft(watch())}
            disabled={isLoading}
          >
            SAVE AS DRAFT
          </Button>
        )}
        <Button
          type="button"
          className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading || isUpdating}
        >
          SAVE & NEXT
        </Button>
      </div>

      {isBlocked && (
        <ConfirmationModal
          onClose={cancelNavigation}
          onConfirm={confirmNavigation}
          title="You have unsaved changes. Are you sure you want to leave?"
          confirmText="LEAVE PAGE"
        />
      )}
    </Form>
  );
};
export default JobDescription;
