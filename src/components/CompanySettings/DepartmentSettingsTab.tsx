import React, { useEffect, useMemo, useState } from 'react';
import { Select as AntSelect } from 'antd';
import { MdSearch } from 'react-icons/md';
import { Input, Typography, Button, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useListMasterDepartmentsQuery,
  useListMasterDepartmentJobTitlesQuery,
  useAssignJobTitleToDepartmentMutation,
  useRemoveJobTitleFromDepartmentMutation,
} from '../../api/organization-service/Platform/masterDepartments';
import { useListPlatformJobTitlesQuery } from '../../api/organization-service/Platform/jobTitles';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

/**
 * Assign job titles to a department — GET .../master-departments/{id}/job-titles
 * for the current mapping, POST/DELETE .../job-titles[/{id}] to change it.
 * No bulk "set the whole mapping" endpoint exists, so unlike a typical
 * checklist-then-Save form, Save here computes the diff against what's
 * currently mapped and fires one assign or remove call per changed row.
 */
const DepartmentSettingsTab: React.FC = () => {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [stagedMappedIds, setStagedMappedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const { data: departments, isLoading: isDeptsLoading } = useListMasterDepartmentsQuery();
  const sortedDepartments = useMemo(
    () => [...(departments ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [departments]
  );

  useEffect(() => {
    if (sortedDepartments.length > 0 && selectedDepartmentId === null) {
      setSelectedDepartmentId(sortedDepartments[0].department_id);
    }
  }, [sortedDepartments, selectedDepartmentId]);

  const { data: allJobTitles, isLoading: isJobTitlesLoading } = useListPlatformJobTitlesQuery();
  const filteredJobTitles = useMemo(() => {
    const list = allJobTitles ?? [];
    if (!searchText.trim()) return list;
    const q = searchText.trim().toLowerCase();
    return list.filter((jt) => jt.name.toLowerCase().includes(q));
  }, [allJobTitles, searchText]);

  const {
    data: mappedJobTitles,
    isLoading: isMappedLoading,
    isFetching: isMappedFetching,
  } = useListMasterDepartmentJobTitlesQuery(selectedDepartmentId ?? '', {
    skip: !selectedDepartmentId,
  });
  const mappedIds = useMemo(
    () => new Set((mappedJobTitles ?? []).map((jt) => jt.job_title_id)),
    [mappedJobTitles]
  );

  useEffect(() => {
    setStagedMappedIds(new Set(mappedIds));
  }, [mappedJobTitles, selectedDepartmentId]);

  const [assignJobTitle] = useAssignJobTitleToDepartmentMutation();
  const [removeJobTitle] = useRemoveJobTitleFromDepartmentMutation();

  const activeDepartmentName =
    sortedDepartments.find((d) => d.department_id === selectedDepartmentId)?.name || 'Department';

  const toggle = (jobTitleId: string, checked: boolean) => {
    setStagedMappedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(jobTitleId);
      else next.delete(jobTitleId);
      return next;
    });
  };

  const isDirty =
    stagedMappedIds.size !== mappedIds.size ||
    [...stagedMappedIds].some((id) => !mappedIds.has(id));

  const handleReset = () => setStagedMappedIds(new Set(mappedIds));

  const handleSave = async () => {
    if (!selectedDepartmentId) return;
    const toAdd = [...stagedMappedIds].filter((id) => !mappedIds.has(id));
    const toRemove = [...mappedIds].filter((id) => !stagedMappedIds.has(id));

    setIsSaving(true);
    try {
      for (const jobTitleId of toAdd) {
        await assignJobTitle({ departmentId: selectedDepartmentId, jobTitleId }).unwrap();
      }
      for (const jobTitleId of toRemove) {
        await removeJobTitle({ departmentId: selectedDepartmentId, jobTitleId }).unwrap();
      }
      showToast({ message: 'Department job titles configured.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to save one or more changes.'),
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isDeptsLoading || isJobTitlesLoading;
  const isBusy = isMappedFetching || isSaving;

  if (isLoading) return <Loader />;

  return (
    <div>
      <Typography variant="body2" className="mb-6 block">
        Assign active job titles to available departments. A job title can belong to one or more
        departments.
      </Typography>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <AntSelect
          showSearch
          placeholder="Select department"
          value={selectedDepartmentId ?? undefined}
          onChange={(value) => setSelectedDepartmentId(value)}
          options={sortedDepartments.map((d) => ({ label: d.name, value: d.department_id }))}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          className="w-[280px]"
        />
        <Input
          prefix={<MdSearch className="text-gray-400" />}
          placeholder="Search job titles..."
          className="w-[320px]"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {!selectedDepartmentId ? (
        <div className="p-6 text-center text-gray-400 text-sm border rounded-xl">
          No departments yet — add one on the Departments tab first.
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-white relative">
          {isMappedLoading && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
              <Loader />
            </div>
          )}
          <div className="px-4 py-3 flex justify-between items-center border-b bg-gray-50">
            <Typography variant="body1">{activeDepartmentName} — job titles</Typography>
            <Typography variant="caption">
              {stagedMappedIds.size} of {(allJobTitles ?? []).length} selected
            </Typography>
          </div>

          <div className="p-4 max-h-[480px] overflow-y-auto flex flex-col gap-2">
            {filteredJobTitles.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-8">No job titles found.</div>
            ) : (
              filteredJobTitles.map((jt) => {
                const isMapped = stagedMappedIds.has(jt.job_title_id);
                return (
                  <label
                    key={jt.job_title_id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      isMapped
                        ? 'border-primary-400 bg-primary-50/40'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isMapped}
                      disabled={isBusy}
                      onChange={(e) => toggle(jt.job_title_id, e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Typography variant="body2">{jt.name}</Typography>
                  </label>
                );
              })
            )}
          </div>

          <div className="border-t px-4 py-4 flex justify-center gap-4">
            <Button
              className="min-w-[140px] border border-gray-300 rounded-full py-2"
              onClick={handleReset}
              disabled={!isDirty || isBusy}
            >
              Reset
            </Button>
            <Button
              className="min-w-[140px] bg-button text-white rounded-full py-2"
              onClick={handleSave}
              disabled={!isDirty || isBusy}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentSettingsTab;
