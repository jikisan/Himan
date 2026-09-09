// Inline brand marks — no external host, works offline. Simplified but recognizable.
interface CardBrandLogoProps {
  brand: string;
  className?: string;
}

export const CardBrandLogo = ({ brand, className = 'h-5 w-auto' }: CardBrandLogoProps) => {
  switch (brand) {
    case 'Visa':
      return (
        <svg viewBox="0 0 48 16" className={className} role="img" aria-label="Visa">
          <text
            x="24"
            y="13"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
            fontSize="14"
            fontStyle="italic"
            fontWeight="700"
            fill="#1434CB"
          >
            VISA
          </text>
        </svg>
      );
    case 'Mastercard':
      return (
        <svg viewBox="0 0 32 20" className={className} role="img" aria-label="Mastercard">
          <circle cx="12" cy="10" r="8" fill="#EB001B" />
          <circle cx="20" cy="10" r="8" fill="#F79E1B" />
          <path
            d="M16 4a8 8 0 0 1 0 12 8 8 0 0 1 0-12z"
            fill="#FF5F00"
          />
        </svg>
      );
    case 'American Express':
      return (
        <svg viewBox="0 0 40 20" className={className} role="img" aria-label="American Express">
          <rect width="40" height="20" rx="2" fill="#006FCF" />
          <text
            x="20"
            y="13"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
            fontSize="8"
            fontWeight="700"
            fill="#FFFFFF"
          >
            AMEX
          </text>
        </svg>
      );
    case 'Discover':
      return (
        <svg viewBox="0 0 56 16" className={className} role="img" aria-label="Discover">
          <text
            x="0"
            y="13"
            fontFamily="Arial, sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="currentColor"
          >
            DISC
          </text>
          <circle cx="50" cy="9" r="5" fill="#FF6000" />
        </svg>
      );
    default:
      return null;
  }
};
