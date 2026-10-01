import { orgApi } from '../orgApi';

export type AuditLogEntry = {
  id: string;
  actor_id: string;
  // Resolved server-side from `actor_id` against platform staff — `null`
  // only if that membership no longer exists. Fall back to `actor_id` in
  // that case, never leave the actor blank.
  actor_name: string | null;
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
  /** Only actions not tied to any tenant at all (platform-staff management,
   * global catalog changes) — `tenant_id IS NULL` server-side. Mutually
   * exclusive with `tenantId`: the backend 422s if both are sent, so never
   * set this alongside a `tenantId`. */
  platformOnly?: boolean;
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
          ...(args?.platformOnly ? { platform_only: true } : {}),
          limit: args?.limit ?? 50,
          offset: args?.offset ?? 0,
        },
      }),
      providesTags: ['PlatformAudit'],
    }),
  }),
});

export const { useListAuditEventsQuery } = extendedApi;
