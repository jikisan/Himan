import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RECEIPT_MAX_TAGS, normalizeTags, receiptSchema, todayISO, validateReceiptPhoto } from '@himan/shared/receipts';
import type { Receipt, ReceiptValue } from '@himan/shared/receipts';
import { useFieldErrors, zodFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import { compressImage } from '../utils/compressImage';

export interface ReceiptFormProps {
  receipt?: Receipt;
  existingPhotoUrl?: string;
  knownTags: string[];
  busy: boolean;
  onSave: (value: ReceiptValue, photo?: ArrayBuffer) => Promise<void>;
  onCancel: () => void;
}

const FIELD_IDS: Record<string, string> = {
  merchant: 'rc-merchant', amount: 'rc-amount', purchasedOn: 'rc-date', warrantyEndsOn: 'rc-warranty', expiresOn: 'rc-expiry', photo: 'rc-photo',
};

export function ReceiptForm({ receipt, existingPhotoUrl, knownTags, busy, onSave, onCancel }: ReceiptFormProps) {
  const [merchant, setMerchant] = useState(receipt?.merchant ?? '');
  const [amount, setAmount] = useState(receipt ? String(receipt.amount) : '');
  const [purchasedOn, setPurchasedOn] = useState(receipt?.purchasedOn ?? todayISO());
  const [note, setNote] = useState(receipt?.note ?? '');
  const [tags, setTags] = useState<string[]>(receipt?.tags ?? []);
  const [tagText, setTagText] = useState('');
  const [warrantyEndsOn, setWarranty] = useState(receipt?.warrantyEndsOn ?? '');
  const [expiresOn, setExpiry] = useState(receipt?.expiresOn ?? '');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fe = useFieldErrors();
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const addTags = (raw: string) => { setTags((previous) => normalizeTags([...previous, ...normalizeTags(raw)])); setTagText(''); };
  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    fe.clear('rc-photo');
    if (!file.type.startsWith('image/')) { fe.fail('rc-photo', 'Choose a picture of the receipt'); return; }
    setPreparing(true);
    try {
      const blob = await compressImage(file);
      validateReceiptPhoto(blob.size);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch (failure) {
      // Browser decode errors are not written for people; only our own size message is.
      fe.fail('rc-photo', failure instanceof Error && failure.message.includes('5 MB') ? failure.message : 'Could not read that picture. Try another photo.');
    } finally { setPreparing(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    fe.clear();
    const pending = normalizeTags([...tags, ...normalizeTags(tagText)]);
    const result = receiptSchema.safeParse({
      merchant, amount: amount.trim() === '' ? NaN : Number(amount.replace(/,/g, '')), purchasedOn, note, tags: pending,
      warrantyEndsOn: warrantyEndsOn || null, expiresOn: expiresOn || null,
    });
    const problems: [string, string][] = result.success ? [] : zodFieldErrors(result.error, (path) => FIELD_IDS[String(path[0])] ?? null);
    if (!receipt && !photo) problems.unshift(['rc-photo', 'Add a photo of the receipt']);
    if (!result.success || problems.length) { fe.failMany(problems); return; }
    try { await onSave(result.data!, photo ? await photo.arrayBuffer() : undefined); }
    catch { fe.setFormError('Could not save this receipt. Your changes are still here; retry when connected.'); }
  };

  const shown = preview ?? existingPhotoUrl;
  const suggestions = knownTags.filter((tag) => !tags.includes(tag)).slice(0, 8);
  return <form className="space-y-5" noValidate onSubmit={submit}>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="rc-photo" required={!receipt}>Photo of the receipt</Label>
        <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void choosePhoto(e.dataTransfer.files[0]); }}
          className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-4 text-center transition-colors motion-reduce:transition-none ${dragging ? 'border-primary bg-primary/5' : 'border-border'}`}>
          {shown && <img src={shown} alt="Receipt preview" className="max-h-56 rounded-xl object-contain" />}
          <input ref={fileInput} id="rc-photo" type="file" accept="image/*" className="sr-only" aria-required={!receipt} {...fe.invalid('rc-photo')}
            onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; void choosePhoto(file); }} />
          <Button type="button" variant="outline" className="h-12 rounded-xl text-base" disabled={preparing} onClick={() => fileInput.current?.click()}>
            {preparing ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Camera aria-hidden="true" className="h-4 w-4" />}
            {shown ? 'Change photo' : 'Choose or take a photo'}
          </Button>
          {!shown && <p className="text-sm text-muted-foreground">You can also drop a picture here.</p>}
        </div>
        <FieldError id="rc-photo" message={fe.errors['rc-photo']} />
      </div>
      <div className="space-y-2"><Label htmlFor="rc-merchant" required>Store</Label>
        <Input id="rc-merchant" className="h-12 rounded-xl text-base" required maxLength={120} value={merchant} {...fe.invalid('rc-merchant')}
          onChange={(e) => { setMerchant(e.target.value); fe.clear('rc-merchant'); }} />
        <FieldError id="rc-merchant" message={fe.errors['rc-merchant']} /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="rc-amount" required>Amount (₱)</Label>
          <Input id="rc-amount" className="h-12 rounded-xl text-base" required inputMode="decimal" value={amount} {...fe.invalid('rc-amount')}
            onChange={(e) => { setAmount(e.target.value); fe.clear('rc-amount'); }} />
          <FieldError id="rc-amount" message={fe.errors['rc-amount']} /></div>
        <div className="space-y-2"><Label htmlFor="rc-date" required>Date bought</Label>
          <Input id="rc-date" type="date" className="h-12 rounded-xl text-base" required value={purchasedOn} {...fe.invalid('rc-date')}
            onChange={(e) => { setPurchasedOn(e.target.value); fe.clear('rc-date'); }} />
          <FieldError id="rc-date" message={fe.errors['rc-date']} /></div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rc-tags">Tags <span className="text-muted-foreground">(optional, up to {RECEIPT_MAX_TAGS})</span></Label>
        {tags.length > 0 && <ul className="flex flex-wrap gap-2" aria-label="Chosen tags">
          {tags.map((tag) => <li key={tag}><button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}
            className="min-h-11 rounded-full bg-secondary px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {tag} <span className="text-muted-foreground">· Remove</span></button></li>)}
        </ul>}
        <div className="flex gap-2">
          <Input id="rc-tags" className="h-12 rounded-xl text-base" value={tagText} placeholder="e.g. groceries, appliance" maxLength={60}
            onChange={(e) => setTagText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTags(tagText); } }} />
          <Button type="button" variant="outline" className="h-12 rounded-xl" disabled={!tagText.trim()} onClick={() => addTags(tagText)}>Add tag</Button>
        </div>
        {suggestions.length > 0 && <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-muted-foreground">Used before:</span>
          {suggestions.map((tag) => <button key={tag} type="button" onClick={() => addTags(tag)}
            className="min-h-11 rounded-full border px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Add {tag}</button>)}</div>}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="rc-warranty">Warranty ends <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="rc-warranty" type="date" className="h-12 rounded-xl text-base" value={warrantyEndsOn} {...fe.invalid('rc-warranty')}
            onChange={(e) => { setWarranty(e.target.value); fe.clear('rc-warranty'); }} />
          <FieldError id="rc-warranty" message={fe.errors['rc-warranty']} /></div>
        <div className="space-y-2"><Label htmlFor="rc-expiry">Expires <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="rc-expiry" type="date" className="h-12 rounded-xl text-base" value={expiresOn} {...fe.invalid('rc-expiry')}
            onChange={(e) => { setExpiry(e.target.value); fe.clear('rc-expiry'); }} />
          <FieldError id="rc-expiry" message={fe.errors['rc-expiry']} /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="rc-note">Note <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea id="rc-note" className="rounded-xl text-base" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="h-11 rounded-xl">{busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save receipt</Button>
      </div>
    </fieldset>
  </form>;
}
