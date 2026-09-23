import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Tag, Popconfirm } from 'antd';
import {
  useGetAtsConfigQuery,
  useConnectAtsMutation,
  useDisconnectAtsMutation,
} from '../../../api/job-service/JobOpening/JobOpeningSync';
import type { AtsConnection } from '../../../api/job-service/JobOpening/JobOpeningSync';
import { showToast } from '../../shared/ui/toast';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';

type ConnectFormValues = { ats_provider: string; tenant_identifier: string };

/** This organization's connected ATS providers - connect starts the OAuth
 * flow (redirect_url), disconnect revokes stored tokens. Already-imported
 * jobs are unaffected by disconnecting. */
const TenantAtsIntegrationTab: React.FC = () => {
  const { data, isLoading } = useGetAtsConfigQuery();
  const [connect, { isLoading: isConnecting }] = useConnectAtsMutation();
  const [disconnect] = useDisconnectAtsMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<ConnectFormValues>();

  const connections = data?.connections ?? [];

  const handleConnect = async (values: ConnectFormValues) => {
    try {
      const result = await connect(values).unwrap();
      window.location.href = result.redirect_url;
    } catch (error) {
      showToast({
        message: getJobErrorMessage(error, 'Failed to connect ATS provider.'),
        type: 'error',
      });
    }
  };

  const handleDisconnect = async (atsProvider: string) => {
    try {
      await disconnect({ ats_provider: atsProvider }).unwrap();
      showToast({ message: 'ATS connection revoked', type: 'success' });
    } catch (error) {
      showToast({
        message: getJobErrorMessage(error, 'Failed to disconnect ATS provider.'),
        type: 'error',
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-500 m-0">Your company&apos;s connected ATS providers.</p>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>
          Connect ATS
        </Button>
      </div>

      <Table<AtsConnection>
        rowKey="org_ats_config_id"
        loading={isLoading}
        dataSource={connections}
        pagination={false}
        // Same "cap has no responsive width and no fallback" fix every
        // other table in this app gets via the shared CustomTable
        // component (src/components/shared/ui/table.tsx) — this one bypasses
        // that wrapper (needs `rowKey`, which CustomTable doesn't expose),
        // so it needs the same `scroll` prop applied directly instead of
        // silently missing the fix.
        scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Provider', dataIndex: 'ats_provider', key: 'ats_provider' },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
              <Tag color={status === 'CONNECTED' ? 'green' : 'default'}>{status}</Tag>
            ),
          },
          {
            title: 'Last synced',
            dataIndex: 'last_synced_at',
            key: 'last_synced_at',
            render: (value: string | null) => value ?? '—',
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
              <Popconfirm
                title="Disconnect this ATS?"
                description="Already-imported jobs are unaffected."
                onConfirm={() => handleDisconnect(record.ats_provider)}
              >
                <Button danger size="small">
                  Disconnect
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal
        title="Connect an ATS provider"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={isConnecting}
        okText="Continue to provider"
      >
        <Form<ConnectFormValues> form={form} layout="vertical" onFinish={handleConnect}>
          <Form.Item
            name="ats_provider"
            label="Provider"
            rules={[{ required: true, message: 'Provider is required' }]}
          >
            <Input placeholder="e.g. greenhouse, lever" />
          </Form.Item>
          <Form.Item
            name="tenant_identifier"
            label="Tenant identifier"
            rules={[{ required: true, message: 'Tenant identifier is required' }]}
          >
            <Input placeholder="Your account/subdomain on the provider" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TenantAtsIntegrationTab;
