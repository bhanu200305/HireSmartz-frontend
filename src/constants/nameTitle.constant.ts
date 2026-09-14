/**
 * Common name-prefix / courtesy-title options for the `title` field on a
 * user's profile — organization-service's `title: str | None = Field(...,
 * max_length=20)`, stored as a plain name component right alongside
 * `first_name`/`middle_name`/`last_name`. This is a salutation like "Mr" or
 * "Dr", not this person's job title — that's `designation_id`/role elsewhere.
 *
 * The backend has no enum for this (free text, so nothing here is a hard
 * constraint) — this list is only the curated set of options the dropdown
 * offers. See `NameTitleSelect` for how a value outside this list (typed
 * before the dropdown existed, or something this list doesn't cover) is
 * preserved rather than hidden.
 */
export const NAME_TITLE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Mr', value: 'Mr' },
  { label: 'Mrs', value: 'Mrs' },
  { label: 'Ms', value: 'Ms' },
  { label: 'Miss', value: 'Miss' },
  { label: 'Mx', value: 'Mx' },
  { label: 'Dr', value: 'Dr' },
  { label: 'Prof', value: 'Prof' },
  { label: 'Rev', value: 'Rev' },
  { label: 'Hon', value: 'Hon' },
];
