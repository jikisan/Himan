import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Copy, Download, Eye, EyeOff, FileText, Landmark, Loader2, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ALL_GOVERNMENT_GROUPS, GOVERNMENT_TYPES, countGovernmentRecordsByGroup, filterGovernmentRecords, filterGovernmentRecordsByGroup,
  governmentRecordSchema, maskGovernmentNumber, personalGovernmentGroup, sortGovernmentGroups, validateGovernmentFile } from '@himan/shared/government';
import type { GovernmentRecord, GovernmentRecordInput, GovernmentDocument, GovernmentGroup } from '@himan/shared/government';
import { useFieldErrors, zodFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import { useGovernment } from '../hooks/useGovernment';
import { GovernmentAgencyMark } from '../components/GovernmentAgencyMark';
import { GovernmentDocumentPreview } from '../components/GovernmentDocumentPreview';
import { GovernmentGroupBar } from '../components/GovernmentGroupBar';
import { GovernmentGroupManager } from '../components/GovernmentGroupManager';

function RecordForm({ record, groups, defaultGroupId, busy, onSave, onCancel }: {
  record?: GovernmentRecord; groups: GovernmentGroup[]; defaultGroupId: string; busy: boolean; onSave: (value: GovernmentRecordInput) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState<GovernmentRecordInput>(() => record ? {
    agency: record.agency, label: record.label, registeredName: record.registeredName,
    number: record.number, issueDate: record.issueDate, expiryDate: record.expiryDate, notes: record.notes, groupId: record.groupId,
  } : { agency: 'PhilHealth', label: '', registeredName: '', number: '', issueDate: null, expiryDate: null, notes: '', groupId: defaultGroupId });
  const [custom, setCustom] = useState(!!record && !GOVERNMENT_TYPES.some((type) => type === record.agency));
  const fe = useFieldErrors();
  const ids: Partial<Record<keyof GovernmentRecordInput, string>> = {
    agency: custom ? 'gov-custom' : 'gov-type', label: custom ? 'gov-custom' : 'gov-type', registeredName: 'gov-name', number: 'gov-number' };
  const set = (field: keyof GovernmentRecordInput, value: string | null) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    const id = ids[field]; if (id) fe.clear(id);
  };
  return <form className="space-y-4" noValidate onSubmit={async (event) => {
    event.preventDefault();
    fe.clear();
    const result = governmentRecordSchema.safeParse({ ...form, label: form.label.trim() || form.agency });
    if (!result.success) { fe.failMany(zodFieldErrors(result.error, (path) => ids[path[0] as keyof GovernmentRecordInput] ?? null)); return; }
    try { await onSave(result.data); }
    catch { fe.setFormError('Could not save this record. Your changes are still here; retry when connected.'); }
  }}>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="gov-type">Type</Label>
        <select id="gov-type" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base"
          {...fe.invalid('gov-type')} value={custom ? 'custom' : form.agency} onChange={(event) => {
            setCustom(event.target.value === 'custom'); set('agency', event.target.value === 'custom' ? '' : event.target.value);
          }}>
          {GOVERNMENT_TYPES.map((type) => <option key={type}>{type}</option>)}<option value="custom">Custom type</option>
        </select>
        <FieldError id="gov-type" message={fe.errors['gov-type']} />
        {custom && <><Label htmlFor="gov-custom" required>Custom type name</Label><Input className="h-12 rounded-xl text-base" id="gov-custom" value={form.agency}
          {...fe.invalid('gov-custom')} onChange={(event) => set('agency', event.target.value)} maxLength={80} required placeholder="e.g. PRC license" />
          <FieldError id="gov-custom" message={fe.errors['gov-custom']} /></>}
      </div>
      <div className="space-y-2"><Label htmlFor="gov-group">Group</Label>
        <select id="gov-group" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base" value={form.groupId ?? ''}
          onChange={(event) => set('groupId', event.target.value)}>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select></div>
      <div className="space-y-2"><Label htmlFor="gov-name" required>Registered name</Label><Input className="h-12 rounded-xl text-base" autoFocus id="gov-name" required maxLength={160}
        {...fe.invalid('gov-name')} value={form.registeredName} onChange={(event) => set('registeredName', event.target.value)} autoComplete="name" />
        <FieldError id="gov-name" message={fe.errors['gov-name']} /></div>
      <div className="space-y-2"><Label htmlFor="gov-number">ID / member number <span className="text-muted-foreground">(optional)</span></Label>
        <Input className="h-12 rounded-xl font-mono text-base" id="gov-number" value={form.number} {...fe.invalid('gov-number')} onChange={(event) => set('number', event.target.value)} maxLength={100} autoComplete="off" />
        <FieldError id="gov-number" message={fe.errors['gov-number']} /></div>
      <div className="flex justify-end gap-3 border-t pt-5"><Button className="h-11 rounded-xl hover:scale-100" type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button className="h-11 rounded-xl bg-foreground text-background hover:scale-100 hover:bg-foreground/90" type="submit">{busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save record</Button></div>
    </fieldset>
  </form>;
}

export function GovernmentPage() {
  const government = useGovernment();
  return <GovernmentContent key={government.userId ?? 'signed-out'} {...government} />;
}

function GovernmentContent({ records, groups: unsortedGroups, loading, error, online, busy, run, refetch, documentUrl, userId }: ReturnType<typeof useGovernment>) {
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState(ALL_GOVERNMENT_GROUPS);
  const [managerOpen, setManagerOpen] = useState(false);
  const [groupDelete, setGroupDelete] = useState<GovernmentGroup | null>(null);
  const groups = sortGovernmentGroups(unsortedGroups);
  const counts = countGovernmentRecordsByGroup(records);
  const personal = personalGovernmentGroup(groups);
  const shownGroup = activeGroup === ALL_GOVERNMENT_GROUPS || groups.some((group) => group.id === activeGroup) ? activeGroup : ALL_GOVERNMENT_GROUPS;
  const groupName = (id: string) => groups.find((group) => group.id === id)?.name;
  const [dialog, setDialog] = useState<{ userId: string | undefined; id: string | null; editing: boolean } | null>(null);
  const activeDialog = dialog?.userId === userId ? dialog : null;
  const [revealed, setRevealed] = useState(false);
  const [revealedPreviewId, setRevealedPreviewId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadErrors = useFieldErrors();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; document: boolean; name: string } | null>(null);
  const selected = records.find((record) => record.id === activeDialog?.id);
  const disabled = busy || uploading;
  const filtered = filterGovernmentRecords(filterGovernmentRecordsByGroup(records, shownGroup), search);
  const open = (id: string | null, editing = false) => { setRevealed(false); setRevealedPreviewId(null); setDialog({ userId, id, editing }); };
  const copyNumber = async (number: string) => {
    try { await navigator.clipboard.writeText(number); toast.success('Number copied'); }
    catch { toast.error('Could not copy number'); }
  };

  const openDocument = async (document: GovernmentDocument, download = false) => {
    const tab = window.open('about:blank', '_blank');
    if (!tab) { toast.error('Allow pop-ups to open this document'); return; }
    tab.opener = null;
    try { tab.location.replace(await documentUrl(document.id, download)); }
    catch { tab.close(); toast.error('Could not open this document. Retry when connected.'); }
  };

  const upload = async (files: File[], recordId: string) => {
    setUploading(true);
    uploadErrors.clear();
    try {
      for (const file of files) validateGovernmentFile(file.name, file.type, file.size);
      for (const file of files) {
        await run({ type: 'upload', id: recordId, file: { name: file.name, mimeType: file.type, bytes: await file.arrayBuffer() } });
      }
      if (files.length) toast.success('Documents attached');
    } catch (failure) {
      uploadErrors.fail('gov-upload', failure instanceof Error ? failure.message : 'Could not attach document. Check the record before retrying.');
    } finally { setUploading(false); }
  };

  return <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Dashboard</Link>
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><Landmark className="h-8 w-8 text-primary" />Government</h1>
        <p className="mt-2 text-muted-foreground">Your ID numbers in one place. Copy a number with one click.</p></div>
      <Button className="h-11 rounded-xl hover:scale-100" onClick={() => open(null, true)} disabled={!online || !userId || disabled}><Plus aria-hidden="true" className="h-4 w-4" />Add record</Button>
    </header>
    {!online ? <div role="status" className="rounded-xl border p-6 text-center">Connect to the internet to access your government records.</div>
      : !userId ? <p>Sign in to access your records.</p>
      : <>
        {!loading && <GovernmentGroupBar groups={groups} counts={counts} total={records.length} active={shownGroup} disabled={disabled}
          onChange={setActiveGroup} onManage={() => setManagerOpen(true)} />}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md"><Search aria-hidden="true" className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search government records" value={search} onChange={(event) => setSearch(event.target.value)}
            className="h-12 rounded-xl bg-card pl-11 text-base" placeholder="Find an ID or number…" /></div>
        {!loading && !error && <p className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'record' : 'records'}{search ? ' found' : ' saved'}</p>}
        </div>
        {error && <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 p-4">
          <p>Could not load government records.</p><Button variant="outline" onClick={() => void refetch()}>Retry</Button></div>}
        {loading ? <p role="status" className="flex items-center gap-2 py-10"><Loader2 className="h-5 w-5 animate-spin" />Loading records…</p>
          : !error && !filtered.length ? <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
            <Landmark className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{search ? 'No matching records' : 'Keep your details together'}</h2>
            <p className="mt-2 text-muted-foreground">{search ? 'Try a different search.' : 'Add PhilHealth, Pag-IBIG, SSS, or another government record.'}</p>
            {!search && <Button className="mt-5" onClick={() => open(null, true)}>Add your first record</Button>}
          </div> : <MotionConfig reducedMotion="user"><motion.div layout key={shownGroup} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false} mode="popLayout">
            {filtered.map((record) => <motion.article layout key={record.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
              <button aria-label={`View ${record.label} details`} onClick={() => open(record.id)}
                className="-m-1 flex min-h-11 items-center gap-3 rounded-xl p-1 text-left hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <GovernmentAgencyMark agency={record.agency} />
                <span className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-semibold leading-6">{record.agency}</h2>
                  {shownGroup === ALL_GOVERNMENT_GROUPS && groupName(record.groupId) && <span className="mb-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{groupName(record.groupId)}</span>}
                  {record.label !== record.agency && <span className="block break-words text-sm text-muted-foreground">{record.label}</span>}
                </span>
              </button>
              {record.deleting && <p role="status" className="text-sm text-destructive">Deletion incomplete</p>}
              {record.documents.filter((document) => document.ready).slice(0, 1).map((document) =>
                <GovernmentDocumentPreview key={document.id} document={document} userId={userId} documentUrl={documentUrl} openLabel="View documents" onOpen={() => open(record.id)} />)}
              <div className="flex min-h-11 items-center gap-2 border-t pt-2" aria-label="ID number">
                <p className="min-w-0 flex-1 break-all font-mono text-base font-medium">{revealedPreviewId === record.id ? record.number : maskGovernmentNumber(record.number)}</p>
                {record.number && <Button className="h-11 w-11 shrink-0 rounded-lg hover:scale-100" size="icon" variant="ghost" aria-label={`${revealedPreviewId === record.id ? 'Hide' : 'Reveal'} ${record.agency} number`}
                  aria-pressed={revealedPreviewId === record.id} onClick={() => setRevealedPreviewId(revealedPreviewId === record.id ? null : record.id)}>
                  {revealedPreviewId === record.id ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
                </Button>}
                <Button className="h-11 w-11 shrink-0 rounded-lg hover:scale-100" size="icon" variant="ghost" disabled={!record.number} aria-label={`Copy ${record.agency} number`}
                  onClick={() => void copyNumber(record.number)}><Copy aria-hidden="true" size={18} /></Button>
              </div>
            </motion.article>)}
            </AnimatePresence>
          </motion.div></MotionConfig>}
      </>}

    <Dialog open={!!activeDialog && online && !!userId} onOpenChange={(isOpen) => { if (!isOpen && !disabled) setDialog(null); }}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl transition-none motion-reduce:animate-none [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full" onInteractOutside={(event) => { if (disabled) event.preventDefault(); }}
        onEscapeKeyDown={(event) => { if (disabled) event.preventDefault(); }}>
        <DialogHeader className="shrink-0 border-b p-4 pr-24 text-left">
          <div className="flex items-center gap-3">
            {selected && !activeDialog?.editing && <GovernmentAgencyMark agency={selected.agency} />}
            <div className="min-w-0 space-y-1"><DialogTitle className="break-words text-lg leading-6">{activeDialog?.editing ? selected ? 'Edit record' : 'Add record' : selected?.label ?? 'Record unavailable'}</DialogTitle>
            <DialogDescription>{activeDialog?.editing ? 'Just your ID type, name, number, and group.' : selected ? `${selected.registeredName}${groupName(selected.groupId) ? ` · ${groupName(selected.groupId)}` : ''}` : 'Refresh the page to reload this record.'}</DialogDescription></div>
          </div>
        </DialogHeader>
        {activeDialog?.editing ? <div className="min-h-0 overflow-y-auto p-6"><RecordForm key={activeDialog.id ?? 'new'} record={selected} groups={groups} defaultGroupId={(groups.find((group) => group.id === shownGroup) ?? personal)?.id ?? ''} busy={disabled}
          onCancel={() => selected ? open(selected.id) : setDialog(null)} onSave={async (input) => {
            const saved = await run({ type: 'save', id: activeDialog.id, input });
            if (saved) { open(saved.id); toast.success('Record saved'); }
          }} /></div> : selected && <>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {selected.deleting && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm">Deletion did not finish. Retry deleting this record to remove the remaining documents.</p>}
          <section className="flex min-h-11 items-center gap-2" aria-label="ID number">
            <p className="min-w-0 flex-1 break-all font-mono text-base font-medium">{revealed ? selected.number : maskGovernmentNumber(selected.number)}</p>
            {selected.number && <Button className="h-11 w-11 shrink-0 rounded-lg hover:scale-100" size="icon" variant="ghost" aria-label={revealed ? 'Hide number' : 'Reveal number'} aria-pressed={revealed} onClick={() => setRevealed(!revealed)}>
              {revealed ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}</Button>}
            <Button className="h-11 w-11 shrink-0 rounded-lg hover:scale-100" size="icon" variant="ghost" disabled={!selected.number} aria-label="Copy number" onClick={() => void copyNumber(selected.number)}><Copy aria-hidden="true" size={18} /></Button>
          </section>
          <details key={selected.id} className="group rounded-xl border" open={selected.documents.length > 0 || uploading || undefined}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <FileText aria-hidden="true" className="h-5 w-5 text-muted-foreground" /><span className="flex-1 text-sm font-medium">Documents <span className="ml-1 text-muted-foreground">({selected.documents.length})</span></span>
              <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="space-y-3 border-t p-4">
            <p className="text-xs text-muted-foreground">PDF, JPEG, PNG · Up to 10 MB each</p>
            {!selected.documents.length && <p className="text-sm text-muted-foreground">Attach a scan or photo if you need one.</p>}
            {selected.documents.map((document) => <div key={document.id} className="space-y-3 rounded-xl border p-3">
              {document.ready && userId && <GovernmentDocumentPreview document={document} userId={userId} documentUrl={documentUrl} onOpen={() => void openDocument(document)} />}
              <div className="flex flex-wrap items-center gap-2">
              <FileText size={18} className="shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{document.name}</p>
                <p className="text-xs text-muted-foreground">{document.ready ? document.size < 1048576 ? `${Math.ceil(document.size / 1024)} KB` : `${(document.size / 1048576).toFixed(1)} MB` : 'Upload incomplete — remove and retry'}</p></div>
              <Button className="h-11 w-11 hover:scale-100" size="icon" variant="ghost" aria-label={`View ${document.name}`} disabled={disabled || !document.ready || selected.deleting} onClick={() => void openDocument(document)}><Eye aria-hidden="true" /></Button>
              <Button className="h-11 w-11 hover:scale-100" size="icon" variant="ghost" aria-label={`Download ${document.name}`} disabled={disabled || !document.ready || selected.deleting} onClick={() => void openDocument(document, true)}><Download aria-hidden="true" /></Button>
              <Button className="h-11 w-11 hover:scale-100" size="icon" variant="ghost" aria-label={`Remove ${document.name}`} disabled={disabled} onClick={() => setDeleteTarget({ id: document.id, document: true, name: document.name })}><Trash2 aria-hidden="true" /></Button>
              </div>
            </div>)}
            <Label htmlFor="gov-upload" className="inline-flex items-center gap-2 text-sm font-medium"><Upload size={16} />Attach existing files</Label>
            <Input className="min-h-11 cursor-pointer" id="gov-upload" type="file" accept="application/pdf,image/jpeg,image/png" multiple disabled={disabled || selected.deleting} {...uploadErrors.invalid('gov-upload')}
              onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void upload(files, selected.id); }} />
            <FieldError id="gov-upload" message={uploadErrors.errors['gov-upload']} />
            {uploading && <p role="status" className="text-sm">Uploading documents…</p>}
            </div>
          </details>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-background/40 px-4 py-3">
            <Button className="h-11 rounded-xl text-destructive hover:scale-100 hover:bg-destructive/10 hover:text-destructive" variant="ghost" disabled={disabled} onClick={() => setDeleteTarget({ id: selected.id, document: false, name: selected.label })}><Trash2 aria-hidden="true" />Delete record</Button>
            <Button className="h-11 rounded-xl hover:scale-100" variant="outline" disabled={disabled || selected.deleting} onClick={() => open(selected.id, true)}><Pencil aria-hidden="true" />Edit details</Button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
    <GovernmentGroupManager open={managerOpen && online} groups={groups} counts={counts} busy={busy} onClose={() => setManagerOpen(false)}
      onAdd={async (name) => { await run({ type: 'addGroup', name }); toast.success('Group added'); }}
      onRename={async (id, name) => { await run({ type: 'renameGroup', id, name }); toast.success('Group renamed'); }}
      onDelete={setGroupDelete} />
    <AlertDialog open={!!groupDelete && online} onOpenChange={(isOpen) => { if (!isOpen && !busy) setGroupDelete(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete the {groupDelete?.name} group?</AlertDialogTitle>
        <AlertDialogDescription>{counts[groupDelete?.id ?? ''] ? `${counts[groupDelete!.id]} ${counts[groupDelete!.id] === 1 ? 'record' : 'records'} will move to Personal. No records are deleted.` : 'This group has no records.'}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep group</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={async (event) => {
            event.preventDefault(); if (!groupDelete) return;
            try { await run({ type: 'removeGroup', id: groupDelete.id }); if (shownGroup === groupDelete.id) setActiveGroup(ALL_GOVERNMENT_GROUPS); setGroupDelete(null); toast.success('Group deleted'); }
            catch { toast.error('Could not delete the group. Retry when connected.'); }
          }}>{busy ? 'Deleting…' : 'Delete group'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={!!deleteTarget && online} onOpenChange={(isOpen) => { if (!isOpen && !disabled) setDeleteTarget(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
        <AlertDialogDescription>{deleteTarget?.document ? 'This document will be permanently deleted.' : 'This record and all its attached documents will be permanently deleted.'} This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={disabled}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={disabled} onClick={async (event) => {
            event.preventDefault(); if (!deleteTarget) return;
            try {
              await run({ type: deleteTarget.document ? 'removeDocument' : 'remove', id: deleteTarget.id });
              if (!deleteTarget.document) setDialog(null);
              setDeleteTarget(null); toast.success('Deleted');
            } catch { toast.error('Deletion did not finish. Retry when connected.'); }
          }}>{disabled ? 'Deleting…' : 'Permanently delete'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
