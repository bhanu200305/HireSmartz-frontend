import React, { useState, useEffect } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Select as AntSelect } from 'antd';
import { Button, Input, showToast } from '../shared';
import {
  useGetMasterDepartmentsQuery,
  useGetMasterDepartmentJobTitlesQuery,
  useConfigureMasterDepartmentJobTitlesMutation,
} from '../../api/tenant-service/CompanySettings/departments';
import { useGetMasterJobTitlesQuery } from '../../api/tenant-service/CompanySettings/jobTitles';
import { Loader } from '../shared/ui/loader';

const DepartmentSettingsTab: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  // Local state for checkboxes
  const [stagedMappedTitleIds, setStagedMappedTitleIds] = useState<Set<number>>(new Set());

  const { data: deptData, isFetching: isDeptsFetching } = useGetMasterDepartmentsQuery({
    size: 200,
    status: 'active',
    sortBy: 'name',
    sortDirection: 'ASC',
  });
  const departments = (deptData?.content || [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  // Default to first department if none selected
  useEffect(() => {
    if (departments.length > 0 && selectedDepartmentId === null) {
      setSelectedDepartmentId(departments[0].id);
    }
  }, [departments, selectedDepartmentId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  // Fetch ALL job titles (possibly filtered by search)
  const { data: jobTitlesData, isFetching: isJobTitlesFetching } = useGetMasterJobTitlesQuery({
    page: 0,
    size: 500, // Fetching a large amount to configure
    search: debouncedSearch || undefined,
    sortBy: 'name',
    sortDirection: 'ASC',
  });
  const allJobTitles = jobTitlesData?.content || [];

  // Fetch mapped job titles for the CURRENT chosen department
  const { data: configuredJobTitlesData, isFetching: isConfiguredFetching } =
    useGetMasterDepartmentJobTitlesQuery(selectedDepartmentId as number, {
      skip: !selectedDepartmentId,
    });

  const configuredTitleIds = new Set(configuredJobTitlesData?.map((jt) => jt.id) || []);

  const [configureJobTitles, { isLoading: isSaving }] =
    useConfigureMasterDepartmentJobTitlesMutation();

  // Reset staging when configured data changes or department changes
  useEffect(() => {
    setStagedMappedTitleIds(new Set(configuredTitleIds));
  }, [configuredJobTitlesData, selectedDepartmentId]);

  const activeDepartmentName =
    departments.find((d) => d.id === selectedDepartmentId)?.name || 'Department';

  const toggleJobTitleMapping = (id: number, checked: boolean) => {
    setStagedMappedTitleIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedDepartmentId) return;
    try {
      await configureJobTitles({
        departmentId: selectedDepartmentId,
        jobTitleIds: Array.from(stagedMappedTitleIds),
      }).unwrap();
      showToast({ type: 'success', message: 'Department Job Titles configured successfully' });
    } catch (error: any) {
      showToast({
        type: 'error',
        message: error?.data?.message || 'Failed to configure department job titles',
      });
    }
  };

  const handleReset = () => {
    setStagedMappedTitleIds(new Set(configuredTitleIds));
  };

  const isFetching = isDeptsFetching || isJobTitlesFetching || isConfiguredFetching;

  // We should also ensure inactive ones show differently
  return (
    <div>
      <p className="text-sm text-gray-500 mb-8 font-medium">
        Assign active Job Titles to available Departments. You can assign a job to one or more
        departments.
      </p>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-[300px]">
          <AntSelect
            showSearch
            placeholder="Select Department"
            value={selectedDepartmentId}
            onChange={(val) => setSelectedDepartmentId(val)}
            options={departments.map((d) => ({ label: d.name, value: d.id }))}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            className="w-full text-sm h-11 [&_.ant-select-selector]:rounded-full [&_.ant-select-selector]:h-11 [&_.ant-select-selection-item]:leading-[42px] [&_.ant-select-selection-search-input]:h-11"
          />
        </div>
        <div className="w-[400px]">
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Search Job Titles..."
            className="w-full rounded-full h-11 text-sm bg-gray-50/50 border-gray-200"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      <div className="relative min-h-[400px]">
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-xl">
            <Loader />
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 bg-white">
            <h3 className="text-[15px] font-bold text-gray-800">
              {activeDepartmentName} — Job Titles Configuration
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              {stagedMappedTitleIds.size} Job Titles active for {activeDepartmentName} Department
            </span>
          </div>

          <div className="p-6 bg-white max-h-[600px] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <span className="text-xs font-bold text-gray-700 tracking-wider">Job Titles</span>
              <span className="text-xs font-bold text-gray-700">
                {stagedMappedTitleIds.size} of {allJobTitles.length} selected
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {allJobTitles.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-8">No job titles found.</div>
              ) : (
                allJobTitles.map((jt) => {
                  const isMapped = stagedMappedTitleIds.has(jt.id);
                  const isInactive = !jt.status;

                  return (
                    <div
                      key={jt.id}
                      className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                        isMapped
                          ? isInactive
                            ? 'border-gray-300 bg-gray-200'
                            : 'border-brand-400 bg-brand-50/30'
                          : isInactive
                            ? 'border-gray-200 bg-gray-100'
                            : 'border-gray-200 bg-white hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isMapped}
                          onChange={(e) => toggleJobTitleMapping(jt.id, e.target.checked)}
                          className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer"
                        />
                        <span
                          className={`text-sm ${isInactive ? 'text-gray-500' : isMapped ? 'text-gray-800 font-medium' : 'text-gray-700'}`}
                        >
                          {jt.name}
                        </span>
                      </div>

                      {isInactive && (
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                          Inactive
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-5 flex justify-center gap-4 bg-white">
            <Button
              onClick={handleReset}
              disabled={
                stagedMappedTitleIds.size === configuredTitleIds.size &&
                [...stagedMappedTitleIds].every((id) => configuredTitleIds.has(id))
              }
              className="px-12 py-[10px] h-11 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-full font-medium min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              RESET
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isSaving ||
                (stagedMappedTitleIds.size === configuredTitleIds.size &&
                  [...stagedMappedTitleIds].every((id) => configuredTitleIds.has(id)))
              }
              className="px-12 py-[10px] h-11 bg-brand-600 text-white hover:bg-brand-700 rounded-full font-medium min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'SAVING...' : 'SAVE'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentSettingsTab;
