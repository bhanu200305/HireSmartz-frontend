import { api } from '../../index';

/* ─────────────────────────────── Types ─────────────────────────────── */

export interface SmsRoundOption {
  value: string;
  label: string;
}

export interface SmsTemplateCatalogItem {
  templateKey: string;
  name: string;
  description?: string | null;
  roundType?: string | null;
  locale?: string | null;
  isCustomized?: boolean;
  currentContent?: string;
  defaultContent?: string | null;
  maxLength?: number;
  allowedPlaceholders?: string[];
}

export interface SmsTemplateDetails {
  templateKey: string;
  name: string;
  currentContent: string;
  defaultContent?: string | null;
  isCustomized: boolean;
  roundType?: string | null;
  maxLength?: number;
  allowedPlaceholders?: string[];
  placeholders?: string[];
}

export interface SmsTemplateCatalogApiResponse {
  success?: boolean;
  message?: string;
  data?: SmsTemplateCatalogItem[] | { templates?: SmsTemplateCatalogItem[] };
}

export interface SmsTemplateDetailsApiResponse {
  success?: boolean;
  message?: string;
  data?: SmsTemplateDetails;
  templateKey?: string;
  templateCode?: string;
  templateName?: string;
  name?: string;
  currentContent?: string;
  defaultContent?: string | null;
  isCustomized?: boolean;
  roundType?: string | null;
  maxLength?: number;
  placeholders?: string[];
  allowedPlaceholders?: string[];
}

export interface SaveSmsTemplateRequest {
  templateKey: string;
  companyId: string;
  content: string;
}

export interface RevertSmsTemplateRequest {
  templateKey: string;
  companyId: string;
}

export interface SmsTemplateMutationResponse {
  success?: boolean;
  message?: string;
  data?: SmsTemplateDetails;
}

/* ─────────────────────────────── Helpers ────────────────────────────── */

/**
 * Fallback round options aligned with the catalog API (`roundType` values).
 * Prefer deriving rounds from the catalog when available.
 */
export const DEFAULT_SMS_ROUND_OPTIONS: SmsRoundOption[] = [
  { value: 'AI', label: 'AI' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'IN_PERSON', label: 'In Person' },
  { value: 'GENERIC', label: 'Generic' },
];

const ROUND_TYPE_ALIASES: Record<string, string> = {
  AI: 'AI',
  VIDEO: 'VIDEO',
  IN_PERSON: 'IN_PERSON',
  INPERSON: 'IN_PERSON',
  'IN-PERSON': 'IN_PERSON',
  PERSON: 'IN_PERSON',
  GENERIC: 'GENERIC',
  GENERAL: 'GENERIC',
};

const formatRoundLabel = (value: string): string => {
  const known = DEFAULT_SMS_ROUND_OPTIONS.find(
    (option) => option.value === normalizeRoundType(value)
  );
  if (known) return known.label;

  return value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/** Canonical round key used for frontend filtering comparisons. */
export const normalizeRoundType = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const compact = trimmed.replace(/[\s-]+/g, '_').toUpperCase();
  if (ROUND_TYPE_ALIASES[compact]) return ROUND_TYPE_ALIASES[compact];

  const spaced = trimmed.replace(/[_-]+/g, ' ').toUpperCase();
  if (spaced.includes('IN PERSON') || spaced.includes('INPERSON')) return 'IN_PERSON';
  if (/\bVIDEO\b/.test(spaced)) return 'VIDEO';
  if (/\bAI\b/.test(spaced)) return 'AI';
  if (/\bGENERIC\b/.test(spaced) || /\bGENERAL\b/.test(spaced)) return 'GENERIC';

  return compact;
};

/**
 * Infer round type from free-text fields when the API does not send `roundType`.
 * More specific phrases are checked before generic ones (e.g. video before interview).
 */
export const inferRoundTypeFromText = (
  ...parts: Array<string | null | undefined>
): string | null => {
  const haystack = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .toLowerCase();

  if (!haystack) return null;

  if (
    haystack.includes('in_person') ||
    haystack.includes('in-person') ||
    haystack.includes('in person') ||
    haystack.includes('inperson')
  ) {
    return 'IN_PERSON';
  }
  if (haystack.includes('video')) return 'VIDEO';
  if (/(^|[^a-z])ai([^a-z]|$)/.test(haystack) || haystack.includes('artificial')) return 'AI';
  if (haystack.includes('generic') || haystack.includes('general')) return 'GENERIC';

  return null;
};

export const resolveCatalogItemRoundType = (
  item: Pick<SmsTemplateCatalogItem, 'roundType' | 'templateKey' | 'name' | 'description'>
): string | null =>
  normalizeRoundType(item.roundType) ??
  inferRoundTypeFromText(item.templateKey, item.name, item.description ?? undefined);

/** Build Round Type dropdown options from the catalog response (client-side). */
export const buildRoundOptionsFromCatalog = (
  templates: SmsTemplateCatalogItem[]
): SmsRoundOption[] => {
  const unique = new Map<string, SmsRoundOption>();

  templates.forEach((item) => {
    const round = resolveCatalogItemRoundType(item);
    if (!round || unique.has(round)) return;
    unique.set(round, {
      value: round,
      label: formatRoundLabel(item.roundType || round),
    });
  });

  return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label));
};

/** Frontend-only filter — backend catalog returns all templates for the company. */
export const filterTemplatesByRoundType = (
  templates: SmsTemplateCatalogItem[],
  selectedRound: string | null | undefined
): SmsTemplateCatalogItem[] => {
  const selected = normalizeRoundType(selectedRound);
  if (!selected) return [];

  return templates.filter((item) => resolveCatalogItemRoundType(item) === selected);
};

const normalizeCatalogItem = (
  raw: Record<string, unknown>,
  inheritedRoundType?: string | null
): SmsTemplateCatalogItem | null => {
  // Catalog API uses `templateCode` (e.g. "ai-interview-reminder").
  const templateKey = String(
    raw.templateCode ?? raw.templateKey ?? raw.templateId ?? raw.key ?? raw.alias ?? raw.id ?? ''
  ).trim();
  if (!templateKey) return null;

  const name =
    (raw.templateName as string | undefined) ||
    (raw.name as string | undefined) ||
    (raw.displayName as string | undefined) ||
    (raw.label as string | undefined) ||
    templateKey;

  const description = (raw.description as string | null | undefined) ?? null;

  const explicitRound =
    normalizeRoundType(raw.roundType) ??
    normalizeRoundType(raw.round) ??
    normalizeRoundType(raw.roundName) ??
    normalizeRoundType(inheritedRoundType);

  const roundType =
    explicitRound ??
    inferRoundTypeFromText(
      templateKey,
      name,
      description ?? undefined,
      typeof raw.alias === 'string' ? raw.alias : undefined
    );

  const allowedPlaceholders = Array.isArray(raw.allowedPlaceholders)
    ? (raw.allowedPlaceholders as string[])
    : undefined;

  return {
    templateKey,
    name,
    description,
    roundType,
    locale: (raw.locale as string | null | undefined) ?? null,
    isCustomized:
      typeof raw.isCustomized === 'boolean'
        ? raw.isCustomized
        : typeof raw.customized === 'boolean'
          ? raw.customized
          : typeof raw.usingDefault === 'boolean'
            ? !raw.usingDefault
            : typeof raw.isDefault === 'boolean'
              ? !raw.isDefault
              : false,
    currentContent: typeof raw.currentContent === 'string' ? raw.currentContent : undefined,
    defaultContent:
      typeof raw.defaultContent === 'string'
        ? raw.defaultContent
        : ((raw.defaultContent as null) ?? null),
    maxLength: typeof raw.maxLength === 'number' ? raw.maxLength : undefined,
    allowedPlaceholders,
  };
};

const flattenCatalogEntries = (
  entries: unknown[],
  inheritedRoundType?: string | null
): SmsTemplateCatalogItem[] => {
  const items: SmsTemplateCatalogItem[] = [];

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const raw = entry as Record<string, unknown>;

    // Grouped shape: { roundType: "AI", templates: [...] }
    if (Array.isArray(raw.templates)) {
      const groupRound =
        normalizeRoundType(raw.roundType) ??
        normalizeRoundType(raw.round) ??
        normalizeRoundType(inheritedRoundType);
      items.push(...flattenCatalogEntries(raw.templates, groupRound));
      return;
    }

    const normalized = normalizeCatalogItem(raw, inheritedRoundType);
    if (normalized) items.push(normalized);
  });

  return items;
};

const normalizeCatalogList = (
  raw: SmsTemplateCatalogApiResponse | SmsTemplateCatalogItem[] | Record<string, unknown>
): SmsTemplateCatalogItem[] => {
  if (Array.isArray(raw)) {
    return flattenCatalogEntries(raw);
  }

  if (!raw || typeof raw !== 'object') return [];

  const root = raw as Record<string, unknown>;
  const data =
    'data' in root && root.data != null
      ? root.data
      : Array.isArray(root.content)
        ? root.content
        : Array.isArray(root.items)
          ? root.items
          : Array.isArray(root.templates)
            ? root.templates
            : root;

  if (Array.isArray(data)) {
    return flattenCatalogEntries(data);
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    const nestedList =
      (Array.isArray(record.templates) && record.templates) ||
      (Array.isArray(record.content) && record.content) ||
      (Array.isArray(record.items) && record.items) ||
      (Array.isArray(record.catalog) && record.catalog) ||
      (Array.isArray(record.result) && record.result) ||
      null;

    if (nestedList) {
      return flattenCatalogEntries(nestedList);
    }

    // Map shape: { AI: [...], VIDEO: [...] }
    const fromMap: SmsTemplateCatalogItem[] = [];
    Object.entries(record).forEach(([key, value]) => {
      if (!Array.isArray(value)) return;
      fromMap.push(...flattenCatalogEntries(value, normalizeRoundType(key)));
    });
    if (fromMap.length > 0) return fromMap;
  }

  return [];
};

const normalizeDetails = (
  raw: SmsTemplateDetailsApiResponse | SmsTemplateDetails
): SmsTemplateDetails => {
  const payload =
    raw && typeof raw === 'object' && 'data' in raw && raw.data
      ? raw.data
      : (raw as SmsTemplateDetails & SmsTemplateDetailsApiResponse);

  const currentContent = payload.currentContent ?? '';
  const defaultContent = payload.defaultContent ?? null;
  const isCustomized =
    typeof payload.isCustomized === 'boolean'
      ? payload.isCustomized
      : Boolean(defaultContent && currentContent !== defaultContent);

  const templateKey =
    payload.templateKey || (payload as SmsTemplateDetailsApiResponse).templateCode || '';

  const name =
    payload.name || (payload as SmsTemplateDetailsApiResponse).templateName || templateKey;

  const allowedPlaceholders =
    (payload as SmsTemplateDetailsApiResponse).allowedPlaceholders ??
    payload.placeholders ??
    payload.allowedPlaceholders;

  return {
    templateKey,
    name,
    currentContent,
    defaultContent,
    isCustomized,
    roundType: normalizeRoundType(payload.roundType) ?? null,
    maxLength: payload.maxLength,
    allowedPlaceholders,
    placeholders: allowedPlaceholders,
  };
};

/**
 * Round options for the Round Type dropdown.
 * Currently returns shared defaults so the control stays enabled for all roles
 * (including non-Master Super Admin). Swap the body for a real RTK query when
 * the rounds endpoint ships — keep this hook signature unchanged.
 *
 * Future endpoint (example):
 *   GET /job-opening/sms/templates/rounds?companyId={companyId}
 */
export const useGetSmsRoundOptionsQuery = (
  _args: { companyId: number } | void,
  options?: { skip?: boolean }
): {
  data: SmsRoundOption[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
} => ({
  data: options?.skip ? [] : DEFAULT_SMS_ROUND_OPTIONS,
  isLoading: false,
  isFetching: false,
  isError: false,
});

/* ─────────────────────────────── Endpoints ──────────────────────────── */

const smsTemplatesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getSmsTemplateCatalog: build.query<SmsTemplateCatalogItem[], string>({
      query: (companyId) => ({
        url: '/job-opening/sms/templates/catalog',
        method: 'GET',
        params: { companyId },
      }),
      transformResponse: (raw: SmsTemplateCatalogApiResponse | SmsTemplateCatalogItem[]) =>
        normalizeCatalogList(raw),
      providesTags: (_result, _error, companyId) => [{ type: 'SmsTemplateCatalog', id: companyId }],
    }),

    getSmsTemplateDetails: build.query<
      SmsTemplateDetails,
      { templateKey: string; companyId: string }
    >({
      query: ({ templateKey, companyId }) => ({
        url: `/job-opening/sms/templates/catalog/${encodeURIComponent(templateKey)}`,
        method: 'GET',
        params: { companyId },
      }),
      transformResponse: (raw: SmsTemplateDetailsApiResponse | SmsTemplateDetails) =>
        normalizeDetails(raw),
      providesTags: (_result, _error, { templateKey, companyId }) => [
        { type: 'SmsTemplateCatalog', id: `${companyId}-${templateKey}` },
      ],
    }),

    saveSmsTemplate: build.mutation<SmsTemplateMutationResponse, SaveSmsTemplateRequest>({
      query: ({ templateKey, companyId, content }) => ({
        url: `/job-opening/sms/templates/catalog/${encodeURIComponent(templateKey)}`,
        method: 'PUT',
        params: { companyId },
        body: { content },
      }),
      invalidatesTags: (_result, _error, { templateKey, companyId }) => [
        { type: 'SmsTemplateCatalog', id: companyId },
        { type: 'SmsTemplateCatalog', id: `${companyId}-${templateKey}` },
      ],
    }),

    revertSmsTemplate: build.mutation<SmsTemplateDetails, RevertSmsTemplateRequest>({
      query: ({ templateKey, companyId }) => ({
        url: `/job-opening/sms/templates/catalog/${encodeURIComponent(templateKey)}/revert`,
        method: 'POST',
        params: { companyId },
        body: '',
      }),
      transformResponse: (
        raw: SmsTemplateMutationResponse | SmsTemplateDetailsApiResponse | SmsTemplateDetails
      ) => normalizeDetails(raw),
      invalidatesTags: (_result, _error, { templateKey, companyId }) => [
        { type: 'SmsTemplateCatalog', id: companyId },
        { type: 'SmsTemplateCatalog', id: `${companyId}-${templateKey}` },
      ],
    }),
  }),
});

export const {
  useGetSmsTemplateCatalogQuery,
  useGetSmsTemplateDetailsQuery,
  useLazyGetSmsTemplateDetailsQuery,
  useSaveSmsTemplateMutation,
  useRevertSmsTemplateMutation,
} = smsTemplatesApi;
