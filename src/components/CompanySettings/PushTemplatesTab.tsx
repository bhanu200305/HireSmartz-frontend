import React, { useState } from 'react';
import { Select, Modal } from 'antd';
import { Button, Typography, showToast } from '../shared';
import { useListPlatformTenantsQuery } from '../../api/organization-service/Platform/tenants';
import {
  usePushTemplatesToTenantsMutation,
  type ImpactedTenant,
} from '../../api/notification-service/PlatformTemplateSettings/index';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';

/**
 * Bulk-revert several companies' email-copy customisations back to the
 * platform default in one action — `POST /v1/platform/template-settings/
 * tenants/push`. Real backend, real tenant search (same browsable-without-
 * typing pattern as `CompanyThemeSection`) — replaces the original version of
 * this tab, which called a legacy endpoint that no longer exists anywhere in
 * this backend.
 *
 * Two-step, mirroring the backend's own dry-run/confirm contract: the first
 * call (`performChanges: false`) only reports which selected companies would
 * lose customised copy; nothing is touched until the second call
 * (`performChanges: true`, `confirmed: true` once any were reported).
 *
 * Only reverts COPY overrides (subject/body) — matches
 * `organization_email_template`, the same table "Tenant overrides" edits.
 * A company's saved THEME (16 colors/banner) is a separate table
 * (`organization_email_layout`) and is untouched by this action.
 */
const PushTemplatesTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPreConfirmModalOpen, setIsPreConfirmModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [impactedTenants, setImpactedTenants] = useState<ImpactedTenant[]>([]);

  const { data: tenantResults, isFetching: isSearching } = useListPlatformTenantsQuery({
    q: search.trim() || undefined,
    limit: 50,
  });
  const [pushToTenants, { isLoading: isPushing }] = usePushTemplatesToTenantsMutation();

  const companies = tenantResults?.tenants ?? [];
  const selectedCompanies = companies.filter((c) => selectedIds.has(c.tenant_id));

  const handlePushClick = () => {
    if (selectedIds.size === 0) {
      showToast({ type: 'warning', message: 'Please select at least one company.' });
      return;
    }
    setIsPreConfirmModalOpen(true);
  };

  // Step 1 — dry run: performChanges=false, confirmed=false.
  const handleDryRun = async () => {
    setIsPreConfirmModalOpen(false);
    try {
      const result = await pushToTenants({
        tenantIds: Array.from(selectedIds),
        performChanges: false,
        confirmed: false,
      }).unwrap();

      if (result.requires_confirmation) {
        setImpactedTenants(result.impacted_tenants);
        setIsConfirmModalOpen(true);
      } else {
        // No customised copy to overwrite — push immediately.
        await handleFinalPush(false);
      }
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to check template status. Please try again.'),
        type: 'error',
      });
    }
  };

  // Step 2 — the real revert: performChanges=true, confirmed matches whether
  // the dry run found anything to overwrite.
  const handleFinalPush = async (userConfirmed: boolean) => {
    try {
      const result = await pushToTenants({
        tenantIds: Array.from(selectedIds),
        performChanges: true,
        confirmed: userConfirmed,
      }).unwrap();
      showToast({
        message: `Reverted to the platform default for ${result.push_result?.total_affected ?? selectedIds.size} ${
          (result.push_result?.total_affected ?? selectedIds.size) === 1 ? 'company' : 'companies'
        }.`,
        type: 'success',
      });
      setIsConfirmModalOpen(false);
      setSelectedIds(new Set());
      setImpactedTenants([]);
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to revert these templates.'),
        type: 'error',
      });
    }
  };

  const toggleCompany = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <Typography variant="h6" className="mb-1 block">
        Bulk-revert companies to the platform default
      </Typography>
      <Typography variant="caption" className="mb-4 block text-gray-500">
        Selected companies lose any customised email wording and fall back to the platform
        default — same effect as reverting each notification type by hand, for several companies
        at once. Their saved brand colors and banner are untouched.
      </Typography>

      <Select
        mode="multiple"
        showSearch
        allowClear
        placeholder="Search and select companies…"
        filterOption={false}
        loading={isSearching}
        value={Array.from(selectedIds)}
        onSearch={setSearch}
        onChange={(values) => setSelectedIds(new Set(values))}
        options={companies.map((c) => ({ value: c.tenant_id, label: c.company_name }))}
        className="w-full max-w-xl"
      />

      <div className="mt-6 flex justify-center">
        <Button
          type="button"
          appname="push templates to companies"
          onClick={handlePushClick}
          disabled={selectedIds.size === 0 || isPushing}
          className="rounded-3xl bg-primary px-10 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPushing ? 'Working…' : 'REVERT TO DEFAULT'}
        </Button>
      </div>

      <Modal
        open={isPreConfirmModalOpen}
        onCancel={() => setIsPreConfirmModalOpen(false)}
        footer={null}
        centered
        closable={false}
        width={420}
      >
        <div className="text-center">
          <h3 className="mb-3 text-xl font-semibold text-gray-900">Revert Email Templates</h3>
          <p className="mb-6 text-sm text-gray-600">
            Revert email copy to the platform default for{' '}
            <span className="font-semibold">{selectedIds.size}</span>{' '}
            {selectedIds.size === 1 ? 'company' : 'companies'}?
          </p>
          <div className="flex gap-3">
            <Button
              className="flex-1 rounded-full border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => setIsPreConfirmModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-white hover:brightness-105"
              onClick={handleDryRun}
            >
              CONTINUE
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        footer={null}
        centered
        closable={false}
        width={480}
      >
        <div className="text-center">
          <h3 className="mb-3 text-xl font-semibold text-gray-900">Customised Copy Will Be Lost</h3>
          <p className="mb-4 text-sm text-gray-600">
            The companies below have customised email wording that will be overwritten with the
            platform default:
          </p>
          <div className="mb-4 max-h-40 space-y-1 overflow-y-auto text-left">
            {impactedTenants.map((t) => (
              <p key={t.tenant_id} className="pl-1 text-sm text-gray-500">
                {t.tenant_name}
              </p>
            ))}
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1 rounded-full border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isPushing}
            >
              CANCEL
            </Button>
            <Button
              className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-white hover:brightness-105"
              onClick={() => handleFinalPush(true)}
              disabled={isPushing}
            >
              {isPushing ? 'Reverting…' : 'YES, REVERT'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
};

export default PushTemplatesTab;
