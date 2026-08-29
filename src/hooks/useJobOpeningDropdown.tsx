import {
  useListClosureReasonsQuery,
  useListInterviewRoundTypesQuery,
  useListJobTypesQuery,
  useListLanguagesQuery,
  useLazySearchSkillsQuery,
  useSearchSkillsQuery,
} from '../api/job-service/JobOpening/catalogs';
import { useListEducationPreferencesQuery } from '../api/job-service/JobOpening/educationPreferences';
import { useListUsersQuery } from '../api/organization-service/Users/users';
import { useListPlatformTenantUsersQuery } from '../api/organization-service/Platform/users';
import { useListPlatformTenantsQuery } from '../api/organization-service/Platform/tenants';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/provider/store';
import { useSessionTenantId } from './useSessionTenantId';

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
 * Replaces the fictional `/job-opening/getDropdownsByType` with the real
 * catalogues each dropdown actually needs. Return shape stays
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
  const roundTypes = useListInterviewRoundTypesQuery(undefined, {
    skip: skip || endpoint !== 'ROUNDS',
  });
  // Tenant-only endpoints — no /platform/master-* equivalent exists for
  // either (unlike job types/shifts), so a platform caller previewing this
  // form gets an empty list, same as the skills fallback below.
  const educationPreferences = useListEducationPreferencesQuery(undefined, {
    skip: skip || endpoint !== 'EDUCATION_PREFERENCE' || callerKind === 'platform',
  });
  const languages = useListLanguagesQuery(undefined, {
    skip: skip || endpoint !== 'LANGUAGE' || callerKind === 'platform',
  });
  const tenantUsers = useListUsersQuery({ limit: 200 }, { skip: skip || !needsPeople || isMaster });
  const platformUsers = useListPlatformTenantUsersQuery(
    { tenantId: tenantId ?? '', limit: 200 },
    { skip: skip || !needsPeople || !isMaster || !tenantId }
  );
  const users = isMaster ? platformUsers : tenantUsers;

  const [searchSkills, skillsResult] = useLazySearchSkillsQuery();
  const preloadedSkills = useSearchSkillsQuery(
    { q: 'ja' },
    { skip: skip || !isSkillsEndpoint(endpoint) || callerKind === 'platform' }
  );

  const jobOpeningDropdown: JobOpeningDropdownOption[] = useMemo(() => {
    switch (endpoint) {
      case 'JOB_TYPE':
        return (jobTypes.data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? undefined,
        }));
      case 'CLOSURE_REASON':
        return (closureReasons.data ?? []).map((item) => ({
          id: item.reason_id,
          name: item.reason,
          description: item.description ?? undefined,
        }));
      case 'ROUNDS':
        return (roundTypes.data ?? []).map((item) => ({
          id: item.round_id,
          name: item.name,
          description: item.description ?? undefined,
          requires_duration: item.requires_duration,
          available_variants: item.available_variants,
          max_occurrences: item.max_occurrences,
        }));
      case 'HIRING_MANAGER':
      case 'RECRUITER':
        return (users.data?.items ?? []).map((user) => ({
          id: user.user_id,
          name: user.full_name || user.email,
        }));
      case 'EXEMPTION_STATUS':
        return [
          { id: 'true', name: 'Exempt' },
          { id: 'false', name: 'Non-Exempt' },
        ];
      case 'EDUCATION_PREFERENCE':
        return (educationPreferences.data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
        }));
      case 'LANGUAGE':
        return (languages.data ?? []).map((item) => ({
          id: item.language_id,
          name: item.name,
        }));
      case 'MANDATORY_SKILLS':
      case 'OPTIONAL_SKILLS': {
        const searched = skillsResult.data;
        const catalog = !skillsResult.isUninitialized
          ? (searched ?? [])
          : (preloadedSkills.data ?? []);
        if (catalog.length === 0) {
          return callerKind === 'platform' ? DUMMY_SKILL_OPTIONS : [];
        }
        return catalog.map((skill) => ({
          id: skill.skill_id,
          name: skill.skill_label,
        }));
      }
      default:
        return [];
    }
  }, [
    endpoint,
    jobTypes.data,
    closureReasons.data,
    roundTypes.data,
    educationPreferences.data,
    languages.data,
    users.data,
    skillsResult.data,
    skillsResult.isUninitialized,
    preloadedSkills.data,
    callerKind,
  ]);

  const loading =
    jobTypes.isLoading ||
    closureReasons.isLoading ||
    roundTypes.isLoading ||
    educationPreferences.isLoading ||
    languages.isLoading ||
    users.isLoading ||
    preloadedSkills.isLoading ||
    skillsResult.isFetching;

  const refetch = () => {
    if (endpoint === 'JOB_TYPE') jobTypes.refetch();
    if (endpoint === 'CLOSURE_REASON') closureReasons.refetch();
    if (endpoint === 'ROUNDS') roundTypes.refetch();
    if (endpoint === 'EDUCATION_PREFERENCE') educationPreferences.refetch();
    if (endpoint === 'LANGUAGE') languages.refetch();
    if (needsPeople) users.refetch();
    if (isSkillsEndpoint(endpoint)) preloadedSkills.refetch();
  };

  return {
    jobOpeningDropdown,
    loading,
    error: null as string | null,
    refetch,
    searchSkills: (q: string) => {
      if (!isSkillsEndpoint(endpoint)) return;
      const query = q.trim();
      if (query.length >= 2) {
        void searchSkills({ q: query });
      }
    },
  };
};

export default useJobOpeningDropdown;

export { useJobOpeningDropdown };
