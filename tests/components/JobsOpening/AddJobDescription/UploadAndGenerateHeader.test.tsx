import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadAndGenerateHeader, {
  type ImportWarningItem,
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
    reason: "already in this job's questions",
    questionText: 'Explain decorators.',
  },
];

const renderHeader = () =>
  render(
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
  );

describe('UploadAndGenerateHeader import details', () => {
  it('opens a modal listing the skipped rows, grouped by what to do', () => {
    renderHeader();

    expect(screen.getByText('Rows that were skipped')).toBeTruthy();
    expect(screen.getByText('Not imported (2)')).toBeTruthy();
    expect(screen.getByText('Skipped duplicates (2)')).toBeTruthy();
    expect(screen.getByText(/Fix these rows in your file/)).toBeTruthy();
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
