import { Users, StopCircle, UserPlus } from 'lucide-react';
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
  const progress = totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0;
  const totalPrice = session.items
    .filter((i) => i.isPurchased && i.price != null)
    .reduce((sum, i) => sum + (i.price ?? 0), 0);
  const allPurchased = totalItems > 0 && purchasedItems === totalItems;

  const listNames = [...new Set(session.items.map((i) => i.listName))];

  return (
    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">
              {allPurchased ? 'All items purchased!' : 'Shopping session'}
              {session.storeName && ` at ${session.storeName}`}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 mt-1.5">
            {listNames.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {listNames.length} {listNames.length === 1 ? 'list' : 'lists'}
                {totalPrice > 0 && ` · ₱${totalPrice.toFixed(2)}`}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {session.members.length} {session.members.length === 1 ? 'shopper' : 'shoppers'}
              </span>
              <button
                onClick={onManageShoppers}
                className="flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <UserPlus className="h-3 w-3" />
                Add
              </button>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant={allPurchased ? 'default' : 'outline'}
          onClick={onEndShopping}
        >
          <StopCircle className="h-4 w-4 mr-1" />
          End Shopping
        </Button>
      </div>

      {/* Progress bar */}
      <div className="mt-2.5 w-full bg-muted rounded-full h-2">
        <div
          className="bg-green-500 rounded-full h-2 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {purchasedItems}/{totalItems} items
      </p>
    </div>
  );
};
