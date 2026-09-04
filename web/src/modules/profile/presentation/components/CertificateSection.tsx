import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useCertificates } from '../hooks/useCertificates';
import { CertificateCard } from './CertificateCard';
import { CertificateEditor, type CertificateFormValues } from './CertificateEditor';

const toDto = (values: CertificateFormValues) => ({
  name: values.name.trim(),
  issuer: values.issuer.trim() || null,
  issueDate: values.issueDate ? new Date(values.issueDate) : null,
  expiryDate: values.expiryDate ? new Date(values.expiryDate) : null,
  credentialId: values.credentialId.trim() || null,
  credentialUrl: values.credentialUrl.trim() || null,
});

export const CertificateSection = () => {
  const { data, loading, create, update, remove, reorder } = useCertificates();
  const [adding, setAdding] = useState(false);

  const handleAdd = async (values: CertificateFormValues) => {
    await create(toDto(values));
    setAdding(false);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const ids = data.map((c) => c.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder(ids);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Certificates</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && <CertificateEditor onSave={handleAdd} onCancel={() => setAdding(false)} />}
        {!loading && data.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No certificates added yet.</p>
        )}
        {data.map((certificate, index) => (
          <CertificateCard
            key={certificate.id}
            certificate={certificate}
            onSave={(values) => update(certificate.id, toDto(values))}
            onDelete={() => remove(certificate.id)}
            onMoveUp={index > 0 ? () => handleMove(index, -1) : undefined}
            onMoveDown={index < data.length - 1 ? () => handleMove(index, 1) : undefined}
          />
        ))}
      </CardContent>
    </Card>
  );
};
