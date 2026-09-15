import React from 'react';
import { Input } from '../../shared';
import TemplateCard from '../TemplateCard';
import { roleTemplatesForScope, type RoleTemplate } from '../data/roleTemplates';
import type { RoleScope } from '../../../types';

type TemplateStepProps = {
  scope: RoleScope;
  roleName: string;
  onRoleNameChange: (name: string) => void;
  selectedTemplateKey: string | null;
  onSelectTemplate: (template: RoleTemplate) => void;
  onCancel: () => void;
  onContinue: () => void;
};

/** Create Role — step 1 of 2: designation + starting template. */
const TemplateStep: React.FC<TemplateStepProps> = ({
  scope,
  roleName,
  onRoleNameChange,
  selectedTemplateKey,
  onSelectTemplate,
  onCancel,
  onContinue,
}) => {
  const templates = roleTemplatesForScope(scope);
  const canContinue = roleName.trim().length > 0 && selectedTemplateKey !== null;

  return (
    <div className="flex flex-col">
      <div className="mb-5">
        <label
          htmlFor="createRoleName"
          className="block text-xs font-semibold text-gray-700 mb-1.5"
        >
          Designation <span className="text-danger-solid">*</span>
        </label>
        <Input
          id="createRoleName"
          value={roleName}
          maxLength={60}
          placeholder="e.g. Regional Hiring Manager"
          onChange={(e) => onRoleNameChange(e.target.value)}
        />
      </div>

      <div className="font-semibold text-sm text-gray-900">Start from a template</div>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">
        Pick the closest match; every permission below is yours to adjust on the next step.
      </p>

      <div className="flex flex-col gap-2 mb-2">
        {templates.map((template) => (
          <TemplateCard
            key={template.key}
            template={template}
            selected={selectedTemplateKey === template.key}
            onSelect={() => onSelectTemplate(template)}
          />
        ))}
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-semibold text-gray-600 border border-gray-200 rounded-full px-5 py-2 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="text-sm font-semibold text-white bg-primary-600 rounded-full px-5 py-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Continue: Set Permissions →
        </button>
      </div>
    </div>
  );
};

export default TemplateStep;
