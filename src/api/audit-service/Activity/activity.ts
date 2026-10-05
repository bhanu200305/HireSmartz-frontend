import { auditApi } from '../auditApi';

// GET /v1/audit/activity — one route, three views. Which one the caller gets
// follows their own permissions server-side (no extra parameter): company
// admin → whole company, hiring manager/recruiter → only their assigned
// jobs, Super Admin → the platform view. `scope` on the response says which.
export type ActivityScope = 'company' | 'assigned_jobs' | 'platform';

export type ActivityCategory = 'job' | 'candidate' | 'interview' | 'team' | 'platform';

export type ActivityActorType = 'user' | 'system' | 'anonymous' | 'unattributed';

export type ActivityActor = {
  type: ActivityActorType;
  id: string | null;
  // Always null on the Super Admin (platform) view for now.
  name: string | null;
};

export type ActivityRef = { id: string | null; name: string | null };

export type ActivityJobRef = {
  id: string | null;
  title: string | null;
  code: string | null;
};

export type ActivityParams = {
  from_status?: string | null;
  to_status?: string | null;
  initiated_by?: string | null;
  round_id?: string | null;
  round_name?: string | null;
  interview_type?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  scope?: string | null;
  role_name?: string | null;
  notify_candidates?: boolean | null;
  entry_path?: string | null;
  recommendation?: string | null;
  signup_source?: string | null;
  source?: string | null;
};

export type ActivityItem = {
  id: string;
  // Open-ended: unknown types render with the generic fallback sentence.
  type: string;
  category: ActivityCategory;
  occurred_at: string;
  actor: ActivityActor | null;
  candidate: ActivityRef | null;
  // A team member the action was done TO (assigned, given a role, offboarded).
  person: ActivityRef | null;
  job: ActivityJobRef | null;
  // Super Admin view only.
  company: ActivityRef | null;
  params: ActivityParams | null;
};

export type ActivityFeedResponse = {
  scope: ActivityScope;
  items: ActivityItem[];
  next_cursor: string | null;
};

export type ActivityFeedArgs = {
  category?: ActivityCategory;
  q?: string;
  jobId?: string;
  departmentId?: string;
  locationId?: string;
  /** "Done by" — sent repeated: ?actor_id=a&actor_id=b. */
  actorIds?: string[];
  mine?: boolean;
  occurredFrom?: string;
  occurredTo?: string;
  limit?: number;
  cursor?: string | null;
};

const extendedApi = auditApi.injectEndpoints({
  endpoints: (build) => ({
    getActivityFeed: build.query<ActivityFeedResponse, ActivityFeedArgs | void>({
      // actor_id has to repeat, which fetchBaseQuery's `params` object can't
      // express — so the query string is built by hand.
      query: (args) => {
        const params = new URLSearchParams();
        const set = (key: string, value?: string | null) => {
          if (value) params.set(key, value);
        };
        set('category', args?.category);
        set('q', args?.q?.trim());
        set('job_id', args?.jobId);
        set('department_id', args?.departmentId);
        set('location_id', args?.locationId);
        args?.actorIds?.forEach((id) => params.append('actor_id', id));
        if (args?.mine) params.set('mine', 'true');
        set('occurred_from', args?.occurredFrom);
        set('occurred_to', args?.occurredTo);
        params.set('limit', String(args?.limit ?? 25));
        set('cursor', args?.cursor);
        return { url: `/v1/audit/activity?${params.toString()}` };
      },
      providesTags: ['Activity'],
    }),
  }),
});

export const { useGetActivityFeedQuery, useLazyGetActivityFeedQuery } = extendedApi;
