import { useState } from 'react';
import { Copy, MoreVertical, Edit2, Trash2, Star, Eye, EyeOff, CreditCard as CreditCardIcon, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { CreditCard as CreditCardEntity } from '../../domain/entities/CreditCard';
import type { CreditCardType } from '../../domain';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Badge component not available, using span with styling instead
import { Logger } from '@core/infrastructure/services';

interface CardCardProps {
  card: CreditCardType;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

export const CardCard = ({
  card,
  onEdit,
  onDelete,
  onToggleFavorite,
}: CardCardProps) => {
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const cardEntity = new CreditCardEntity(card);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`, {
        duration: 2000,
      });
    } catch (err) {
      Logger.error('Failed to copy to clipboard', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const isExpired = cardEntity.isExpired();
  const isExpiringSoon = cardEntity.isExpiringSoon(3);

  return (
    <div className="bg-card rounded-lg p-4 shadow-md hover:shadow-xl transition-shadow border border-border relative">
      {/* Header with favorite and menu */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleFavorite}
            className="h-7 w-7 flex-shrink-0"
          >
            <Star
              className={`h-4 w-4 ${
                card.isFavorite
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </Button>
          <h3 className="font-semibold text-base truncate flex-1">{card.cardName}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-popover text-popover-foreground"
          >
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status badges */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {isExpired && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-destructive text-destructive-foreground">
            <AlertCircle className="h-3 w-3" />
            Expired
          </span>
        )}
        {!isExpired && isExpiringSoon && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-orange-500 text-white">
            <AlertCircle className="h-3 w-3" />
            Expiring Soon
          </span>
        )}
      </div>

      {/* Card details */}
      <div className="space-y-3">
        {/* Card Number */}
        <div>
          <label className="text-xs text-muted-foreground opacity-50">Card Number</label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono flex-1 truncate">
              {showCardNumber ? card.cardNumber.replace(/(.{4})/g, '$1 ').trim() : cardEntity.getMaskedNumber()}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowCardNumber(!showCardNumber)}
              className="h-7 w-7 flex-shrink-0"
              aria-label={showCardNumber ? 'Hide card number' : 'Show card number'}
            >
              {showCardNumber ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => copyToClipboard(card.cardNumber.replace(/\D/g, ''), 'Card number')}
              className="h-7 w-7 flex-shrink-0"
              aria-label="Copy card number"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* CVV */}
        <div>
          <label className="text-xs text-muted-foreground opacity-50">CVV</label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono flex-1">
              {showCvv ? card.cvv : '•••'}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowCvv(!showCvv)}
              className="h-7 w-7 flex-shrink-0"
              aria-label={showCvv ? 'Hide CVV' : 'Show CVV'}
            >
              {showCvv ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => copyToClipboard(card.cvv, 'CVV')}
              className="h-7 w-7 flex-shrink-0"
              aria-label="Copy CVV"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-center text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 pt-2 border-t border-border">
            {/* Expiry */}
            <div>
              <label className="text-xs text-muted-foreground opacity-50">Expiry</label>
              <div className="flex items-center gap-2 mt-1">
                <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear}
                </span>
              </div>
            </div>

            {/* Bank Name */}
            {card.bankName && (
              <div>
                <label className="text-xs text-muted-foreground opacity-50">Bank</label>
                <span className="text-sm block mt-1">{card.bankName}</span>
              </div>
            )}

            {/* Card Issuer */}
            {card.cardIssuer && (
              <div>
                <label className="text-xs text-muted-foreground opacity-50">Issuer</label>
                <span className="text-sm block mt-1">{card.cardIssuer}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};