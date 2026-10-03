import { ArrowUp } from 'lucide-react';

export interface PortfolioSection {
  label: string;
  href: string;
}

export const PortfolioNavigation = ({ sections }: { sections: PortfolioSection[] }) => (
  <nav aria-label="Portfolio sections" className="hidden min-w-0 max-w-full items-center gap-1 overflow-x-auto py-1 sm:flex">
    {sections.map(({ label, href }) => (
      <a key={href} href={href} className="pf-label inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[var(--pf-muted)] transition-colors hover:bg-white/5 hover:text-white">
        {label}
      </a>
    ))}
  </nav>
);

export const PortfolioBackToTop = () => (
  <a href="#top" aria-label="Back to top" className="pf-back-to-top fixed bottom-6 right-4 z-30 inline-flex size-12 items-center justify-center rounded-full border border-[var(--pf-line-strong)] bg-[var(--pf-ink-soft)] text-[var(--pf-sky-hi)] shadow-lg transition-colors hover:border-[var(--pf-sky)] hover:bg-[var(--pf-navy)] sm:right-6">
    <ArrowUp className="size-5" aria-hidden />
  </a>
);
