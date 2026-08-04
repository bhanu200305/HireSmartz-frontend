import React from 'react';
import { CaretRightOutlined } from '@ant-design/icons';
import type { CollapseProps } from 'antd';
import { Collapse as AntdCollapse } from 'antd';

interface CustomCollapseProps {
  data: Array<{
    key: string;
    label: string;
    content: React.ReactNode;
  }>;
}

const CustomCollapse: React.FC<CustomCollapseProps> = ({ data }) => {
  const getItems: CollapseProps['items'] = data.map((item) => ({
    key: item.key,
    label: item.label,
    children: <div className="p-2">{item.content}</div>,
    className: 'mb-2 bg-white rounded-lg border border-[#1F1F1F0D]',
  }));

  return (
    <AntdCollapse
      bordered={false}
      defaultActiveKey={['1']}
      expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      className="bg-white border border-[#1F1F1F0D]"
      items={getItems}
    />
  );
};

export default CustomCollapse;
