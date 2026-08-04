import { useEffect, useCallback, useState } from 'react';
import { UseFormReturn, FieldValues, Path } from 'react-hook-form';

export const useSecondaryContact = <T extends FieldValues>(formMethods: {
  watch: UseFormReturn<T>['watch'];
  trigger: UseFormReturn<T>['trigger'];
  setValue: UseFormReturn<T>['setValue'];
  formState: UseFormReturn<T>['formState'];
}) => {
  const {
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = formMethods;

  const [
    firstNameSecondary,
    lastNameSecondary,
    phoneSecondary,
    emailSecondary,
    countryCodeSecondary,
  ] = watch([
    'firstNameSecondary' as Path<T>,
    'lastNameSecondary' as Path<T>,
    'phoneSecondary' as Path<T>,
    'emailSecondary' as Path<T>,
    'countryCodeSecondary' as Path<T>,
  ]);

  const [hasSecondaryContact, setHasSecondaryContact] = useState(false);

  const checkSecondaryContact = useCallback(() => {
    const hasContact = !!(
      firstNameSecondary?.trim() ||
      lastNameSecondary?.trim() ||
      phoneSecondary?.trim() ||
      emailSecondary?.trim()
    );

    if (hasContact !== hasSecondaryContact) {
      setHasSecondaryContact(hasContact);

      if (!hasContact) {
        setTimeout(() => {
          trigger([
            'firstNameSecondary' as Path<T>,
            'lastNameSecondary' as Path<T>,
            'phoneSecondary' as Path<T>,
            'emailSecondary' as Path<T>,
            'countryCodeSecondary' as Path<T>,
            'roleIdSecondary' as Path<T>,
          ]);
        }, 0);
      }
    }

    return hasContact;
  }, [
    firstNameSecondary,
    lastNameSecondary,
    phoneSecondary,
    emailSecondary,
    countryCodeSecondary,
    hasSecondaryContact,
    trigger,
  ]);

  useEffect(() => {
    const shouldValidate = checkSecondaryContact();

    if (shouldValidate) {
      const timeoutId = setTimeout(() => {
        trigger([
          'firstNameSecondary' as Path<T>,
          'lastNameSecondary' as Path<T>,
          'phoneSecondary' as Path<T>,
          'emailSecondary' as Path<T>,
          'countryCodeSecondary' as Path<T>,
          'roleIdSecondary' as Path<T>,
        ]);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [
    firstNameSecondary,
    lastNameSecondary,
    phoneSecondary,
    emailSecondary,
    countryCodeSecondary,
    trigger,
    checkSecondaryContact,
  ]);

  const getSecondaryFieldError = (field: Path<T>): string | undefined => {
    if (!hasSecondaryContact) return undefined;
    return errors[field]?.message as string | undefined;
  };

  return {
    hasSecondaryContact,
    getSecondaryFieldError,
    secondaryFields: {
      firstName: firstNameSecondary || '',
      lastName: lastNameSecondary || '',
      phone: phoneSecondary || '',
      email: emailSecondary || '',
    },
  };
};
