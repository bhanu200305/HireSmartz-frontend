import { useEffect, useRef, useState } from 'react';
import { Form, Select, Tooltip } from 'antd';
import { Button, Input, showToast } from '../../shared';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import { CandidateByIdResponse, EditCandidateRequest } from '../../../types';
import { get } from 'lodash-es';
import { useEditCandidateMutation } from '../../../api/candidate-service/Candidates/Candidates';
// import { useUpdateDropdownByTypeMutation } from '../../../api/job-service/AddableDropdown/UpdateDropdownByType';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import { countryCodes } from '../../../constants/countryCode';
import { sanitizeInput } from '../../../shared/utils/validation/input.helpers';
import { restrictPhoneDigits } from '../../../shared/utils/validation/phoneValidation';
import { Loader } from '../../shared/ui/loader';
import {
  // capitalizeWordsAdvanced,
  cleanPhoneNumber,
} from '../../../shared/utils/methods';
import { FaCheckCircle } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editCandidateSchema, EditCandidateFormValues } from './EditCandidateSchema';

type EditCandidateProps = {
  candidate?: CandidateByIdResponse;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  isCandidateLoading: boolean;
  isMultilingualJob?: boolean;
  smsOptOut?: boolean;
};

const EditCandidate: React.FC<EditCandidateProps> = ({
  candidate,
  isEditing,
  setIsEditing,
  isCandidateLoading,
  isMultilingualJob = false,
  smsOptOut = false,
}) => {
  const [form] = Form.useForm();
  const skillsContainerRef = useRef<HTMLDivElement>(null);
  const [, setIsSkillsFocused] = useState(false);
  const [updateCandidate, { isLoading: isEditCandidateLoading }] = useEditCandidateMutation();
  // const [updateDropdownByType] = useUpdateDropdownByTypeMutation();
  const {
    jobOpeningDropdown: mandatorySkills,
    loading: mandatorySkillsLoading,
    // refetch: refetchMandatorySkills,
  } = useJobOpeningDropdown('MANDATORY_SKILLS', 'create');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<EditCandidateFormValues>({
    resolver: zodResolver(editCandidateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      countryCode:
        countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value || '+1',
      phoneNumber: '',
      email: '',
      education: '',
      address: '',
      candidateCommunicationLanguage: null,
      skills: [],
    },
    mode: 'onChange',
  });

  const handleSave = (values: EditCandidateFormValues) => {
    const cleanedPhone = cleanPhoneNumber(values.phoneNumber);
    const payload = {
      linkedInProfile: '',
      ...values,
      firstName: sanitizeInput(values.firstName),
      lastName: sanitizeInput(values.lastName),
      education: sanitizeInput(values.education),
      address: sanitizeInput(values.address),
      phoneNumber: cleanedPhone,
      candidateId: candidate?.id,
      candidateCommunicationLanguage: values.candidateCommunicationLanguage ?? '',
    } as unknown as EditCandidateRequest;
    updateCandidate(payload)
      .unwrap()
      .then((res) => {
        if (res?.success) {
          showToast({
            message: get(res, 'message', 'Candidate Details has been updated successfully'),
            type: 'success',
          });
          setIsEditing(false);
        } else {
          showToast({
            message: get(res, 'message', 'An error occurred while editing details'),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(err?.data, 'message', 'An error occurred while editing details'),
          type: 'error',
        });
      });
  };

  // const handleAddOption = async (newValue: string) => {
  //   try {
  //     const res = await updateDropdownByType({
  //       type: 'MANDATORY_SKILLS',
  //       value: capitalizeWordsAdvanced(newValue),
  //     }).unwrap();

  //     if (res.success) {
  //       showToast({
  //         message: res.message || 'Dropdown has been updated successfully',
  //         type: 'success',
  //       });

  //       await refetchMandatorySkills?.();

  //       const currentValues = watch('skills') || [];
  //       setValue('skills', [...currentValues, res.data.id], {
  //         shouldValidate: true,
  //         shouldDirty: true,
  //       });
  //     } else {
  //       showToast({
  //         message: res.message || 'Failed to update dropdown.',
  //         type: 'error',
  //       });
  //     }
  //   } catch (err) {
  //     showToast({
  //       message: get(err, 'data.message', 'Something went wrong while updating dropdown.'),
  //       type: 'error',
  //     });
  //   }
  // };

  useEffect(() => {
    if (candidate && candidate?.id) {
      reset({
        firstName: candidate?.firstName || '',
        lastName: candidate?.lastName || '',
        countryCode:
          candidate?.countryCode ||
          countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value ||
          '+1',
        phoneNumber: cleanPhoneNumber(candidate?.phoneNumber || ''),
        email: candidate?.email || '',
        education: candidate?.education || '',
        address: candidate?.address ?? '',
        candidateCommunicationLanguage: candidate?.candidateCommunicationLanguage || null,
        skills: candidate?.mandatorySkills?.map((skill: any) => skill?.id) || [],
      });
      // Trigger validation for phone number field after prefilling
      trigger('phoneNumber');
    }
  }, [candidate, reset, isEditing, trigger]);

  const selectedSkills = watch('skills') || [];
  const selectedSkillsData =
    mandatorySkills?.filter((skill: any) => selectedSkills.includes(skill.id)) || [];
  const candidateLanguageValue = watch('candidateCommunicationLanguage');
  const candidateLanguageLabel =
    candidateLanguageValue === 'es' ? 'Español' : candidateLanguageValue === 'en' ? 'English' : '-';

  return (
    <div className="flex-1">
      {isCandidateLoading && <Loader />}
      <Form
        layout="vertical"
        form={form}
        autoComplete="off"
        requiredMark={false}
        onFinish={handleSave}
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 ml-6 mt-2">
          <Form.Item
            label={
              <span>
                First Name <span className="required-asterisk">*</span>
              </span>
            }
            name="firstName"
            style={{ marginBottom: '10px' }}
          >
            <Input
              type="text"
              maxLength={100}
              disabled={!isEditing}
              placeholder="First Name"
              className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              {...register('firstName')}
              onChange={(e) => {
                setValue('firstName', e.target.value, { shouldDirty: true });
                trigger('firstName');
              }}
            />
            <p className="text-red-500 text-sm">{errors.firstName?.message}</p>
          </Form.Item>

          <Form.Item
            label={
              <span>
                Last Name <span className="required-asterisk">*</span>
              </span>
            }
            name="lastName"
            style={{ marginBottom: '10px' }}
          >
            <Input
              type="text"
              maxLength={100}
              disabled={!isEditing}
              placeholder="Last Name"
              className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              {...register('lastName')}
              onChange={(e) => {
                setValue('lastName', e.target.value, { shouldDirty: true });
                trigger('lastName');
              }}
            />
            <p className="text-red-500 text-sm">{errors.lastName?.message}</p>
          </Form.Item>

          <Form.Item
            label={
              <span className="flex items-center gap-1.5">
                Phone Number <span className="required-asterisk">*</span>
                <Tooltip
                  title={smsOptOut ? 'Candidate has opted out of SMS' : 'SMS consent active'}
                >
                  <FaCheckCircle
                    size={14}
                    className={smsOptOut ? 'text-gray-300' : 'text-green-500'}
                  />
                </Tooltip>
              </span>
            }
            name="phone"
            style={{ marginBottom: '10px' }}
          >
            <div className="phone-input-wrapper flex items-center bg-white w-full px-4 rounded-3xl border border-[var(--border)]">
              <Select
                className="!border-none custom-select-no-border"
                onChange={(value) => {
                  setValue('countryCode', value, { shouldDirty: true });
                  trigger('countryCode');
                }}
                value={watch('countryCode')}
                dropdownStyle={{ minWidth: '300px' }}
                style={{ width: '80px', fontSize: '14px' }}
                variant="borderless"
                options={countryCodes.map(({ label, value, short }) => ({
                  label: `${short} - ${label}`,
                  value,
                }))}
                optionLabelProp="value"
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                placeholder="Search..."
                disabled={!isEditing}
              />

              <div className="border-l-2 border-gray-300 h-6 mx-1"></div>

              <Input
                type="tel"
                className="border-none bg-transparent focus:outline-none focus:!ring-0"
                placeholder="Phone number"
                value={watch('phoneNumber')}
                onChange={(e) => {
                  setValue('phoneNumber', restrictPhoneDigits(e.target.value), {
                    shouldDirty: true,
                  });
                  trigger('phoneNumber');
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData('text');
                  setValue('phoneNumber', restrictPhoneDigits(pastedText), { shouldDirty: true });
                  trigger('phoneNumber');
                }}
                maxLength={15}
                disabled={!isEditing}
              />
            </div>
            {isEditing && (
              <>
                <p className="text-red-500 text-sm">{errors.countryCode?.message}</p>
                <p className="text-red-500 text-sm">{errors.phoneNumber?.message}</p>
              </>
            )}
          </Form.Item>

          <Form.Item
            label={
              <span>
                Email ID <span className="required-asterisk">*</span>
              </span>
            }
            name="email"
            style={{ marginBottom: '10px' }}
          >
            <Input
              disabled={!isEditing}
              placeholder="Email ID"
              className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              value={watch('email')}
              onChange={(e) => {
                const noSpaces = e.target.value.replace(/\s/g, '');
                setValue('email', noSpaces, { shouldDirty: true });
                trigger('email');
              }}
            />
            <p className="text-red-500 text-sm">{errors.email?.message}</p>
          </Form.Item>

          <Form.Item
            label={
              <span>
                Qualification <span className="required-asterisk">*</span>
              </span>
            }
            name="education"
            style={{ marginBottom: '10px' }}
          >
            <Input
              disabled={!isEditing}
              placeholder="Qualification"
              className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              {...register('education')}
              onChange={(e) => {
                setValue('education', e.target.value, { shouldDirty: true });
                trigger('education');
              }}
            />
            <p className="text-red-500 text-sm">{errors.education?.message}</p>
          </Form.Item>
          <Form.Item label={<span>Source</span>} style={{ marginBottom: '10px' }}>
            <Input
              type="text"
              placeholder="Source"
              className="w-full p-3 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-gray-300"
              value={candidate?.source ?? ''}
              disabled
            />
          </Form.Item>

          <Form.Item
            label={<span>Candidate Skills</span>}
            name="skills"
            style={{ marginBottom: '10px' }}
          >
            <div className="space-y-3">
              <div
                ref={skillsContainerRef}
                className="relative"
                onFocus={() => setIsSkillsFocused(true)}
                onBlur={() => setIsSkillsFocused(false)}
              >
                <DropdownWithAddOption
                  className="w-full custom-select-jobs placeholder-style [&_.ant-select-selector]:min-h-auto [&_.ant-select-selector]:h-auto [&_.ant-select-selection-item]:!flex [&_.ant-select-selection-item]:!flex-wrap [&_.ant-select-selection-item]:!word-break"
                  mode="multiple"
                  placeholder="Select Candidate Skills"
                  value={selectedSkills}
                  onChange={(value) => {
                    setValue('skills', value ?? [], {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  options={mandatorySkills}
                  loading={mandatorySkillsLoading}
                  // onAddOption={() => {}}
                  type="MANDATORY_SKILLS"
                  disabled={!isEditing}
                  maxTagCount={0}
                  maxTagPlaceholder={(omittedValues: any) => (
                    <span>
                      {omittedValues.length} of {mandatorySkills?.length || 20} skills selected
                    </span>
                  )}
                  // onFocus={() => setIsSkillsFocused(true)}
                  // onBlur={() => setIsSkillsFocused(false)}
                />
              </div>

              {selectedSkills.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Selected Skills</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkillsData.map((skill: any) => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-800 border border-brand-200"
                      >
                        {skill.name}
                        {isEditing && (
                          <Button
                            size="small"
                            onClick={() => {
                              const newValue = selectedSkills.filter((id: any) => id !== skill.id);
                              setValue('skills', newValue, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                            className="ml-1 w-4 h-4 p-0 text-brand-500 hover:text-brand-700 !bg-transparent border-0"
                          >
                            ×
                          </Button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-red-500 text-sm">{errors.skills?.message}</p>
          </Form.Item>
          <Form.Item
            label={
              <span>
                Candidate Location <span className="required-asterisk">*</span>
              </span>
            }
            name="address"
            style={{ marginBottom: '10px' }}
          >
            <Input
              disabled={!isEditing}
              placeholder="Candidate Location"
              className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              {...register('address')}
              onChange={(e) => {
                setValue('address', e.target.value, { shouldDirty: true });
                trigger('address');
              }}
            />
            <p className="text-red-500 text-sm">{errors.address?.message}</p>
          </Form.Item>
          {isMultilingualJob && (
            <Form.Item
              label={<span>Candidate Communication Language</span>}
              name="candidateCommunicationLanguage"
              style={{ marginBottom: '10px' }}
            >
              {isEditing ? (
                <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                  <Select
                    value={candidateLanguageValue || undefined}
                    onChange={(value: 'en' | 'es' | undefined) => {
                      setValue(
                        'candidateCommunicationLanguage',
                        (value ?? '') as 'en' | 'es' | '',
                        { shouldDirty: true }
                      );
                      trigger('candidateCommunicationLanguage');
                    }}
                    className="w-full custom-select-jobs placeholder-style"
                    variant="borderless"
                    placeholder="Select Candidate Communication Language"
                    allowClear
                  >
                    <Select.Option value="en">English</Select.Option>
                    <Select.Option value="es">Español</Select.Option>
                  </Select>
                </div>
              ) : (
                <Input
                  type="text"
                  // value={candidateLanguageLabel === '-' ? '' : candidateLanguageLabel}
                  placeholder={
                    candidateLanguageLabel === '-'
                      ? 'Select Candidate Communication Language'
                      : candidateLanguageLabel
                  }
                  disabled
                  className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                />
              )}
              {isEditing && (
                <p className="text-red-500 text-sm">
                  {errors.candidateCommunicationLanguage?.message}
                </p>
              )}
            </Form.Item>
          )}
        </div>
        {isEditing && (
          <div className="flex justify-center items-center mt-3">
            {isEditCandidateLoading && <Loader />}
            <Button
              disabled={!isDirty || isEditCandidateLoading || !isValid}
              className="w-40 px-3 py-2 bg-primary font-medium text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleSubmit(handleSave)()}
            >
              {isEditCandidateLoading ? 'SAVING...' : 'SAVE CHANGES'}
            </Button>
          </div>
        )}
      </Form>
    </div>
  );
};

export default EditCandidate;
