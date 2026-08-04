import React, { useState } from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import EmailTemplateConfigAdminTab from './EmailTemplateConfigAdminTab';
import PushTemplatesTab from './PushTemplatesTab';

const EmailTemplateConfigWrapper: React.FC = () => {
  const [subTab, setSubTab] = useState<string>('1');

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'Global Theme Settings',
      children: <EmailTemplateConfigAdminTab />,
    },
    {
      key: '3',
      label: 'Push Templates',
      children: <PushTemplatesTab />,
    },
  ];

  return (
    <div>
      <h2 className="heading-font text-2xl font-semibold text-gray-800 mb-1">
        Email Templates Config
      </h2>
      <p className="text-sm text-gray-500 mb-6 roboto-font">
        Update Email template configuration and publish them to companies.
      </p>

      <Tabs activeKey={subTab} onChange={setSubTab} items={items} />
    </div>
  );
};

export default EmailTemplateConfigWrapper;
