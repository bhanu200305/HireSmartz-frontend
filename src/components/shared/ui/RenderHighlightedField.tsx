type HighlightFilters = {
  searchQuery?: string;
  text?: string;
  globalSearchRequestDto?: {
    text?: string;
  };
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getHighlightTerms = (filters?: HighlightFilters): string[] => {
  const internalQuery = (filters?.searchQuery || filters?.text || '').trim();
  const globalQuery = filters?.globalSearchRequestDto?.text?.trim() || '';

  return Array.from(new Set([globalQuery, internalQuery].filter(Boolean)));
};

const renderTextWithTerms = (text: string, terms: string[]) => {
  const escapedTerms = terms.map(escapeRegExp).sort((a, b) => b.length - a.length);

  if (!escapedTerms.length) {
    return <span>{text}</span>;
  }

  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.filter(Boolean).map((part, index) =>
        regex.test(part) ? (
          <mark key={`highlight-${index}`} className="bg-yellow-300 text-black px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={`text-${index}`}>{part}</span>
        )
      )}
    </span>
  );
};

const renderHighlightedField = (text: string, _fieldName: string, filters?: HighlightFilters) => {
  const highlightTerms = getHighlightTerms(filters);

  if (!highlightTerms.length || !text) {
    return <span>{text}</span>;
  }

  return renderTextWithTerms(text.toString(), highlightTerms);
};

export default renderHighlightedField;
