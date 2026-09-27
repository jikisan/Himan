import { ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Label, Switch } from '@/components/ui';

interface PortfolioSharePanelProps {
  shareToken: string;
  enabled: boolean;
  showEmail: boolean;
  onChange: (dto: { portfolioEnabled?: boolean; portfolioShowEmail?: boolean }) => Promise<unknown>;
}

// The portfolio shows the projects, experience and skills this item's CV
// layout selects — editing the CV layout edits the portfolio too.
export const PortfolioSharePanel = ({ shareToken, enabled, showEmail, onChange }: PortfolioSharePanelProps) => {
  const url = `${window.location.origin}/p/${shareToken}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success('Portfolio link copied');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Portfolio</h3>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <span title={!enabled ? 'Turn the portfolio on first' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy portfolio link" onClick={handleCopy} disabled={!enabled}>
              <Link2 className="h-4 w-4" />
            </Button>
          </span>
          <span title={!enabled ? 'Turn the portfolio on first' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Open portfolio" disabled={!enabled} asChild={enabled}>
              {enabled ? (
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
            </Button>
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="portfolio-enabled">Public portfolio link</Label>
            <p className="text-xs text-muted-foreground">
              Anyone with the link sees the projects, experience and skills picked in this CV layout. Revoking the CV link
              also retires this link.
            </p>
          </div>
          <Switch
            id="portfolio-enabled"
            checked={enabled}
            onCheckedChange={(checked) => onChange({ portfolioEnabled: checked })}
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="portfolio-email">Show my email</Label>
            <p className="text-xs text-muted-foreground">Your phone number is never shown.</p>
          </div>
          <Switch
            id="portfolio-email"
            checked={showEmail}
            disabled={!enabled}
            onCheckedChange={(checked) => onChange({ portfolioShowEmail: checked })}
          />
        </div>
        {enabled && <p className="truncate rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">{url}</p>}
      </div>
    </div>
  );
};
