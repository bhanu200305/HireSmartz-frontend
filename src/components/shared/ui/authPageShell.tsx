import { ReactNode } from 'react';
import Footer from '../../Footer';

/**
 * The full-bleed gradient card shell shared by every unauthenticated,
 * token-in-the-URL auth screen (reset-password, verify-email) — lifted out
 * of Login/AcceptInvitation's copy of the same markup so a third one didn't
 * mean a third hand-copy of this background.
 */
export const AuthPageShell = ({ children }: { children: ReactNode }) => (
  <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden font-['DM Sans'] bg-gradient-to-br from-[#2c47a3] via-[#3f5bc4] to-[#6fc3e0] px-4 py-12">
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.15]"
      style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
    <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#7dd8ee]/30 blur-3xl" />
    <div className="pointer-events-none absolute top-1/4 -right-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-28 -right-24 h-[26rem] w-[26rem] rounded-full bg-[#182a72]/30 blur-3xl" />
    <div className="login-card-pop relative z-10 w-full max-w-sm rounded-3xl bg-white px-8 py-9 shadow-2xl ring-1 ring-black/5">
      <div className="mb-6 flex flex-col items-center">
        <img src="/cfpLogo.svg" alt="CareerForce Pro" className="h-10 w-auto object-contain" />
        <span className="ai-recruitment-text mt-2 text-[11px] tracking-widest">
          AI POWERED RECRUITMENT SOLUTIONS
        </span>
      </div>
      {children}
    </div>
    <Footer className="relative z-10 mt-8 shrink-0 text-white/70" />
  </div>
);
