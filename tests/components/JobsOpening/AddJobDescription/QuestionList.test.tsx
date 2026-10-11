import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionList from '../../../../src/components/JobsOpening/AddJobDescription/QuestionList';

const questions = [
  { id: 'react', question_text: 'Explain React hooks' },
  { id: 'sql', question_text: 'Explain SQL joins' },
  { id: 'testing', question_text: 'How do you test React components?' },
];

function ListHarness({ initialSelection = [] }: { initialSelection?: string[] }) {
  const [selectedIds, setSelectedIds] = useState(initialSelection);
  const [searchValue, setSearchValue] = useState('');
  return (
    <QuestionList
      questions={questions}
      selectedIds={selectedIds}
      isLoading={false}
      onSelectionChange={setSelectedIds}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onLocalEdit={vi.fn()}
      onDelete={vi.fn()}
      onDeleteSelected={vi.fn()}
    />
  );
}

describe('QuestionList', () => {
  it('searches case-insensitively, keeps original numbering, and clears search', async () => {
    const user = userEvent.setup();
    render(<ListHarness />);
    await user.type(screen.getByRole('searchbox', { name: 'Search questions' }), ' SQL ');
    expect(screen.getByText('Explain SQL joins')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.queryByText('Explain React hooks')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getAllByRole('checkbox', { name: 'Select question' })).toHaveLength(3);
  });

  it('preserves hidden selections when selecting and deselecting search results', async () => {
    const user = userEvent.setup();
    render(<ListHarness initialSelection={['sql']} />);
    await user.type(screen.getByRole('searchbox'), 'React');
    await user.click(screen.getByRole('checkbox', { name: 'Select shown' }));
    expect(screen.getByText(/Selected Questions:/)).toHaveTextContent('Selected Questions: 3');
    await user.click(screen.getByRole('checkbox', { name: 'Select shown' }));
    expect(screen.getByText(/Selected Questions:/)).toHaveTextContent('Selected Questions: 1');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    const rows = screen.getAllByRole('checkbox', { name: 'Select question' });
    expect(rows[1]).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select All' })).toBePartiallyChecked();
  });

  it('shows a no-match state without removing selection', async () => {
    const user = userEvent.setup();
    render(<ListHarness initialSelection={['sql']} />);
    await user.type(screen.getByRole('searchbox'), 'unmatched');
    expect(screen.getByText('No questions match “unmatched”')).toBeInTheDocument();
    expect(screen.getByText(/Selected Questions:/)).toHaveTextContent('Selected Questions: 1');
    expect(screen.getByRole('checkbox', { name: 'Select shown' })).toBeDisabled();
  });

  it('clicking edit shows inline input; Escape reverts without saving', async () => {
    const user = userEvent.setup();
    render(<ListHarness />);
    await user.click(screen.getAllByRole('button', { name: 'Edit question' })[0]);
    expect(screen.getByDisplayValue('Explain React hooks')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByText('Explain React hooks')).toBeInTheDocument();
  });

  it('calls onLocalEdit with trimmed text on blur', async () => {
    const onLocalEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionList
        questions={questions}
        selectedIds={[]}
        isLoading={false}
        onSelectionChange={vi.fn()}
        searchValue=""
        onSearchChange={vi.fn()}
        onLocalEdit={onLocalEdit}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
      />
    );
    await user.click(screen.getAllByRole('button', { name: 'Edit question' })[0]);
    const input = screen.getByDisplayValue('Explain React hooks');
    await user.clear(input);
    await user.type(input, '  Updated question  ');
    await user.tab(); // blur
    expect(onLocalEdit).toHaveBeenCalledWith(questions[0], 'Updated question');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionList
        questions={questions}
        selectedIds={[]}
        isLoading={false}
        onSelectionChange={vi.fn()}
        searchValue=""
        onSearchChange={vi.fn()}
        onLocalEdit={vi.fn()}
        onDelete={onDelete}
        onDeleteSelected={vi.fn()}
      />
    );
    await user.click(screen.getAllByRole('button', { name: 'Delete question' })[1]);
    expect(onDelete).toHaveBeenCalledWith('sql');
  });

  it('shows loading and empty-round states without a search toolbar', () => {
    const props = {
      questions: [],
      selectedIds: [],
      isLoading: true,
      onSelectionChange: vi.fn(),
      searchValue: '',
      onSearchChange: vi.fn(),
      onLocalEdit: vi.fn(),
      onDelete: vi.fn(),
      onDeleteSelected: vi.fn(),
    };
    const { rerender } = render(<QuestionList {...props} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    rerender(<QuestionList {...props} isLoading={false} />);
    expect(screen.getByText('No questions for this round yet')).toBeInTheDocument();
  });
});
