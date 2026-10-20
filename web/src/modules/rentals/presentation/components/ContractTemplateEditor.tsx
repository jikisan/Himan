import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CONTRACT_FIELDS, DEFAULT_CLAUSES, clausesSchema } from '@himan/shared/rentals';
import type { Clause, RentalProperty } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import { errorMessage } from '../utils/errorMessage';
import { inputClass } from './Field';
import { SignaturePad } from './SignaturePad';

// Both sit inside the property form: plain buttons, and Enter in a field never submits that form.
const noEnterSubmit = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault(); };
const iconButton = 'size-11 sm:size-8';

/** Owner-only: the clauses every new contract for this property starts from. */
export function ContractTemplateEditor({ propertyId, template, busy, run }: {
  propertyId: string; template: Clause[];
} & Pick<RentalsState, 'busy' | 'run'>) {
  const [clauses, setClauses] = useState(template);
  const fe = useFieldErrors();
  const [confirmReset, setConfirmReset] = useState(false);
  const cursor = useRef<Record<string, number>>({}); // where to insert a field, per clause id
  const clauseId = (id: string) => `template-clause-${id}`;
  // A typed change clears that clause's message; adding, removing, moving or resetting clears them all.
  const update = (next: Clause[], changed?: string) => { setClauses(next); fe.clear(changed); };
  const move = (i: number, to: number) => { const next = [...clauses]; [next[i], next[to]] = [next[to], next[i]]; update(next); };
  const insert = (i: number, key: string) => {
    const { id, text } = clauses[i];
    const at = cursor.current[id] ?? text.length;
    const field = `{{${key}}}`;
    cursor.current[id] = at + field.length;
    update(clauses.map((c, j) => (j === i ? { id, text: text.slice(0, at) + field + text.slice(at) } : c)), clauseId(id));
  };

  return <section aria-labelledby="contract-template" className="space-y-3" onKeyDown={noEnterSubmit}>
    <FormErrorBanner message={fe.formError} />
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h3 id="contract-template" className="text-sm font-semibold">Contract template</h3>
        <p className="text-xs text-muted-foreground">New contracts start from these clauses. Fields in {'{{ }}'} are filled in for each tenant.
          Contracts already made don’t change.</p>
      </div>
      <span className="text-xs font-medium text-muted-foreground" aria-live="polite">{clauses.length} {clauses.length === 1 ? 'clause' : 'clauses'}</span>
    </div>
    <ol className="max-h-[60vh] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">{clauses.map((clause, i) => {
      const n = i + 1;
      return <li key={clause.id} className="space-y-2 rounded-lg border p-3">
        <textarea id={clauseId(clause.id)} aria-label={`Clause ${n}`} className={`${inputClass} h-auto py-2 text-sm`} required
          rows={Math.min(8, Math.ceil(clause.text.length / 60) + 1)} value={clause.text} maxLength={4000} {...fe.invalid(clauseId(clause.id))}
          onSelect={(e) => { cursor.current[clause.id] = e.currentTarget.selectionStart; }}
          onChange={(e) => { cursor.current[clause.id] = e.target.selectionStart ?? e.target.value.length;
            update(clauses.map((c, j) => (j === i ? { ...c, text: e.target.value } : c)), clauseId(clause.id)); }} />
        <FieldError id={clauseId(clause.id)} message={fe.errors[clauseId(clause.id)]} />
        <div className="flex flex-wrap items-center gap-1">
          <select aria-label={`Insert field into clause ${n}`} className={`${inputClass} h-11 w-auto flex-1 sm:h-8`} value=""
            onChange={(e) => { if (e.target.value) insert(i, e.target.value); }}>
            <option value="">Insert field…</option>
            {CONTRACT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <Button type="button" variant="ghost" size="icon" className={iconButton} aria-label={`Move clause ${n} up`} disabled={i === 0}
            onClick={() => move(i, i - 1)}><ArrowUp className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className={iconButton} aria-label={`Move clause ${n} down`} disabled={i === clauses.length - 1}
            onClick={() => move(i, i + 1)}><ArrowDown className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="sm" className="h-11 px-2.5 text-destructive hover:text-destructive sm:h-8" aria-label={`Remove clause ${n}`}
            onClick={() => update(clauses.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" />Remove</Button>
        </div>
      </li>;
    })}</ol>
    <div className="flex flex-wrap justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-11 sm:h-9"
          onClick={() => update([...clauses, { id: `c-${crypto.randomUUID().slice(0, 8)}`, text: '' }])}><Plus className="h-4 w-4" />Add clause</Button>
        <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={() => setConfirmReset(true)}>Reset to default</Button>
      </div>
      <Button type="button" className="h-11 sm:h-9" disabled={busy} onClick={async () => {
        fe.clear();
        const result = clausesSchema.safeParse(clauses);
        if (!result.success) {
          // A clause's own problem goes under it; the clause count (no index in the path) goes in the banner.
          const fields = result.error.issues.flatMap((issue): [string, string][] =>
            typeof issue.path[0] === 'number' ? [[clauseId(clauses[issue.path[0]].id), issue.message]] : []);
          if (fields.length) fe.failMany(fields); else fe.setFormError(result.error.issues[0].message);
          return;
        }
        try { await run({ type: 'saveTemplate', propertyId, clauses: result.data }); toast.success('Contract template saved'); }
        catch (e) { fe.setFormError(errorMessage(e)); }
      }}>Save template</Button>
    </div>
    <ConfirmDialog open={confirmReset} onOpenChange={setConfirmReset} title="Reset to the default contract?" confirmText="Reset"
      description="Your changes to the clauses are replaced by the standard contract. Nothing is saved until you tap Save template."
      onConfirm={() => update(DEFAULT_CLAUSES)} />
  </section>;
}

/** Owner-only: the signature drawn once and used to countersign contracts in one tap. */
export function LessorSignatureEditor({ property, busy, run }: { property: RentalProperty } & Pick<RentalsState, 'busy' | 'run'>) {
  const [drawing, setDrawing] = useState(!property.lessorSignature);
  const [png, setPng] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const fe = useFieldErrors();
  return <section aria-labelledby="my-signature" className="space-y-3" onKeyDown={noEnterSubmit}>
    <FormErrorBanner message={fe.formError} />
    <div>
      <h3 id="my-signature" className="text-sm font-semibold">My signature</h3>
      <p className="text-xs text-muted-foreground">Draw it once. It signs your side of contracts when you tap Countersign.</p>
    </div>
    {drawing ? <>
      <SignaturePad label="Draw your signature" onChange={setPng} disabled={busy} />
      <div className="flex justify-end gap-2">
        {property.lessorSignature && <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={() => setDrawing(false)}>Cancel</Button>}
        <Button type="button" className="h-11 sm:h-9" disabled={busy || !png} onClick={async () => {
          fe.clear();
          try {
            await run({ type: 'saveLessorSignature', propertyId: property.id, png: png! });
            toast.success('Signature saved');
            setDrawing(false);
          } catch (e) { fe.setFormError(errorMessage(e)); }
        }}>Save signature</Button>
      </div>
    </> : <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <img src={property.lessorSignature!} alt="Your saved signature" className="h-16 max-w-[60%] rounded bg-white object-contain" />
      <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => setConfirmReplace(true)}>Replace</Button>
    </div>}
    <ConfirmDialog open={confirmReplace} onOpenChange={setConfirmReplace} title="Replace your signature?" confirmText="Replace signature"
      description="Contracts you already signed keep the old one. New countersignatures use the new one once you save it."
      onConfirm={() => { setPng(null); setDrawing(true); }} />
  </section>;
}
