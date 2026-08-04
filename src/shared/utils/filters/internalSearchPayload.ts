export type InternalGlobalSearchRequestDto = {
  text: string;
  field: string;
};

export const buildInternalGlobalSearchRequestDto = (
  text: string,
  field?: string
): InternalGlobalSearchRequestDto => ({
  text,
  field: field ?? '',
});
