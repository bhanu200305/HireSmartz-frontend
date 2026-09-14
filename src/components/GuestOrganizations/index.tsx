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
import { useListGuestOrganizationsQuery } from '../../api/organization-service/Platform/guestOrganizations';
import type { GuestOrganization } from '../../api/organization-service/Platform/guestOrganizations';
import type { GuestOrgPrefill } from '../TenantOnboarding/StepCompanyDetails';

const PAGE_SIZE = 25;

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
});

const GuestOrganizations: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useListGuestOrganizationsQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
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
          {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}
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
          <div className="w-full border border-neutral-200 rounded-xl overflow-hidden bg-white">
            <CustomTable<LeadRow> columns={columns} dataSource={dataSource} />
          </div>
        )}

        {(data?.total ?? 0) > PAGE_SIZE && (
          <MasterPagination
            current={page + 1}
            pageSize={PAGE_SIZE}
            total={data?.total ?? 0}
            itemLabel="Leads"
            onPageChange={(p) => setPage(p - 1)}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default GuestOrganizations;
