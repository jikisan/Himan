import { motion } from 'motion/react';
import { ArrowUpRight, Mail } from 'lucide-react';
import { yearSpan, type PortfolioData, type PortfolioExperience } from '@himan/shared/career';
import { SectionHeading } from './SectionHeading';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const experienceYears = (exp: PortfolioExperience) =>
  yearSpan(exp.startDate, exp.isCurrent ? null : exp.endDate) ?? '';

export const ExperienceList = ({ experiences }: { experiences: PortfolioExperience[] }) => (
  <section aria-labelledby="exp-title" className="mx-auto max-w-6xl px-4 py-24 sm:px-8 md:py-32">
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

const MarqueeRow = ({ items, reverse }: { items: string[]; reverse?: boolean }) => (
  <div className="pf-marquee flex overflow-hidden" aria-hidden>
    <div className="pf-marquee-track flex shrink-0 items-center" data-reverse={reverse}>
      {[...items, ...items].map((skill, i) => (
        <span key={`${skill}-${i}`} className="flex items-center">
          <span className="pf-display whitespace-nowrap px-6 text-[clamp(1.5rem,4vw,2.75rem)] text-white/85">{skill}</span>
          <span className="h-2 w-2 rotate-45 bg-[var(--pf-sky)]" />
        </span>
      ))}
    </div>
  </div>
);

export const SkillsMarquee = ({ skills }: { skills: string[] }) => {
  const half = Math.ceil(skills.length / 2);
  return (
    <section aria-label="Skills" className="flex flex-col gap-4 border-y border-[var(--pf-line)] bg-[var(--pf-navy)]/50 py-10">
      <MarqueeRow items={skills.slice(0, half)} />
      {skills.length > 8 && <MarqueeRow items={skills.slice(half)} reverse />}
      {/* The marquee is decorative motion; this is the readable list. */}
      <p className="sr-only">Skills: {skills.join(', ')}</p>
    </section>
  );
};

const prettyLinkName = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

export const ContactFooter = ({ data }: { data: PortfolioData }) => {
  const { profile } = data;
  const links = [
    ...(profile.website ? [['Website', profile.website] as const] : []),
    ...Object.entries(profile.links).filter(([, url]) => !!url).map(([k, url]) => [prettyLinkName(k), url] as const),
  ];

  return (
    <footer id="contact" className="relative isolate overflow-hidden scroll-mt-8">
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
