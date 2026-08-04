import { DownOutlined, MoreOutlined } from '@ant-design/icons';
import { Dropdown, MenuProps } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { User } from '../../../types';

interface TableHeaderProps {
  onExpand: (record: User, event: React.MouseEvent<HTMLElement>) => void;
  expandedRowKeys: string[];
}

const TableHeader = ({ onExpand, expandedRowKeys }: TableHeaderProps): ColumnsType<User> => {
  const navigate = useNavigate();
  return [
    {
      title: '',
      dataIndex: 'actions',
      key: 'actions',
      render: (_, record) => {
        const items: MenuProps['items'] = [
          {
            key: 'view',
            label: 'view',
            onClick: () => navigate(`/view-user/${record.key}`),
            // onClick: () => navigate(`/view-user/${record.key}`)
          },
        ];

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <MoreOutlined
              style={{ cursor: 'pointer', fontSize: '20px' }}
              onClick={(e) => e.stopPropagation()} // Prevents row expansion when clicked
            />
          </Dropdown>
        );
      },
    },
    {
      title: 'USER DETAILS',
      dataIndex: 'firstName',
      key: 'userDetails',
      render: (_, record) => (
        <div className={`user-details ${expandedRowKeys.includes(record.key) ? 'expanded' : ''}`}>
          <p className="font-bold">
            {`${record.firstName} ${record.lastName}`}
            <DownOutlined
              style={{
                cursor: 'pointer',
                fontSize: '12px',
                marginLeft: '8px', // ✅ Icon appears AFTER the name
              }}
              onClick={(e) => onExpand(record, e)}
            />
          </p>

          {/* Render email and phone number ONLY when expanded */}
          {expandedRowKeys.includes(record.key) && (
            <div className="contact-info">
              <p>
                <strong>Email:</strong> {record.email}
              </p>
              <p>
                <strong>Phone:</strong> {record.phoneNumber}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'TITLE',
      dataIndex: 'title',
      key: 'title',
      render: () => <span>Senior Manager</span>, // Static title for now
    },
    {
      title: 'ROLE',
      dataIndex: 'role',
      key: 'role',
    },
  ];
};

export default TableHeader;
