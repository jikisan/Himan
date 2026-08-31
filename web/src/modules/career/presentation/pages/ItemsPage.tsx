import { useState } from 'react';
import { Briefcase, ListChecks, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { buttonVariants, ConfirmDialog, ScrollArea } from '@/components/ui';
import { useCareerItems } from '../hooks/useCareerItems';
import { ItemCard } from '../components/ItemCard';
import type { CareerItemType } from '@himan/shared/career';

export const ItemsPage = () => {
  const navigate = useNavigate();
  const { items, loading, deleteItem, duplicateItem } = useCareerItems();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDuplicate = async (item: CareerItemType) => {
    const created = await duplicateItem(item);
    if (created) {
      toast.success('Item duplicated — blocks carried over, just update company and title');
      navigate(`/career/${created.id}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Career</h1>
        <div className="flex items-center gap-2">
          <Link to="/career/blocks" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
            <ListChecks className="h-4 w-4 mr-1.5" />
            Blocks
          </Link>
          <Link to="/career/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="h-4 w-4 mr-1.5" />
            New item
          </Link>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 max-w-3xl mx-auto">
          {!loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
              <Briefcase className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm mb-4">No items yet. Create one to start generating cover letters.</p>
              <Link to="/career/new" className={buttonVariants()}>
                <Plus className="h-4 w-4 mr-1.5" />
                New item
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={() => setDeleteId(item.id)}
                  onDuplicate={() => handleDuplicate(item)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete item"
        description="This item and its saved generation history will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => { if (deleteId) deleteItem(deleteId); setDeleteId(null); }}
        variant="destructive"
      />
    </div>
  );
};
