import { Users, StopCircle, UserPlus, ShoppingBag } from 'lucide-react';
import type { GrocerySessionType } from '../../domain';
import { Button } from '@/components/ui/button';

interface SessionBannerProps {
  session: GrocerySessionType;
  onEndShopping: () => void;
  onManageShoppers: () => void;
}

export const SessionBanner = ({
  session,
  onEndShopping,
  onManageShoppers,
}: SessionBannerProps) => {
  const totalItems = session.items.length;
  const purchasedItems = session.items.filter((i) => i.isPurchased).length;
  const remaining = totalItems - purchasedItems;
  const progress = totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0;
  const totalPrice = session.items
    .filter((i) => i.isPurchased && i.price != null)
    .reduce((sum, i) => sum + (i.price ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-sm font-semibold truncate">
              {session.storeName || 'Shopping Session'}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <button
              onClick={onManageShoppers}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground active:text-foreground transition-colors"
            >
              <Users className="h-3 w-3" />
              <span>{session.members.length} {session.members.length === 1 ? 'shopper' : 'shoppers'}</span>
              <UserPlus className="h-3 w-3" />
            </button>
            {totalPrice > 0 && (
              <span className="text-xs text-muted-foreground">· ₱{totalPrice.toFixed(2)}</span>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onEndShopping}
          className="flex-shrink-0 h-8 text-xs"
        >
          <StopCircle className="h-3.5 w-3.5 mr-1.5" />
          End
        </Button>
      </div>

    </div>
  );
};
