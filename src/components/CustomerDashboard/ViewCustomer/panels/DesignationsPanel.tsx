import React from 'react';
import { Typography, CustomTable } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import { useListPlatformTenantDesignationsQuery } from '../../../../api/organization-service/Platform/designations';

type DesignationRow = { key: string; name: string };

/**
 * Read-only — there is no add/edit/delete endpoint for designations at all
 * (see designations.ts's own comment: a designation only ever comes into
 * being via a roster row naming one by text), so unlike its sibling panels
 * this one was never a write surface to begin with.
 */
const DesignationsPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useListPlatformTenantDesignationsQuery(tenantId);

  if (isLoading) return <Loader />;

  const dataSource: DesignationRow[] = (data ?? []).map((d) => ({
    key: d.designation_id,
    name: d.name,
  }));

  return (
    <div className="p-4">
      <Typography variant="h5" className="mb-1 block">
        Designations
      </Typography>
      <Typography variant="body2" className="text-gray-400 mb-6">
        Job designations in use across this company&apos;s team.
      </Typography>

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<DesignationRow>
          columns={[{ title: 'Designation', dataIndex: 'name', key: 'name' }]}
          dataSource={dataSource}
          emptyText="No designations yet."
        />
      </div>
    </div>
  );
};

export default DesignationsPanel;
