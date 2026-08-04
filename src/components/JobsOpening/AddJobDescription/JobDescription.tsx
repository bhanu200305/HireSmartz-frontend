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
import { JobDescriptionState, SaveJobOpeningRequest } from '../../../types';
import { Controller, useForm } from 'react-hook-form';
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
import {
  capitalizeWordsAdvanced,
  changeNullValuesToEmptyArray,
  validateDraft,
} from '../../../shared/utils/methods';
import { Loader } from '../../shared/ui/loader';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import {
  useEffect,
  //  useRef,
  useState,
} from 'react';
import {
  useDeleteDropdownMutation,
  useEditDropdownMutation,
  useReuseDropdownMutation,
  useUpdateDropdownByTypeMutation,
} from '../../../api/job-service/AddableDropdown/UpdateDropdownByType';
import { useUpdateJobOpeningMutation } from '../../../api/job-service/JobOpening/UpdateJobOpening';
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
  const [updateDropdownByType] = useUpdateDropdownByTypeMutation();
  const [editDropdown] = useEditDropdownMutation();
  const [deleteDropdown] = useDeleteDropdownMutation();
  const [reuseDropdown] = useReuseDropdownMutation();
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [isAddingToDropdown, setIsAddingToDropdown] = useState<string | null>(null);
  const [isMandatoryFocused, setIsMandatoryFocused] = useState(false);

  const [isOptionalFocused, setIsOptionalFocused] = useState(false);

  const atsJobData = location.state?.jobData;
  const isFromAts = location.state?.refresh;
  const atsJobOpeningId = location.state?.atsJobOpeningId;
  const { details, jobOpeningId, isFormCompleted } = useSelector(
    (state: RootState) => state.JobSlice
  );
  const [saveJobOpening, { isLoading }] = useSaveJobOpeningMutation();
  const [updateJobOpening, { isLoading: isUpdating }] = useUpdateJobOpeningMutation();
  const {
    jobOpeningDropdown: educationPreference,
    loading: educationPreferenceLoading,
    refetch: refetchEducationPreference,
  } = useJobOpeningDropdown('EDUCATION_PREFERENCE', 'create');
  const {
    jobOpeningDropdown: mandatorySkills,
    loading: mandatorySkillsLoading,
    refetch: refetchMandatorySkills,
  } = useJobOpeningDropdown('MANDATORY_SKILLS', 'create');
  const {
    jobOpeningDropdown: optionalSkills,
    loading: optionalSkillsLoading,
    refetch: refetchOptionalSkills,
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
    formState: { errors, isValid },
  } = useForm<JobDescriptionState>({
    resolver: zodResolver(jobDescriptionSchema),
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

    // Set loading state for the specific dropdown
    setIsAddingToDropdown(addType);

    // Store current values for multi-select fields
    const currentValues = watch(type) || [];

    // Clear the previous selection for single select only (educationPreference)
    if (addType === 'educationPreference') {
      setValue(type, [], { shouldValidate: false });
    }

    try {
      const res = await updateDropdownByType({
        type: mappedType,
        value: capitalizeWordsAdvanced(newValue),
      }).unwrap();

      if (res.success) {
        showToast({
          message: res.message || 'Dropdown has been updated successfully',
          type: 'success',
        });

        // Wait for the refetch to complete before setting the value
        let refetchPromise: Promise<any> | undefined;

        switch (addType) {
          case 'educationPreference':
            refetchPromise = refetchEducationPreference?.();
            break;
          case 'mandatorySkills':
            refetchPromise = refetchMandatorySkills?.();
            break;
          case 'optionalSkills':
            refetchPromise = refetchOptionalSkills?.();
            break;
        }

        // Wait for refetch to complete before setting the value
        if (refetchPromise) {
          await refetchPromise;
        }

        // Now set the value after the dropdown data is updated
        if (addType === 'educationPreference') {
          setValue(type, [res.data.id], { shouldValidate: true });
        } else {
          setValue(type, [...currentValues, res.data.id], { shouldValidate: true });
        }
      } else {
        showToast({
          message: res.message || 'Failed to update dropdown.',
          type: 'error',
        });
      }
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
  const handleReuseOption = async (id: string | number, type: string) => {
    const typeMapping: Record<string, string> = {
      educationPreference: 'EDUCATION_PREFERENCE',
      mandatorySkills: 'MANDATORY_SKILLS',
      optionalSkills: 'OPTIONAL_SKILLS',
    };

    const mappedType = typeMapping[type];
    if (!mappedType) return;

    try {
      const res = await reuseDropdown({
        type: mappedType,
        id: [Number(id)],
      }).unwrap();

      // Check if the operation was successful
      if (res.successCount > 0 && res.results?.[0]?.status === 'SUCCESS') {
        const successMessage =
          res.results[0].message || res.message || 'Option reactivated successfully';

        showToast({
          message: successMessage,
          type: 'success',
        });

        // Refetch the dropdown data
        switch (type) {
          case 'educationPreference':
            refetchEducationPreference?.();
            break;
          case 'mandatorySkills':
            refetchMandatorySkills?.();
            break;
          case 'optionalSkills':
            refetchOptionalSkills?.();
            break;
        }
      } else {
        const errorMessage =
          res.results?.[0]?.message || res.message || 'Failed to reactivate option.';

        showToast({
          message: errorMessage,
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Something went wrong while reactivating option.'),
        type: 'error',
      });
    }
  };
  const handleEditOption = async (id: string | number, newName: string, type: string) => {
    const typeMapping: Record<string, string> = {
      educationPreference: 'EDUCATION_PREFERENCE',
      mandatorySkills: 'MANDATORY_SKILLS',
      optionalSkills: 'OPTIONAL_SKILLS',
    };

    const mappedType = typeMapping[type];
    if (!mappedType) return;

    try {
      const res = await editDropdown({
        type: mappedType,
        ids: [Number(id)],
        operation: 'update',
        updateFieldsList: [
          {
            name: capitalizeWordsAdvanced(newName),
          },
        ],
      }).unwrap();

      // Check if the operation was successful based on the response structure
      if (res.successCount > 0 && res.results?.[0]?.status === 'SUCCESS') {
        const successMessage =
          res.results[0].message || res.message || 'Option updated successfully';

        showToast({
          message: successMessage,
          type: 'success',
        });

        // Refetch the dropdown data
        switch (type) {
          case 'educationPreference':
            refetchEducationPreference?.();
            break;
          case 'mandatorySkills':
            refetchMandatorySkills?.();
            break;
          case 'optionalSkills':
            refetchOptionalSkills?.();
            break;
        }
      } else {
        const errorMessage = res.results?.[0]?.message || res.message || 'Failed to update option.';

        showToast({
          message: errorMessage,
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Something went wrong while updating option.'),
        type: 'error',
      });
    }
  };

  const handleDeleteOption = async (id: string | number, type: string) => {
    const typeMapping: Record<string, string> = {
      educationPreference: 'EDUCATION_PREFERENCE',
      mandatorySkills: 'MANDATORY_SKILLS',
      optionalSkills: 'OPTIONAL_SKILLS',
    };

    const mappedType = typeMapping[type];
    if (!mappedType) return;

    try {
      const res = await deleteDropdown({
        type: mappedType,
        ids: [Number(id)], // Send as array of IDs
      }).unwrap();

      // Check if the operation was successful
      if (res.successCount > 0 && res.results?.[0]?.status === 'SUCCESS') {
        const successMessage =
          res.results[0].message || res.message || 'Option updated successfully';

        showToast({
          message: successMessage,
          type: 'success',
        });

        const currentValue = watch(type as keyof JobDescriptionState);
        if (Array.isArray(currentValue)) {
          const updatedValues = currentValue.filter((value) => value !== Number(id));
          setValue(type as keyof JobDescriptionState, updatedValues, { shouldValidate: true });
        } else if (currentValue === id) {
          setValue(type as keyof JobDescriptionState, undefined, { shouldValidate: true });
        }

        // Refetch the dropdown data
        switch (type) {
          case 'educationPreference':
            refetchEducationPreference?.();
            break;
          case 'mandatorySkills':
            refetchMandatorySkills?.();
            break;
          case 'optionalSkills':
            refetchOptionalSkills?.();
            break;
        }
      } else {
        const errorMessage = res.results?.[0]?.message || res.message || 'Failed to update option.';

        showToast({
          message: errorMessage,
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Something went wrong while deleting option.'),
        type: 'error',
      });
    }
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
      const apiPayload: SaveJobOpeningRequest = {
        ...details,
        ...data,
        useCultureIntro: Boolean(details.useCultureIntro),
        locationId: details.officeLocation?.[0],
        shift: `${details.shiftStart || ''} - ${details.shiftEnd || ''}`,
        openings: details.openings || 0,
        minSalary: details.minSalary ? parseFloat(details.minSalary) : undefined,
        maxSalary: details.maxSalary ? parseFloat(details.maxSalary) : undefined,
        minExperience:
          details.minExperience !== null && details.minExperience !== undefined
            ? details.minExperience
            : undefined,
        maxExperience:
          details.maxExperience !== null && details.maxExperience !== undefined
            ? details.maxExperience
            : undefined,
        openDate: details.openDate,
        hiringManagers: details.hiringManagers || [],
        recruiters: details.recruiters || [],
        mandatorySkills: data.mandatorySkills || [],
        educationPreference: data.educationPreference || [],
        //communicationSkills: data.communicationSkills || '',
        responsibilities: data.responsibilities || undefined,
        otherRequirements: data.otherRequirements || undefined,
        exemptionStatus: details.exemptionStatus || undefined,
        referralBonus:
          details.referralBonus === null ||
          details.referralBonus === undefined ||
          details.referralBonus === ''
            ? ''
            : details.referralBonus,
        isDraft: true,
      };

      const response = await saveJobOpening(apiPayload).unwrap();

      if (response?.success) {
        showToast({
          message: get(response, 'message', 'Job saved as draft successfully'),
          type: 'success',
        });
        dispatch(resetJobState());
        setAllowNavigation(true);
        setTimeout(() => {
          navigate('/jobs');
        }, 0);
      } else {
        showToast({
          message: get(response, 'message', 'Failed to save draft'),
          type: 'error',
        });
      }
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

    const payload = {
      ...details,
      ...data,
      locationId: details.officeLocation?.[0],
      generateAiJd: true,
      useCultureIntro: Boolean(details.useCultureIntro),
      shift:
        details.shiftStart && details.shiftEnd ? `${details.shiftStart} - ${details.shiftEnd}` : '',
      referralBonus: details.referralBonus,
      maxExperience: details.maxExperience,
      hiringManagers: details.hiringManagers || [],
      recruiters: details.recruiters || [],
      openings: details.openings || 0,
      minSalary: details.minSalary ? parseFloat(details.minSalary) : undefined,
      maxSalary: details.maxSalary ? parseFloat(details.maxSalary) : undefined,
      minExperience: details.minExperience ?? undefined,
      openDate: details.openDate,
      exemptionStatus: details.exemptionStatus || undefined,
      responsibilities: data.responsibilities || undefined,
    };

    const processedPayload = {
      ...changeNullValuesToEmptyArray<any>({
        ...payload,
        referralBonus: null,
        maxExperience: null,
      }),
      referralBonus:
        payload.referralBonus === null ||
        payload.referralBonus === undefined ||
        payload.referralBonus === ''
          ? ''
          : payload.referralBonus,
      maxExperience: payload.maxExperience,
      hiringManagers: payload.hiringManagers,
      recruiters: payload.recruiters,
      isDraft: false,
    };

    try {
      const apiCall = jobOpeningId
        ? updateJobOpening({ jobOpeningId, body: { ...processedPayload, generateAiJd: true } })
        : saveJobOpening(processedPayload);

      const res = await apiCall.unwrap();

      if (!res?.success) {
        showToast({
          message: get(res, 'message', 'Failed to save job opening. Please try again.'),
          type: 'error',
        });
        return;
      }

      showToast({
        message: get(
          res,
          'message',
          jobOpeningId
            ? 'Job opening has been updated successfully'
            : 'Job opening has been saved successfully'
        ),
        type: 'success',
      });
      dispatch(setJobOpeningId(res.data.jobOpeningId));
      dispatch(setAiJobDescriptionId(res.data.aiJobDescriptionId));

      // Start the stream once the job opening is created
      if (res.data.jobOpeningId) {
        startStream(res.data.jobOpeningId);
      }

      navigate(`/ai-job-description?aiJobDescriptionId=${res.data.aiJobDescriptionId}`, {
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
        <Form.Item
          label={
            <span>
              Required Skills <span className="required-asterisk">*</span>
            </span>
          }
        >
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
                    ?.filter((skill: any) => watch('mandatorySkills')?.includes(skill.id))
                    ?.map((skill: any) => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                      >
                        {skill.name}
                        <Button
                          size="small"
                          onClick={() => {
                            const newValue = (watch('mandatorySkills') || []).filter(
                              (id: any) => id !== skill.id
                            );
                            setValue('mandatorySkills', newValue, { shouldValidate: true });
                          }}
                          className="ml-1 w-4 h-4 p-0 text-blue-500 hover:text-blue-700"
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
                    ?.filter((skill: any) => (watch('optionalSkills') || [])?.includes(skill.id))
                    ?.map((skill: any) => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                      >
                        {skill.name}
                        <Button
                          size="small"
                          onClick={() => {
                            const newValue = (watch('optionalSkills') || []).filter(
                              (id: any) => id !== skill.id
                            );
                            setValue('optionalSkills', newValue, { shouldValidate: true });
                          }}
                          className="ml-1 w-4 h-4 p-0 text-blue-500 hover:text-blue-700"
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
        <Form.Item
          label={
            <span>
              Education Preference <span className="required-asterisk">*</span>
            </span>
          }
        >
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
