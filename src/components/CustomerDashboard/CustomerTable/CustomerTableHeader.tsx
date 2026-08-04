import { Space, Switch } from 'antd';
import { EyeOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons';

const TableHeader = () => {
  return [
    {
      title: 'Customer Name',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Primary Contact',
      dataIndex: 'primaryContact',
      key: 'primaryContact',
    },
    {
      title: 'Phone No.',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
    },
    {
      title: 'Interview Count',
      dataIndex: 'interviewCount',
      key: 'interviewCount',
    },
    {
      title: 'Package',
      dataIndex: 'package',
      key: 'package',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Website Links',
      dataIndex: 'websiteLinks',
      key: 'websiteLinks',
    },
    {
      title: 'Recruiters',
      dataIndex: 'recruiters',
      key: 'recruiters',
    },
    {
      title: 'Hiring Manager',
      dataIndex: 'hiringManager',
      key: 'hiringManager',
    },
    {
      title: 'Quota',
      dataIndex: 'quota',
      key: 'quota',
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <EyeOutlined style={{ cursor: 'pointer' }} />
          <EditOutlined style={{ cursor: 'pointer' }} />
          <DownloadOutlined style={{ cursor: 'pointer' }} />
          <Switch defaultChecked={record.status === 'ACTIVE'} />
        </Space>
      ),
    },
  ];
};

export default TableHeader;
