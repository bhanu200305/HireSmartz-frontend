import { useEffect, useState } from 'react';

const getMatch = (query: string): boolean =>
  typeof window !== 'undefined' && 'matchMedia' in window
    ? window.matchMedia(query).matches
    : false;

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => getMatch(query));

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;

    const mediaQueryList = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQueryList.matches);

    handleChange();
    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};
