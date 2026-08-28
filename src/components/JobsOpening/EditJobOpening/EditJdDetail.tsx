import { Form } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Button, showToast } from '../../shared';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { RootState } from '../../../redux/provider/store';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { JobDescriptionState } from '../../../types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { editJobDescriptionDraftSchema, editJobDescriptionSchema } from './EditJobDetailsSchema';
import '../AddJobDescription/addJob.css';
import {
  resetEditJobState,
  setEditJobOpeningId,
  setIsChanged,
  setIsDraft,
  updateEditAiJobDescription,
  updateEditJobDescription,
  updateEditJobDetails,
} from '../../../redux/slices/editJobOpeningSlice';
import { Loader } from '../../shared/ui/loader';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import { get } from 'lodash-es';
import {
  useDeleteDropdownMutation,
  useEditDropdownMutation,
  useReuseDropdownMutation,
} from '../../../api/job-service/AddableDropdown/UpdateDropdownByType';
import { useUpdateJobOpeningMutation } from '../../../api/job-service/JobOpening/UpdateJobOpening';
import { buildSaveJobDetailsPayload } from '../../../api/job-service/buildSaveJobDetailsPayload';
import { asJobId } from '../../../api/job-service/jobId';
import { useCreateOrganizationSkillMutation } from '../../../api/job-service/JobOpening/catalogs';
import { capitalizeWordsAdvanced, validateDraft } from '../../../shared/utils/methods';
import { useNavigationBlocker } from '../../../hooks/useNavigationBlocker';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';

const EditJobDescription = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const justSavedRef = useRef(false);

  const {
    jobOpeningDropdown: educationPreference,
    loading: educationPreferenceLoading,
    refetch: refetchEducationPreference,
  } = useJobOpeningDropdown('EDUCATION_PREFERENCE', 'edit', Number(id));
  const {
    jobOpeningDropdown: mandatorySkills,
    loading: mandatorySkillsLoading,
    refetch: refetchMandatorySkills,
    searchSkills: searchMandatorySkills,
  } = useJobOpeningDropdown('MANDATORY_SKILLS', 'edit', Number(id));
  const {
    jobOpeningDropdown: optionalSkills,
    loading: optionalSkillsLoading,
    refetch: refetchOptionalSkills,
    searchSkills: searchOptionalSkills,
  } = useJobOpeningDropdown('OPTIONAL_SKILLS', 'edit', Number(id));

  const [openModalFor, setOpenModalFor] = useState<
    null | 'educationPreference' | 'mandatorySkills' | 'optionalSkills'
  >(null);
  const [editDropdown] = useEditDropdownMutation();
  const [deleteDropdown] = useDeleteDropdownMutation();
  const [reuseDropdown] = useReuseDropdownMutation();
  const [updateJobOpening, { isLoading: isUpdatingDraft }] = useUpdateJobOpeningMutation();
  const [createOrganizationSkill] = useCreateOrganizationSkillMutation();
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [isAddingToDropdown, setIsAddingToDropdown] = useState<string | null>(null);
  const { descriptionDetails, jobDetails, isDraft } = useSelector(
    (state: RootState) => ({
      jobDetails: state.EditJobSlice.details,
      descriptionDetails: state.EditJobSlice.description,
      isDraft: state.EditJobSlice.isDraft,
    }),
    shallowEqual
  );

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<JobDescriptionState>({
    resolver: zodResolver(editJobDescriptionSchema) as Resolver<JobDescriptionState>,
    defaultValues: {
      educationPreference: descriptionDetails?.educationPreference || [],
      //communicationSkills: descriptionDetails?.communicationSkills || '',
      mandatorySkills: descriptionDetails?.mandatorySkills || [],
      optionalSkills: descriptionDetails?.optionalSkills || [],
      responsibilities: descriptionDetails?.responsibilities || '',
      otherRequirements: descriptionDetails?.otherRequirements || '',
    },
  });

  const formValues = watch();
  const [, setIsMandatoryFocused] = useState<boolean>(false);
  const [, setIsOptionalFocused] = useState<boolean>(false);

  const isFormDirty = JSON.stringify(formValues) !== JSON.stringify(descriptionDetails);

  const { isBlocked, confirmNavigation, cancelNavigation } = useNavigationBlocker(
    true,
    isFormDirty && !allowNavigation
  );

  useEffect(() => {
    if (isFormDirty) {
      dispatch(setIsChanged(true));
    }
  }, [isFormDirty]);

  useEffect(() => {
    if (!justSavedRef.current) {
      if (descriptionDetails && Object.keys(descriptionDetails).length > 0) {
        reset(descriptionDetails);
        // Ensure otherRequirements is explicitly set (even if empty string)
        if (
          descriptionDetails.otherRequirements !== undefined &&
          descriptionDetails.otherRequirements !== null
        ) {
          setValue('otherRequirements', descriptionDetails.otherRequirements, {
            shouldValidate: false,
          });
        }
      }
    }
  }, [descriptionDetails, reset, setValue]);
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
    setAllowNavigation(true);
    const { errors } = validateDraft<JobDescriptionState>(data, editJobDescriptionDraftSchema);

    if (errors) {
      Object.entries(errors).forEach(([name, error]) => {
        setError(name as keyof JobDescriptionState, error);
      });
      return;
    }
    try {
      const body = buildSaveJobDetailsPayload({
        data: {
          ...jobDetails,
          ...data,
          useCultureIntro: Boolean(jobDetails.useCultureIntro),
        },
      });

      await updateJobOpening({
        body,
        jobOpeningId: asJobId(id),
      }).unwrap();

      showToast({
        message: 'Job saved as draft successfully',
        type: 'success',
      });
      justSavedRef.current = true;
      dispatch(resetEditJobState());
      navigate('/jobs');
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to save draft'),
        type: 'error',
      });
    }
  };

  // const onSubmit = (data: JobDescriptionState) => {
  //   dispatch(updateEditJobDetails(jobDetails))
  //   dispatch(updateEditJobDescription(data))

  //   if (!isDraft) {
  //     navigate(`/jobs/edit/${id}/description/confirm-new-jd`)
  //   }
  // }
  const onSubmit = (data: JobDescriptionState) => {
    setAllowNavigation(true);
    dispatch(updateEditJobDetails(jobDetails));
    dispatch(updateEditJobDescription(data));
    setTimeout(() => {
      if (isDraft) {
        handleSubmitJob(true);
      } else {
        navigate(`/jobs/edit/${id}/description/confirm-new-jd`);
      }
    }, 500);
  };

  const handleSubmitJob = async (_generateAiJd: boolean) => {
    const formData = watch();
    const jobOpeningId = asJobId(id);
    const body = buildSaveJobDetailsPayload({
      data: {
        ...jobDetails,
        ...formData,
        useCultureIntro: Boolean(jobDetails.useCultureIntro),
      },
    });

    try {
      const response = await updateJobOpening({
        body,
        jobOpeningId,
      }).unwrap();

      const savedId = response.org_job_opening_id || jobOpeningId;
      showToast({
        message: 'Job opening has been updated successfully',
        type: 'success',
      });
      dispatch(setEditJobOpeningId(savedId));
      dispatch(
        updateEditAiJobDescription({
          id: savedId,
          jobOpeningId: savedId,
        })
      );
      dispatch(setIsDraft(false));
      dispatch(setIsChanged(false));
      navigate(`/jobs/edit/${id}/AiJobDescription/${savedId}`);
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to update job opening'),
        type: 'error',
      });
    }
  };
  return (
    <>
      {isUpdatingDraft && <Loader />}
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)} autoComplete="off">
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label={<span>Required Skills</span>}>
            <div className="space-y-3">
              <Controller
                name="mandatorySkills"
                control={control}
                render={({ field: { value } }) => (
                  <>
                    <div
                      className="relative"
                      onFocus={() => setIsMandatoryFocused(true)}
                      onBlur={() => setIsMandatoryFocused(false)}
                    >
                      <DropdownWithAddOption
                        className="w-full custom-select-jobs placeholder-style"
                        value={value || []}
                        onChange={(values) => {
                          setValue('mandatorySkills', values || [], { shouldValidate: true });
                        }}
                        options={mandatorySkills}
                        loading={mandatorySkillsLoading}
                        placeholder="Select Required Skills"
                        label="Required Skills"
                        onAddOption={(newValue) => handleAddOption(newValue, 'mandatorySkills')}
                        onSearchChange={searchMandatorySkills}
                        type="mandatorySkills"
                        mode="multiple"
                        enableEditDelete
                        onEditOption={handleEditOption}
                        onDeleteOption={handleDeleteOption}
                        onReuseOption={handleReuseOption}
                        maxTagCount={0}
                        maxTagPlaceholder={(omittedValues: any) => (
                          <span>
                            {omittedValues.length} of {mandatorySkills?.length || 20} skills
                            selected
                          </span>
                        )}
                      />
                    </div>

                    {value && value.length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Selected Skills</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {mandatorySkills
                            ?.filter((skill: any) =>
                              (value || []).map(String).includes(String(skill.id))
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
                                    const newValue = (value || []).filter(
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
                  </>
                )}
              />
              {errors.mandatorySkills && (
                <p className="text-red-500 text-sm mt-1">{errors.mandatorySkills.message}</p>
              )}
            </div>
          </Form.Item>
          <Form.Item label="Optional Skills">
            <Controller
              name="optionalSkills"
              control={control}
              render={({ field: { value } }) => (
                <>
                  <div
                    className="relative"
                    onFocus={() => setIsOptionalFocused(true)}
                    onBlur={() => setIsOptionalFocused(false)}
                  >
                    <DropdownWithAddOption
                      className="w-full custom-select-jobs placeholder-style"
                      value={value || []}
                      onChange={(values) => {
                        setValue('optionalSkills', values || [], { shouldValidate: true });
                      }}
                      options={optionalSkills}
                      loading={optionalSkillsLoading}
                      placeholder="Select Optional Skills"
                      label="Optional Skills"
                      onAddOption={(newValue) => handleAddOption(newValue, 'optionalSkills')}
                      onSearchChange={searchOptionalSkills}
                      type="optionalSkills"
                      mode="multiple"
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

                  {value && value.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-3 max-h-40 overflow-auto pr-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Selected Skills</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {optionalSkills
                          ?.filter((skill: any) =>
                            (value || []).map(String).includes(String(skill.id))
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
                                  const newValue = (value || []).filter(
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
                </>
              )}
            />
            {errors.optionalSkills && (
              <p className="text-red-500 text-sm mt-1">{errors.optionalSkills.message}</p>
            )}
          </Form.Item>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item label={<span>Responsibilities</span>}>
            <Controller
              name="responsibilities"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  value={field.value || ''}
                  placeholder="Enter responsibilities"
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              )}
            />
            {errors.responsibilities && (
              <p className="text-red-500 text-sm mt-1">{errors.responsibilities.message}</p>
            )}
          </Form.Item>
          <Form.Item label={<span>Education Preference</span>}>
            <DropdownWithAddOption
              className="w-full custom-select-jobs placeholder-style"
              value={watch('educationPreference')?.[0]}
              onChange={(value) => {
                setValue('educationPreference', value ? [value] : [], { shouldValidate: true });
              }}
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

        <div className="grid grid-cols gap-4">
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
                  setValue('communicationSkills', value, { shouldValidate: true })
                }
                className="w-full custom-select placeholder-style"
                placeholder="Select Communication Level"
                popupClassName="rounded-3xl"
              >
                <Option value="Basic">Basic</Option>
                <Option value="Intermediate">Intermediate</Option>
                <Option value="Advanced">Advanced</Option>
                <Option value="Fluent / Native-like">Fluent / Native-like</Option>
              </Select>
            </div>
            {errors.communicationSkills && (
              <p className="text-red-500 text-sm mt-1">{errors.communicationSkills.message}</p>
            )}
          </Form.Item> */}

          <Form.Item label={<span>Other Requirements</span>}>
            <Controller
              name="otherRequirements"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  value={field.value || ''}
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
          {isDraft && (
            <Button
              type="button"
              className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
              onClick={() => {
                const formData = watch();
                onSaveDraft(formData);
              }}
              disabled={isUpdatingDraft}
            >
              SAVE AS DRAFT
            </Button>
          )}
          <Button
            type="button"
            className="text-white bg-button hover:bg-button-dark rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
            onClick={handleSubmit(onSubmit)}
            disabled={isUpdatingDraft}
          >
            SAVE & NEXT
          </Button>
        </div>
      </Form>
      {isBlocked && (
        <ConfirmationModal
          onClose={cancelNavigation}
          onConfirm={confirmNavigation}
          title="You have unsaved changes. Are you sure you want to leave?"
          confirmText="LEAVE PAGE"
        />
      )}
      <Outlet />
    </>
  );
};

export default EditJobDescription;
