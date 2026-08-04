import { Authorities, ROLE_AUTHORITIES } from '../../../constants/authorities.constant';
import { convertToCamelCase } from '../methods';

export const hasFeatureAccess = (
  feature: 'user' | 'company' | 'job_opening' | 'dashboard' | 'job_configuration',
  action: 'create' | 'view' | 'edit' | 'archive' | 'resend',
  role: {
    name: string;
    type: string;
  },
  _authorities: string[] = []
): boolean => {
  const authority = `${feature}_${action}`;
  // get authority enum from authorities constant
  const requiredAuthority = Authorities[authority.toUpperCase() as keyof typeof Authorities];
  const allowedAuthorities = ROLE_AUTHORITIES[role?.type]?.[convertToCamelCase(role?.name)] || [];

  return allowedAuthorities.includes(requiredAuthority);
};
