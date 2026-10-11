import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
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

const renderHeader = () =>
  render(
    // No animation, so a closed modal is gone at once.
    <ConfigProvider theme={{ token: { motion: false } }}>
      <UploadAndGenerateHeader
        description=""
        onGenerate={vi.fn()}
        onUpload={vi.fn()}
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
          uploadedFiles={uploadedFiles}
        />
      </ConfigProvider>
    );

  it('shows nothing when no file was uploaded to the round', () => {
    renderWithFiles([]);
    expect(screen.queryByText(/Uploaded files/)).toBeNull();
  });

  it('lists every file with its counts in a modal that can be closed', async () => {
    renderWithFiles(files);

    fireEvent.click(screen.getByText('Uploaded files (2)'));
    expect(await screen.findByText('round-two.xlsx')).toBeTruthy();
    expect(screen.getByText(/4 added · 1 invalid · 2 duplicate/)).toBeTruthy();
    expect(screen.getByText('older.xlsx')).toBeTruthy();

    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByText('round-two.xlsx')).toBeNull());
  });

  it('leaves out counts a file does not have', async () => {
    renderWithFiles([files[1]]);

    fireEvent.click(screen.getByText('Uploaded files (1)'));
    expect(await screen.findByText('older.xlsx')).toBeTruthy();
    expect(screen.queryByText(/added/)).toBeNull();
  });
});

describe('UploadAndGenerateHeader file types', () => {
  const acceptOf = (extensions?: string[]) => {
    const { container } = render(
      <UploadAndGenerateHeader
        description=""
        onGenerate={vi.fn()}
        onUpload={vi.fn()}
        acceptedExtensions={extensions}
      />
    );
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
