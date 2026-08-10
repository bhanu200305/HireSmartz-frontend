import { z } from 'zod';
import { nameValidation } from '../../../shared/utils/validation/input.helpers';
import { Authorities } from '../../../constants/authorities.constant';

export const locationPermissionSchema = z.object({
  locationId: z.number(),
  locationName: z.string().optional(),
  permissions: z.array(z.nativeEnum(Authorities)),
});

const roleFormSchema = z.object({
  roleName: nameValidation({ label: 'Role name', required: true }),
  permissions: z.array(z.nativeEnum(Authorities)).min(1, 'Select at least one permission.'),
  locationPermissions: z.array(locationPermissionSchema),
});

export default roleFormSchema;
export type RoleFormValues = z.infer<typeof roleFormSchema>;
