import { orgApi } from '../orgApi';

export type AuditLogEntry = {
  id: string;
  actor_id: string;
  actor_type: string;
  // Open-ended catalog, same reasoning as tenant activity's `action` field —
  // never gate rendering on a fixed union.
  action: string;
  target_type: string;
  target_id: string;
  tenant_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
};

export type ListAuditEventsArgs = {
  actorId?: string;
  action?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
};

export type ListAuditEventsResponse = {
  events: AuditLogEntry[];
  total: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listAuditEvents: build.query<ListAuditEventsResponse, ListAuditEventsArgs | void>({
      query: (args) => ({
        url: '/v1/platform/audit/events',
        params: {
          ...(args?.actorId ? { actor_id: args.actorId } : {}),
          ...(args?.action ? { action: args.action } : {}),
          ...(args?.tenantId ? { tenant_id: args.tenantId } : {}),
          limit: args?.limit ?? 50,
          offset: args?.offset ?? 0,
        },
      }),
      providesTags: ['PlatformAudit'],
    }),
  }),
});

export const { useListAuditEventsQuery } = extendedApi;
