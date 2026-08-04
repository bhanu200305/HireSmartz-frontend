import React from 'react';
import { findAllMatches } from '../../../shared/utils/methods';

interface HighlightTextProps {
  text: string;
  highlight: string;
  highlightClassName?: string;
}

const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  highlight,
  highlightClassName = 'bg-yellow-300',
}) => {
  const textStr = text?.toString() || '';
  const highlightStr = highlight?.toString().trim() || '';

  if (!textStr || !highlightStr) {
    return <span>{textStr}</span>;
  }

  const matches = findAllMatches(textStr, highlightStr);

  if (!matches || matches.length === 0) {
    return <span>{textStr}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    if (match.start > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{textStr.substring(lastIndex, match.start)}</span>
      );
    }
    parts.push(
      <mark key={`highlight-${match.start}`} className={highlightClassName}>
        {textStr.substring(match.start, match.end)}
      </mark>
    );
    lastIndex = match.end;
  }

  if (lastIndex < textStr.length) {
    parts.push(<span key={`text-${lastIndex}`}>{textStr.substring(lastIndex)}</span>);
  }

  return <span>{parts}</span>;
};

export default HighlightText;
