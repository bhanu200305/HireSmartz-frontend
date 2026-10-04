/** Variant text from the database `variant_labels`, else the capitalised code. */
export const resolveVariantLabel = (
  variant: string,
  overrides?: Record<string, string> | null
): string => {
  const code = variant.toLowerCase();
  return (
    overrides?.[code] ??
    `${code
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1))} Round`
  );
};
