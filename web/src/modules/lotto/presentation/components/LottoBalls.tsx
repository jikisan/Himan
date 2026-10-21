import { cn } from '@core/presentation/utils';

/** The numbers as balls. Highlighted ones (the ones you matched) are filled. */
export function LottoBalls({ numbers, highlight, size = 'md', label = 'Numbers' }: {
  numbers: number[]; highlight?: number[]; size?: 'sm' | 'md'; label?: string;
}) {
  const hit = new Set(highlight);
  return <ol aria-label={`${label}: ${numbers.join(', ')}`} className={cn('flex flex-wrap', size === 'sm' ? 'gap-1.5' : 'gap-2')}>
    {numbers.map((n) => <li key={n} aria-hidden="true" className={cn(
      'flex items-center justify-center rounded-full border font-semibold tabular-nums',
      size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base',
      hit.has(n) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border bg-background text-foreground')}>
      {String(n).padStart(2, '0')}</li>)}
  </ol>;
}
