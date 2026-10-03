import type { PortfolioProject } from '@himan/shared/career';

// Same Simple Icons CDN as the skills grid; the label still reads if it fails.
const STORES = [
  { key: 'androidUrl', label: 'Android', icon: 'https://cdn.simpleicons.org/android/white' },
  { key: 'iosUrl', label: 'iOS', icon: 'https://cdn.simpleicons.org/apple/white' },
] as const;

export const StoreLinks = ({ project, className = '' }: { project: PortfolioProject; className?: string }) => {
  const links = STORES.flatMap((store) => (project[store.key] ? [{ ...store, href: project[store.key]! }] : []));
  if (links.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map(({ key, label, icon, href }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--pf-line-strong)] bg-black/40 px-4 text-sm font-bold text-white transition-colors hover:border-[var(--pf-sky)] hover:bg-[var(--pf-sky)]/15"
        >
          <img src={icon} alt="" className="size-4" loading="lazy" />
          {label}
          <span className="sr-only">app for {project.name}</span>
        </a>
      ))}
    </div>
  );
};
