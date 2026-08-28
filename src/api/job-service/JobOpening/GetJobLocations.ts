import {
  officeDisplayName,
  useListTenantOfficesQuery,
} from '../../organization-service/Tenants/offices';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/provider/store';

export type JobLocation = {
  id: string;
  companyId?: string;
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  timezone?: string;
  primary?: boolean;
  status?: boolean;
};

export type GetJobLocationsResponse = {
  success: boolean;
  message: string;
  data: JobLocation[];
};

/**
 * Locations for the job flow come from organization-service offices
 * (`GET /v1/tenants/{id}/offices`), not from a fictional job-service path.
 * Hook names kept so JobsOpening / jobdetails imports stay stable.
 */
export const useGetMyLocationsQuery = (
  _args?: { activeOnly?: boolean },
  options?: { skip?: boolean }
) => {
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const result = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '' },
    { skip: !tenantId || options?.skip }
  );

  const data: GetJobLocationsResponse | undefined = result.data
    ? {
        success: true,
        message: 'OK',
        data: result.data.map((office) => ({
          id: office.office_id,
          name: officeDisplayName(office),
          code: office.location_code ?? '',
          addressLine1: office.address_line_1,
          addressLine2: office.address_line_2 ?? '',
          country: office.country,
          state: office.state ?? '',
          city: office.city,
          zipCode: office.zip_code ?? '',
        })),
      }
    : undefined;

  return {
    ...result,
    data,
    refetch: result.refetch,
  };
};

export const useGetJobLocationsQuery = useGetMyLocationsQuery;
