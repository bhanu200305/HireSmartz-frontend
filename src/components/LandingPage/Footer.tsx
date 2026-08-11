const FOOTER_COLUMNS = [
  { title: 'Product', links: ['Solutions', 'Why CFP?', 'News'] },
  { title: 'Support', links: ['Help Center', 'Contact'] },
  { title: 'Legal', links: ['Privacy', 'Accessibility', 'Terms of Service'] },
];

const Footer = () => (
  <footer className="bg-neutral-950 px-5 pt-16 pb-8 text-white sm:px-8">
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <img src="/white-logo.svg" alt="CareerForce Pro" className="h-8 w-auto object-contain" />
        <p className="mt-4 max-w-xs text-sm text-white/50">
          Transform your manual, inconsistent hiring process into a scalable, data-driven workflow
          with our AI-powered Talent Acquisition platform.
        </p>
      </div>
      {FOOTER_COLUMNS.map((col) => (
        <div key={col.title}>
          <p className="text-sm font-bold text-white">{col.title}</p>
          <ul className="mt-4 space-y-2.5">
            {col.links.map((link) => (
              <li key={link}>
                <span className="cursor-pointer text-sm text-white/50 transition-colors hover:text-accent-400">
                  {link}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
      <p>© {new Date().getFullYear()} CareerForce Pro Inc. All rights reserved.</p>
      <p>support@careerforcepro.com</p>
    </div>
  </footer>
);

export default Footer;
