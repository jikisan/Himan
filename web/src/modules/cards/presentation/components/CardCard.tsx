import { useState, type CSSProperties } from 'react';
import { Copy, MoreVertical, Edit2, Trash2, Star, Eye, EyeOff, CreditCard as CreditCardIcon, AlertCircle, Maximize2, CalendarClock } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Logger } from '@core/infrastructure/services';
import { ordinal } from '@himan/shared/utils';
import { getCardColorTheme } from '@himan/shared/cards';
import { CardBrandLogo } from './CardBrandLogo';

const BRANDS_WITH_LOGO = ['Visa', 'Mastercard', 'American Express', 'Discover'];

// Brand-tinted card faces — the row *is* the card. Faces stay dark in both themes;
// physical cards don't switch to light mode, and it keeps identity constant.
const BRAND_GRADIENT: Record<string, string> = {
  Visa: 'linear-gradient(135deg,#1a1f5c,#25309a,#3f51d4)',
  Mastercard: 'linear-gradient(135deg,#201d1b,#3a2a1e,#4a3221)',
  'American Express': 'linear-gradient(135deg,#0369a1,#0a8fd0,#22b3e6)',
  Discover: 'linear-gradient(135deg,#26262b,#3c3c44,#5c4a34)',
};
const CUSTOM_SHEEN = 'linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0) 45%,rgba(0,0,0,0.22))';
const DEFAULT_GRADIENT = 'linear-gradient(135deg,#3730a3,#4f46e5,#6366f1)';
const EXPIRED_GRADIENT = 'linear-gradient(135deg,#3a3a40,#494950,#585860)';

// Network mark drawn light for the dark face.
const BrandMark = ({ brand, issuer }: { brand: string; issuer: string | null }) => {
  switch (brand) {
    case 'Visa':
      return <span className="text-lg font-extrabold italic tracking-tight text-current">VISA</span>;
    case 'Mastercard':
      return (
        <span className="flex items-center">
          <span className="w-6 h-6 rounded-full" style={{ backgroundColor: '#EB001B' }} />
          <span className="w-6 h-6 rounded-full -ml-3" style={{ backgroundColor: '#F79E1B', opacity: 0.9 }} />
        </span>
      );
    case 'American Express':
      return <span className="text-sm font-bold tracking-[3px] text-current">AMEX</span>;
    case 'Discover':
      return (
        <span className="flex items-center gap-1">
          <span className="text-sm font-bold tracking-wide text-current">DISC</span>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FF6000' }} />
        </span>
      );
    default:
      return issuer ? (
        <span className="text-xs font-semibold uppercase tracking-widest text-current/70 truncate max-w-[8rem]">
          {issuer}
        </span>
      ) : <span />;
  }
};

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalShowCardNumber, setModalShowCardNumber] = useState(false);
  const [modalShowCvv, setModalShowCvv] = useState(false);
  const cardEntity = new CreditCardEntity(card);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`, { duration: 2000 });
    } catch (err) {
      Logger.error('Failed to copy to clipboard', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const isExpired = cardEntity.isExpired();
  const isExpiringSoon = !isExpired && cardEntity.isExpiringSoon(3);
  const brand = cardEntity.getCardBrand();
  const last4 = card.cardNumber.replace(/\D/g, '').slice(-4);
  const expiryStr = `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`;
  const gradient = isExpired ? EXPIRED_GRADIENT : BRAND_GRADIENT[brand] ?? DEFAULT_GRADIENT;
  // A chosen color wins over the brand look. Gradients can't be transitioned, so the chosen
  // color goes on background-color (animatable) with a fixed light-to-dark sheen on top.
  const theme = card.color ? getCardColorTheme(card.color) : null;
  const faceStyle: CSSProperties = theme
    ? { backgroundColor: card.color!, backgroundImage: CUSTOM_SHEEN, color: theme.foreground }
    : { backgroundImage: gradient, color: '#ffffff' };

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl active:scale-[0.99] transition-[transform,box-shadow,background-color,color] duration-300 ease-out motion-reduce:transition-none motion-reduce:active:scale-100"
      style={faceStyle}
    >
      {/* Soft top-right glare */}
      <div className="pointer-events-none absolute -top-14 -right-10 w-52 h-52 rounded-full bg-current/10" />

      {/* Face */}
      <div className="relative px-5 pt-4 pb-3">
        {/* Chip + status + favorite + menu */}
        <div className="flex items-start justify-between">
          {/* Chip */}
          <div
            className="w-11 h-8 rounded-md relative"
            style={{ background: 'linear-gradient(135deg,#f6e6a8,#d9b64c,#b8912f)' }}
          >
            <div className="absolute inset-0 m-auto w-6 h-5 rounded-sm border border-black/20" />
          </div>

          <div className="flex items-center gap-1.5">
            {isExpired && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-500 text-white">
                <AlertCircle className="h-3 w-3" />
                Expired
              </span>
            )}
            {isExpiringSoon && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-400 text-gray-900">
                <AlertCircle className="h-3 w-3" />
                Expiring
              </span>
            )}
            <button
              onClick={onToggleFavorite}
              aria-label={card.isFavorite ? 'Unfavorite' : 'Favorite'}
              className="p-1.5 rounded-lg hover:bg-current/10 transition-colors"
            >
              <Star className={`h-5 w-5 ${card.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-current/55'}`} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Card actions"
                  className="p-1.5 rounded-lg hover:bg-current/10 transition-colors text-current/80"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
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
        </div>

        {/* Masked number */}
        <div className="mt-5 flex items-center gap-2">
          <span className="text-xl font-mono tracking-[2px] text-current">
            {showCardNumber
              ? card.cardNumber.replace(/(.{4})/g, '$1 ').trim()
              : `••••  ••••  ••••  ${last4}`}
          </span>
          <button
            onClick={() => setShowCardNumber((v) => !v)}
            aria-label={showCardNumber ? 'Hide card number' : 'Show card number'}
            className="p-1 rounded-md hover:bg-current/10 text-current/70 transition-colors"
          >
            {showCardNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Holder / bank + expiry */}
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-current/50">Card</div>
            <div className="text-base font-semibold text-current truncate">{card.cardName}</div>
            {card.bankName && <div className="text-xs text-current/60 truncate">{card.bankName}</div>}
            {card.dueDay && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-current/60">
                <CalendarClock className="h-3 w-3" />
                Due {ordinal(card.dueDay)}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-current/50">Expires</div>
            <div className="text-sm font-mono tracking-wide text-current">{expiryStr}</div>
          </div>
        </div>
      </div>

      {/* Action bar — brand mark anchors identity, copy is the primary job */}
      <div className="flex items-center justify-between border-t border-current/15 pl-5 pr-2 py-1">
        <BrandMark brand={brand} issuer={card.cardIssuer} />
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => copyToClipboard(card.cardNumber.replace(/\D/g, ''), 'Card number')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-current/90 hover:bg-current/10 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Number
          </button>
          <button
            onClick={() => copyToClipboard(card.cvv, 'CVV')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-current/90 hover:bg-current/10 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            CVV
          </button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <button
                aria-label="View details"
                className="flex items-center rounded-lg px-2 py-2 text-current/80 hover:bg-current/10 transition-colors"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-popover text-popover-foreground">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Star
                    className={`h-5 w-5 ${
                      card.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                    }`}
                  />
                  {card.cardName}
                </DialogTitle>
                <DialogDescription>View all details for this credit card</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Status badges */}
                <div className="flex gap-2 flex-wrap">
                  {isExpired && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-destructive text-destructive-foreground">
                      <AlertCircle className="h-3 w-3" />
                      Expired
                    </span>
                  )}
                  {isExpiringSoon && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-orange-500 text-white">
                      <AlertCircle className="h-3 w-3" />
                      Expiring Soon
                    </span>
                  )}
                </div>

                {/* Card Number */}
                <div>
                  <label className="text-xs text-muted-foreground opacity-50">Card Number</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-mono flex-1 whitespace-nowrap overflow-hidden">
                      {modalShowCardNumber ? card.cardNumber.replace(/(.{4})/g, '$1 ').trim() : cardEntity.getMaskedNumber()}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setModalShowCardNumber(!modalShowCardNumber)}
                      className="h-7 w-7 flex-shrink-0"
                      aria-label={modalShowCardNumber ? 'Hide card number' : 'Show card number'}
                    >
                      {modalShowCardNumber ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
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
                      {modalShowCvv ? card.cvv : '•••'}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setModalShowCvv(!modalShowCvv)}
                      className="h-7 w-7 flex-shrink-0"
                      aria-label={modalShowCvv ? 'Hide CVV' : 'Show CVV'}
                    >
                      {modalShowCvv ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
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

                {/* Expiry */}
                <div>
                  <label className="text-xs text-muted-foreground opacity-50">Expiry Date</label>
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

                {/* Issuer (auto-detected from card number) */}
                {brand !== 'Unknown' && (
                  <div>
                    <label className="text-xs text-muted-foreground opacity-50">Issuer</label>
                    <div className="flex items-center gap-2 mt-1">
                      {BRANDS_WITH_LOGO.includes(brand) && (
                        <CardBrandLogo brand={brand} className="h-6 w-auto" />
                      )}
                      <span className="text-sm">{brand}</span>
                    </div>
                  </div>
                )}

                {/* Card Type */}
                {card.cardType && (
                  <div>
                    <label className="text-xs text-muted-foreground opacity-50">Card Type</label>
                    <span className="text-sm block mt-1">{card.cardType}</span>
                  </div>
                )}

                {/* Due Day */}
                {card.dueDay && (
                  <div>
                    <label className="text-xs text-muted-foreground opacity-50">Payment Due Day</label>
                    <span className="text-sm block mt-1">{ordinal(card.dueDay)} of every month</span>
                  </div>
                )}

                {/* Notes */}
                {card.notes && (
                  <div>
                    <label className="text-xs text-muted-foreground opacity-50">Notes</label>
                    <p className="text-sm block mt-1 whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                      {card.notes}
                    </p>
                  </div>
                )}

                {/* Created/Updated timestamps */}
                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  <div>Created: {cardEntity.createdAt.toLocaleDateString()}</div>
                  <div>Last updated: {cardEntity.getRelativeTime()}</div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};
