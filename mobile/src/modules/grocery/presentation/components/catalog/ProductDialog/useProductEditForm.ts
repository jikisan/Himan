import { useEffect, useState } from 'react';
import type { ProductType, UpdateProductDto } from '@himan/shared/grocery';
import type { ProductEditFormValues } from './ProductEditForm';

const emptyForm: ProductEditFormValues = {
  name: '',
  brand: '',
  category: '',
  packageSize: '',
  lifespanDays: '',
  notes: '',
};

export function useProductEditForm(
  product: ProductType | null,
  onUpdate: (id: string, dto: UpdateProductDto) => Promise<void>
) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProductEditFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIsEditing(false);
    setForm({
      name: product?.name ?? '',
      brand: product?.brand ?? '',
      category: product?.category ?? '',
      packageSize: product?.packageSize ?? '',
      lifespanDays: product?.lifespanDays != null ? String(product.lifespanDays) : '',
      notes: product?.notes ?? '',
    });
  }, [product?.id]);

  const patchForm = (patch: Partial<ProductEditFormValues>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!product) return;
    const name = form.name.trim();
    if (!name) return;

    setSaving(true);
    try {
      await onUpdate(product.id, {
        name,
        brand: form.brand.trim(),
        category: form.category.trim(),
        packageSize: form.packageSize.trim(),
        lifespanDays: form.lifespanDays.trim() ? Number(form.lifespanDays.trim()) : undefined,
        notes: form.notes.trim(),
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return { isEditing, setIsEditing, form, patchForm, saving, handleSave };
}
