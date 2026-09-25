import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TenantDepartmentSettingsTab from '../../../../src/components/MyCompany/JobSettings/TenantDepartmentSettingsTab';

const assignJobTitle = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const removeJobTitle = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve(undefined) });

const departments = [{ org_department_id: 'd-1', name: 'Kitchen', office_id: null }];
const jobTitles = [
  { org_job_title_id: 'jt-1', name: 'Bartender', description: null, source_job_title_id: null },
  { org_job_title_id: 'jt-2', name: 'Waiter', description: null, source_job_title_id: null },
];
// Only Bartender starts mapped to Kitchen.
const mappedJobTitles = [jobTitles[0]];

vi.mock('../../../../src/api/organization-service/Tenants/departments', () => ({
  useListTenantDepartmentsQuery: () => ({ data: departments, isLoading: false }),
}));

vi.mock('../../../../src/api/organization-service/Tenants/jobTitles', () => ({
  useListTenantJobTitlesQuery: () => ({ data: jobTitles, isLoading: false }),
  useListTenantDepartmentJobTitlesQuery: () => ({
    data: mappedJobTitles,
    isLoading: false,
    isFetching: false,
  }),
  useAssignTenantJobTitleToDepartmentMutation: () => [assignJobTitle, { isLoading: false }],
  useRemoveTenantJobTitleFromDepartmentMutation: () => [removeJobTitle, { isLoading: false }],
  tenantJobTitleFormId: (t: { org_job_title_id: string }) => t.org_job_title_id,
}));

let mockedAccess: Record<string, boolean> = {};
vi.mock('../../../../src/hooks/useHasAccess', () => ({
  default: (authority: string) => Boolean(mockedAccess[authority]),
}));

describe('TenantDepartmentSettingsTab', () => {
  beforeEach(() => {
    mockedAccess = { 'department:update': true };
    assignJobTitle.mockClear();
    removeJobTitle.mockClear();
  });

  it('shows the currently mapped job title checked, others unchecked', () => {
    render(<TenantDepartmentSettingsTab tenantId="tenant-1" />);
    const bartenderRow = screen.getByText('Bartender').closest('tr');
    const waiterRow = screen.getByText('Waiter').closest('tr');
    expect(bartenderRow?.querySelector('input[type="checkbox"]')).toBeChecked();
    expect(waiterRow?.querySelector('input[type="checkbox"]')).not.toBeChecked();
  });

  it('Save fires assign for a newly-checked title and remove for a newly-unchecked one', async () => {
    render(<TenantDepartmentSettingsTab tenantId="tenant-1" />);

    const bartenderCheckbox = screen
      .getByText('Bartender')
      .closest('tr')
      ?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const waiterCheckbox = screen
      .getByText('Waiter')
      .closest('tr')
      ?.querySelector('input[type="checkbox"]') as HTMLInputElement;

    fireEvent.click(bartenderCheckbox); // uncheck the mapped one
    fireEvent.click(waiterCheckbox); // check the unmapped one
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(assignJobTitle).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        departmentId: 'd-1',
        job_title_id: 'jt-2',
      });
      expect(removeJobTitle).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        departmentId: 'd-1',
        jobTitleId: 'jt-1',
      });
    });
  });

  it('hides Save/Reset when the caller lacks DEPARTMENT_EDIT', () => {
    mockedAccess = {};
    render(<TenantDepartmentSettingsTab tenantId="tenant-1" />);
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });
});
