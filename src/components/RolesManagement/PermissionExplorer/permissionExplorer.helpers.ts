import type { PermissionCatalogResponse } from '../../../api/organization-service/Roles/permissionCatalog';
import type {
  MatrixUser,
  PermissionMatrixResponse,
} from '../../../api/organization-service/Roles/permissionMatrix';
import {
  Authorities,
  PERMISSION_CATALOG,
  PERMISSION_DESCRIPTIONS,
} from '../../../constants/authorities.constant';
import { systemRoleLabel } from '../data/roleTemplates';

/** A holder row carrying which organization it came from — needed the
 * moment a result can span more than one (CFP staff plus every client
 * company, once a cross-org search is merged in); redundant but harmless
 * for a single-source result. */
export type TaggedMatrixUser = MatrixUser & {
  organizationId: string;
  organizationName: string;
};

/** Flattens one or more `PermissionMatrixResponse`-shaped sources (the
 * tenant matrix, `usePlatformPermissionMatrix`, and the cross-org search all
 * share this exact shape — see `PermissionMatrixResponse`'s own docstring on
 * why its org list was designed to carry more than one entry) into one row
 * list, each row tagged with its organization. Order is source order, then
 * each source's own org order — callers merging CFP staff with a cross-org
 * search should pass CFP staff first, so it leads the combined list. */
export const flattenMatrixResponses = (
  ...responses: (PermissionMatrixResponse | undefined)[]
): TaggedMatrixUser[] =>
  responses.flatMap((response) =>
    (response?.Organization_User_Permissions ?? []).flatMap((org) =>
      (org.Users_Permission ?? []).map((user) => ({
        ...user,
        organizationId: org.Organization_Id,
        organizationName: org.Organization_Name,
      }))
    )
  );

/** A catalog action flattened onto its parent resource — the shape every
 * screen here actually renders a row from, instead of re-nesting through
 * `resources[].actions[]` at every call site. */
export type FlatPermissionEntry = {
  code: string;
  label: string;
  description: string;
  resource: string;
  resourceLabel: string;
  category: string;
  action: string;
  sensitive: boolean;
  enforced: boolean;
  audience: 'tenant' | 'platform' | 'both';
};

/** Humanizes a `resource:action` code into a fallback title — `job:approve`
 * -> `Job Approve` — used only when the catalog entry itself carries no
 * label (a defensive fallback, never the normal path). */
const humanizeCode = (code: string): string =>
  code
    .replace(/[:_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const ACTION_VERB: Record<string, string> = {
  read: 'View',
  write: 'Add',
  update: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export',
};

/** A one-line description for a live-catalog permission that PERMISSION_CATALOG
 * doesn't know about yet and the backend itself sent no description for —
 * used so a permission never renders with nothing under its label, even one
 * this app hasn't been taught a real description for. Composed from the
 * resource's own display label plus the action, e.g. `audit:export` + "Audit
 * log" -> "Export audit log records as a file." */
const genericDescription = (resourceLabel: string, action: string): string => {
  const verb = ACTION_VERB[action] ?? humanizeCode(action);
  const subject = resourceLabel.toLowerCase();
  if (action === 'export') return `Export ${subject} records as a file.`;
  if (action === 'read') return `View ${subject}.`;
  if (action === 'delete') return `Delete ${subject}.`;
  if (action === 'approve') return `Approve a change to ${subject}.`;
  if (action === 'write') return `Add a new ${subject.replace(/s$/, '')} record.`;
  if (action === 'update') return `Edit an existing ${subject.replace(/s$/, '')} record.`;
  return `${verb} ${subject}.`;
};

/**
 * Every code the live catalog (`GET /v1/roles/permissions`) actually
 * returned, keyed by code, for enriching the static `PERMISSION_CATALOG`
 * rows below with the metadata only the backend can supply (whether it's
 * currently enforced, flagged sensitive, tenant- vs. platform-scoped) — and
 * as a fallback description source ahead of `genericDescription` when the
 * backend does provide one. If the same code appears more than once (it
 * shouldn't), the first wins.
 */
const indexLiveCatalog = (catalog: PermissionCatalogResponse | undefined) => {
  const map = new Map<
    string,
    {
      label: string;
      description: string;
      resourceLabel: string;
      sensitive: boolean;
      enforced: boolean;
      audience: 'tenant' | 'platform' | 'both';
    }
  >();
  for (const resource of catalog?.resources ?? []) {
    for (const action of resource.actions ?? []) {
      if (map.has(action.code)) continue;
      map.set(action.code, {
        label: action.label || '',
        description: action.description || '',
        resourceLabel: resource.label,
        sensitive: Boolean(action.sensitive),
        enforced: Boolean(action.enforced),
        audience: resource.audience,
      });
    }
  }
  return map;
};

/**
 * `tenant:*` never got a tenant-appropriate duplicate the way `user:*` did
 * (there's no "My Company" module standing in for "Company" the way
 * "Organization Users" stands in for "CFP Users" — see `ORG_HIDDEN_MODULE`)
 * even though `company_admin`'s own seeded permission set
 * (organization_service_seed.py: `"tenant": ("read", "update", "write")`)
 * genuinely holds `tenant:read/update/write`. Its static entries ("View
 * companies" / "See every company on the platform…") were written purely
 * from a Super Admin managing many client companies — correct for a
 * platform reader, wrong for a company admin reading about their own one.
 * `tenant:approve/delete/export` (approve a new company's signup, suspend
 * one, export the company list) are never in that seeded set at all, so
 * they're dropped outright for org view; `read/write/update` get their
 * label and description from the live catalog instead, which
 * organization-service's own `permission_definitions.py` already writes to
 * read correctly for a tenant caller.
 */
const ORG_UNREACHABLE_CODES = new Set(['tenant:approve', 'tenant:delete', 'tenant:export']);
const ORG_PREFER_LIVE_TEXT_CODES = new Set(['tenant:read', 'tenant:write', 'tenant:update']);

/**
 * `PERMISSION_CATALOG` (authorities.constant.ts) is the authoritative source
 * for label + category here: it's the hand-maintained list the role-editor
 * checkbox picker already uses, and it deliberately lists a few codes twice
 * under different modules (e.g. a user permission under both "CFP Users" and
 * "Organization Users") — preserved here rather than deduplicated, so both
 * sections still show it. The live catalog (`GET /v1/roles/permissions`) DOES
 * carry real `category`/`description` per resource, sourced from
 * organization-service's own `permission_definitions.py` — but that file
 * doesn't know this frontend's two-module split for shared codes, so it isn't
 * used as the primary source here.
 *
 * The live catalog is still consulted for what only the backend actually
 * knows: `sensitive`/`enforced`/`audience`, and as a description fallback for
 * any static entry that has no hand-written one. Any code the live catalog
 * reports that ISN'T in `PERMISSION_CATALOG` at all (the backend's real
 * catalog is ~176 codes vs. the static list's 114 — not yet wired into a
 * role-editor checkbox) still gets its own entry, under whatever category the
 * backend provides, so nothing the API actually grants disappears from this
 * reference.
 */
const flattenCatalog = (
  catalog: PermissionCatalogResponse | undefined,
  includePlatformOnly = true
): FlatPermissionEntry[] => {
  const live = indexLiveCatalog(catalog);
  const knownCodes = new Set<string>(Object.values(Authorities));

  const staticEntries: FlatPermissionEntry[] = PERMISSION_CATALOG.filter(
    (entry) => includePlatformOnly || !ORG_UNREACHABLE_CODES.has(entry.code)
  ).map((entry) => {
    const liveMatch = live.get(entry.code);
    const [resource, action] = entry.code.split(':');
    const preferLiveText = !includePlatformOnly && ORG_PREFER_LIVE_TEXT_CODES.has(entry.code);
    return {
      code: entry.code,
      label: (preferLiveText && liveMatch?.label) || entry.label,
      description:
        (preferLiveText && liveMatch?.description) ||
        PERMISSION_DESCRIPTIONS[entry.code] ||
        liveMatch?.description ||
        '',
      resource,
      resourceLabel: liveMatch?.resourceLabel || humanizeCode(resource),
      category: entry.module,
      action: action ?? '',
      sensitive: liveMatch?.sensitive ?? false,
      // Every PERMISSION_CATALOG row is a real, already-enforced backend
      // permission (that's the whole reason it's in the fixed catalog a role
      // editor picks from) — true unless the live catalog explicitly says
      // otherwise for this code.
      enforced: liveMatch?.enforced ?? true,
      audience: liveMatch?.audience ?? 'tenant',
    };
  });

  const extraEntries: FlatPermissionEntry[] = [];
  for (const resource of catalog?.resources ?? []) {
    for (const action of resource.actions ?? []) {
      if (knownCodes.has(action.code)) continue;
      extraEntries.push({
        code: action.code,
        label: action.label || humanizeCode(action.code),
        description: action.description || genericDescription(resource.label, action.action),
        resource: resource.resource,
        resourceLabel: resource.label,
        category: resource.category || 'Other',
        action: action.action,
        sensitive: Boolean(action.sensitive),
        enforced: Boolean(action.enforced),
        audience: resource.audience,
      });
    }
  }

  return [...staticEntries, ...extraEntries];
};

/**
 * Same shared codes PermissionMatrix.tsx's `HIDDEN_MODULE_BY_SCOPE` hides for
 * a tenant-scope role editor, for the same reason: "CFP Users" is a
 * static-catalog heading over codes (`user:approve`, `user:export`, ...)
 * whose real backend resource is `user` — `audience: 'both'`, not
 * `'platform'` — because the SAME resource is also read/written on the
 * tenant side. The audience filter below can't tell "CFP Users" apart from
 * "Organization Users" on its own; both pass it. Dropping this module
 * outright for a company session is what actually keeps a permission
 * labelled "Approve CFP users" off their reference page.
 */
const ORG_HIDDEN_MODULE = 'CFP Users';

/**
 * Groups the live catalog by `category`, preserving the display order the
 * API already returns (both across categories and within one) — mirrors
 * `groupCatalogByModule`'s shape for the static catalog. `enforced: false`
 * (a stub no screen grants any real ability for yet) is dropped for EVERY
 * session — a reference page listing something indistinguishable from a
 * working permission, with no visible marker that it does nothing, is worse
 * than just not listing it. A Company Admin session additionally drops
 * `audience: 'platform'` entries and the `ORG_HIDDEN_MODULE` heading
 * (`ORG_UNREACHABLE_CODES` is dropped inside `flattenCatalog`); pass
 * `includePlatformOnly: true` for a Super Admin session, which keeps every
 * audience.
 */
export const groupPermissionCatalogByCategory = (
  catalog: PermissionCatalogResponse | undefined,
  includePlatformOnly: boolean
): Record<string, FlatPermissionEntry[]> => {
  const entries = flattenCatalog(catalog, includePlatformOnly).filter(
    (entry) =>
      entry.enforced &&
      (includePlatformOnly ||
        (entry.audience !== 'platform' && entry.category !== ORG_HIDDEN_MODULE))
  );

  const groups: Record<string, FlatPermissionEntry[]> = {};
  entries.forEach((entry) => {
    if (!groups[entry.category]) groups[entry.category] = [];
    groups[entry.category].push(entry);
  });
  return groups;
};

/** Flat, ungrouped list — used for search/lookup by code (e.g. resolving a
 * `Denied_Permissions` code to its label). */
export const flattenPermissionCatalog = flattenCatalog;

/** Maps a backend role NAME (e.g. "company_admin") to its display label
 * (e.g. "Company Admin") — same mapping RoleTable already uses for system
 * roles; a custom role's name passes through unchanged. */
export const roleDisplayName = systemRoleLabel;
