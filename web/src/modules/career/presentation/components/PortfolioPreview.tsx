import { EyeOff } from 'lucide-react';

interface PortfolioPreviewProps {
  // Null while the portfolio is off.
  url: string | null;
  // Changes whenever the item is saved, so the frame reloads with new settings.
  version: number;
}

// The public page itself, framed like a browser window. Desktop only: on a
// phone the panel's Open button does the same job without a cramped frame.
export const PortfolioPreview = ({ url, version }: PortfolioPreviewProps) => (
  <div className="hidden min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:block">
    <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
      <div className="flex gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
      </div>
      <p className="min-w-0 flex-1 truncate rounded-md bg-background px-3 py-1 text-center text-xs text-muted-foreground">
        {url ? `${window.location.host}${url}` : 'Portfolio is off'}
      </p>
    </div>
    {url ? (
      <iframe key={version} src={url} title="Portfolio preview" loading="lazy" className="block h-[44rem] w-full bg-[#031942]" />
    ) : (
      <div className="flex h-[44rem] flex-col items-center justify-center gap-3 bg-background/60 px-6 text-center">
        <EyeOff className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Your portfolio is off</p>
        <p className="max-w-xs text-sm leading-6 text-muted-foreground">Turn on the public link to preview what recruiters see.</p>
      </div>
    )}
  </div>
);
