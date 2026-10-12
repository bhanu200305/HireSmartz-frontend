import React from 'react';
import { Select as AntSelect, Switch, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { Input } from '../../shared';

export type CatalogField<TFormValues> = {
  name: keyof TFormValues & string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'tags' | 'time';
  required?: boolean;
  options?: { label: string; value: string }[];
  helperText?: string;
  /** Text fields: the longest value allowed. Typing stops there and a counter shows. */
  maxLength?: number;
};

// Existing values come back as "HH:mm:ss" from the backend; parse both formats.
// Stored/sent as 24h; only the picker's own display is 12h with AM/PM.
const TIME_FORMAT = 'HH:mm';
const TIME_DISPLAY_FORMAT = 'h:mm A';
const TIME_PARSE_FORMATS = ['HH:mm:ss', 'HH:mm'];

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
                <Switch
                  checked={Boolean(raw)}
                  onChange={(checked) => setField(field.name, checked)}
                />
                <span className="text-sm text-gray-700">{field.label}</span>
              </div>
            );
          case 'time':
            return (
              <TimePicker
                key={field.name}
                className="w-full"
                format={TIME_DISPLAY_FORMAT}
                use12Hours
                minuteStep={5}
                placeholder={field.label + (field.required ? ' *' : '')}
                value={raw ? dayjs(raw as string, TIME_PARSE_FORMATS) : null}
                onChange={(value) => setField(field.name, value ? value.format(TIME_FORMAT) : '')}
              />
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
          default: {
            const text = (raw as string) || '';
            return (
              <div key={field.name}>
                <Input
                  placeholder={field.label + (field.required ? ' *' : '')}
                  value={text}
                  maxLength={field.maxLength}
                  onChange={(e) => setField(field.name, e.target.value)}
                />
                {field.maxLength != null && (
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {text.length}/{field.maxLength}
                  </p>
                )}
              </div>
            );
          }
        }
      })}
    </>
  );
}

export default CatalogFormFields;
