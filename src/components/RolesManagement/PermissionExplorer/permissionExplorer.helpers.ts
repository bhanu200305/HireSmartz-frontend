import type { PermissionCatalogResponse } from '../../../api/organization-service/Roles/permissionCatalog';
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

const flattenCatalog = (catalog: PermissionCatalogResponse | undefined): FlatPermissionEntry[] =>
  (catalog?.resources ?? []).flatMap((resource) =>
    resource.actions.map((action) => ({
      code: action.code,
      label: action.label,
      description: action.description,
      resource: resource.resource,
      resourceLabel: resource.label,
      category: resource.category,
      action: action.action,
      sensitive: action.sensitive,
      enforced: action.enforced,
      audience: resource.audience,
    }))
  );

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
