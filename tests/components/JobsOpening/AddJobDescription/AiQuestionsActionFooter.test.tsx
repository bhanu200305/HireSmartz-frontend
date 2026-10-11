import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AiQuestionsActionFooter from '../../../../src/components/JobsOpening/AddJobDescription/AiQuestionsActionFooter';
import JobActionFooter from '../../../../src/components/JobsOpening/AddJobDescription/JobActionFooter';

describe('AiQuestionsActionFooter', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const defaultProps = {
    canPublishHere: true,
    isEditingAlreadyPublishedJob: false,
    isLastSection: false,
    isPublishing: false,
    activeJobOpeningId: 'job-123',
    publishDisabledReason: null,
    onSaveDraft: vi.fn(),
    onCancel: vi.fn(),
    onSaveAndNext: vi.fn(),
    onPublishOrFinish: vi.fn(),
  };

  it('renders Cancel, Save As Draft, and Save & Next buttons with right alignment', () => {
    render(<AiQuestionsActionFooter {...defaultProps} />);

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save as draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save & next/i })).toBeInTheDocument();
  });

  it('triggers onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<AiQuestionsActionFooter {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses the Upload File blue styling for Save As Draft', () => {
    render(<AiQuestionsActionFooter {...defaultProps} />);

    expect(screen.getByRole('button', { name: /save as draft/i })).toHaveClass(
      'bg-primary',
      'hover:bg-brand-700',
      'text-white'
    );
  });

  it('floats within the content column and stays fixed while scrolling', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      return new DOMRect(120, 0, 900, 80);
    });

    render(<AiQuestionsActionFooter {...defaultProps} />);
    const footer = screen.getByRole('contentinfo', { name: 'Questions actions' });

    expect(footer).toHaveClass('fixed');
    expect(footer).toHaveStyle({ left: '120px', width: '900px' });
    expect(footer.parentElement).toHaveStyle({ height: '80px' });

    fireEvent.scroll(window);

    expect(footer).toHaveClass('fixed');
    expect(footer.parentElement).toHaveStyle({ height: '80px' });
  });

  it('updates the floating footer width and reserved height on resize', () => {
    let width = 900;
    let height = 80;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      return new DOMRect(16, this.tagName === 'FOOTER' ? 0 : window.innerHeight, width, height);
    });

    render(<AiQuestionsActionFooter {...defaultProps} />);
    const footer = screen.getByRole('contentinfo', { name: 'Questions actions' });
    width = 340;
    height = 160;
    fireEvent.resize(window);

    expect(footer).toHaveStyle({ left: '16px', width: '340px' });
    expect(footer.parentElement).toHaveStyle({ height: '160px' });
  });

  it('keeps first-step actions in normal flow even below the viewport', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(120, window.innerHeight + 500, 900, 80)
    );

    render(
      <JobActionFooter floating={false}>
        <button type="button">Next</button>
      </JobActionFooter>
    );
    const footer = screen.getByRole('contentinfo', { name: 'Job actions' });

    expect(footer).toHaveClass('relative');
    expect(footer).not.toHaveClass('fixed');
    expect(footer.parentElement?.style.height).toBe('');
    fireEvent.scroll(window);
    fireEvent.resize(window);
    expect(footer).not.toHaveClass('fixed');
  });

  it('triggers onSaveDraft when Save As Draft is clicked', () => {
    const onSaveDraft = vi.fn();
    render(<AiQuestionsActionFooter {...defaultProps} onSaveDraft={onSaveDraft} />);

    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
  });

  it('triggers onSaveAndNext when Save & Next is clicked', () => {
    const onSaveAndNext = vi.fn();
    render(<AiQuestionsActionFooter {...defaultProps} onSaveAndNext={onSaveAndNext} />);

    fireEvent.click(screen.getByRole('button', { name: /save & next/i }));
    expect(onSaveAndNext).toHaveBeenCalledTimes(1);
  });

  it('renders Publish Job Opening on the last section', () => {
    const onPublishOrFinish = vi.fn();
    render(
      <AiQuestionsActionFooter
        {...defaultProps}
        isLastSection={true}
        onPublishOrFinish={onPublishOrFinish}
      />
    );

    expect(screen.queryByRole('button', { name: /save & next/i })).not.toBeInTheDocument();
    const publishButton = screen.getByRole('button', { name: /publish job opening/i });
    expect(publishButton).toBeInTheDocument();

    fireEvent.click(publishButton);
    expect(onPublishOrFinish).toHaveBeenCalledTimes(1);
  });

  it('hides Cancel and Save As Draft when editing an already published job', () => {
    render(
      <AiQuestionsActionFooter
        {...defaultProps}
        isEditingAlreadyPublishedJob={true}
        isLastSection={true}
      />
    );

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save as draft/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save & finish/i })).toBeInTheDocument();
  });

  it('returns null when isLastSection is true and canPublishHere is false', () => {
    const { container } = render(
      <AiQuestionsActionFooter {...defaultProps} isLastSection={true} canPublishHere={false} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
