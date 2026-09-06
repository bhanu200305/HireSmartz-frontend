// Scrolls to and focuses the first field (in visual order) that has a
// validation error, so the user doesn't have to hunt across a long form.
export function scrollToFirstFormError(
  errors: Record<string, unknown>,
  fieldOrder: string[]
): void {
  const firstErrorField = fieldOrder.find((name) => errors[name]);
  if (!firstErrorField) return;

  const element = document.getElementById(`field-${firstErrorField}`);
  if (!element) return;

  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusable = element.querySelector<HTMLElement>(
    'input, textarea, select, [tabindex], .ant-select-selector'
  );
  focusable?.focus();
}
