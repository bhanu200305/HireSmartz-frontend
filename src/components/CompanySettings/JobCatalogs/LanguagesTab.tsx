import React from 'react';
import { Badge } from '../../shared';
import {
  useListPlatformLanguagesQuery,
  useCreatePlatformLanguageMutation,
  useUpdatePlatformLanguageMutation,
  useDeletePlatformLanguageMutation,
  PlatformLanguage,
} from '../../../api/job-service/Platform/masterLanguages';
import PlatformCatalogTab from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { name: string; language_code: string };
const emptyForm: FormValues = { name: '', language_code: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'language_code', label: 'Language code (e.g. en, hi)', type: 'text', required: true },
];

/** Platform-wide language catalogue used by the Job Details Communication Language field. */
const LanguagesTab: React.FC = () => {
  const { data, isLoading } = useListPlatformLanguagesQuery();
  const [create] = useCreatePlatformLanguageMutation();
  const [update] = useUpdatePlatformLanguageMutation();
  const [remove] = useDeletePlatformLanguageMutation();

  return (
    <PlatformCatalogTab<PlatformLanguage, FormValues>
      title="Platform-wide language catalog."
      itemNounSingular="Language"
      itemNounPlural="Languages"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.language_id}
      labelOf={(item) => item.language_name}
      columns={[
        { title: 'Name', dataIndex: 'language_name', key: 'language_name' },
        {
          title: 'Code',
          key: 'language_code',
          render: (_, item) => (
            <Badge status="neutral" dot={false} className="font-mono">
              {item.language_code}
            </Badge>
          ),
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({ name: item.language_name, language_code: item.language_code })}
      onCreate={(values) =>
        create({
          language_name: values.name.trim(),
          language_code: values.language_code.trim(),
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          languageId: id,
          language_name: values.name.trim(),
          language_code: values.language_code.trim(),
        }).unwrap()
      }
      onDelete={(item) => remove(item.language_id).unwrap()}
    />
  );
};

export default LanguagesTab;
