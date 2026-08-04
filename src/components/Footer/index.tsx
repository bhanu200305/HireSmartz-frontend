import dayjs from 'dayjs';

const Footer = ({ className }: { className?: string }) => {
  const currentYear = dayjs().year();
  return (
    <footer className={`w-full py-4 flex flex-col items-center justify-center ${className}`}>
      <p className="text-sm text-center">
        Copyright ©{currentYear} careerforce pro. All Rights Reserved. (Version 1.5)
      </p>
      <p className="text-sm text-muted-foreground text-center mt-2">
        For any assistance or inquiries, please contact our support team at{' '}
        <span className="font-semibold">support@careerforcepro.com</span>
      </p>
      {/* <p className="mt-2"></p> */}
    </footer>
  );
};

export default Footer;
