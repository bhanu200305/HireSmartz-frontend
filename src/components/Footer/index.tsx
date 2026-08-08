import dayjs from 'dayjs';

const Footer = ({ className }: { className?: string }) => {
  const currentYear = dayjs().year();
  return (
    <footer
      className={`w-full py-5 flex flex-col items-center justify-center border-t border-neutral-100 ${className}`}
    >
      <p className="text-xs text-neutral-400 text-center">
        Copyright ©{currentYear} careerforce pro. All Rights Reserved. (Version 1.5)
      </p>
      <p className="text-xs text-neutral-400 text-center mt-1.5">
        For any assistance or inquiries, please contact our support team at{' '}
        <span className="font-medium text-neutral-500">support@careerforcepro.com</span>
      </p>
    </footer>
  );
};

export default Footer;
