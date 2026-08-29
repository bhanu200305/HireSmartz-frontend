import { TbReload } from 'react-icons/tb';
import { Button, Input, showToast } from '../../shared';
import Footer from '../../Footer';
import { useNavigate, useParams } from 'react-router-dom';
import { Checkbox, Tooltip } from 'antd';
import { MdEdit, MdSave } from 'react-icons/md';
import {
  useGetJobDescriptionByIdQuery,
  useUpdateJobDescriptionMutation,
} from '../../../api/job-service/JobOpening/ViewJobDescriptionById';
import ReactMarkdown from 'react-markdown';
import { Loader } from '../../shared/ui/loader';
import { useRegenerateJobDescriptionMutation } from '../../../api/job-service/JobOpening/RegenerateJd';

import { useForm } from 'react-hook-form';
import { lazy, Suspense, useEffect, useState } from 'react';
import {
  useSyncAtsJobOpeningMutation,
  // useSyncJobOpeningMutation
} from '../../../api/job-service/JobOpening/JobOpeningSync';
import { makeFirstLetterUpperCase } from '../../../shared/utils/methods';
// import { RichTextEditor } from '../../shared/ui/RichTextEditor'
import TurndownService from 'turndown';
import { RootState } from '../../../redux/provider/store';
import { useSelector } from 'react-redux';
import { formatAiJobDescription } from '../../../shared/utils/business-logic';
import { useNavigationBlocker } from '../../../hooks/useNavigationBlocker';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { useGetTopFivePromptQuery } from '../../../api/ai-service/AiQuestion/AiQuestion';

const RichTextEditor = lazy(() =>
  import('../../shared/ui/RichTextEditor').then((module) => ({ default: module.RichTextEditor }))
);

const EditAiJobDescription = () => {
  const navigate = useNavigate();
  const { id: jobOpeningId, aiJobDescriptionId } = useParams<{
    id: string;
    aiJobDescriptionId: string;
  }>();
  const { register, getValues, setValue, watch } = useForm({
    defaultValues: {
      description: '',
    },
  });
  const formValues = watch();
  const [initialFormValues] = useState(formValues);
  const [updateJobDescription, { isLoading: isUpdating }] = useUpdateJobDescriptionMutation();
  // const [syncJobOpening, { isLoading: isSyncing }] = useSyncJobOpeningMutation()
  const [syncAtsJobOpening, { isLoading: isSyncing }] = useSyncAtsJobOpeningMutation();
  const [isSyncingWithATS, setIsSyncingWithATS] = useState(
    location.pathname.includes('/sync-ats') ? true : false
  );
  const {
    data: response,
    isLoading,
    refetch,
  } = useGetJobDescriptionByIdQuery({
    aiJobDescriptionID: Number(aiJobDescriptionId),
  });
  const [regenerateJobDescription, { isLoading: isRegenerating }] =
    useRegenerateJobDescriptionMutation();
  const [previewDescription, setPreviewDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const atsProvider = useSelector((state: RootState) => state.JobSlice.ats.name);
  const atsjobOpeningId = useSelector((state: RootState) => state.EditJobSlice.atsJobOpeningId);
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState<boolean>(false);
  const isFormDirty =
    JSON.stringify(formValues) !== JSON.stringify(initialFormValues) || hasChanges;

  const { isBlocked, confirmNavigation, cancelNavigation } = useNavigationBlocker(
    true,
    isFormDirty && !allowNavigation
  );

  const {
    data,
    isFetching,
    refetch: refetchTopFivePrompt,
  } = useGetTopFivePromptQuery(
    { mode: 'JD' },
    {
      refetchOnMountOrArgChange: true,
    }
  );

  const handlePromptClick = (promptText: string) => {
    setValue('description', promptText);
    setIsInputFocused(false);
  };

  useEffect(() => {
    if (response?.jobDescription) {
      setPreviewDescription(response.jobDescription);
      setEditorContent(response.jobDescription);
    }
  }, [response]);

  const handleCheckboxChange = (e: any) => {
    setIsSyncingWithATS(e.target.checked);
  };
  const handleCancelEdit = () => {
    setEditorContent(previewDescription);
    setHasChanges(false);
    setIsEditing(false);
  };
  const handleContinue = async () => {
    setAllowNavigation(true);
    try {
      const hasAtsJobId = !!atsjobOpeningId;

      const payload = {
        jobOpeningId: Number(jobOpeningId),
        atsJobOpeningId: String(atsjobOpeningId) || '',
        isSync: isSyncingWithATS,
        jobBoardIds: ['string'],
        isNewJob: !hasAtsJobId,
      };

      const result = await syncAtsJobOpening({
        body: payload,
        providerName: isSyncingWithATS ? atsProvider : '',
      }).unwrap();

      showToast({
        message:
          result?.message ||
          (isSyncingWithATS
            ? payload.isNewJob
              ? 'Job created in ATS successfully!'
              : 'Job updated in ATS successfully!'
            : 'Job has been saved successfully'),
        type: 'success',
      });

      navigate(`/jobs/edit/${jobOpeningId}/interview`);
    } catch (error: any) {
      showToast({
        message:
          error?.data?.message ||
          (isSyncingWithATS ? 'Failed to sync with ATS' : 'Failed to save job'),
        type: 'error',
      });
    }
  };
  const handleRegenerate = async (generateFromScratch: boolean) => {
    const desc = getValues('description');
    const payload = {
      aiJobDescriptionId: Number(aiJobDescriptionId),
      text: desc,
      generateFromScratch: generateFromScratch,
    };

    try {
      const result = await regenerateJobDescription(payload).unwrap();
      const newDescription = result?.data?.jobDescription;

      if (newDescription) {
        setPreviewDescription(newDescription);
        setEditorContent(newDescription);
      }

      showToast({
        message: result.message || 'Job description regenerated successfully!',
        type: 'success',
      });
      setValue('description', '');
      refetchTopFivePrompt();
    } catch (error: any) {
      showToast({
        message: error?.data?.message || 'Failed to regenerate job description. Please try again.',
        type: 'error',
      });
    }
  };

  const handleRefine = () => {
    handleRegenerate(false);
  };

  const handleRegenerateFromScratch = () => {
    handleRegenerate(true);
  };

  const handleEditToggle = async () => {
    if (isEditing) {
      if (hasChanges) {
        try {
          // Convert HTML back to Markdown when saving
          const turndownService = new TurndownService({
            headingStyle: 'atx',
            bulletListMarker: '-',
            hr: '---',
            codeBlockStyle: 'fenced',
          });

          // Add custom rules for better Markdown conversion
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

          // Clean up empty list items and extra blank lines within lists
          markdown = markdown
            .split('\n')
            .reduce((acc: string[], line: string, index: number, array: string[]) => {
              const trimmedLine = line.trim();
              // Skip empty lines that are between list items
              if (
                trimmedLine === '' &&
                acc.length > 0 &&
                array[index + 1]?.trim().startsWith('-')
              ) {
                return acc;
              }
              // Remove standalone empty bullet points
              if (trimmedLine === '-') {
                return acc;
              }
              acc.push(line);
              return acc;
            }, [])
            .join('\n');

          // Remove multiple consecutive blank lines (keep max 1)
          markdown = markdown.replace(/\n\n\n+/g, '\n\n');

          // Call the update API
          await updateJobDescription({
            aiJobDescriptionId: Number(aiJobDescriptionId),
            jobDescription: markdown,
          }).unwrap();
          await refetch();
          setPreviewDescription(markdown);
          showToast({
            message: 'Job description has been updated successfully!',
            type: 'success',
          });
        } catch (error: any) {
          showToast({
            message: error?.data?.message || 'Failed to update job description',
            type: 'error',
          });
        }
      }
      setHasChanges(false);
    } else {
      // When entering edit mode, reset changes flag
      setHasChanges(false);
    }
    setIsEditing(!isEditing);
  };
  const handleEditorChange = (content: string) => {
    if (!hasChanges) {
      setHasChanges(true);
    }
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
      } else {
        return <>{parts[0]}:</>;
      }
    }
    return children as string;
  };

  return (
    <>
      <div className="flex items-start justify-between w-full">
        {(isLoading || isRegenerating || isSyncing || isUpdating) && <Loader />}
        <div className="w-[84%] relative z-30">
          <Input
            {...register('description')}
            value={watch('description')}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onChange={(e) => setValue('description', e.target.value)}
            placeholder="Type your input here..."
            className="bg-white w-full px-4 py-2 border rounded-lg focus:ring focus:ring-brand-300 border-[var(--border)]"
          />
          {isInputFocused && !isFetching && data && data.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border)] rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto">
              {data.map((prompt, index) => (
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
        <div className="flex flex-col items-center justify-start w-[15%]">
          <Tooltip title="Uses the last generated JD as a reference along with your prompt.">
            <span className="inline-block w-full">
              <Button
                className="text-white bg-button rounded-3xl px-6 py-2 flex items-center justify-center w-full disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleRefine}
                disabled={!watch('description').trim()}
              >
                <TbReload className="mr-2" size={20} />
                REFINE
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Generates a new Job Description using Job Details and Job Skills, ignoring previous AI-generated content.">
            <span className="inline-block mt-2">
              <Button
                onClick={() => setShowRegenerateModal(true)}
                disabled={watch('description').trim() !== ''}
                className="text-primary font-semibold text-sm underline hover:opacity-80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed m-0 p-0"
              >
                REGENERATE
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>
      <div className="w-full mt-4 mx-auto p-6 bg-white border border-neutral-200 shadow-sm rounded-2xl flex flex-col justify-between h-full">
        <div className="sticky top-0 z-20 -mx-6 -mt-6 rounded-t-2xl bg-white pb-2">
          <h1 className="text-2xl font-bold p-2 rounded-t-2xl text-center text-white bg-primary">
            <img
              src="/white-logo.svg"
              alt="CareerForce Pro"
              className="mx-auto h-7 w-auto object-contain"
            />
          </h1>
          <div className="flex items-center space-x-2 justify-end px-2 pt-2">
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
                      <MdSave size={20} />
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
                <MdEdit size={20} />
                <span className="text-primary">EDIT</span>
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 mb-4 p-6">
          {isEditing ? (
            <div className="mt-4">
              <Suspense fallback={<Loader />}>
                <RichTextEditor
                  initialContent={formatAiJobDescription(previewDescription)}
                  onContentChange={handleEditorChange}
                  placeholder="Write your job description here..."
                  toolbarStickyTop="top-28"
                />
              </Suspense>
            </div>
          ) : (
            <div className="prose max-w-none prose-p:my-2 prose-li:my-1 prose-h2:mt-4 prose-h2:mb-2">
              <ReactMarkdown
                components={{
                  h1: ({ node: _node, ...props }) => (
                    <h1
                      className="text-2xl flex gap-2 items-center font-bold capitalize mb-3"
                      {...props}
                    >
                      {formatMarkdownHeadings(props.children)}
                    </h1>
                  ),
                  h2: ({ node: _node, ...props }) => (
                    <h3
                      className="text-xl font-semibold flex gap-2 items-center capitalize py-2"
                      {...props}
                    >
                      {formatMarkdownHeadings(props.children)}
                    </h3>
                  ),
                  h3: ({ node: _node, ...props }) => (
                    <h3
                      className="text-lg font-semibold flex gap-2 items-center capitalize py-2"
                      {...props}
                    >
                      {formatMarkdownHeadings(props.children)}
                    </h3>
                  ),
                  li: ({ node: _node, ...props }) => (
                    <li className="list-disc ml-8">{props.children}</li>
                  ),
                  p: ({ node: _node, ...props }) => {
                    const children = props.children;
                    const isString = typeof children === 'string';
                    return (
                      <p className="my-2">
                        {isString ? makeFirstLetterUpperCase(children) : children}
                      </p>
                    );
                  },
                }}
              >
                {formatAiJobDescription(previewDescription)}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="-mx-6 mt-4 -mb-6">
          <Footer className="bg-primary text-white w-full rounded-b-2xl" />
        </div>
      </div>
      <div className="flex w-full justify-start py-4 px-1">
        <Checkbox
          checked={isSyncingWithATS}
          onChange={handleCheckboxChange}
          className="custom-checkbox"
        >
          Sync Job Description With ATS
        </Checkbox>
      </div>
      <div className="flex justify-center mt-6 mb-4">
        {!isEditing && (
          <Button
            className="text-white bg-button rounded-3xl px-8 py-2 flex items-center justify-center cursor-pointer"
            onClick={handleContinue}
          >
            SAVE & NEXT
          </Button>
        )}
      </div>
      {isBlocked && (
        <ConfirmationModal
          onClose={cancelNavigation}
          onConfirm={confirmNavigation}
          title="You have unsaved changes. Are you sure you want to leave?"
          confirmText="LEAVE PAGE"
        />
      )}
      {showRegenerateModal && (
        <ConfirmationModal
          onClose={() => setShowRegenerateModal(false)}
          onConfirm={() => {
            setShowRegenerateModal(false);
            handleRegenerateFromScratch();
          }}
          title="This will generate a new Job Description using Job Details and Job Skills and will ignore previously generated AI content."
          confirmText="YES"
        />
      )}
    </>
  );
};

export default EditAiJobDescription;
