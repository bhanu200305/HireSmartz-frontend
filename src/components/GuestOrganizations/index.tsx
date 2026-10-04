import BackButton from '../shared/ui/BackButton';
import React, { useState } from 'react';
import type { TableProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { HiOutlineSpeakerphone } from 'react-icons/hi';
import MainLayout from '../../layouts/MainLayout';
import { Button } from '../shared';
import { Loader } from '../shared/ui/loader';
import { Badge } from '../shared/ui/badge';
import CustomTable from '../shared/ui/table';
import MasterPagination from '../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';
import { useListGuestOrganizationsQuery } from '../../api/organization-service/Platform/guestOrganizations';
import type { GuestOrganization } from '../../api/organization-service/Platform/guestOrganizations';
import type { GuestOrgPrefill } from '../TenantOnboarding/StepCompanyDetails';

/**
 * GET /v1/platform/guest-organizations — "Book a Demo" leads submitted from
 * the public landing page (guest_organization module's `public_router.py`
 * is the write side; this is Super Admin's read side).
 */
const toPrefill = (lead: GuestOrganization): GuestOrgPrefill => ({
  id: lead.id,
  companyName: lead.organization_name,
  adminEmail: lead.organization_email,
  contactNumber: lead.contact_number,
  location: lead.location,
  companySize: lead.company_size,
  jobTitle: lead.job_title,
  referralSource: lead.referral_source,
});

const GuestOrganizations: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('guest_organizations', 25);
  const { data, isLoading } = useListGuestOrganizationsQuery({
    limit: pageSize,
    offset: page * pageSize,
  });

  const leads = data?.guest_organizations ?? [];
  type LeadRow = (typeof leads)[number] & { key: string };
  const dataSource: LeadRow[] = leads.map((lead) => ({ ...lead, key: lead.id }));

  const columns: TableProps<LeadRow>['columns'] = [
    {
      title: 'Organization',
      dataIndex: 'organization_name',
      key: 'organization_name',
      render: (_: unknown, lead: LeadRow) => (
        <span className="text-sm font-semibold text-gray-900">{lead.organization_name}</span>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_: unknown, lead: LeadRow) => (
        <span className="text-sm text-gray-600">
          {lead.first_name} {lead.last_name}
        </span>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'organization_email',
      key: 'organization_email',
      render: (_: unknown, lead: LeadRow) => (
        <span className="text-sm text-gray-600 truncate" title={lead.organization_email}>
          {lead.organization_email}
        </span>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (_: unknown, lead: LeadRow) => (
        <span className="text-sm text-gray-600">{lead.location}</span>
      ),
    },
    {
      title: 'Submitted',
      key: 'created_at',
      render: (_: unknown, lead: LeadRow) => (
        <span className="text-sm text-gray-500">
          {lead.created_at
            ? new Date(lead.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
            : '-'}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      align: 'right',
      render: (_: unknown, lead: LeadRow) =>
        lead.converted_tenant_id ? (
          <Badge status="success">Converted</Badge>
        ) : (
          <Button
            type="button"
            appname="approve lead"
            onClick={() => navigate('/add-company', { state: { fromGuestOrg: toPrefill(lead) } })}
            className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 hover:border-primary-300 hover:text-primary-600 transition-colors"
          >
            Approve
          </Button>
        ),
    },
  ];

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <BackButton onClick={() => navigate('/')} className="mb-4" />
        <div className="flex items-center space-x-2 mb-6">
          <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
            <HiOutlineSpeakerphone size={18} />
          </span>
          <h2 className="font-display text-xl font-bold text-gray-900">Book a Demo: Leads</h2>
        </div>

        {isLoading ? (
          <Loader />
        ) : leads.length === 0 ? (
          <div className="p-10 text-center text-gray-500 border border-dashed border-neutral-200 rounded-xl bg-neutral-50">
            No demo requests yet.
          </div>
        ) : (
          <>
            <RowsPerPageSelect
              pageSize={pageSize}
              options={PAGE_SIZE_OPTIONS}
              onChange={(size) => {
                setPageSize(size);
                setPage(0);
              }}
            />
            <div className="w-full border border-neutral-200 rounded-xl overflow-hidden bg-white">
              <CustomTable<LeadRow> columns={columns} dataSource={dataSource} />
            </div>
          </>
        )}

        {(data?.total ?? 0) > pageSize && (
          <MasterPagination
            current={page + 1}
            pageSize={pageSize}
            total={data?.total ?? 0}
            itemLabel="leads"
            onPageChange={(p) => setPage(p - 1)}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default GuestOrganizations;
