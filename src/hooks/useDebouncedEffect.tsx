import { useEffect, useRef } from 'react';

export const useDebouncedEffect = (
  effect: () => void,
  deps: React.DependencyList,
  delay: number
) => {
  const callback = useRef(effect);

  useEffect(() => {
    callback.current = effect;
  }, [effect]);

  useEffect(() => {
    const handler = setTimeout(() => {
      callback.current();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [...deps, delay]);
};
