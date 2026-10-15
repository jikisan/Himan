import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return <div className="space-y-2">
    <Label htmlFor={id}>{label}{hint && <span className="text-muted-foreground"> ({hint})</span>}</Label>
    {children}
  </div>;
}

export const inputClass = 'h-11 w-full rounded-xl border border-input bg-background px-3 text-base';
