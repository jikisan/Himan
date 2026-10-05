import { useState, type ReactNode } from 'react';
import { MotionConfig, motion } from 'motion/react';
import {
  ArrowUpRight, FlaskConical, Globe, Layers, Mail, Plug, Rocket, Sparkles, Workflow, Zap, type LucideIcon,
} from 'lucide-react';
import { yearSpan, type PortfolioData, type PortfolioExperience } from '@himan/shared/career';
import { SectionHeading } from './SectionHeading';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const PortfolioMotion = ({ children }: { children: ReactNode }) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);

const experienceYears = (exp: PortfolioExperience) =>
  yearSpan(exp.startDate, exp.isCurrent ? null : exp.endDate) ?? '';

export const ExperienceList = ({ experiences }: { experiences: PortfolioExperience[] }) => (
  <section id="experience" aria-labelledby="exp-title" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-8 md:py-32">
    <SectionHeading id="exp-title" lead="Where the work" accent="happened." />
    <ol className="border-t border-[var(--pf-line)]">
      {experiences.map((exp, i) => (
        <motion.li
          key={exp.id}
          className="grid gap-2 border-b border-[var(--pf-line)] py-7 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-10"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: Math.min(i, 4) * 0.05, ease: EASE_OUT }}
        >
          <p className="pf-tabular pt-1 text-sm font-semibold text-[var(--pf-faint)]">{experienceYears(exp)}</p>
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-bold leading-snug [font-variation-settings:'wdth'_110]">
              {exp.title} <span className="text-[var(--pf-sky)]">· {exp.company}</span>
            </h3>
            {exp.summary && <p className="max-w-[65ch] text-[var(--pf-muted)]">{exp.summary}</p>}
          </div>
        </motion.li>
      ))}
    </ol>
  </section>
);

// Devicon names that differ from the Simple Icons slug.
const DEVICON_NAMES: Record<string, string> = { java: 'java', css: 'css3', junit: 'junit' };

// Simple Icons slugs for names that don't normalize to their slug.
const ICON_SLUGS: Record<string, string> = {
  java: 'openjdk',
  html: 'html5',
  junit: 'junit5',
  nodejs: 'nodedotjs',
  nextjs: 'nextdotjs',
  postgres: 'postgresql',
  claudecode: 'claude',
  gitgithub: 'github',
  gitlabci: 'gitlab',
  reactnative: 'react',
  kotlincomposemultiplatform: 'kotlin',
  swiftui: 'swift',
  appstoredeployment: 'appstore',
  playstoredeployment: 'googleplay',
};

// Concept skills have no brand mark; pick a generic glyph by keyword.
const CONCEPT_ICONS: [RegExp, LucideIcon][] = [
  [/architect|mvvm|inject|pattern/i, Layers],
  [/test|\bqa\b/i, FlaskConical],
  [/agile|scrum|kanban/i, Workflow],
  [/\bapis?\b|\brest\b/i, Plug],
  [/automat|ghl/i, Zap],
  [/deploy|publish|release/i, Rocket],
  [/host|web/i, Globe],
];

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

// Full-color logo: Devicon first (multi-color originals), then Simple
// Icons in its brand color, then a generic glyph. Logos sit on a white
// tile because many brand marks are dark and vanish on navy.
const SkillIcon = ({ name }: { name: string }) => {
  const key = normalize(name);
  const concept = CONCEPT_ICONS.find(([re]) => re.test(name))?.[1];
  const slug = ICON_SLUGS[key] ?? (concept ? null : key);
  const devicon = DEVICON_NAMES[key] ?? slug;
  const sources = slug
    ? [`https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${devicon}/${devicon}-original.svg`, `https://cdn.simpleicons.org/${slug}`]
    : [];
  const [attempt, setAttempt] = useState(0);
  const Icon = concept ?? Sparkles;

  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white">
      {attempt < sources.length ? (
        <img
          src={sources[attempt]}
          alt=""
          width={18}
          height={18}
          loading="lazy"
          className="h-[18px] w-[18px] object-contain"
          onError={() => setAttempt((n) => n + 1)}
        />
      ) : (
        <Icon className="h-4 w-4 text-[var(--pf-navy)]" aria-hidden />
      )}
    </span>
  );
};

export const SkillsGrid = ({ skills }: { skills: string[] }) => (
  <section id="skills" aria-labelledby="skills-title" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-8 md:py-32">
    <SectionHeading id="skills-title" lead="The toolkit" accent="behind it." />
    <ul className="flex flex-wrap gap-3">
      {skills.map((skill, i) => (
        <motion.li
          key={skill}
          className="flex items-center gap-2.5 rounded-full border border-[var(--pf-line)] bg-[var(--pf-navy)]/50 py-1.5 pl-1.5 pr-4 text-sm font-medium text-white/90 transition-colors hover:border-[var(--pf-sky)]/60"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.4, delay: Math.min(i, 20) * 0.02, ease: EASE_OUT }}
        >
          <SkillIcon name={skill} />
          {skill}
        </motion.li>
      ))}
    </ul>
  </section>
);

const prettyLinkName = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

export const ContactFooter = ({ data }: { data: PortfolioData }) => {
  const { profile } = data;
  const links = [
    ...(profile.website ? [['Website', profile.website] as const] : []),
    ...Object.entries(profile.links).filter(([, url]) => !!url).map(([k, url]) => [prettyLinkName(k), url] as const),
  ];

  return (
    <footer id="contact" className="relative isolate overflow-hidden scroll-mt-24">
      <div
        className="absolute -bottom-48 left-1/2 -z-10 h-[32rem] w-[48rem] -translate-x-1/2 rounded-full bg-[var(--pf-sky)]/15 blur-[140px]"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-24 sm:px-8 md:py-32">
        <motion.h2
          className="pf-display text-[clamp(2.75rem,10vw,6rem)]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        >
          Let's <span className="text-[var(--pf-sky)]">talk.</span>
        </motion.h2>

        {profile.email ? (
          <a
            href={`mailto:${profile.email}`}
            className="group inline-flex w-fit items-center gap-3 break-all text-[clamp(1.25rem,3.5vw,2rem)] font-bold text-white underline decoration-[var(--pf-sky)] decoration-2 transition-colors hover:text-[var(--pf-sky)]"
          >
            <Mail className="h-6 w-6 shrink-0 text-[var(--pf-sky)]" aria-hidden />
            {profile.email}
          </a>
        ) : (
          <p className="max-w-[55ch] text-lg text-[var(--pf-muted)]">
            Reply through the application this link came with — I read every one.
          </p>
        )}

        {links.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {links.map(([label, url]) => (
              <li key={label}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--pf-line-strong)] px-5 text-sm font-bold uppercase tracking-[0.12em] transition-colors hover:border-white hover:bg-white hover:text-[var(--pf-ink)]"
                >
                  {label}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className="border-t border-[var(--pf-line)] pt-8 text-sm text-[var(--pf-faint)]">
          {profile.fullName} · {data.itemName}
        </p>
      </div>
    </footer>
  );
};
