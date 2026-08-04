import { useGetFeatureFlagsQuery } from '../api/authentication-service/FeatureFlags/index';
import type { FeatureFlags } from '../api/authentication-service/FeatureFlags/index';

/**
 * Returns the boolean value of a backend-driven feature flag.
 *
 * Defaults to `false` while the flags are loading so hidden features
 * stay hidden until the API confirms they should be shown.
 *
 * @example
 * const isEmailTemplateEnabled = useFeatureFlag('emailTemplateConfig');
 * if (!isEmailTemplateEnabled) return null;
 */
const useFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  const { data: featureFlags } = useGetFeatureFlagsQuery();
  return featureFlags?.[flag] ?? false;
};

export default useFeatureFlag;
