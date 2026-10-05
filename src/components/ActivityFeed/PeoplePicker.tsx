import { useMemo } from 'react';
import { Select } from 'antd';
import { useListUsersQuery } from '../../api/organization-service/Users/users';
import { FilterSelectIcon } from '../shared/ui/FilterSelectIcon';

// Role groups offered under "Done by" — GET /v1/users?role=<name>.
const ROLE_GROUPS = [
  { role: 'hiring_manager', label: 'Hiring managers' },
  { role: 'recruiter', label: 'Recruiters' },
] as const;

export type PersonOption = { value: string; label: string };

type Props = {
  value: string[];
  onChange: (ids: string[], options: PersonOption[]) => void;
};

/** "Done by" multi-select, grouped by role. Selected ids go to the feed as repeated actor_id. */
const PeoplePicker = ({ value, onChange }: Props) => {
  const hiringManagers = useListUsersQuery({ role: 'hiring_manager', limit: 100 });
  const recruiters = useListUsersQuery({ role: 'recruiter', limit: 100 });

  const results = [hiringManagers, recruiters];
  const loading = results.some((r) => r.isFetching);

  const groups = useMemo(() => {
    // A person holding both roles is listed once, under the first group.
    const seen = new Set<string>();
    return ROLE_GROUPS.map(({ label }, i) => {
      const options = (results[i].data?.items ?? [])
        .filter((u) => !seen.has(u.user_id) && Boolean(seen.add(u.user_id)))
        .map((u) => ({ value: u.user_id, label: u.full_name || u.email }));
      return { label, options };
    }).filter((g) => g.options.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiringManagers.data, recruiters.data]);

  const flat = useMemo(() => groups.flatMap((g) => g.options), [groups]);

  return (
    <div className="cfp-dropdown-trigger">
      <FilterSelectIcon />
      <Select
        mode="multiple"
        allowClear
        showSearch
        optionFilterProp="label"
        maxTagCount="responsive"
        placeholder="Done by"
        loading={loading}
        options={groups}
        value={value}
        onChange={(ids: string[]) =>
          onChange(
            ids,
            flat.filter((o) => ids.includes(o.value))
          )
        }
        className="w-full custom-select"
        variant="borderless"
        style={{ minWidth: 170, fontSize: 14 }}
      />
    </div>
  );
};

export default PeoplePicker;
