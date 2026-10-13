import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { LuMenu, LuX } from 'react-icons/lu';

const NAV_LINKS = [
  { label: 'Solutions', href: '/#solutions' },
  { label: 'Why CFP?', href: '/#why-cfp' },
  { label: 'Resources', href: '/#resources' },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={clsx(
        'fixed top-0 z-50 w-full transition-all duration-300',
        scrolled ? 'bg-white/90 shadow-sm backdrop-blur-md' : 'bg-transparent'
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/">
          <img
            src="/netsmartz-logo.png"
            alt="HireSmartz"
            className="h-8 w-auto object-contain sm:h-9"
          />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-primary-600"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-600"
          >
            Login
          </Link>
          <Link
            to="/book-demo"
            className="rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md"
          >
            Book a Demo
          </Link>
        </div>

        {/* Mobile-only header pair — the hero section's own standalone "Book
            a Demo" CTA is visible with zero taps, so a mobile visitor who
            actually wants to log in shouldn't need two (open the menu, then
            find Login) to reach the one entry point that isn't repeated
            anywhere else on the page. Kept alongside the hamburger's own
            copy of this link below, same as "Book a Demo" already appears
            both here and in the hero. */}
        <div className="flex items-center gap-4 md:hidden">
          <Link
            to="/login"
            className="text-sm font-semibold text-neutral-700 hover:text-primary-600"
          >
            Login
          </Link>
          <button
            className="cursor-pointer text-2xl text-neutral-700"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <LuX /> : <LuMenu />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-neutral-100 bg-white px-5 py-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-neutral-100 pt-3">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-center text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Login
            </Link>
            <Link
              to="/book-demo"
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-primary-600 px-3 py-2.5 text-center text-sm font-semibold text-white"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
