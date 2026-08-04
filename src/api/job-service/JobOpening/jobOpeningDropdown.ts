import { api } from '../../index';

export type JobOpeningDropdown = {
  id: number;
  department: string;
  exemptionStatus: string;
  educationPreference: string;
  officeLocation: string;
  mandatorySkills: string[];
  jobType: string;
};

export type GetJobOpeningDropdownResponse = {
  data: {
    data: JobOpeningDropdown[];
    success: boolean;
    message: string;
  };
};

type GetJobOpeningDropdownParams = {
  endpoint: string;
  mode: string;
  jobOpeningId?: number;
  locationId?: number;
  isRemote?: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getJobOpeningDropdown: build.query<GetJobOpeningDropdownResponse, GetJobOpeningDropdownParams>({
      query: ({ endpoint, mode, jobOpeningId, locationId, isRemote }) => {
        let url = `/job-opening/getDropdownsByType?type=${endpoint}&mode=${mode}`;
        if (jobOpeningId) {
          url += `&jobOpeningId=${jobOpeningId}`;
        }
        if (locationId) {
          url += `&locationId=${locationId}`;
        }
        if (isRemote) {
          url += `&isRemote=true`;
        }
        return {
          url,
          method: 'GET',
        };
      },
    }),
  }),
});

export const { useGetJobOpeningDropdownQuery } = extendedApi;
