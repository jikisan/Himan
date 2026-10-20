import { useState, useEffect, type FormEvent } from 'react';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreditCardType, CardCategoryType } from '../../domain';
import { CARD_TYPES } from './cardOptions';

interface CardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCardType | null;
  categories: CardCategoryType[];
  onSave: (data: {
    cardName: string;
    cardNumber: string;
    cvv: string;
    expiryMonth: number;
    expiryYear: number;
    bankName?: string | null;
    cardIssuer?: string | null;
    cardType?: string | null;
    categoryId?: string | null;
    notes?: string | null;
    dueDay?: number | null;
  }) => Promise<void>;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => CURRENT_YEAR + i);
const DUE_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// Luhn algorithm for card validation
const luhnCheck = (cardNumber: string): boolean => {
  const digitsOnly = cardNumber.replace(/\D/g, '');
  if (digitsOnly.length < 13 || digitsOnly.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = digitsOnly.length - 1; i >= 0; i--) {
    let digit = parseInt(digitsOnly.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

export const CardDialog = ({
  open,
  onOpenChange,
  card,
  categories,
  onSave,
}: CardDialogProps) => {
  const [formData, setFormData] = useState({
    cardName: '',
    cardNumber: '',
    cvv: '',
    expiryMonth: new Date().getMonth() + 1,
    expiryYear: CURRENT_YEAR,
    bankName: '',
    cardType: '',
    categoryId: null as string | null,
    notes: '',
    dueDay: null as number | null,
  });
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const fe = useFieldErrors();
  const clearErrors = fe.clear;

  useEffect(() => {
    if (card) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when editing a different card
      setFormData({
        cardName: card.cardName,
        cardNumber: card.cardNumber,
        cvv: card.cvv,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        bankName: card.bankName || '',
        cardType: card.cardType || '',
        categoryId: card.categoryId,
        notes: card.notes || '',
        dueDay: card.dueDay,
      });
    } else {
      setFormData({
        cardName: '',
        cardNumber: '',
        cvv: '',
        expiryMonth: new Date().getMonth() + 1,
        expiryYear: CURRENT_YEAR,
        bankName: '',
        cardType: '',
        categoryId: null,
        notes: '',
        dueDay: null,
      });
    }
    setShowCardNumber(false);
    setShowCvv(false);
    clearErrors();
  }, [card, open, clearErrors]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.cardName.trim()) {
      newErrors.cardName = 'Card name is required';
    } else if (formData.cardName.length > 100) {
      newErrors.cardName = 'Card name must be 100 characters or less';
    }

    const digitsOnly = formData.cardNumber.replace(/\D/g, '');
    if (!digitsOnly) {
      newErrors.cardNumber = 'Card number is required';
    } else if (digitsOnly.length < 13 || digitsOnly.length > 19) {
      newErrors.cardNumber = 'Card number must be between 13 and 19 digits';
    } else if (!luhnCheck(formData.cardNumber)) {
      newErrors.cardNumber = 'Invalid card number (Luhn check failed)';
    }

    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (formData.cvv.length < 3 || formData.cvv.length > 4) {
      newErrors.cvv = 'CVV must be 3 or 4 digits';
    } else if (!/^\d+$/.test(formData.cvv)) {
      newErrors.cvv = 'CVV must contain only digits';
    }

    // Validate expiry date
    const expiryDate = new Date(formData.expiryYear, formData.expiryMonth - 1);
    const now = new Date();
    now.setMonth(now.getMonth() - 1); // Allow up to 1 month expired
    if (expiryDate < now) {
      newErrors.expiryYear = 'Card expiry date must be valid';
    }


    fe.failMany(Object.entries(newErrors));
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    if (!validateForm()) {
      return;
    }

    try {
      await onSave({
      cardName: formData.cardName.trim(),
      cardNumber: formData.cardNumber.replace(/\D/g, ''),
      cvv: formData.cvv,
      expiryMonth: formData.expiryMonth,
      expiryYear: formData.expiryYear,
      bankName: formData.bankName.trim() || null,
      cardType: formData.cardType || null,
      categoryId: formData.categoryId,
      notes: formData.notes.trim() || null,
      dueDay: formData.dueDay,
      });
    } catch (err) {
      fe.setFormError(err instanceof Error ? err.message : 'Could not save this card.');
      return;
    }
    onOpenChange(false);
  };

  // Format card number with spaces
  const formatCardNumber = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData({ ...formData, cardNumber: formatted });
    fe.clear('cardNumber');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{card ? 'Edit Credit Card' : 'Add Credit Card'}</DialogTitle>
          <DialogDescription>
            {card ? 'Update the credit card information below.' : 'Enter the details for your new credit card.'}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSave}>
        <div className="space-y-4">
          <FormErrorBanner message={fe.formError} />
          {/* Card Name */}
          <div className="space-y-2">
            <Label htmlFor="cardName" required>Card Name</Label>
            <Input
              id="cardName"
              required
              {...fe.invalid('cardName')}
              value={formData.cardName}
              onChange={(e) => { setFormData({ ...formData, cardName: e.target.value }); fe.clear('cardName'); }}
              placeholder="e.g., Personal Visa"
              maxLength={100}
            />
            <FieldError id="cardName" message={fe.errors.cardName} />
          </div>

          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber" required>Card Number</Label>
            <div className="flex gap-2">
              <Input
                id="cardNumber"
                required
                {...fe.invalid('cardNumber')}
                type={showCardNumber ? 'text' : 'password'}
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                maxLength={23} // 16 digits + 3 spaces
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={showCardNumber ? 'Hide card number' : 'Show card number'}
                onClick={() => setShowCardNumber(!showCardNumber)}
                className="h-10 w-10"
              >
                {showCardNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <FieldError id="cardNumber" message={fe.errors.cardNumber} />
          </div>

          {/* CVV and Expiry */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cvv" required>CVV</Label>
              <div className="flex gap-2">
                <Input
                  id="cvv"
                  required
                  {...fe.invalid('cvv')}
                  type={showCvv ? 'text' : 'password'}
                  value={formData.cvv}
                  onChange={(e) => { setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, '') }); fe.clear('cvv'); }}
                  placeholder="123"
                  maxLength={4}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={showCvv ? 'Hide CVV' : 'Show CVV'}
                  onClick={() => setShowCvv(!showCvv)}
                  className="h-10 w-10"
                >
                  {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <FieldError id="cvv" message={fe.errors.cvv} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryMonth" required>Expiry Month</Label>
              <Select
                value={formData.expiryMonth.toString()}
                onValueChange={(value) => { setFormData({ ...formData, expiryMonth: parseInt(value) }); fe.clear('expiryYear'); }}
              >
                <SelectTrigger id="expiryMonth" aria-required="true">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryYear" required>Expiry Year</Label>
              <Select
                value={formData.expiryYear.toString()}
                onValueChange={(value) => { setFormData({ ...formData, expiryYear: parseInt(value) }); fe.clear('expiryYear'); }}
              >
                <SelectTrigger id="expiryYear" aria-required="true" {...fe.invalid('expiryYear')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="expiryYear" message={fe.errors.expiryYear} />
            </div>
          </div>

          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="e.g., Chase Bank"
              maxLength={100}
            />
          </div>

          {/* Card Type */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cardType">Card Type</Label>
              <Select
                value={formData.cardType || 'none'}
                onValueChange={(value) => setFormData({ ...formData, cardType: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="cardType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CARD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.categoryId || 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, categoryId: value === 'none' ? null : value })
              }
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Day */}
          <div className="space-y-2">
            <Label htmlFor="dueDay">Payment Due Day</Label>
            <Select
              value={formData.dueDay?.toString() || 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, dueDay: value === 'none' ? null : parseInt(value) })
              }
            >
              <SelectTrigger id="dueDay">
                <SelectValue placeholder="Select day of month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {DUE_DAYS.map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Day of the month this bill is due, e.g. 29
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              maxLength={1000}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            {card ? 'Save Changes' : 'Add Card'}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};