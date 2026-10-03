import { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { ArrowUpRight, Trophy } from 'lucide-react';
import { deviceOf, parseMetric, type PortfolioProject } from '@himan/shared/career';
import { SectionHeading } from './SectionHeading';
import { DeviceFrame } from './DeviceFrame';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const MAX_SHOTS = 4;

// Counts a leading quantity up once it scrolls in; ranks and words
// render as written.
const Metric = ({ value }: { value: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const reduce = useReducedMotion();
  const parsed = parseMetric(value);
  const [shown, setShown] = useState(parsed && !reduce ? `${parsed.prefix}0${parsed.suffix}` : value);

  useEffect(() => {
    if (!parsed || reduce || !inView) return;
    const controls = animate(0, parsed.value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => setShown(`${parsed.prefix}${n.toFixed(parsed.decimals)}${parsed.suffix}`),
    });
    return () => controls.stop();
    // parsed is derived from value; depending on value keeps this stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className="pf-tabular" aria-label={value}>
      {shown}
    </span>
  );
};

const metricOf = (project: PortfolioProject) => project.proofMetric ?? (project.url ? 'Live' : 'Shipped');

// The story column, shared by both layouts.
const ProofStory = ({ project }: { project: PortfolioProject }) => {
  const attribution = [project.name, project.category].filter(Boolean).join(' · ');
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <p className="pf-display break-words text-[clamp(3.25rem,9vw,6rem)] leading-[0.85] text-white">
          <Metric value={metricOf(project)} />
        </p>
        {project.proofLabel && <p className="pf-label max-w-[18ch] pb-2 text-[var(--pf-sky)]">{project.proofLabel}</p>}
      </div>
      <h3 className="text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold leading-[1.05] [font-variation-settings:'wdth'_112] [text-wrap:balance]">
        {project.outcome ?? project.name}
      </h3>
      {project.description && <p className="max-w-[55ch] text-lg text-[var(--pf-muted)]">{project.description}</p>}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--pf-line)] pt-6">
        <p className="pf-label text-white/80">{attribution}</p>
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--pf-sky)] transition-colors hover:text-white"
          >
            See it live
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        )}
      </div>
    </div>
  );
};

// Stacked → fanned. Card 0 ends in front on the left; the rest fan right
// and recede. Offsets are % of the card's own width, so the fan scales
// with the frame on every screen size.
const fanned = (i: number) => ({ x: -58 + i * 42, y: i * 3, rotate: -7 + i * 5, scale: 1 - i * 0.07 });
const stacked = (i: number) => ({ x: i * 6, y: i * -2, rotate: 0, scale: 1 - i * 0.04 });
const FAN_RANGE = [0.08, 0.55];

const FanCard = ({
  index,
  count,
  progress,
  children,
}: {
  index: number;
  count: number;
  progress: MotionValue<number>;
  children: React.ReactNode;
}) => {
  const from = stacked(index);
  const to = fanned(index);
  const x = useTransform(progress, FAN_RANGE, [`${from.x}%`, `${to.x}%`]);
  const y = useTransform(progress, FAN_RANGE, [`${from.y}%`, `${to.y}%`]);
  const rotate = useTransform(progress, FAN_RANGE, [from.rotate, to.rotate]);
  const scale = useTransform(progress, FAN_RANGE, [from.scale, to.scale]);

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: count - index }}>
      <motion.div style={{ x, y, rotate, scale }}>{children}</motion.div>
    </div>
  );
};

// Pinned while the visitor scrolls ~1.6 screens: the story holds still on
// the left while the screenshots fan out from a stack on the right, and
// the proof badge lands last. Mirrors the reference's "Proof, Not Promises".
const ProofScroll = ({ project }: { project: PortfolioProject }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const badgeOpacity = useTransform(scrollYProgress, [0.45, 0.6], [0, 1]);
  const badgeY = useTransform(scrollYProgress, [0.45, 0.6], [24, 0]);
  const glow = useTransform(scrollYProgress, [0.2, 0.6], [0.2, 1]);

  const device = deviceOf(project);
  const shots = project.images.slice(0, MAX_SHOTS);
  const frameWidth = device === 'phone' ? 'w-[9.5rem] sm:w-[12rem] lg:w-[14.5rem]' : 'w-[15rem] sm:w-[20rem] lg:w-[26rem]';

  return (
    <div ref={ref} className="relative h-[260vh]" data-testid="proof-scroll">
      <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="max-lg:hidden">
            <ProofStory project={project} />
          </div>

          <div className="relative h-[60dvh] min-h-[22rem] lg:h-[72dvh]">
            <motion.div
              className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--pf-sky)]/25 blur-[110px]"
              style={{ opacity: glow }}
              aria-hidden
            />
            {shots.map((src, i) => (
              <FanCard key={src} index={i} count={shots.length} progress={scrollYProgress}>
                <DeviceFrame device={device} image={src} label={project.name} url={project.url} className={frameWidth} />
              </FanCard>
            ))}
            <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center">
              <motion.div
                className="flex items-center gap-3 rounded-2xl border border-[var(--pf-sky)]/40 bg-[var(--pf-navy)]/90 px-5 py-3 shadow-[0_20px_40px_-20px_rgb(0_0_0_/_0.8)]"
                style={{ opacity: badgeOpacity, y: badgeY }}
              >
                <Trophy className="h-5 w-5 text-[var(--pf-sky)]" aria-hidden />
                <span className="flex flex-col leading-tight">
                  <span className="pf-display text-lg">{metricOf(project)}</span>
                  <span className="pf-label text-[var(--pf-muted)]">Proof, not promises</span>
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Without screenshots there is nothing to fan out, so the proof stays a
// single card.
const ProofCard = ({ project }: { project: PortfolioProject }) => (
  <motion.article
    className="relative overflow-hidden rounded-[2rem] bg-[var(--pf-navy)] p-8 shadow-[0_30px_80px_-30px_rgb(14_165_233_/_0.35)] md:p-12"
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.8, ease: EASE_OUT }}
  >
    <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[var(--pf-sky)]/25 blur-[90px]" aria-hidden />
    <div className="relative">
      <ProofStory project={project} />
    </div>
  </motion.article>
);

export const ProofSection = ({ project }: { project: PortfolioProject }) => {
  const hasShots = project.images.length > 0;
  return (
    <section id="highlights" aria-labelledby="proof-title" className="scroll-mt-24 pt-24 md:pt-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <SectionHeading id="proof-title" lead="Enough about method." accent="Here's the proof." />
        {/* Small screens read the story first; the fan then pins below it. */}
        {hasShots && (
          <div className="lg:hidden">
            <ProofStory project={project} />
          </div>
        )}
        {!hasShots && (
          <div className="pb-24 md:pb-32">
            <ProofCard project={project} />
          </div>
        )}
      </div>
      {hasShots && <ProofScroll project={project} />}
    </section>
  );
};
