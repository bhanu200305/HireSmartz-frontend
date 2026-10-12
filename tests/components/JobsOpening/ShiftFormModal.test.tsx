import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import ShiftFormModal from '../../../src/components/JobsOpening/ShiftFormModal';
import { SHIFT_NAME_MAX_LENGTH } from '../../../src/shared/utils/catalogueNameLimits';

const renderModal = (name = '') =>
  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <ShiftFormModal
        open
        mode="add"
        initialValues={{ name, start_time: '', end_time: '' }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    </ConfigProvider>
  );

const nameInput = () => screen.getByPlaceholderText('Name *') as HTMLInputElement;

describe('ShiftFormModal name limit', () => {
  it('limits the name to what the server accepts', () => {
    renderModal();
    expect(nameInput().maxLength).toBe(SHIFT_NAME_MAX_LENGTH);
  });

  it('shows a live counter', async () => {
    renderModal();
    expect(screen.getByText(`0/${SHIFT_NAME_MAX_LENGTH}`)).toBeTruthy();
    await userEvent.type(nameInput(), 'Night');
    expect(screen.getByText(`5/${SHIFT_NAME_MAX_LENGTH}`)).toBeTruthy();
  });

  it('cuts a longer pre-filled name to the limit', () => {
    renderModal('Flexible evening and weekend rotating shift');
    expect(nameInput().value).toBe('Flexible evening and');
    expect(screen.getByText(`20/${SHIFT_NAME_MAX_LENGTH}`)).toBeTruthy();
  });
});
