import { useGetJobOpeningDropdownQuery } from '../api/job-service/JobOpening/jobOpeningDropdown';

const useJobOpeningDropdown = (
  endpoint: string,
  mode: string,
  jobOpeningId?: number,
  skip?: boolean,
  locationId?: number,
  isRemote?: boolean
) => {
  const { data, error, isLoading, refetch } = useGetJobOpeningDropdownQuery(
    { endpoint, mode, jobOpeningId, locationId, isRemote },
    {
      refetchOnMountOrArgChange: true,
      skip,
    }
  );

  return {
    jobOpeningDropdown: Array.isArray(data) ? data : [],
    loading: isLoading,
    error: error ? 'Failed to fetch job openings' : null,
    refetch,
  };
};

export default useJobOpeningDropdown;
