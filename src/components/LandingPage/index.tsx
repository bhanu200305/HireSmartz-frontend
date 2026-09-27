import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  LuFileText,
  LuListOrdered,
  LuCalendarClock,
  LuMic,
  LuUsers,
  LuBadgeCheck,
  LuShieldCheck,
  LuSparkles,
  LuLock,
  LuGem,
  LuClock,
  LuEye,
  LuArrowRight,
  LuCheck,
} from 'react-icons/lu';
import { useInView } from './useInView';
import Navbar from './Navbar';
import Footer from './Footer';
import './landingPage.css';

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

const Reveal = ({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) => {
  const { ref, isInView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={clsx('lp-reveal', isInView && 'lp-visible', className)}
      style={{ transitionDelay: isInView ? `${delayMs}ms` : '0ms' }}
    >
      {children}
    </div>
  );
};

const StatCounter = ({
  target,
  suffix = '%',
  label,
}: {
  target: number;
  suffix?: string;
  label: string;
}) => {
  const { ref, isInView } = useInView<HTMLDivElement>(0.5);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1400;
    const start = performance.now();

    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInView, target]);

  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-4xl font-extrabold text-primary-600 sm:text-5xl">
        {value}
        {suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-neutral-500 sm:text-base">{label}</p>
    </div>
  );
};

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: 'light' | 'dark';
  badge?: string;
};

const FeatureCard = ({ icon, title, description, tone = 'light', badge }: FeatureCardProps) => (
  <div
    className={clsx(
      'group relative flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1',
      tone === 'light'
        ? 'border-neutral-100 bg-white hover:border-accent-300 hover:shadow-lg'
        : 'border-white/10 bg-white/[0.06] backdrop-blur-sm hover:bg-white/[0.1]'
    )}
  >
    {badge && (
      <span className="absolute top-4 right-4 rounded-full bg-accent-400 px-2 py-0.5 text-xs font-bold tracking-wide text-white">
        {badge}
      </span>
    )}
    <div
      className={clsx(
        'flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform duration-300 group-hover:scale-110',
        tone === 'light' ? 'bg-primary-50 text-primary-600' : 'bg-white/10 text-accent-400'
      )}
    >
      {icon}
    </div>
    <div>
      <h3
        className={clsx(
          'font-display text-lg font-bold',
          tone === 'light' ? 'text-neutral-900' : 'text-white'
        )}
      >
        {title}
      </h3>
      <p
        className={clsx(
          'mt-1.5 text-sm leading-relaxed',
          tone === 'light' ? 'text-neutral-500' : 'text-white/70'
        )}
      >
        {description}
      </p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Page sections
// ---------------------------------------------------------------------------

const HeroMockup = () => {
  const bars = [40, 70, 55, 90, 65];
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="lp-blob absolute -top-10 -left-10 h-56 w-56 rounded-full bg-accent-400/30 blur-3xl" />
      <div
        className="lp-blob absolute -right-8 -bottom-10 h-64 w-64 rounded-full bg-primary-600/20 blur-3xl"
        style={{ animationDelay: '1.5s' }}
      />

      <div className="lp-float relative rounded-3xl border border-white/60 bg-white/90 p-5 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
          <span className="ml-auto text-xs font-medium text-neutral-400">Hiring Overview</span>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl bg-[#eef2ff] px-3 py-2.5">
            <p className="font-display text-lg font-bold text-primary-600">128</p>
            <p className="text-xs font-medium text-neutral-500">Candidates</p>
          </div>
          <div className="rounded-xl bg-[#ecf7fb] px-3 py-2.5">
            <p className="font-display text-lg font-bold text-accent-500">42</p>
            <p className="text-xs font-medium text-neutral-500">Interviews</p>
          </div>
          <div className="rounded-xl bg-[#f9fafc] px-3 py-2.5">
            <p className="font-display text-lg font-bold text-neutral-800">93%</p>
            <p className="text-xs font-medium text-neutral-500">Match Score</p>
          </div>
        </div>

        <div className="flex h-24 items-end gap-2 rounded-xl bg-neutral-50/70 p-3">
          {bars.map((h, i) => (
            <div
              key={i}
              className="lp-bar-grow flex-1 rounded-t-md bg-gradient-to-t from-primary-600 to-accent-400"
              style={{ height: `${h}%`, animationDelay: `${i * 90 + 200}ms` }}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-accent-100 bg-accent-50 px-3 py-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-400 text-white">
            <LuCheck className="text-xs" />
          </span>
          <p className="text-xs font-medium text-neutral-700">
            Top candidate shortlisted automatically
          </p>
        </div>
      </div>
    </div>
  );
};

const Hero = () => (
  <section className="relative overflow-hidden bg-gradient-to-b from-[#eef2ff] via-[#f9fafc] to-white pt-32 pb-20 sm:pt-40 sm:pb-28">
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage: 'radial-gradient(rgba(38,61,146,0.12) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }}
    />
    <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
      <Reveal>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3.5 py-1.5 text-xs font-bold tracking-widest text-accent-600 uppercase">
          <LuSparkles /> Next-Gen Recruiting
        </span>
        <h1 className="font-display mt-5 text-4xl leading-[1.1] font-extrabold text-neutral-900 sm:text-5xl lg:text-[3.4rem]">
          Simplify Hiring,
          <br />
          <span className="lp-gradient-text">Elevate Your Team</span>
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-neutral-500 sm:text-lg">
          Transform manual, inconsistent hiring into a scalable, data-driven workflow with our
          AI-powered Talent Acquisition platform, from job descriptions to offer, all in one place.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/book-demo"
            className="group inline-flex items-center gap-2 rounded-full bg-primary-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-xl"
          >
            Book a Demo
            <LuArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </Reveal>

      <Reveal delayMs={150}>
        <HeroMockup />
      </Reveal>
    </div>
  </section>
);

const STATS = [
  { target: 93, label: 'More qualified candidates identified' },
  { target: 30, label: 'Reduction in cost-per-hire' },
  { target: 96, label: 'Hours saved every week on screening' },
];

const StatsBar = () => (
  <section className="relative mx-auto -mt-10 max-w-6xl px-5 sm:px-8">
    <Reveal>
      <div className="grid grid-cols-1 gap-6 rounded-3xl border border-neutral-100 bg-white p-8 shadow-xl shadow-primary-900/5 sm:grid-cols-3 sm:p-10">
        {STATS.map((stat) => (
          <StatCounter key={stat.label} target={stat.target} label={stat.label} />
        ))}
      </div>
    </Reveal>
  </section>
);

const TALENT_SEARCH = [
  {
    icon: <LuFileText />,
    title: 'Job Description Generation',
    description:
      'Generate high-converting, SEO-optimized, and bias-free job descriptions in seconds based on your role requirements.',
  },
  {
    icon: <LuListOrdered />,
    title: 'Resume Ranker',
    description:
      'Automatically parses and scores resumes based on skill match, experience, and potential, surfacing the best fits instantly.',
  },
];

const TALENT_ENGAGEMENT = [
  {
    icon: <LuCalendarClock />,
    title: 'Auto Scheduler',
    description:
      'Real-time calendar sync for seamless interview booking between candidates and hiring teams.',
  },
  {
    icon: <LuMic />,
    title: 'AI Audio Interviews',
    description:
      'Autonomous voice interviews that screen candidates at scale while maintaining a human touch.',
    badge: 'NEW',
  },
  {
    icon: <LuUsers />,
    title: 'Multi-member Video Panels',
    description:
      'Collaborative panel interviews with shared notes, real-time feedback, and synced scorecards.',
  },
];

const TALENT_EVALUATION = [
  {
    icon: <LuBadgeCheck />,
    title: 'Candidate Evaluation',
    description:
      'AI analyzes interview recordings and notes to provide an objective, data-backed summary of candidate strengths.',
  },
  {
    icon: <LuShieldCheck />,
    title: 'Bias & Compliance QC',
    description:
      'Every stage of the pipeline is monitored to surface and eliminate bias before it reaches a decision.',
  },
];

const FeaturesSection = () => (
  <section id="solutions" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
    <Reveal className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-bold tracking-widest text-accent-600 uppercase">
        What we do
      </span>
      <h2 className="font-display mt-3 text-3xl font-extrabold text-neutral-900 sm:text-4xl">
        Eliminate Hiring Headaches
      </h2>
      <p className="mt-4 text-base text-neutral-500 sm:text-lg">
        Reclaim your peace of mind with AI tools that take the stress out of high-volume hiring,
        from job postings to offer letters.
      </p>
    </Reveal>

    <Reveal delayMs={100} className="mt-14">
      <p className="mb-5 text-sm font-bold tracking-wide text-neutral-400 uppercase">
        Talent Search
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {TALENT_SEARCH.map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </Reveal>

    <Reveal
      delayMs={150}
      className="mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 p-8 sm:p-10"
    >
      <p className="mb-5 text-sm font-bold tracking-wide text-accent-300 uppercase">
        Talent Engagement
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {TALENT_ENGAGEMENT.map((f) => (
          <FeatureCard key={f.title} {...f} tone="dark" />
        ))}
      </div>
    </Reveal>

    <Reveal delayMs={200} className="mt-10">
      <p className="mb-5 text-sm font-bold tracking-wide text-neutral-400 uppercase">
        Talent Evaluation
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {TALENT_EVALUATION.map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </Reveal>
  </section>
);

const RANKING_POINTS = [
  'Contextual skill assessment beyond keywords',
  'Automated ranking against your ideal candidate profile',
  'Eliminates initial screening bias',
];

const RankingSpotlight = () => (
  <section className="mx-auto max-w-7xl px-5 sm:px-8">
    <Reveal className="grid grid-cols-1 items-center gap-10 overflow-hidden rounded-3xl bg-neutral-950 p-8 sm:p-12 lg:grid-cols-2 lg:gap-16">
      <div className="order-2 lg:order-1">
        <div className="lp-float-slow rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="space-y-2.5">
            {[
              { name: 'Priya Sharma', score: 96 },
              { name: 'Alex Chen', score: 91 },
              { name: 'Jordan Lee', score: 84 },
            ].map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3"
              >
                <span className="text-sm font-medium text-white/90">{c.name}</span>
                <span className="rounded-full bg-accent-400/20 px-2.5 py-1 text-xs font-bold text-accent-300">
                  {c.score}% match
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="order-1 lg:order-2">
        <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
          Resume Scoring &amp; <span className="text-accent-400">Stack Ranking</span>
        </h2>
        <p className="mt-4 text-white/60">
          Our AI engine reads beyond keywords; it understands context, career progression, and skill
          depth to instantly rank thousands of applicants.
        </p>
        <ul className="mt-6 space-y-3">
          {RANKING_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm text-white/80">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-400/20 text-accent-400">
                <LuCheck className="text-xs" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  </section>
);

const WHY_CFP = [
  {
    icon: <LuSparkles />,
    title: 'Simplicity',
    description: 'Keep every stage of hiring in one intuitive workspace.',
  },
  {
    icon: <LuLock />,
    title: 'Security',
    description: '24/7 automated monitoring by dedicated engineering teams.',
  },
  {
    icon: <LuGem />,
    title: 'Quality',
    description: '99.9% guaranteed platform uptime, backed by a formal SLA.',
  },
  {
    icon: <LuClock />,
    title: 'Dependability',
    description: 'Proactive maintenance with advance notice, always.',
  },
  {
    icon: <LuEye />,
    title: 'Transparency',
    description: 'Clear, root-cause reporting on any incident, every time.',
  },
];

const WhyCfp = () => (
  <section id="why-cfp" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
    <Reveal className="text-center">
      <h2 className="font-display text-3xl font-extrabold text-neutral-900 sm:text-4xl">
        Why Careerforce Pro
      </h2>
      <p className="mt-3 text-neutral-500">
        Deep, dependable, and built to scale with your hiring needs.
      </p>
    </Reveal>
    <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-5">
      {WHY_CFP.map((item, i) => (
        <Reveal
          key={item.title}
          delayMs={i * 80}
          className="flex flex-col items-center text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ecf7fb] text-2xl text-accent-500">
            {item.icon}
          </div>
          <p className="mt-3 text-sm font-bold text-neutral-900">{item.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">{item.description}</p>
        </Reveal>
      ))}
    </div>
  </section>
);

const CtaBanner = () => (
  <section id="resources" className="mx-auto max-w-7xl px-5 sm:px-8">
    <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-accent-500 px-8 py-16 text-center sm:px-16">
      <div className="lp-blob absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div
        className="lp-blob absolute -right-16 -bottom-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        style={{ animationDelay: '2s' }}
      />
      <h2 className="font-display relative text-3xl font-extrabold text-white sm:text-4xl">
        Stay Ahead of the Curve with AI-Powered Hiring
      </h2>
      <p className="relative mx-auto mt-4 max-w-xl text-white/80">
        Enable consistency and confidence while embracing the future of hiring with Careerforce Pro.
      </p>
      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/book-demo"
          className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-primary-700 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
        >
          Book a Demo
          <LuArrowRight />
        </Link>
      </div>
    </Reveal>
  </section>
);

// ---------------------------------------------------------------------------

const LandingPage = () => {
  const scrolledRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (scrolledRef.current) {
      return;
    }
    scrolledRef.current = true;

    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [location.hash]);

  return (
    <div className="font-sans min-h-screen w-full bg-white">
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <FeaturesSection />
        <RankingSpotlight />
        <WhyCfp />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
