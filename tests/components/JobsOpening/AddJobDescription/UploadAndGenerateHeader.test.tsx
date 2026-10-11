import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import QuestionEntryPanel from '../../../../src/components/JobsOpening/AddJobDescription/QuestionEntryPanel';
import UploadAndGenerateHeader, {
  type ImportWarningItem,
  type UploadedFileItem,
} from '../../../../src/components/JobsOpening/AddJobDescription/UploadAndGenerateHeader';

const warnings: ImportWarningItem[] = [
  { type: 'error', row: 4, reason: 'Question text is required', questionText: null },
  {
    type: 'error',
    row: 6,
    reason: 'Question text exceeds 2000 characters',
    questionText: 'A very long question',
  },
  {
    type: 'duplicate',
    row: 9,
    reason: 'same as row 5 in this file',
    questionText: 'What is a closure?',
  },
  {
    type: 'duplicate',
    row: 11,
    reason: 'already in this round',
    questionText: 'Explain decorators.',
  },
];

const EntryHarness = ({ onSubmit = vi.fn(), onUpload = vi.fn() }) => {
  const [text, setText] = useState('');
  return (
    <ConfigProvider theme={{ token: { motion: false } }}>
      <QuestionEntryPanel
        description=""
        empty
        text={text}
        onTextChange={setText}
        onSubmit={onSubmit}
        onUpload={onUpload}
        onGenerate={vi.fn()}
        onDownloadTemplate={vi.fn()}
        isSubmitting={false}
        roundName="Audio Screening"
      />
    </ConfigProvider>
  );
};

describe('Question entry UI', () => {
  it('orders the cards upload, generate, write and uses sparkles without the fastest badge', () => {
    render(<EntryHarness />);
    expect(
      screen
        .getAllByRole('button')
        .slice(0, 3)
        .map((button) => button.textContent?.trim())
    ).toEqual(['Upload File', '✨Generate With AI', 'Write Your Own']);
    expect(screen.queryByText('Fastest')).not.toBeInTheDocument();
  });

  it('provides a real upload button and forwards file input changes', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    render(<EntryHarness onUpload={onUpload} />);
    expect(screen.getByRole('button', { name: 'Upload File' })).toBeEnabled();
    await user.upload(
      screen.getByLabelText('Upload questions file'),
      new File(['Question?'], 'questions.csv', { type: 'text/csv' })
    );
    expect(onUpload).toHaveBeenCalledOnce();
  });

  it('opens the writing modal, counts only nonblank lines, and reuses submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EntryHarness onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Write Your Own' }));
    const input = screen.getByRole('textbox', { name: 'Questions' });
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Add Questions' })).toBeDisabled();
    await user.paste(' First question? \n\n Second question? ');
    expect(screen.getByText('2 questions ready to add')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add 2 Questions' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows writing help and uses project pill buttons', async () => {
    const user = userEvent.setup();
    render(<EntryHarness />);
    await user.click(screen.getByRole('button', { name: 'Write Your Own' }));
    const help =
      'Type one question, or paste a list with one question on each line. Every line is added as a separate question.';
    expect(screen.getByRole('textbox', { name: 'Questions' })).toHaveAccessibleDescription(help);
    await user.hover(screen.getByRole('button', { name: 'How to write questions' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(help);
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toHaveClass(
      'rounded-3xl',
      'min-h-11',
      'px-6',
      'py-2',
      'bg-white',
      'border-gray-300'
    );
    expect(cancelButton.parentElement).toHaveClass('gap-3');
    expect(cancelButton.parentElement).not.toHaveClass('sm:gap-6');
    expect(screen.getByRole('button', { name: 'Add Questions' })).toHaveClass(
      'rounded-3xl',
      'min-h-11',
      'px-6',
      'py-2',
      'bg-primary'
    );
  });

  it('ignores text drags and keeps the file overlay through nested drag leaves', () => {
    render(<EntryHarness />);
    fireEvent.dragEnter(window, { dataTransfer: { types: ['text/plain'] } });
    expect(screen.queryByText('Drop your file to upload')).not.toBeInTheDocument();
    const drag = { dataTransfer: { types: ['Files'] } };
    fireEvent.dragEnter(window, drag);
    fireEvent.dragEnter(window, drag);
    fireEvent.dragLeave(window, drag);
    expect(screen.getByText('Drop your file to upload')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Drop your file to upload')).not.toBeInTheDocument();
  });

  it('rejects invalid dropped files without uploading and clears the overlay', () => {
    const onUpload = vi.fn();
    render(<EntryHarness onUpload={onUpload} />);
    fireEvent.dragEnter(window, { dataTransfer: { types: ['Files'] } });
    fireEvent.drop(window, {
      dataTransfer: { types: ['Files'], files: [new File(['hello'], 'questions.txt')] },
    });
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Upload an Excel (.xlsx) or CSV (.csv) file.'
    );
    expect(screen.queryByText('Drop your file to upload')).not.toBeInTheDocument();
  });

  it('rejects oversized files before the upload handler', () => {
    const onUpload = vi.fn();
    render(<EntryHarness onUpload={onUpload} />);
    const file = new File(['question'], 'questions.csv');
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.drop(window, { dataTransfer: { types: ['Files'], files: [file] } });
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('File size must not exceed 5 MB.');
  });
});

const renderHeader = () =>
  render(
    // No animation, so a closed modal is gone at once.
    <ConfigProvider theme={{ token: { motion: false } }}>
      <UploadAndGenerateHeader
        description=""
        onGenerate={vi.fn()}
        onUpload={vi.fn()}
        onDownloadTemplate={vi.fn()}
        uploadedFileName="questions.xlsx"
        importedCount={3}
        failedCount={2}
        duplicateCount={2}
        warnings={warnings}
      />
    </ConfigProvider>
  );

describe('UploadAndGenerateHeader import details', () => {
  it('opens a modal listing the skipped rows, grouped by what to do', () => {
    renderHeader();

    expect(screen.getByText('Rows that were skipped')).toBeTruthy();
    expect(screen.getByText('Not imported (2)')).toBeTruthy();
    expect(screen.getByText('Skipped duplicates (2)')).toBeTruthy();
    expect(screen.getByText(/The question is already in this round/)).toBeTruthy();
    expect(screen.queryByText(/Fix these rows/)).toBeNull();
    expect(screen.getByText('Row 4')).toBeTruthy();
    expect(screen.getByText('Question text is required')).toBeTruthy();
    expect(screen.getByText('Row 9')).toBeTruthy();
    expect(screen.getByText('same as row 5 in this file')).toBeTruthy();
    expect(screen.getByText(/A very long question/)).toBeTruthy();
  });

  it('puts the question before the reason on each entry', () => {
    renderHeader();

    const question = screen.getByText(/What is a closure\?/);
    const reason = screen.getByText('same as row 5 in this file');
    expect(
      question.compareDocumentPosition(reason) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('can be closed and opened again from the summary', async () => {
    renderHeader();

    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByText('Not imported (2)')).toBeNull());

    fireEvent.click(screen.getByText('View details (4)'));
    expect(screen.getByText('Not imported (2)')).toBeTruthy();
  });
});

describe('UploadAndGenerateHeader clear button', () => {
  it('is a cross icon with no text, and clears the details', () => {
    const onClear = vi.fn();
    render(
      <UploadAndGenerateHeader
        description=""
        onGenerate={vi.fn()}
        onUpload={vi.fn()}
        onDownloadTemplate={vi.fn()}
        uploadedFileName="questions.xlsx"
        importedCount={1}
        onClearDetails={onClear}
      />
    );

    expect(screen.queryByText(/Clear Details/i)).toBeNull();
    fireEvent.click(screen.getByLabelText('Clear details'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('UploadAndGenerateHeader uploaded files', () => {
  const files: UploadedFileItem[] = [
    {
      id: 'f2',
      fileName: 'round-two.xlsx',
      uploadedAt: '2026-10-09T10:30:00Z',
      imported: 4,
      failed: 1,
      duplicates: 2,
    },
    {
      id: 'f1',
      fileName: 'older.xlsx',
      uploadedAt: null,
      imported: null,
      failed: null,
      duplicates: null,
    },
  ];

  const renderWithFiles = (uploadedFiles: UploadedFileItem[]) =>
    render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <UploadAndGenerateHeader
          description=""
          onGenerate={vi.fn()}
          onUpload={vi.fn()}
          onDownloadTemplate={vi.fn()}
          uploadedFiles={uploadedFiles}
        />
      </ConfigProvider>
    );

  it('opens an empty state from the info icon when no file was uploaded', async () => {
    const user = userEvent.setup();
    renderWithFiles([]);
    const infoButton = screen.getByRole('button', { name: 'View uploaded files' });
    expect(infoButton).toHaveAttribute('aria-haspopup', 'dialog');
    expect(infoButton.textContent).toBe('');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(infoButton);
    expect(screen.getByRole('dialog', { name: 'Uploaded files' })).toBeInTheDocument();
    expect(screen.getByText('No files uploaded')).toBeInTheDocument();
    await user.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('lists every file with its counts in a modal that can be closed', async () => {
    renderWithFiles(files);

    fireEvent.click(screen.getByRole('button', { name: 'View uploaded files' }));
    expect(await screen.findByText('round-two.xlsx')).toBeTruthy();
    expect(screen.getByText(/4 added · 1 invalid · 2 duplicate/)).toBeTruthy();
    expect(screen.getByText('older.xlsx')).toBeTruthy();

    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByText('round-two.xlsx')).toBeNull());
  });

  it('leaves out counts a file does not have', async () => {
    renderWithFiles([files[1]]);

    fireEvent.click(screen.getByRole('button', { name: 'View uploaded files' }));
    expect(await screen.findByText('older.xlsx')).toBeTruthy();
    expect(screen.queryByText(/added/)).toBeNull();
  });
});

describe('UploadAndGenerateHeader file types', () => {
  const acceptOf = (extensions?: string[]) => {
    const props = {
      description: '',
      onGenerate: vi.fn(),
      onUpload: vi.fn(),
      onDownloadTemplate: vi.fn(),
      acceptedExtensions: extensions,
    } as any;

    const { container } = render(<UploadAndGenerateHeader {...props} />);
    return container.querySelector('input[type="file"]')?.getAttribute('accept');
  };

  it('offers the file types the backend sends', () => {
    expect(acceptOf(['.xlsx', '.csv', '.docx', '.txt'])).toBe('.xlsx,.csv,.docx,.txt');
  });

  it('accepts any file until the list arrives', () => {
    expect(acceptOf(undefined)).toBeNull();
    expect(acceptOf([])).toBeNull();
  });
});
