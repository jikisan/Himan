import type { ReactNode } from 'react';
import { cn } from '@core/presentation/utils';

interface SettingsSectionProps {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
}

/** A titled group of rows, iOS-settings style: label above, rows in one rounded box, note below. */
export const SettingsSection = ({ title, footer, children }: SettingsSectionProps) => (
  <section aria-label={title} className="space-y-2">
    {title && (
      <h2 className="px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    )}
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">{children}</div>
    {footer && <div className="px-4 text-xs text-muted-foreground">{footer}</div>}
  </section>
);

interface SettingsRowProps {
  label: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

/** One line in a section: label (and optional hint) on the left, value or control on the right. */
export const SettingsRow = ({ label, description, children, className }: SettingsRowProps) => (
  <div className={cn('flex min-h-12 items-center justify-between gap-4 px-4 py-3', className)}>
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    {children !== undefined && <div className="flex min-w-0 shrink items-center gap-2 text-sm">{children}</div>}
  </div>
);
