import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlatformCatalogTab from '../../../../src/components/CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../../../src/components/CompanySettings/JobCatalogs/CatalogFormFields';

type Item = { id: string; name: string };
type FormValues = { name: string };

const items: Item[] = [{ id: '1', name: 'Resume Screening' }];
const fields: CatalogField<FormValues>[] = [{ name: 'name', label: 'Name', type: 'text' }];
const baseProps = {
  title: 'Catalogue',
  itemNounSingular: 'Item',
  itemNounPlural: 'Items',
  items,
  isLoading: false,
  idOf: (item: Item) => item.id,
  labelOf: (item: Item) => item.name,
  columns: [{ title: 'Name', dataIndex: 'name', key: 'name' }],
  fields,
  emptyForm: { name: '' },
  toFormValues: (item: Item) => ({ name: item.name }),
  onCreate: vi.fn().mockResolvedValue(undefined),
  onUpdate: vi.fn().mockResolvedValue(undefined),
};

describe('PlatformCatalogTab — allowCreate/allowEdit', () => {
  it('shows Add and per-row Edit/Delete by default', () => {
    render(<PlatformCatalogTab {...baseProps} onDelete={vi.fn()} />);

    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/edit item/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delete item/i)).toBeInTheDocument();
  });

  it('hides Add when allowCreate is false', () => {
    render(<PlatformCatalogTab {...baseProps} allowCreate={false} />);

    expect(screen.queryByRole('button', { name: /add item/i })).not.toBeInTheDocument();
  });

  it('hides Edit when allowEdit is false, independent of onDelete', () => {
    render(<PlatformCatalogTab {...baseProps} allowEdit={false} onDelete={vi.fn()} />);

    expect(screen.queryByLabelText(/edit item/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/delete item/i)).toBeInTheDocument();
  });

  it('renders no Actions column at all when both are off and no onDelete', () => {
    render(<PlatformCatalogTab {...baseProps} allowCreate={false} allowEdit={false} />);

    expect(screen.queryByRole('button', { name: /add item/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/edit item/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delete item/i)).not.toBeInTheDocument();
  });
});
