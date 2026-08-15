import React from 'react';
import type { RoleTemplate } from './data/roleTemplates';

type TemplateCardProps = {
  template: RoleTemplate;
  selected: boolean;
  onSelect: () => void;
};

/** Single radio-style template card — Create Role step 1. */
const TemplateCard: React.FC<TemplateCardProps> = ({ template, selected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className={`w-full text-left border-[1.5px] rounded-xl px-4 py-3 transition-colors cursor-pointer ${
      selected
        ? 'border-primary-600 bg-primary-50'
        : 'border-gray-200 bg-white hover:border-primary-300'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="font-semibold text-sm text-gray-900">{template.label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{template.description}</div>
      </div>
      <span
        className={`mt-0.5 h-[18px] w-[18px] rounded-full border-[1.5px] shrink-0 flex items-center justify-center ${
          selected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
        }`}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
    </div>
  </button>
);

export default TemplateCard;
