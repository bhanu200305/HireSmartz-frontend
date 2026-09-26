import { TbReload } from 'react-icons/tb';
import { Button, Input, showToast } from '../../shared';
import { Tooltip } from 'antd';
import { MdEdit, MdSave } from 'react-icons/md';
import {
  useGetJobDescriptionByIdQuery,
  useUpdateJobDescriptionMutation,
} from '../../../api/job-service/JobOpening/ViewJobDescriptionById';
import ReactMarkdown from 'react-markdown';
import { Loader } from '../../shared/ui/loader';
import { useEnhanceJdMutation } from '../../../api/job-service/JobOpening/JdUpload';
import { useJdStatusPolling } from '../../../hooks/useJdStatusPolling';
import { useForm } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateJobDetails } from '../../../redux/slices/jobOpeningSlice';
import { updateEditJobDetails } from '../../../redux/slices/editJobOpeningSlice';
import { RootState } from '../../../redux/provider/store';
import TurndownService from 'turndown';
import { RichTextEditor } from '../../shared/ui/RichTextEditor';
import {
  formatAiJobDescription,
  jdGenerationFailureMessage,
} from '../../../shared/utils/business-logic';
import { diffAiOwnedFields, mergeNewAiSkills } from '../../../shared/utils/jdSync';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { makeFirstLetterUpperCase } from '../../../shared/utils/methods';
import { useGetTopFivePromptQuery } from '../../../api/ai-service/AiQuestion/AiQuestion';
import { asJobId } from '../../../api/job-service/jobId';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import { useGetTenantProfileQuery } from '../../../api/organization-service/Tenants/profile';

interface JobDescriptionPanelProps {
  /** UUID of the job — JD hangs off the job, not a separate entity. */
  aiJobDescriptionId: string | number | null;
  /** True when mounted from the Edit wizard — uses EditJobSlice instead of JobSlice. */
  isEditFlow?: boolean;
}

/**
 * Right-hand panel of the merged "Job Details & AI Description" step —
 * adapted from `ViewJobDescription.tsx` (previously its own separate wizard
 * page at `/ai-job-description`). Same prompt/REFINE/REGENERATE/EDIT
 * behavior against the same real endpoints; what's dropped is everything
 * that belonged to that page being its own step: its own `JobDetailsLayout`/
 * `MainLayout` wrapper, its own navigation-blocker (the merged page's own
 * blocker already covers this panel), and the "Sync with ATS" + final
 * "Save & Next" footer — advancing to the next wizard step is now `jobdetails.tsx`'s
 * job, not this panel's, since generating the description no longer means
 * leaving the page.
 */
const JobDescriptionPanel = ({
  aiJobDescriptionId,
  isEditFlow = false,
}: JobDescriptionPanelProps) => {
  const dispatch = useDispatch();
  const jobOpeningId = asJobId(aiJobDescriptionId);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [previewDescription, setPreviewDescription] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Which job the "JD generation failed" toast was last shown for, so it isn't repeated.
  const failedToastShownForJobRef = useRef<string | null>(null);
  // Previous jd_status tick, to detect an actual transition into READY.
  const prevJdStatusRef = useRef<string | undefined>(undefined);
  // True once a completion is observed, until the resulting refetch lands.
  const awaitingFreshAiFieldsRef = useRef(false);

  const { register, getValues, setValue, watch } = useForm({
    defaultValues: { description: '' },
  });
  const jobDetailsInRedux = useSelector((state: RootState) =>
    isEditFlow ? state.EditJobSlice.details : state.JobSlice.details
  );
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const { data: tenantProfile } = useGetTenantProfileQuery(tenantId ?? '', {
    skip: !tenantId,
  });

  const {
    data: prompts,
    isFetching: isFetchingPrompts,
    refetch: refetchTopFivePrompt,
  } = useGetTopFivePromptQuery(undefined, { refetchOnMountOrArgChange: true });

  const {
    data: response,
    isLoading,
    refetch,
  } = useGetJobDescriptionByIdQuery({ jobOpeningId }, { skip: !jobOpeningId });
  // Whether Job Details has real saved content (title + department); gates Generate/Refine/Regenerate.
  const hasSavedDetails = response?.hasSavedDetails ?? false;
  const { data: jdStatus, timedOut: jdStatusTimedOut } = useJdStatusPolling(jobOpeningId, {
    notifyOnTimeout: true,
  });
  const [updateJobDescription, { isLoading: isUpdating }] = useUpdateJobDescriptionMutation();
  const [enhanceJd, { isLoading: isGenerating }] = useEnhanceJdMutation();

  useEffect(() => {
    if (response?.jobDescription) {
      setPreviewDescription(response.jobDescription);
      setEditorContent(response.jobDescription);
    }
  }, [response]);

  // jd_status flipping to READY is the completion signal; refetch picks up the new jobDescription.
  useEffect(() => {
    if (!jobOpeningId) return;
    const previousStatus = prevJdStatusRef.current;
    const currentStatus = jdStatus?.status;
    prevJdStatusRef.current = currentStatus;

    if (currentStatus === 'READY') {
      failedToastShownForJobRef.current = null;
      void refetch();
      // Only flag on an actual GENERATING/PROCESSING -> READY transition, not an already-resting READY.
      if (previousStatus === 'GENERATING' || previousStatus === 'PROCESSING') {
        awaitingFreshAiFieldsRef.current = true;
      }
    } else if (currentStatus === 'FAILED' && failedToastShownForJobRef.current !== jobOpeningId) {
      failedToastShownForJobRef.current = jobOpeningId;
      showToast({
        message: jdGenerationFailureMessage(jdStatus?.error_message),
        type: 'error',
      });
    }
  }, [jdStatus?.status, jdStatus?.error_message, jobOpeningId, refetch]);

  // Pushes AI-refreshed fields into Redux once the refetch above resolves. Merges, never overwrites.
  useEffect(() => {
    if (!awaitingFreshAiFieldsRef.current || !response) return;
    awaitingFreshAiFieldsRef.current = false;

    const currentMandatory = (jobDetailsInRedux.mandatorySkills || []).map(String);
    const currentOptional = (jobDetailsInRedux.optionalSkills || []).map(String);
    const { newMandatoryIds, newOptionalIds, newOptions } = mergeNewAiSkills(
      response.skills,
      currentMandatory,
      currentOptional
    );
    const newLabels = Object.fromEntries(newOptions.map((o) => [o.id, o.name]));

    dispatch(
      (isEditFlow ? updateEditJobDetails : updateJobDetails)({
        ...diffAiOwnedFields(response, jobDetailsInRedux),
        ...(newMandatoryIds.length > 0
          ? { mandatorySkills: [...currentMandatory, ...newMandatoryIds] }
          : {}),
        ...(newOptionalIds.length > 0
          ? { optionalSkills: [...currentOptional, ...newOptionalIds] }
          : {}),
        ...(newOptions.length > 0
          ? {
              aiSuggestedSkillLabels: {
                ...(jobDetailsInRedux.aiSuggestedSkillLabels || {}),
                ...newLabels,
              },
            }
          : {}),
      })
    );
  }, [
    response,
    dispatch,
    isEditFlow,
    jobDetailsInRedux.mandatorySkills,
    jobDetailsInRedux.optionalSkills,
    jobDetailsInRedux.aiSuggestedSkillLabels,
  ]);

  const handlePromptClick = (promptText: string) => {
    setValue('description', promptText);
    setIsInputFocused(false);
  };

  // Refine and Regenerate both go through this action; `regenerate` discards the current
  // JD text and composes fresh instead of polishing it.
  const handleGenerate = async (refineInstructions?: string, regenerate = false) => {
    if (!jobOpeningId) return;
    try {
      await enhanceJd({ jobOpeningId, instruction: refineInstructions, regenerate }).unwrap();
      showToast({ message: 'Generating your AI job description…', type: 'success' });
      failedToastShownForJobRef.current = null;
      setValue('description', '');
      refetchTopFivePrompt();
    } catch (error: unknown) {
      showToast({
        message: getJobErrorMessage(error, 'Failed to start AI generation. Please try again.'),
        type: 'error',
      });
    }
  };

  const handleRefine = () => {
    const desc = getValues('description').trim();
    if (!desc) return;
    void handleGenerate(desc);
  };

  const handleCancelEdit = () => {
    setEditorContent(previewDescription);
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleEditToggle = async () => {
    if (!isEditing) {
      setHasChanges(false);
      setSaveError(null);
      setIsEditing(true);
      return;
    }

    if (hasChanges && aiJobDescriptionId) {
      try {
        const turndownService = new TurndownService({
          headingStyle: 'atx',
          bulletListMarker: '-',
          hr: '---',
          codeBlockStyle: 'fenced',
        });

        turndownService.addRule('bold', {
          filter: ['strong', 'b'],
          replacement: (content: string) => `**${content}**`,
        });
        turndownService.addRule('italic', {
          filter: ['i', 'em'],
          replacement: (content: string) => `*${content}*`,
        });
        turndownService.addRule('heading', {
          filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
          replacement: (content: string, node: any) => {
            const hLevel = node.nodeName.charAt(1);
            return `\n${'#'.repeat(parseInt(hLevel))} ${content}\n\n`;
          },
        });

        let markdown = turndownService.turndown(editorContent);

        markdown = markdown
          .split('\n')
          .reduce((acc: string[], line: string, index: number, array: string[]) => {
            const trimmedLine = line.trim();
            if (trimmedLine === '' && acc.length > 0 && array[index + 1]?.trim().startsWith('-')) {
              return acc;
            }
            if (trimmedLine === '-') {
              return acc;
            }
            acc.push(line);
            return acc;
          }, [])
          .join('\n');

        markdown = markdown.replace(/\n\n\n+/g, '\n\n');

        await updateJobDescription({
          jobOpeningId,
          jobDescription: markdown,
        }).unwrap();
        await refetch();
        setPreviewDescription(markdown);
        setSaveError(null);
        showToast({ message: 'Job description has been updated successfully', type: 'success' });
      } catch (error: any) {
        const message = getJobErrorMessage(error, 'Failed to update job description');
        setSaveError(message);
        showToast({ message, type: 'error' });
        return;
      }
    }
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleEditorChange = (content: string) => {
    if (!hasChanges) setHasChanges(true);
    if (saveError) setSaveError(null);
    setEditorContent(content);
  };

  const formatMarkdownHeadings = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') {
      const parts = children.split(':');
      if (parts.length > 1) {
        return (
          <>
            {parts[0]}: <p className="font-normal">{parts.slice(1).join(':')}</p>
          </>
        );
      }
      return <>{parts[0]}:</>;
    }
    return children as string;
  };

  // Shared input + prompt-suggestion dropdown for the Refine and Regenerate rows.
  const promptInputField = (
    <div className="relative z-30 w-full">
      <Input
        {...register('description')}
        value={watch('description')}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => setIsInputFocused(false)}
        onChange={(e) => setValue('description', e.target.value)}
        placeholder="Type your input here..."
        className="bg-white w-full px-4 py-2 border rounded-lg focus:ring focus:ring-brand-300 border-[var(--border)]"
      />
      {isInputFocused && !isFetchingPrompts && prompts && prompts.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border)] rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto">
          {prompts.map((prompt, index) => (
            <div
              key={index}
              onMouseDown={() => handlePromptClick(prompt.promptText)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <p>{prompt.promptText}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Company logo banner, falls back to the company name.
  const companyBanner = (
    <div className="h-11 px-4 bg-primary rounded-lg flex items-center justify-center">
      {tenantProfile?.logo_url ? (
        <img
          src={tenantProfile.logo_url}
          alt={tenantProfile.company_name}
          className="h-[42px] w-auto object-contain"
        />
      ) : (
        <span className="text-white font-semibold text-sm">{tenantProfile?.company_name}</span>
      )}
    </div>
  );

  // Generated JD with EDIT/SAVE controls, shared across entry paths.
  const jdContentCard = (
    <div className="w-full mt-4 mx-auto p-4 bg-[#FAFAFA] border border-[#E2E2E2] shadow rounded-lg">
      {companyBanner}
      <div className="flex items-center space-x-2 justify-end">
        {isEditing ? (
          <>
            <Button
              className="flex items-center space-x-1 cursor-pointer px-3 py-1"
              onClick={handleCancelEdit}
            >
              <span>CANCEL</span>
            </Button>
            <Button
              className="flex items-center space-x-1 cursor-pointer text-primary px-3 py-1"
              onClick={handleEditToggle}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader />
              ) : (
                <>
                  <MdSave size={18} />
                  <span className="text-primary">SAVE</span>
                </>
              )}
            </Button>
          </>
        ) : (
          <Button
            className="flex items-center space-x-1 cursor-pointer text-primary px-3 py-1"
            onClick={handleEditToggle}
            disabled={isUpdating}
          >
            <MdEdit size={18} />
            <span className="text-primary">EDIT</span>
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="mt-2">
          <RichTextEditor
            initialContent={formatAiJobDescription(previewDescription)}
            onContentChange={handleEditorChange}
            placeholder="Write your job description here..."
          />
          {saveError && <p className="text-red-500 text-sm px-2 py-1">{saveError}</p>}
          <p className="text-xs text-gray-400 px-2 py-1">
            Do not include discriminatory, abusive, or hateful language.
          </p>
        </div>
      ) : (
        <div className="prose max-w-none prose-sm prose-p:my-2 prose-li:my-1 prose-h2:mt-4 prose-h2:mb-2 max-h-[520px] overflow-y-auto pr-1">
          <ReactMarkdown
            components={{
              h1: ({ node: _node, ...props }) => (
                <h1
                  className="text-xl flex gap-2 items-center font-bold capitalize mb-3"
                  {...props}
                >
                  {formatMarkdownHeadings(props.children)}
                </h1>
              ),
              h2: ({ node: _node, ...props }) => (
                <h3
                  className="text-lg font-semibold flex gap-2 items-center capitalize py-2"
                  {...props}
                >
                  {formatMarkdownHeadings(props.children)}
                </h3>
              ),
              h3: ({ node: _node, ...props }) => (
                <h3
                  className="text-base font-semibold flex gap-2 items-center capitalize py-2"
                  {...props}
                >
                  {formatMarkdownHeadings(props.children)}
                </h3>
              ),
              li: ({ node: _node, ...props }) => (
                <li className="list-disc ml-6">{props.children}</li>
              ),
              p: ({ node: _node, ...props }) => {
                const children = props.children;
                const isString = typeof children === 'string';
                return (
                  <p className="my-2">{isString ? makeFirstLetterUpperCase(children) : children}</p>
                );
              },
            }}
          >
            {formatAiJobDescription(previewDescription)}
          </ReactMarkdown>
        </div>
      )}
      <div className="mt-4">{companyBanner}</div>
    </div>
  );

  return (
    <div className="w-full">
      {(isLoading ||
        isGenerating ||
        (!jdStatusTimedOut &&
          (jdStatus?.status === 'GENERATING' || jdStatus?.status === 'PROCESSING'))) && <Loader />}

      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">✨</span>
        <span className="font-semibold text-gray-900">
          {aiJobDescriptionId && hasSavedDetails
            ? 'AI Job Description'
            : 'Describe the role - AI fills the description'}
        </span>
      </div>

      {!aiJobDescriptionId ? (
        <div className="w-full p-6 bg-[#FAFAFA] border border-dashed border-[#E2E2E2] rounded-lg text-center text-gray-400 text-sm">
          Save the job details first - the AI description generates automatically and appears here.
        </div>
      ) : !hasSavedDetails ? (
        <div className="w-full p-6 bg-[#FAFAFA] border border-dashed border-[#E2E2E2] rounded-lg text-center text-gray-400 text-sm">
          Save the job details first - the AI description generates automatically and appears here.
        </div>
      ) : !previewDescription ? (
        <div className="w-full p-6 bg-[#FAFAFA] border border-dashed border-[#E2E2E2] rounded-lg text-center">
          <p className="text-gray-400 text-sm mb-4">
            {jdStatus?.status === 'GENERATING' || jdStatus?.status === 'PROCESSING'
              ? 'Generating your AI job description from the fields you filled in…'
              : "No description yet - generate one from the Job Info, Skills, and Education Preference you've filled in on the left."}
          </p>
          <Button
            className="text-white bg-button rounded-3xl px-6 py-2 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => void handleGenerate()}
            disabled={
              isGenerating || jdStatus?.status === 'GENERATING' || jdStatus?.status === 'PROCESSING'
            }
          >
            <TbReload size={16} />
            GENERATE DESCRIPTION
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start justify-between w-full gap-3">
            <div className="w-full sm:w-[76%]">{promptInputField}</div>
            <div className="flex flex-col items-center justify-start w-full sm:w-[22%]">
              <Tooltip title="Uses the last generated JD as a reference along with your prompt.">
                <span className="inline-block w-full">
                  <Button
                    className="text-white bg-button rounded-3xl px-4 py-2 flex items-center justify-center w-full text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleRefine}
                    disabled={!watch('description').trim()}
                  >
                    <TbReload className="mr-1" size={16} />
                    REFINE
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Generates a new Job Description using Job Details and Job Skills, ignoring previous AI-generated content.">
                <span className="inline-block mt-2">
                  <Button
                    onClick={() => setShowRegenerateModal(true)}
                    disabled={watch('description').trim() !== ''}
                    className="text-primary font-semibold text-xs underline hover:opacity-80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed m-0 p-0"
                  >
                    REGENERATE
                  </Button>
                </span>
              </Tooltip>
            </div>
          </div>

          {jdContentCard}
        </>
      )}

      {showRegenerateModal && (
        <ConfirmationModal
          onClose={() => setShowRegenerateModal(false)}
          onConfirm={() => {
            setShowRegenerateModal(false);
            void handleGenerate(undefined, true);
          }}
          title="This will generate a new Job Description using Job Details and Job Skills and will ignore previously generated AI content."
          confirmText="YES"
        />
      )}
    </div>
  );
};

export default JobDescriptionPanel;
