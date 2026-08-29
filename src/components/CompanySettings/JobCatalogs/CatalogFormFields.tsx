import React from 'react';
import { Select as AntSelect, Switch } from 'antd';
import { Input } from '../../shared';

export type CatalogField<TFormValues> = {
  name: keyof TFormValues & string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'tags';
  required?: boolean;
  options?: { label: string; value: string }[];
  helperText?: string;
};

type Props<TFormValues extends Record<string, unknown>> = {
  fields: CatalogField<TFormValues>[];
  values: TFormValues;
  onChange: (next: TFormValues) => void;
};

/** Renders one add/edit modal's fields from a declarative list — the form
 * half of PlatformCatalogTab's genericism. `tags` is a comma-separated text
 * input mapped to string[] (used for interview-round `available_variants`,
 * the one field across all 9 platform catalogues that isn't text/number/
 * boolean/single-select). */
function CatalogFormFields<TFormValues extends Record<string, unknown>>({
  fields,
  values,
  onChange,
}: Props<TFormValues>) {
  const setField = (name: keyof TFormValues & string, value: unknown) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <>
      {fields.map((field) => {
        const raw = values[field.name];
        switch (field.type) {
          case 'boolean':
            return (
              <div key={field.name} className="flex items-center gap-2.5">
                <Switch checked={Boolean(raw)} onChange={(checked) => setField(field.name, checked)} />
                <span className="text-sm text-gray-700">{field.label}</span>
              </div>
            );
          case 'select':
            return (
              <AntSelect
                key={field.name}
                placeholder={field.label + (field.required ? ' *' : '')}
                className="w-full"
                allowClear={!field.required}
                value={(raw as string) || undefined}
                onChange={(value) => setField(field.name, value ?? null)}
                options={field.options ?? []}
              />
            );
          case 'number':
            return (
              <Input
                key={field.name}
                type="number"
                placeholder={field.label + (field.required ? ' *' : '')}
                value={raw == null ? '' : String(raw)}
                onChange={(e) =>
                  setField(field.name, e.target.value === '' ? null : Number(e.target.value))
                }
              />
            );
          case 'tags':
            return (
              <div key={field.name}>
                <Input
                  placeholder={field.label + (field.required ? ' *' : '')}
                  value={Array.isArray(raw) ? (raw as string[]).join(', ') : ''}
                  onChange={(e) =>
                    setField(
                      field.name,
                      e.target.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean)
                    )
                  }
                />
                {field.helperText && (
                  <p className="text-xs text-gray-400 mt-1">{field.helperText}</p>
                )}
              </div>
            );
          case 'textarea':
            return (
              <Input
                key={field.name}
                placeholder={field.label + (field.required ? ' *' : '')}
                value={(raw as string) || ''}
                onChange={(e) => setField(field.name, e.target.value)}
              />
            );
          case 'text':
          default:
            return (
              <Input
                key={field.name}
                placeholder={field.label + (field.required ? ' *' : '')}
                value={(raw as string) || ''}
                onChange={(e) => setField(field.name, e.target.value)}
              />
            );
        }
      })}
    </>
  );
}

export default CatalogFormFields;
