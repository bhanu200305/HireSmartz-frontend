import React from 'react';
import { Tooltip } from 'antd';
import { MdInfoOutline } from 'react-icons/md';

type InfoHintProps = {
  content: string;
  className?: string;
};

/**
 * Shared "ⓘ" hover-info affordance — sits next to a heading or label to
 * explain it briefly without adding visual weight. White background (not
 * antd's default dark) so it matches the app's light surfaces, and a fixed
 * bottom-left placement so it always lands in the same spot relative to the
 * icon no matter where that icon sits on the page.
 */
const InfoHint: React.FC<InfoHintProps> = ({ content, className = '' }) => (
  <Tooltip
    title={content}
    color="white"
    placement="bottomLeft"
    align={{ offset: [-8, 4] }}
    overlayStyle={{ maxWidth: 240 }}
    overlayInnerStyle={{
      color: '#374151',
      fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      border: '1px solid #e5e7eb',
    }}
  >
    <span
      className={`text-gray-400 hover:text-primary-600 cursor-pointer inline-flex ${className}`}
    >
      <MdInfoOutline size={14} />
    </span>
  </Tooltip>
);

export default InfoHint;
