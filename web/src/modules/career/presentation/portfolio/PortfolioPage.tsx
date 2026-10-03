import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { deviceOf, pickHeroProject, sanitizePortfolio, type PortfolioData } from '@himan/shared/career';
import { ProjectMediaService } from '@himan/shared/profile';
import { CareerPortfolioRepository } from '../../infrastructure';
import { PortfolioSplash } from './PortfolioSplash';
import { PortfolioHero } from './PortfolioHero';
import { PortfolioBackToTop, PortfolioNavigation, type PortfolioSection } from './PortfolioNavigation';
import { ProofSection } from './ProofSection';
import { BrowserTabs } from './BrowserTabs';
import { BuildGrid } from './BuildGrid';
import { ExperienceList, SkillsGrid, ContactFooter } from './CareerSections';
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

  const handleLift = useCallback(() => {
    if (!splash) return;
    try {
      sessionStorage.setItem(splashKey(token), 'seen');
    } catch {
      // Private mode: the introduction may show again next time.
    }
  }, [splash, token]);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['career-portfolio', token],
    queryFn: async () => {
      const raw = await repo.getByToken(token);
      if (!raw) return null;
      const clean = sanitizePortfolio(raw);
      // Stored paths → public URLs in the portfolio-media bucket.
      return {
        ...clean,
        projects: clean.projects.map((p) => ({ ...p, images: (p.images ?? []).map(ProjectMediaService.publicUrl) })),
      };
    },
    staleTime: 0,
    retry: 1,
    enabled: !!token,
  });

  usePageMeta(data);

  if (isPending) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="pf pf-scroll overflow-x-clip">
          <PortfolioSplash key="intro" name={null} tagline={null} ready={false} intro={splash} onLift={handleLift} />
        </div>
      </MotionConfig>
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
  // Websites, dashboards and automations get browser tabs; native-only apps
  // live in the proof fan and the build cards instead.
  const web = data.projects.filter((p) => deviceOf(p) === 'browser' && (p.images.length > 0 || !!p.url));
  const portraitUrl = data.portraitPath ? ProjectMediaService.publicUrl(data.portraitPath) : null;
  const sections: PortfolioSection[] = [
    { label: 'About', href: '#about' },
    ...(hero ? [{ label: 'Highlights', href: '#highlights' }] : []),
    ...(web.length ? [{ label: 'Live projects', href: '#live' }] : []),
    ...(data.projects.length ? [{ label: 'Work', href: '#work' }] : []),
    ...(data.skills.length ? [{ label: 'Skills', href: '#skills' }] : []),
    ...(data.experiences.length ? [{ label: 'Experience', href: '#experience' }] : []),
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div id="top" className="pf pf-scroll overflow-x-clip">
        <PortfolioSplash
          key="intro"
          name={data.profile.fullName ?? data.itemName}
          tagline={data.profile.headline}
          portraitUrl={portraitUrl}
          ready
          intro={splash}
          onLift={handleLift}
        />

        <a
          href={data.projects.length ? '#work' : '#about'}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-40 focus:rounded-full focus:bg-[var(--pf-sky)] focus:px-4 focus:py-2 focus:text-[var(--pf-ink)]"
        >
          Skip to portfolio content
        </a>

        <header className="sticky top-0 z-40 border-b border-[var(--pf-line)] bg-[var(--pf-ink)]/90 backdrop-blur-md">
          <div className="mx-auto flex min-h-[4.5rem] max-w-6xl flex-col justify-center gap-1 px-4 py-3 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-0">
            <span className="pf-label min-w-0 truncate text-white lg:max-w-56 lg:shrink-0">{data.profile.fullName}</span>
            <PortfolioNavigation sections={sections} />
          </div>
        </header>

        <main>
          <PortfolioHero data={data} delay={0.1} portraitUrl={portraitUrl} />
          {hero && <ProofSection project={hero} />}
          {web.length > 0 && <BrowserTabs projects={web} />}
          {data.projects.length > 0 && <BuildGrid projects={data.projects} />}
          {data.skills.length > 0 && <SkillsGrid skills={data.skills} />}
          {data.experiences.length > 0 && <ExperienceList experiences={data.experiences} />}
        </main>

        <ContactFooter data={data} />
        <PortfolioBackToTop />
      </div>
    </MotionConfig>
  );
};

export default PortfolioPage;
