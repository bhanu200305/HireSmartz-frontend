export const formatPhoneNumber = (phone: string) => {
  if (!phone) return '';

  const paddedPhone = phone.padStart(10, '0');

  const firstPart = paddedPhone.slice(0, 5);
  const secondPart = paddedPhone.slice(5, 10);

  return `${firstPart}-${secondPart}`;
};
