import { api } from '../../index';

type UpdateDropdownByTypeRequest = {
  type: string;
  value: string;
};

type UpdateDropdownByTypeResponse = {
  success: boolean;
  message: string;
  data: {
    id: number;
    name: string;
  };
};

type EditDropdownRequest = {
  type: string;
  ids: number[];
  operation: string;
  updateFieldsList: Array<{
    name?: string;
    isDeleted?: boolean;
  }>;
};

type EditDropdownResponse = {
  successCount: number;
  failureCount: number;
  results: Array<{
    id: number;
    status: 'SUCCESS' | 'FAILED';
    message: string;
    entityType: string;
    updateFields: {
      name?: string;
      isDeleted?: boolean;
    };
  }>;
  message: string;
};

type DeleteDropdownResponse = {
  successCount: number;
  failureCount: number;
  results: Array<{
    id: number;
    status: 'SUCCESS' | 'FAILED';
    message: string;
    entityType: string;
    updateFields: {
      name: string;
    };
  }>;
  message: string;
};
type ReuseDropdownResponse = {
  successCount: number;
  failureCount: number;
  results: Array<{
    id: number;
    status: 'SUCCESS' | 'FAILED';
    message: string;
    entityType: string;
    updateFields: {
      isDeleted: boolean;
    };
  }>;
  message: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    updateDropdownByType: build.mutation<UpdateDropdownByTypeResponse, UpdateDropdownByTypeRequest>(
      {
        query: ({ type, value }) => ({
          url: `/job-opening/updateDropdownsByType?type=${type}`,
          method: 'POST',
          body: { value },
        }),
      }
    ),
    editDropdown: build.mutation<EditDropdownResponse, EditDropdownRequest>({
      query: ({ type, ids, operation, updateFieldsList }) => ({
        url: `/job-opening/${type}/update`,
        method: 'POST',
        body: { ids, operation, updateFieldsList },
      }),
    }),
    deleteDropdown: build.mutation<DeleteDropdownResponse, { type: string; ids: number[] }>({
      query: ({ type, ids }) => ({
        url: `/job-opening/${type}/delete`,
        method: 'POST',
        body: ids,
      }),
    }),
    reuseDropdown: build.mutation<ReuseDropdownResponse, { type: string; id: number[] }>({
      query: ({ type, id }) => ({
        url: `/job-opening/${type}/reuse/${id}`,
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useUpdateDropdownByTypeMutation,
  useEditDropdownMutation,
  useDeleteDropdownMutation,
  useReuseDropdownMutation,
} = extendedApi;
