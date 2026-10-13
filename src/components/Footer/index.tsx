import dayjs from 'dayjs';

const Footer = ({ className }: { className?: string }) => {
  const currentYear = dayjs().year();
  return (
    <footer
      className={`w-full py-2 flex flex-col items-center justify-center border-t border-neutral-100 ${className}`}
    >
      <p className="text-xs text-neutral-400 text-center">
        Copyright ©{currentYear} HireSmartz. All Rights Reserved. (Version 1.5)
      </p>
      <p className="text-xs text-neutral-400 text-center mt-1.5">
        For any assistance or inquiries, please contact our support team at{' '}
        <span className="font-medium text-neutral-500">support@hiresmartz.com</span>
      </p>
    </footer>
  );
};

export default Footer;
