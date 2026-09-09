import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, DatePicker, Input, Label } from '@/components/ui';
import type { CertificateType } from '@himan/shared/profile';

export interface CertificateFormValues {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  credentialId: string;
  credentialUrl: string;
}

const toFormValues = (certificate?: CertificateType): CertificateFormValues => ({
  name: certificate?.name ?? '',
  issuer: certificate?.issuer ?? '',
  issueDate: certificate?.issueDate ? certificate.issueDate.toISOString().slice(0, 10) : '',
  expiryDate: certificate?.expiryDate ? certificate.expiryDate.toISOString().slice(0, 10) : '',
  credentialId: certificate?.credentialId ?? '',
  credentialUrl: certificate?.credentialUrl ?? '',
});

interface CertificateEditorProps {
  certificate?: CertificateType;
  onSave: (values: CertificateFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const CertificateEditor = ({ certificate, onSave, onCancel, isSaving }: CertificateEditorProps) => {
  const [values, setValues] = useState<CertificateFormValues>(() => toFormValues(certificate));

  const set = <K extends keyof CertificateFormValues>(key: K, value: CertificateFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cert-name">Name</Label>
          <Input id="cert-name" value={values.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cert-issuer">Issuer</Label>
          <Input id="cert-issuer" value={values.issuer} onChange={(e) => set('issuer', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Issue date</Label>
          <DatePicker value={values.issueDate} onChange={(v) => set('issueDate', v)} />
        </div>
        <div className="space-y-2">
          <Label>Expiry date</Label>
          <DatePicker value={values.expiryDate} onChange={(v) => set('expiryDate', v)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cert-credential-id">Credential ID</Label>
          <Input id="cert-credential-id" value={values.credentialId} onChange={(e) => set('credentialId', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cert-credential-url">Credential URL</Label>
          <Input id="cert-credential-url" value={values.credentialUrl} onChange={(e) => set('credentialUrl', e.target.value)} placeholder="https://" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(values)} disabled={isSaving || !values.name.trim()}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
};
