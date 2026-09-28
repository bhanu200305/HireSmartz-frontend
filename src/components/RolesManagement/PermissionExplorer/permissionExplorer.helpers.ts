import type { PermissionCatalogResponse } from '../../../api/organization-service/Roles/permissionCatalog';
import {
  Authorities,
  PERMISSION_CATALOG,
  PERMISSION_DESCRIPTIONS,
} from '../../../constants/authorities.constant';
import { systemRoleLabel } from '../data/roleTemplates';

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
  audience: 'tenant' | 'platform';
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
      description: string;
      resourceLabel: string;
      sensitive: boolean;
      enforced: boolean;
      audience: 'tenant' | 'platform';
    }
  >();
  for (const resource of catalog?.resources ?? []) {
    for (const action of resource.actions ?? []) {
      if (map.has(action.code)) continue;
      map.set(action.code, {
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
 * `PERMISSION_CATALOG` (authorities.constant.ts) is the authoritative source
 * for label + category here, NOT the live backend catalog's own `category`/
 * `description` fields — those come back empty for every resource today
 * (confirmed against a live response), which collapsed every permission into
 * a single "Other" bucket with no explanation text. `PERMISSION_CATALOG`
 * already carries a hand-maintained module per code (and deliberately lists
 * a few codes twice under different modules — e.g. a user permission under
 * both "CFP Users" and "Organization Users" — preserved here rather than
 * deduplicated, so both sections still show it).
 *
 * The live catalog is still consulted for what only the backend actually
 * knows: `sensitive`/`enforced`/`audience`, and as a description fallback.
 * Any code the live catalog reports that ISN'T in `PERMISSION_CATALOG` at
 * all (the backend's real catalog is ~176 codes vs. the static list's 114 —
 * not yet wired into a role-editor checkbox) still gets its own entry, under
 * whatever category the backend provides (or 'Other'), so nothing the API
 * actually grants disappears from this reference.
 */
const flattenCatalog = (catalog: PermissionCatalogResponse | undefined): FlatPermissionEntry[] => {
  const live = indexLiveCatalog(catalog);
  const knownCodes = new Set<string>(Object.values(Authorities));

  const staticEntries: FlatPermissionEntry[] = PERMISSION_CATALOG.map((entry) => {
    const liveMatch = live.get(entry.code);
    const [resource, action] = entry.code.split(':');
    return {
      code: entry.code,
      label: entry.label,
      description: PERMISSION_DESCRIPTIONS[entry.code] || liveMatch?.description || '',
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
 * Groups the live catalog by `category`, preserving the display order the
 * API already returns (both across categories and within one) — mirrors
 * `groupCatalogByModule`'s shape for the static catalog. Company Admin
 * sessions should drop `audience: 'platform'` entries first (no company role
 * can ever hold them); pass `includePlatformOnly: true` for a Super Admin
 * session viewing the reference on its own.
 */
export const groupPermissionCatalogByCategory = (
  catalog: PermissionCatalogResponse | undefined,
  includePlatformOnly: boolean
): Record<string, FlatPermissionEntry[]> => {
  const entries = flattenCatalog(catalog).filter(
    (entry) => includePlatformOnly || entry.audience !== 'platform'
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
