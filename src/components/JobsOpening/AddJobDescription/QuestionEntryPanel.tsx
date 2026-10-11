import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Modal, Tooltip } from 'antd';
import { MdClose, MdInfoOutline } from 'react-icons/md';
import { HiOutlineUpload } from 'react-icons/hi';
import { Button, Typography, showToast } from '../../shared';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../../../constants/app.constants';
import UploadAndGenerateHeader from './UploadAndGenerateHeader';

const QUESTION_WRITING_HELP =
  'Type one question, or paste a list with one question on each line. Every line is added as a separate question.';

type QuestionEntryPanelProps = ComponentProps<typeof UploadAndGenerateHeader> & {
  text: string;
  onTextChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  roundName: string;
};

const QuestionEntryPanel = ({
  text,
  onTextChange,
  onSubmit,
  isSubmitting,
  roundName,
  ...headerProps
}: QuestionEntryPanelProps) => {
  const [writeOpen, setWriteOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dropError, setDropError] = useState('');
  const dragDepth = useRef(0);
  const dropInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const wasSubmitting = useRef(false);
  const count = text.split('\n').filter((line) => line.trim()).length;

  useEffect(() => {
    if (wasSubmitting.current && !isSubmitting && !text) setWriteOpen(false);
    wasSubmitting.current = isSubmitting;
  }, [text, isSubmitting]);

  useEffect(() => {
    const reset = () => {
      dragDepth.current = 0;
      setDragging(false);
    };
    const isFile = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files');
    const enter = (event: DragEvent) => {
      if (!isFile(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      if (!headerProps.generateDisabled && !headerProps.isUploading) setDragging(true);
    };
    const leave = (event: DragEvent) => {
      if (!isFile(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) reset();
    };
    const over = (event: DragEvent) => {
      event.preventDefault();
      if (isFile(event) && event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const drop = (event: DragEvent) => {
      event.preventDefault();
      reset();
      if (!isFile(event) || headerProps.generateDisabled || headerProps.isUploading) return;
      const file = event.dataTransfer?.files[0];
      if (!file) return;
      const allowed = headerProps.acceptedExtensions;
      const fileType = /\.[^.]+$/.exec(file.name)?.[0].toLowerCase() ?? '';
      const wrongType = allowed?.length
        ? !allowed.includes(fileType)
        : !/\.(xlsx|csv)$/i.test(file.name);
      const error = wrongType
        ? allowed?.length
          ? `Upload a file of one of these types: ${allowed.join(', ')}.`
          : 'Upload an Excel (.xlsx) or CSV (.csv) file.'
        : file.size === 0
          ? 'The file is empty. Choose a file containing questions.'
          : file.size > MAX_FILE_SIZE_BYTES
            ? `File size must not exceed ${MAX_FILE_SIZE_MB} MB.`
            : '';
      setDropError(error);
      if (error) {
        showToast({ message: error, type: 'error' });
        return;
      }
      if (dropInput.current && event.dataTransfer) {
        dropInput.current.files = event.dataTransfer.files;
        dropInput.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        reset();
        setWriteOpen(false);
      }
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    window.addEventListener('keydown', escape);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
      window.removeEventListener('keydown', escape);
      window.removeEventListener('blur', reset);
    };
  }, [headerProps.generateDisabled, headerProps.isUploading, headerProps.acceptedExtensions]);

  const canSubmit = !!count && !isSubmitting && !headerProps.generateDisabled;

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ignore Enter while an IME (Hindi/Japanese/etc.) composition is active
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // stop the newline
      if (canSubmit) void onSubmit();
    }
    // Shift+Enter: do nothing, the browser inserts a new line
  };

  return (
    <>
      <UploadAndGenerateHeader {...headerProps} onWrite={() => setWriteOpen(true)} />
      <input
        ref={dropInput}
        type="file"
        accept={
          headerProps.acceptedExtensions?.length
            ? headerProps.acceptedExtensions.join(',')
            : undefined
        }
        hidden
        onChange={headerProps.onUpload}
      />
      <div className="sr-only" role="status" aria-live="polite">
        {dropError}
      </div>
      {dragging && (
        <div
          className="app-modal-overlay fixed inset-0 z-[2000] flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm"
          role="region"
          aria-label="Upload questions"
          aria-live="polite"
        >
          <div className="flex min-h-[50vh] w-full max-w-2xl flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-white p-6 text-center text-white sm:min-h-0 sm:py-16">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary">
              <HiOutlineUpload size={28} />
            </span>
            <Typography variant="h5" className="m-0 text-white">
              Drop your file to upload
            </Typography>
            <Typography variant="body2" className="m-0 text-white">
              Questions will be added to {roundName}
            </Typography>
            <Typography variant="body2" className="m-0 text-white">
              Excel (.xlsx) or CSV (.csv)
            </Typography>
          </div>
        </div>
      )}
      <Modal
        open={writeOpen}
        onCancel={() => setWriteOpen(false)}
        centered
        width="100%"
        style={{ maxWidth: '32rem', marginInline: '1rem' }}
        title={null}
        footer={null}
        closable={false}
        maskClosable={true}
        destroyOnHidden
        keyboard
        afterOpenChange={(open) => {
          if (open) textarea.current?.focus();
        }}
        className="app-modal-panel"
      >
        <div className="flex items-center justify-between gap-2 pb-5">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <Typography
              variant="h6"
              className="m-0 min-w-0 font-semibold leading-none text-neutral-900"
            >
              Write your questions
            </Typography>
            <Tooltip title={QUESTION_WRITING_HELP} trigger={['hover', 'focus', 'click']}>
              <button
                type="button"
                aria-label="How to write questions"
                aria-describedby="write-questions-help"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-primary focus-visible:outline focus-visible:outline-primary"
              >
                <MdInfoOutline size={18} aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
          <button
            type="button"
            aria-label="Close write questions"
            onClick={() => setWriteOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 cursor-pointer transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <MdClose size={20} />
          </button>
        </div>
        <label htmlFor="write-round-questions" className="sr-only">
          Questions
        </label>
        <div id="write-questions-help" className="sr-only">
          {QUESTION_WRITING_HELP}
        </div>
        <textarea
          ref={textarea}
          id="write-round-questions"
          rows={5}
          placeholder="Type a question or paste a list with one question per line"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={handleTextareaKeyDown}
          aria-describedby="write-questions-help write-questions-count"
          className="w-full resize-y rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-900 focus:border-primary focus:outline focus:outline-2 focus:outline-primary"
        />
        <div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            onClick={() => setWriteOpen(false)}
            className="min-h-11 w-full border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 py-2 px-6 rounded-3xl text-sm font-semibold transition flex items-center justify-center focus-visible:outline focus-visible:outline-primary sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onSubmit()}
            // disabled={!count || isSubmitting || headerProps.generateDisabled}
            disabled={!canSubmit}
            className="min-h-11 w-full text-white bg-primary hover:bg-brand-700 py-2 px-6 rounded-3xl text-sm font-semibold transition flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-primary sm:w-auto"
          >
            Add {count > 0 ? count : ''}
            {count === 1 ? ' Question' : ' Questions'}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default QuestionEntryPanel;
