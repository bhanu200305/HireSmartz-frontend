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
import {
  useGetJdStatusQuery,
  useEnhanceJdMutation,
} from '../../../api/job-service/JobOpening/JdUpload';
import { useForm } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateJobDetails } from '../../../redux/slices/jobOpeningSlice';
import { updateEditJobDetails } from '../../../redux/slices/editJobOpeningSlice';
import { RootState } from '../../../redux/provider/store';
import TurndownService from 'turndown';
import { RichTextEditor } from '../../shared/ui/RichTextEditor';
import { formatAiJobDescription } from '../../../shared/utils/business-logic';
import { diffAiOwnedFields, mergeNewAiSkills } from '../../../shared/utils/jdSync';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { makeFirstLetterUpperCase } from '../../../shared/utils/methods';
import { useGetTopFivePromptQuery } from '../../../api/ai-service/AiQuestion/AiQuestion';
import { asJobId } from '../../../api/job-service/jobId';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';

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
  // Tracks which job this component instance has already shown a "JD
  // generation failed" toast for — a plain boolean here would wrongly stay
  // `true` across a job switch, since this component isn't remounted when
  // only the `jobOpeningId` query param changes (route is `/job-details`,
  // not `/job-details/:id`).
  const failedToastShownForJobRef = useRef<string | null>(null);
  // Previous jd_status tick, so the effect below can tell an actual
  // GENERATING/PROCESSING -> READY completion apart from "status just
  // happens to be READY" (also every untouched job's resting state).
  const prevJdStatusRef = useRef<string | undefined>(undefined);
  // Set true the tick a completion is observed; consumed (and cleared) by
  // the Redux-dispatch effect once the resulting refetch actually lands.
  const awaitingFreshAiFieldsRef = useRef(false);

  const { register, getValues, setValue, watch } = useForm({
    defaultValues: { description: '' },
  });
  // Read fresh at dispatch time (not destructured once) so the merge below
  // always starts from whatever's currently in Redux, not a stale closure.
  const jobDetailsInRedux = useSelector((state: RootState) =>
    isEditFlow ? state.EditJobSlice.details : state.JobSlice.details
  );

  const {
    data: prompts,
    isFetching: isFetchingPrompts,
    refetch: refetchTopFivePrompt,
  } = useGetTopFivePromptQuery({ mode: 'JD' }, { refetchOnMountOrArgChange: true });

  const {
    data: response,
    isLoading,
    refetch,
  } = useGetJobDescriptionByIdQuery({ jobOpeningId }, { skip: !jobOpeningId });
  // Whether the Job Details form has actually been saved with real content
  // (job title + department, both required there) — false for a bare
  // draft shell (`useStartManualJobOpening` creates one up front, before
  // anything's filled in) and while `response` hasn't loaded yet, so this
  // panel never shows Generate/Refine/Regenerate for a job with nothing yet
  // to generate from.
  const hasSavedDetails = response?.hasSavedDetails ?? false;
  const { data: jdStatus } = useGetJdStatusQuery(jobOpeningId, {
    skip: !jobOpeningId,
    pollingInterval: 2000,
  });
  const [updateJobDescription, { isLoading: isUpdating }] = useUpdateJobDescriptionMutation();
  const [enhanceJd, { isLoading: isGenerating }] = useEnhanceJdMutation();

  useEffect(() => {
    if (response?.jobDescription) {
      setPreviewDescription(response.jobDescription);
      setEditorContent(response.jobDescription);
    }
  }, [response]);

  // Enhancement is applied directly by job-service the moment ai-service
  // replies — there's no separate "ready, now apply it" step anymore (see
  // enhance_jd.py's `apply_jd_enhancement`). `jd_status` flipping to READY
  // is the only completion signal; refetching the job picks up whatever it
  // just wrote straight into `jobDescription`.
  useEffect(() => {
    if (!jobOpeningId) return;
    const previousStatus = prevJdStatusRef.current;
    const currentStatus = jdStatus?.status;
    prevJdStatusRef.current = currentStatus;

    if (currentStatus === 'READY') {
      failedToastShownForJobRef.current = null;
      void refetch();
      // A real GENERATING/PROCESSING -> READY completion (not just "status
      // happens to already be READY", which is also every job's resting
      // state) means job-service just wrote fresh structured fields —
      // `response` above is still the pre-completion snapshot until the
      // refetch resolves, so flag it and let the effect below apply the
      // NEW response once it lands, rather than reading `response` here.
      if (previousStatus === 'GENERATING' || previousStatus === 'PROCESSING') {
        awaitingFreshAiFieldsRef.current = true;
      }
    } else if (currentStatus === 'FAILED' && failedToastShownForJobRef.current !== jobOpeningId) {
      failedToastShownForJobRef.current = jobOpeningId;
      showToast({
        message: jdStatus?.error_message || 'Failed to generate the job description.',
        type: 'error',
      });
    }
  }, [jdStatus?.status, jdStatus?.error_message, jobOpeningId, refetch]);

  // Pushes AI-refreshed fields into Redux once the refetch above resolves.
  // Plain merge — never wipes out other saved fields.
  useEffect(() => {
    if (!awaitingFreshAiFieldsRef.current || !response) return;
    awaitingFreshAiFieldsRef.current = false;

    // Skills AI suggested via job.jd.enhance are auto-committed straight
    // onto the job (job.add_skill — unlike generate/parse's
    // suggestions-only cache), so `response.skills` already reflects them.
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

  // The (re)generate action, with or without the recruiter's own typed
  // instructions — REFINE and REGENERATE both go through this one action
  // against `/jd/enhance` rather than two different endpoints. `regenerate`
  // maps straight onto the backend's own flag — true discards the current
  // JD text and composes fresh from Job Details fields instead of
  // polishing it. Same endpoint the floating "Fill with AI" widget on the
  // Job Details step uses (see FillWithAiWidget.tsx) — every job is a
  // normal Manual-entry draft now, so there's just this one flow.
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
        showToast({ message: 'Job description has been updated successfully', type: 'success' });
      } catch (error: any) {
        showToast({
          message: error?.data?.message || 'Failed to update job description',
          type: 'error',
        });
      }
    }
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleEditorChange = (content: string) => {
    if (!hasChanges) setHasChanges(true);
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

  // Shared by the Manual/Upload Refine row and the AI-Prompt regenerate row
  // below — same input, same "top 5 prompts" suggestion dropdown, only the
  // button next to it (and which mutation it fires) differs.
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

  // The generated JD itself, with its EDIT/SAVE controls — identical for
  // every entry path once a description exists, so both the Manual/Upload
  // branch and the AI-Prompt branch below render this same block.
  const jdContentCard = (
    <div className="w-full mt-4 mx-auto p-4 bg-[#FAFAFA] border border-[#E2E2E2] shadow rounded-lg">
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
    </div>
  );

  return (
    <div className="w-full">
      {(isLoading ||
        isGenerating ||
        jdStatus?.status === 'GENERATING' ||
        jdStatus?.status === 'PROCESSING') && <Loader />}

      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">✨</span>
        <span className="font-semibold text-gray-900">
          {aiJobDescriptionId && hasSavedDetails
            ? 'AI Job Description'
            : 'Describe the role — AI fills the description'}
        </span>
      </div>

      {!aiJobDescriptionId ? (
        <div className="w-full p-6 bg-[#FAFAFA] border border-dashed border-[#E2E2E2] rounded-lg text-center text-gray-400 text-sm">
          Save the job details on the left first — the AI description generates automatically and
          appears here.
        </div>
      ) : !hasSavedDetails ? (
        <div className="w-full p-6 bg-[#FAFAFA] border border-dashed border-[#E2E2E2] rounded-lg text-center text-gray-400 text-sm">
          Save the job details on the left first — the AI description generates automatically and
          appears here.
        </div>
      ) : !previewDescription ? (
        <div className="w-full p-6 bg-[#FAFAFA] border border-dashed border-[#E2E2E2] rounded-lg text-center">
          <p className="text-gray-400 text-sm mb-4">
            {jdStatus?.status === 'GENERATING' || jdStatus?.status === 'PROCESSING'
              ? 'Generating your AI job description from the fields you filled in…'
              : "No description yet — generate one from the Job Info, Skills, and Education Preference you've filled in on the left."}
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
          <div className="flex items-start justify-between w-full">
            <div className="w-[76%]">{promptInputField}</div>
            <div className="flex flex-col items-center justify-start w-[22%]">
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
