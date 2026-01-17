import type { CreditCardType } from '../types';

export class CreditCard implements CreditCardType {
  id: string;
  cardName: string;
  cardNumber: string; // Decrypted in memory
  cvv: string; // Decrypted in memory
  expiryMonth: number;
  expiryYear: number;
  bankName: string | null;
  cardIssuer: string | null;
  cardType: string | null;
  categoryId: string | null;
  userId: string;
  isFavorite: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: CreditCardType) {
    this.id = data.id;
    this.cardName = data.cardName;
    this.cardNumber = data.cardNumber;
    this.cvv = data.cvv;
    this.expiryMonth = data.expiryMonth;
    this.expiryYear = data.expiryYear;
    this.bankName = data.bankName;
    this.cardIssuer = data.cardIssuer;
    this.cardType = data.cardType;
    this.categoryId = data.categoryId;
    this.userId = data.userId;
    this.isFavorite = data.isFavorite;
    this.notes = data.notes;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Returns masked card number (e.g., "•••• •••• •••• 1234")
   */
  getMaskedNumber(): string {
    const digitsOnly = this.cardNumber.replace(/\D/g, '');
    if (digitsOnly.length < 4) {
      return '•••• •••• •••• ••••';
    }
    const last4 = digitsOnly.slice(-4);
    const maskedLength = digitsOnly.length - 4;
    const masked = '•'.repeat(maskedLength);
    
    // Format with spaces every 4 digits
    let formatted = masked + last4;
    formatted = formatted.replace(/(.{4})/g, '$1 ').trim();
    return formatted;
  }

  /**
   * Check if card expiry date has passed
   */
  isExpired(): boolean {
    const expiry = new Date(this.expiryYear, this.expiryMonth - 1);
    const now = new Date();
    return expiry < now;
  }

  /**
   * Check if card is expiring soon (within N months)
   */
  isExpiringSoon(months: number = 3): boolean {
    const expiry = new Date(this.expiryYear, this.expiryMonth - 1);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setMonth(now.getMonth() + months);
    return expiry <= futureDate && expiry > now;
  }

  /**
   * Returns relative time string (e.g., "2 days ago", "Just now")
   */
  getRelativeTime(): string {
    const now = new Date();
    const diff = now.getTime() - this.updatedAt.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return this.updatedAt.toLocaleDateString();
    } else if (days > 0) {
      return days + (days > 1 ? ' days ago' : ' day ago');
    } else if (hours > 0) {
      return hours + (hours > 1 ? ' hours ago' : ' hour ago');
    } else if (minutes > 0) {
      return minutes + (minutes > 1 ? ' minutes ago' : ' minute ago');
    } else {
      return 'Just now';
    }
  }

  /**
   * Detect card brand from card number (Visa, Mastercard, Amex, Discover, etc.)
   */
  getCardBrand(): string {
    const digitsOnly = this.cardNumber.replace(/\D/g, '');
    const firstDigit = digitsOnly.charAt(0);
    const firstTwoDigits = digitsOnly.substring(0, 2);

    // Visa: starts with 4
    if (firstDigit === '4') {
      return 'Visa';
    }

    // Mastercard: 51-55 or 2221-2720
    if ((firstTwoDigits >= '51' && firstTwoDigits <= '55') || 
        (digitsOnly.length >= 4 && parseInt(digitsOnly.substring(0, 4)) >= 2221 && parseInt(digitsOnly.substring(0, 4)) <= 2720)) {
      return 'Mastercard';
    }

    // American Express: 34 or 37
    if (firstTwoDigits === '34' || firstTwoDigits === '37') {
      return 'American Express';
    }

    // Discover: 6011, 65, or 644-649
    if (digitsOnly.startsWith('6011') || 
        firstTwoDigits === '65' ||
        (firstTwoDigits >= '64' && firstTwoDigits <= '69')) {
      return 'Discover';
    }

    // Default to card issuer if set, otherwise "Unknown"
    return this.cardIssuer || 'Unknown';
  }
}