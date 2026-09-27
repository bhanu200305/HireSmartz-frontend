import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TenantJobTitlesTab from '../../../../src/components/MyCompany/JobSettings/TenantJobTitlesTab';

const createJobTitle = vi
  .fn()
  .mockReturnValue({ unwrap: () => Promise.resolve({ org_job_title_id: 'new-id' }) });
const updateJobTitle = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const deleteJobTitle = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve(undefined) });
const assignJobTitle = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const deactivateJobTitle = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve(undefined) });
const activateJobTitle = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve(undefined) });

const jobTitles = [
  {
    org_job_title_id: 'jt-1',
    name: 'Bartender',
    description: 'Mixes drinks',
    source_job_title_id: null,
  },
  { org_job_title_id: 'jt-2', name: 'Waiter', description: null, source_job_title_id: null },
];

vi.mock('../../../../src/api/organization-service/Tenants/jobTitles', () => ({
  useListTenantJobTitlesQuery: () => ({ data: jobTitles, isLoading: false }),
  useCreateTenantJobTitleMutation: () => [createJobTitle, { isLoading: false }],
  useUpdateTenantJobTitleMutation: () => [updateJobTitle, { isLoading: false }],
  useDeleteTenantJobTitleMutation: () => [deleteJobTitle, { isLoading: false }],
  useAssignTenantJobTitleToDepartmentMutation: () => [assignJobTitle, { isLoading: false }],
  useDeactivateTenantJobTitleMutation: () => [deactivateJobTitle, { isLoading: false }],
  useActivateTenantJobTitleMutation: () => [activateJobTitle, { isLoading: false }],
  tenantJobTitleFormId: (t: { org_job_title_id: string }) => t.org_job_title_id,
}));

vi.mock('../../../../src/api/organization-service/Tenants/departments', () => ({
  useListTenantDepartmentsQuery: () => ({
    data: [{ org_department_id: 'd-1', name: 'Kitchen', office_id: null }],
  }),
}));

let mockedAccess: Record<string, boolean> = {};
vi.mock('../../../../src/hooks/useHasAccess', () => ({
  default: (authority: string) => Boolean(mockedAccess[authority]),
}));

describe('TenantJobTitlesTab', () => {
  beforeEach(() => {
    mockedAccess = {
      'tenant_job_title:write': true,
      'tenant_job_title:update': true,
      'tenant_job_title:delete': true,
    };
    createJobTitle.mockClear();
    updateJobTitle.mockClear();
    deleteJobTitle.mockClear();
    deactivateJobTitle.mockClear();
    activateJobTitle.mockClear();
  });

  it('lists every job title', () => {
    render(<TenantJobTitlesTab tenantId="tenant-1" />);
    expect(screen.getByText('Bartender')).toBeInTheDocument();
    expect(screen.getByText('Waiter')).toBeInTheDocument();
  });

  it('shows Add and per-row Edit/Delete when the caller has permission', () => {
    render(<TenantJobTitlesTab tenantId="tenant-1" />);
    expect(screen.getByText(/add job title/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText('Edit job title')).toHaveLength(2);
    expect(screen.getAllByLabelText('Delete job title')).toHaveLength(2);
  });

  it('hides Add when the caller lacks permission', () => {
    mockedAccess = { 'tenant_job_title:update': true, 'tenant_job_title:delete': true };
    render(<TenantJobTitlesTab tenantId="tenant-1" />);
    expect(screen.queryByText(/add job title/i)).not.toBeInTheDocument();
  });

  it('hides Edit/Delete row actions when the caller lacks permission', () => {
    mockedAccess = { 'tenant_job_title:write': true };
    render(<TenantJobTitlesTab tenantId="tenant-1" />);
    expect(screen.queryByLabelText('Edit job title')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete job title')).not.toBeInTheDocument();
  });

  it('filters the list by search text', () => {
    render(<TenantJobTitlesTab tenantId="tenant-1" />);
    fireEvent.change(screen.getByPlaceholderText('Search job titles...'), {
      target: { value: 'Bar' },
    });
    expect(screen.getByText('Bartender')).toBeInTheDocument();
    expect(screen.queryByText('Waiter')).not.toBeInTheDocument();
  });
});
