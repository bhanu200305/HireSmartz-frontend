import React, { useState } from 'react';
import { HiOutlineSpeakerphone } from 'react-icons/hi';
import MainLayout from '../../layouts/MainLayout';
import { Typography } from '../shared';
import { Loader } from '../shared/ui/loader';
import MasterPagination from '../shared/ui/MasterPagination';
import { useListGuestOrganizationsQuery } from '../../api/organization-service/Platform/guestOrganizations';

const PAGE_SIZE = 25;

/**
 * GET /v1/platform/guest-organizations — "Book a Demo" leads submitted from
 * the public landing page (guest_organization module's `public_router.py`
 * is the write side; this is Super Admin's read side).
 */
const GuestOrganizations: React.FC = () => {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useListGuestOrganizationsQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const leads = data?.guest_organizations ?? [];

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <div className="flex items-center space-x-2 mb-6">
          <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
            <HiOutlineSpeakerphone size={18} />
          </span>
          <h2 className="text-xl font-semibold">Book a Demo — Leads</h2>
        </div>

        {isLoading ? (
          <Loader />
        ) : leads.length === 0 ? (
          <div className="p-10 text-center text-gray-500 border border-dashed rounded-xl">
            No demo requests yet.
          </div>
        ) : (
          <div className="w-full divide-y border rounded-xl overflow-hidden bg-white">
            <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-[#FAFAFA] text-xs font-semibold text-gray-500">
              <span>ORGANIZATION</span>
              <span>CONTACT</span>
              <span>EMAIL</span>
              <span>LOCATION</span>
              <span>SUBMITTED</span>
            </div>
            {leads.map((lead) => (
              <div key={lead.id} className="grid grid-cols-5 gap-2 px-4 py-3 items-center">
                <Typography variant="body2">{lead.organization_name}</Typography>
                <Typography variant="body2">
                  {lead.first_name} {lead.last_name}
                </Typography>
                <Typography variant="body2" className="truncate" title={lead.organization_email}>
                  {lead.organization_email}
                </Typography>
                <Typography variant="body2">{lead.location}</Typography>
                <Typography variant="body2">
                  {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}
                </Typography>
              </div>
            ))}
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
