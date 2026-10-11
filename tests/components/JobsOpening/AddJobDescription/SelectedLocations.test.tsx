import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SelectedLocations from '../../../../src/components/JobsOpening/AddJobDescription/SelectedLocations';
import type { TenantOffice } from '../../../../src/api/organization-service/Tenants/offices';

const office = (id: string, city: string): TenantOffice => ({
  office_id: id,
  location_code: `${city.toUpperCase()}-1`,
  address_line_1: `1 ${city} Road`,
  address_line_2: null,
  city,
  state: 'Maharashtra',
  country: 'India',
  zip_code: '400001',
  is_active: true,
});

const pune = office('p', 'Pune');
const delhi = office('d', 'Delhi');

describe('SelectedLocations', () => {
  it('shows nothing when no location is selected', () => {
    const { container } = render(<SelectedLocations offices={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows a chip and an address card for each selected location', () => {
    render(<SelectedLocations offices={[pune, delhi]} />);

    expect(screen.getByText('Selected Locations')).toBeTruthy();
    expect(screen.getByRole('region', { name: /Pune/ })).toBeTruthy();
    expect(screen.getByRole('region', { name: /Delhi/ })).toBeTruthy();
    expect(screen.getByText('1 Pune Road')).toBeTruthy();
    expect(screen.getByText('1 Delhi Road')).toBeTruthy();
  });

  it('removes a location from its chip', () => {
    const onRemove = vi.fn();
    render(<SelectedLocations offices={[pune, delhi]} onRemove={onRemove} />);

    fireEvent.click(screen.getByLabelText(/Remove .*Delhi/));

    expect(onRemove).toHaveBeenCalledWith('d');
  });

  it('has no remove buttons while the form is locked', () => {
    render(<SelectedLocations offices={[pune]} onRemove={vi.fn()} disabled />);

    expect(screen.queryByLabelText(/Remove/)).toBeNull();
  });

  it('has no remove buttons when nothing handles removal', () => {
    render(<SelectedLocations offices={[pune]} />);

    expect(screen.queryByLabelText(/Remove/)).toBeNull();
  });

  it('says so when a location has no code', () => {
    render(<SelectedLocations offices={[{ ...pune, location_code: null }]} />);

    expect(screen.getByText('Not set')).toBeTruthy();
  });
});
