import {
  useListActiveSkillsQuery,
  useListClosureReasonsQuery,
  useListInterviewRoundTypesQuery,
  useListOrganizationJobModesQuery,
  useListJobTypesQuery,
  useListLanguagesQuery,
  useLazySearchSkillsQuery,
} from '../api/job-service/JobOpening/catalogs';
import { useListEducationPreferencesQuery } from '../api/job-service/JobOpening/educationPreferences';
import { useGetOrganizationShiftsQuery } from '../api/job-service/Shifts/shifts';
import { useListUsersQuery } from '../api/organization-service/Users/users';
import { useListPlatformTenantUsersQuery } from '../api/organization-service/Platform/users';
import { useListPlatformTenantsQuery } from '../api/organization-service/Platform/tenants';
import { useMemo, useState } from 'react';
import { formatTime12h } from '../utils/formatTime';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/provider/store';
import { useSessionTenantId } from './useSessionTenantId';
import { getJobErrorMessage } from '../shared/utils/auth/jobError.helpers';

export type JobOpeningDropdownOption = {
  id: string;
  name: string;
  description?: string;
  roundType?: string;
  used?: boolean;
  isDeleted?: boolean;
  requires_duration?: boolean;
  available_variants?: string[] | null;
  max_occurrences?: number | null;
  special_kind?: 'intake_call' | 'resume' | 'verification' | null;
  /** Skills only: false for a platform-shared skill, so the UI can offer
   * rename/remove only for this organization's own additions. */
  isEditable?: boolean;
};

const DUMMY_SKILL_OPTIONS: JobOpeningDropdownOption[] = [
  { id: 'Python', name: 'Python' },
  { id: 'Java', name: 'Java' },
  { id: 'JavaScript', name: 'JavaScript' },
  { id: 'SQL', name: 'SQL' },
  { id: 'Communication', name: 'Communication' },
];

const isSkillsEndpoint = (endpoint: string) =>
  endpoint === 'MANDATORY_SKILLS' || endpoint === 'OPTIONAL_SKILLS';

const isPeopleEndpoint = (endpoint: string) =>
  endpoint === 'HIRING_MANAGER' || endpoint === 'RECRUITER';

/**
 * Fetches the catalogue each dropdown needs. Return shape stays
 * `{ id, name }[]` so DropdownWithAddOption keeps working.
 */
const useJobOpeningDropdown = (
  endpoint: string,
  _mode: string,
  _jobOpeningId?: string | number,
  skip?: boolean,
  _locationId?: string | number,
  _isRemote?: boolean
) => {
  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const sessionTenantId = useSessionTenantId();
  const needsPeople = isPeopleEndpoint(endpoint);
  const { data: platformTenants } = useListPlatformTenantsQuery(
    { limit: 50 },
    { skip: skip || !needsPeople || Boolean(sessionTenantId) }
  );
  const tenantId = sessionTenantId ?? platformTenants?.tenants?.[0]?.tenant_id;
  const isMaster = Boolean(!sessionTenantId && tenantId);

  const jobTypes = useListJobTypesQuery(
    { isMaster: callerKind === 'platform' },
    { skip: skip || endpoint !== 'JOB_TYPE' }
  );
  const closureReasons = useListClosureReasonsQuery(undefined, {
    skip: skip || endpoint !== 'CLOSURE_REASON',
  });
  // This organization's own configured list — empty for a platform caller.
  const jobModes = useListOrganizationJobModesQuery(undefined, {
    skip: skip || endpoint !== 'JOB_MODE' || callerKind === 'platform',
  });
  const roundTypes = useListInterviewRoundTypesQuery(undefined, {
    skip: skip || endpoint !== 'ROUNDS',
  });
  // Tenant-only — a platform caller previewing this form gets an empty list.
  const educationPreferences = useListEducationPreferencesQuery(undefined, {
    skip: skip || endpoint !== 'EDUCATION_PREFERENCE' || callerKind === 'platform',
  });
  const languages = useListLanguagesQuery(undefined, {
    skip: skip || endpoint !== 'LANGUAGE' || callerKind === 'platform',
  });
  // Tenant-only, same as education preferences/languages above — a platform
  // caller has no organization to own shifts.
  const shifts = useGetOrganizationShiftsQuery(undefined, {
    skip: skip || endpoint !== 'SHIFT' || callerKind === 'platform',
  });
  // Each dropdown only ever offers users actually holding that role.
  const tenantUsers = useListUsersQuery(
    {
      limit: 200,
      role:
        endpoint === 'HIRING_MANAGER'
          ? 'hiring_manager'
          : endpoint === 'RECRUITER'
            ? 'recruiter'
            : undefined,
    },
    { skip: skip || !needsPeople || isMaster }
  );
  // Company Admin can also act as HM/recruiter on a job - merged into both
  // lists below rather than requiring a separate role grant.
  const tenantCompanyAdmins = useListUsersQuery(
    { limit: 200, role: 'company_admin' },
    { skip: skip || !needsPeople || isMaster }
  );
  const platformUsers = useListPlatformTenantUsersQuery(
    { tenantId: tenantId ?? '', limit: 200 },
    { skip: skip || !needsPeople || !isMaster || !tenantId }
  );
  const users = isMaster ? platformUsers : tenantUsers;

  const [searchSkills, skillsResult] = useLazySearchSkillsQuery();
  // Full active catalogue, shown until the recruiter types 2+ characters
  // into the box — at which point `skillsResult` (searchSkills, above)
  // takes over with the narrower, name-matched results.
  const preloadedSkills = useListActiveSkillsQuery(undefined, {
    skip: skip || !isSkillsEndpoint(endpoint) || callerKind === 'platform',
  });
  // `skillsResult.isUninitialized` stays true forever once a search has ever
  // fired, so it can't tell "searching now" from "searched once, cleared" -
  // track that explicitly instead.
  const [hasActiveSkillSearch, setHasActiveSkillSearch] = useState(false);

  const jobOpeningDropdown: JobOpeningDropdownOption[] = useMemo(() => {
    const unsorted: JobOpeningDropdownOption[] = (() => {
      switch (endpoint) {
        case 'JOB_TYPE':
          return (jobTypes.data ?? []).map((item) => ({
            id: item.id,
            name: item.job_type_name,
            description: item.job_type_description ?? undefined,
          }));
        case 'CLOSURE_REASON':
          return (closureReasons.data ?? []).map((item) => ({
            id: item.reason_id,
            name: item.reason,
            description: item.description ?? undefined,
          }));
        case 'JOB_MODE':
          return (jobModes.data ?? []).map((item) => ({
            id: item.id,
            name: item.job_mode_name,
            description: item.job_mode_description ?? undefined,
          }));
        case 'ROUNDS':
          return (roundTypes.data ?? []).map((item) => ({
            id: item.round_id,
            name: item.round_name,
            description: item.round_description ?? undefined,
            requires_duration: item.requires_duration,
            available_variants: item.available_variants,
            max_occurrences: item.max_occurrences,
            special_kind: item.special_kind,
          }));
        case 'HIRING_MANAGER':
        case 'RECRUITER': {
          const combined = [
            ...(users.data?.items ?? []),
            ...(tenantCompanyAdmins.data?.items ?? []),
          ];
          const deduped = [...new Map(combined.map((user) => [user.user_id, user])).values()];
          return deduped.map((user) => ({
            id: user.user_id,
            name: user.full_name || user.email,
          }));
        }
        case 'EXEMPTION_STATUS':
          return [
            { id: 'true', name: 'Exempt' },
            { id: 'false', name: 'Non-Exempt' },
          ];
        case 'EDUCATION_PREFERENCE':
          return (educationPreferences.data ?? []).map((item) => ({
            id: item.id,
            name: item.education_preference_name,
          }));
        case 'LANGUAGE':
          return (languages.data ?? []).map((item) => ({
            id: item.language_id,
            name: item.language_name,
          }));
        case 'SHIFT':
          return (shifts.data?.shifts ?? []).map((item) => ({
            id: item.id,
            name: `${item.shift_name} (${formatTime12h(item.start_time)} - ${formatTime12h(item.end_time)})`,
          }));
        case 'MANDATORY_SKILLS':
        case 'OPTIONAL_SKILLS': {
          const searched = skillsResult.data;
          const catalog = hasActiveSkillSearch ? (searched ?? []) : (preloadedSkills.data ?? []);
          if (catalog.length === 0) {
            return callerKind === 'platform' ? DUMMY_SKILL_OPTIONS : [];
          }
          return catalog.map((skill) => ({
            id: skill.skill_id,
            name: skill.skill_label,
            isEditable: Boolean(skill.is_organization_specific),
          }));
        }
        default:
          return [];
      }
    })();
    return [...unsorted].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [
    endpoint,
    jobTypes.data,
    closureReasons.data,
    jobModes.data,
    roundTypes.data,
    educationPreferences.data,
    languages.data,
    shifts.data,
    users.data,
    tenantCompanyAdmins.data,
    skillsResult.data,
    hasActiveSkillSearch,
    preloadedSkills.data,
    callerKind,
  ]);

  // Which query backs this endpoint, so we can surface why it's empty.
  const activeQuery = (() => {
    switch (endpoint) {
      case 'JOB_TYPE':
        return jobTypes;
      case 'CLOSURE_REASON':
        return closureReasons;
      case 'JOB_MODE':
        return jobModes;
      case 'ROUNDS':
        return roundTypes;
      case 'EDUCATION_PREFERENCE':
        return educationPreferences;
      case 'LANGUAGE':
        return languages;
      case 'SHIFT':
        return shifts;
      case 'HIRING_MANAGER':
      case 'RECRUITER':
        return users;
      default:
        return undefined;
    }
  })();
  const error = activeQuery?.isError
    ? getJobErrorMessage(activeQuery.error, 'Failed to load options.')
    : null;

  // isFetching, not isLoading - isLoading never fires again after a manual refetch().
  const loading =
    jobTypes.isFetching ||
    closureReasons.isFetching ||
    jobModes.isFetching ||
    roundTypes.isFetching ||
    educationPreferences.isFetching ||
    languages.isFetching ||
    shifts.isFetching ||
    users.isFetching ||
    tenantCompanyAdmins.isFetching ||
    preloadedSkills.isFetching ||
    skillsResult.isFetching;

  // Awaitable so callers can refetch before setValue, letting the new id
  // already exist in options when the form re-renders instead of showing a raw uuid.
  const refetch = async () => {
    if (endpoint === 'JOB_TYPE') await jobTypes.refetch();
    if (endpoint === 'CLOSURE_REASON') await closureReasons.refetch();
    if (endpoint === 'JOB_MODE') await jobModes.refetch();
    if (endpoint === 'ROUNDS') await roundTypes.refetch();
    if (endpoint === 'EDUCATION_PREFERENCE') await educationPreferences.refetch();
    if (endpoint === 'LANGUAGE') await languages.refetch();
    if (endpoint === 'SHIFT') await shifts.refetch();
    if (needsPeople) {
      await users.refetch();
      await tenantCompanyAdmins.refetch();
    }
    if (isSkillsEndpoint(endpoint)) await preloadedSkills.refetch();
  };

  return {
    jobOpeningDropdown,
    loading,
    error,
    refetch,
    searchSkills: (q: string) => {
      if (!isSkillsEndpoint(endpoint)) return;
      const query = q.trim();
      if (query.length >= 2) {
        setHasActiveSkillSearch(true);
        void searchSkills({ q: query });
      } else {
        // Box cleared (or back below 2 chars) - fall back to the full
        // catalogue rather than keeping the last search's stale results.
        setHasActiveSkillSearch(false);
      }
    },
    // Full catalogue size, unaffected by the search endpoint's 20-result cap -
    // used for "N of X skills selected" regardless of an in-progress search.
    totalSkillsCount: isSkillsEndpoint(endpoint) ? (preloadedSkills.data?.length ?? 0) : 0,
  };
};

export default useJobOpeningDropdown;

export { useJobOpeningDropdown };
