import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { isFramable, pickHeroProject, sanitizePortfolio, type PortfolioData } from '@himan/shared/career';
import { CareerPortfolioRepository } from '../../infrastructure';
import { PortfolioSplash } from './PortfolioSplash';
import { PortfolioHero } from './PortfolioHero';
import { ProofSection } from './ProofSection';
import { BrowserShowcase } from './BrowserShowcase';
import { BuildGrid } from './BuildGrid';
import { ExperienceList, SkillsMarquee, ContactFooter } from './CareerSections';
import './portfolio.css';

const repo = new CareerPortfolioRepository();

// Once per tab per link, and never under reduced motion — a recruiter
// re-opening the tab should land straight on the work.
const splashKey = (token: string) => `himan-pf-seen:${token}`;

function shouldShowSplash(token: string): boolean {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return sessionStorage.getItem(splashKey(token)) !== 'seen';
  } catch {
    return true;
  }
}

// A shared-by-link page: keep it out of search results and set a title
// that reads well in a browser tab or a recruiter's history.
const usePageMeta = (data: PortfolioData | null | undefined) => {
  useEffect(() => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  useEffect(() => {
    if (!data) return;
    const previous = document.title;
    document.title = [data.profile.fullName, data.itemName].filter(Boolean).join(' — ');
    return () => {
      document.title = previous;
    };
  }, [data]);
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="pf flex min-h-dvh items-center justify-center bg-[var(--pf-navy)] px-6">{children}</div>
);

const Unavailable = ({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) => (
  <Shell>
    <div className="flex max-w-xl flex-col gap-6">
      <span className="h-[3px] w-16 bg-[var(--pf-sky)]" aria-hidden />
      <h1 className="pf-display text-[clamp(2rem,7vw,3.5rem)]">{title}</h1>
      <p className="text-lg text-[var(--pf-muted)]">{body}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-12 w-fit cursor-pointer items-center rounded-full bg-[var(--pf-sky)] px-7 text-sm font-bold uppercase tracking-[0.12em] text-[var(--pf-ink)] transition-colors hover:bg-white"
        >
          Try again
        </button>
      )}
    </div>
  </Shell>
);

const PortfolioPage = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [splash] = useState(() => shouldShowSplash(token));

  // Marked in an effect, not the state initializer: StrictMode runs
  // initializers twice and the second read would already say "seen".
  useEffect(() => {
    if (!splash) return;
    try {
      sessionStorage.setItem(splashKey(token), 'seen');
    } catch {
      // Private mode: it just shows again next time.
    }
  }, [splash, token]);
  const [lifted, setLifted] = useState(!splash);
  const handleLift = useCallback(() => setLifted(true), []);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['career-portfolio', token],
    queryFn: async () => {
      const raw = await repo.getByToken(token);
      return raw && sanitizePortfolio(raw);
    },
    staleTime: Infinity,
    retry: 1,
    enabled: !!token,
  });

  usePageMeta(data);

  // Same navy as the splash, so a slow fetch reads as the intro's first
  // frame rather than a blank page.
  if (isPending) {
    return (
      <Shell>
        <span className="sr-only" role="status">Loading portfolio</span>
        {!splash && <span className="h-[3px] w-16 animate-pulse bg-[var(--pf-sky)]" aria-hidden />}
      </Shell>
    );
  }

  if (isError) {
    return (
      <Unavailable
        title="Couldn't load this."
        body="The portfolio didn't come through — usually a dropped connection."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return (
      <Unavailable
        title="This link is off."
        body="The portfolio behind this link was turned off or replaced with a newer one. Ask for a fresh link."
      />
    );
  }

  const hero = pickHeroProject(data.projects);
  const live = data.projects.filter((p) => isFramable(p.url, window.location.origin));
  // Hero entrance waits for the splash to start lifting.
  const heroDelay = splash && !lifted ? 1.95 : 0.1;

  return (
    <MotionConfig reducedMotion="user">
      <div className="pf pf-scroll overflow-x-clip">
        {splash && (
          <PortfolioSplash
            name={data.profile.fullName ?? data.itemName}
            tagline={data.profile.headline}
            onLift={handleLift}
          />
        )}

        <a
          href="#work"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-40 focus:rounded-full focus:bg-[var(--pf-sky)] focus:px-4 focus:py-2 focus:text-[var(--pf-ink)]"
        >
          Skip to the work
        </a>

        <header className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 sm:px-8">
          <span className="pf-label text-white">{data.profile.fullName}</span>
          <nav aria-label="Sections" className="flex gap-1">
            {[
              ['Work', '#work'],
              ['Contact', '#contact'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="pf-label inline-flex min-h-11 items-center rounded-full px-4 text-[var(--pf-muted)] transition-colors hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>

        <main>
          <PortfolioHero data={data} delay={heroDelay} />
          {hero && <ProofSection project={hero} />}
          {live.length > 0 && <BrowserShowcase projects={live} />}
          {data.projects.length > 0 && <BuildGrid projects={data.projects} />}
          {data.skills.length > 0 && <SkillsMarquee skills={data.skills} />}
          {data.experiences.length > 0 && <ExperienceList experiences={data.experiences} />}
        </main>

        <ContactFooter data={data} />
      </div>
    </MotionConfig>
  );
};

export default PortfolioPage;
