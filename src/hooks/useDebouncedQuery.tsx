import { useState } from 'react';
import { useDebouncedEffect } from './useDebouncedEffect';

type Props = {
  options: Record<string, any>;
  state: Record<string, any>;
  delay: number;
  skip: boolean;
  rtkQueryHook: any;
  dependencyArrayKeys?: string[];
};

type DebouncedQueryReturn = {
  data: any;
  error: any;
  isLoading: boolean;
  refetch: () => void;
  options: Record<string, any>;
  state: Record<string, any>;
};

export const useDebouncedQuery = <Return = DebouncedQueryReturn,>({
  options,
  skip,
  state,
  delay,
  rtkQueryHook,
  dependencyArrayKeys = [],
}: Props) => {
  const props = {
    options,
    skip,
    state,
    delay,
    rtkQueryHook,
    dependencyArrayKeys,
  };
  const [debouncedOptions, setDebouncedOptions] = useState(options);
  const [debouncedState, setDebouncedState] = useState(state);
  const [debouncedSkip, setDebouncedSkip] = useState(skip);

  const { data, error, isLoading, refetch } = rtkQueryHook(
    { ...debouncedOptions },
    {
      skip: debouncedSkip,
    }
  );

  const depndencyArray =
    dependencyArrayKeys.map((key) => {
      const [Key, value] = key.split('_');
      return (props as any)[Key][value];
    }) || [];

  useDebouncedEffect(
    () => {
      setDebouncedOptions(options);
      setDebouncedState(state);
      setDebouncedSkip(skip);
    },
    depndencyArray,
    delay
  );

  return {
    data,
    error,
    isLoading,
    refetch,
    options: debouncedOptions,
    state: debouncedState,
  } as Return;
};
