import { hostOf } from '@himan/shared/career';

interface DeviceFrameProps {
  device: 'phone' | 'browser';
  image: string | null;
  label: string;
  url?: string | null;
  className?: string;
}

// A screenshot inside the chrome of the thing it came from. No image means
// a quiet placeholder with the build's name, never a broken <img>.
export const DeviceFrame = ({ device, image, label, url, className = '' }: DeviceFrameProps) => {
  const screen = image ? (
    <img src={image} alt={`${label} screenshot`} loading="lazy" draggable={false} className="h-full w-full object-cover object-top" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-[var(--pf-ink-soft)] p-4 text-center">
      <span className="pf-display text-lg text-white/20">{label}</span>
    </div>
  );

  if (device === 'phone') {
    return (
      <div
        className={`relative aspect-[9/19.5] overflow-hidden rounded-[2.2rem] border-[6px] border-[#0b0f17] bg-black shadow-[0_40px_80px_-30px_rgb(0_0_0_/_0.9)] ring-1 ring-white/15 ${className}`}
      >
        {screen}
        <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden />
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--pf-line-strong)] bg-[var(--pf-ink)] shadow-[0_40px_80px_-30px_rgb(0_0_0_/_0.9)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-[var(--pf-line)] bg-[var(--pf-ink-soft)] px-3 py-2">
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
        </span>
        <span className="truncate text-[10px] text-[var(--pf-faint)]">{url ? hostOf(url) : label}</span>
      </div>
      <div className="aspect-[16/10]">{screen}</div>
    </div>
  );
};
