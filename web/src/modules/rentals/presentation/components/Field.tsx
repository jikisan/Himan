import type { InputHTMLAttributes, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@core/presentation/utils';

export function Field({ id, label, hint, className, children }: {
  id: string; label: string; hint?: string; className?: string; children: ReactNode;
}) {
  return <div className={cn('space-y-1.5', className)}>
    {/* A long label and its hint wrap as units: the hint drops below instead of both breaking mid-phrase. */}
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
      <Label htmlFor={id}>{label}</Label>
      {hint && <span className="whitespace-nowrap text-xs text-muted-foreground">{hint}</span>}
    </div>
    {children}
  </div>;
}

/** A titled group of a long form, e.g. the tenant's details: `large` for the tenant's own phone screens. */
export function FieldGroup({ title, hint, large, children }: { title: string; hint?: string; large?: boolean; children: ReactNode }) {
  return <fieldset className="space-y-4">
    <legend className={cn('mb-4 font-semibold', large ? 'text-lg' : 'text-base')}>
      {title}{hint && <span className="ml-2 text-sm font-normal text-muted-foreground">{hint}</span>}</legend>
    {children}
  </fieldset>;
}

/** Titled group inside a form; keeps related fields together and separates the groups. */
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="space-y-3">
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{children}</div>
  </section>;
}

export function MoneyInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <div className="relative">
    <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">₱</span>
    <input inputMode="decimal" className={cn(inputClass, 'pl-7 tabular-nums', className)} {...props} />
  </div>;
}

/** Sticky footer; must be the last thing in the dialog, which drops its bottom padding (pb-0). `start` sits on the left (e.g. a destructive action). */
export function FormActions({ submit, onCancel, start }: { submit: string; onCancel: () => void; start?: ReactNode }) {
  return <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center justify-end gap-2 border-t bg-card px-6 py-4">
    {start && <div className="mr-auto">{start}</div>}
    <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onCancel}>Cancel</Button>
    <Button type="submit" className="h-11 sm:h-9">{submit}</Button>
  </div>;
}

export const inputClass = 'h-11 w-full rounded-lg border border-input bg-background px-3 text-base shadow-sm transition-colors '
  + 'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
  + '[&[readonly]]:bg-muted/50 [&[readonly]]:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:text-sm';

/** Native file picker drawn like the outline buttons. Add `file:h-12 text-base` on the tenant's big screens. */
export const fileInputClass = 'block w-full text-sm text-muted-foreground file:mr-3 file:h-10 file:cursor-pointer file:rounded-lg file:border '
  + 'file:border-input file:bg-background file:px-4 file:text-sm file:font-medium file:text-foreground file:transition-colors hover:file:bg-muted '
  + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60';
