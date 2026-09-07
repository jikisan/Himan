import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { CertificateType } from '@himan/shared/profile';
import { CertificateEditor, type CertificateFormValues } from './CertificateEditor';

interface CertificateCardProps {
  certificate: CertificateType;
  onSave: (values: CertificateFormValues) => Promise<unknown> | void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isSaving?: boolean;
}

export const CertificateCard = ({ certificate, onSave, onDelete, onMoveUp, onMoveDown, isSaving }: CertificateCardProps) => {
  const [editing, setEditing] = useState(false);

  const handleSave = async (values: CertificateFormValues) => {
    await onSave(values);
    setEditing(false);
  };

  if (editing) {
    return <CertificateEditor certificate={certificate} onSave={handleSave} onCancel={() => setEditing(false)} isSaving={isSaving} />;
  }

  const dateRange = [
    certificate.issueDate ? format(certificate.issueDate, 'MMM yyyy') : null,
    certificate.expiryDate ? `expires ${format(certificate.expiryDate, 'MMM yyyy')}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">{certificate.name}</p>
            {certificate.credentialUrl && (
              <a href={certificate.credentialUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {certificate.issuer && <p className="text-sm text-muted-foreground">{certificate.issuer}</p>}
          {dateRange && <p className="text-xs text-muted-foreground mt-0.5">{dateRange}</p>}
          {certificate.credentialId && <p className="text-xs text-muted-foreground mt-0.5">ID: {certificate.credentialId}</p>}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={!onMoveUp} title="Move up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={!onMoveDown} title="Move down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
