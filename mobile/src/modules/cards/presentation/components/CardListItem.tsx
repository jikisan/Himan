import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { CreditCard, getCardColorTheme } from '@himan/shared/cards';
import type { CreditCardType } from '@himan/shared/cards';
import { ordinal } from '@himan/shared/utils';

interface CardListItemProps {
  card: CreditCardType;
  onPress: (card: CreditCardType) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onCopied?: (label: string) => void;
}

type Gradient = readonly [string, string, ...string[]];

const withAlpha = (hex: string, a: number): string => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
};

// Pure-JS vertical gradient (stacked interpolated bands) — no native module, so it
// runs on the existing binary and in Expo Go without a rebuild.
const toRgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const bands = (stops: Gradient, steps = 20): string[] => {
  const rgb = stops.map(toRgb);
  return Array.from({ length: steps }, (_, i) => {
    const p = (i / (steps - 1)) * (rgb.length - 1);
    const idx = Math.min(Math.floor(p), rgb.length - 2);
    const t = p - idx;
    const c = rgb[idx].map((v, k) => Math.round(v + (rgb[idx + 1][k] - v) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  });
};
const Gradient = ({
  colors,
  style,
  children,
}: {
  colors: Gradient;
  style?: object;
  children?: React.ReactNode;
}) => (
  <View style={style}>
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bands(colors).map((c, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
    {children}
  </View>
);

// Each row is rendered as the physical card face: brand-tinted gradient, chip,
// network mark, masked number. Faces stay dark in both themes — real cards
// don't switch to light mode, and it keeps identity constant across the list.
const BRAND_GRADIENT: Record<string, Gradient> = {
  Visa: ['#1a1f5c', '#25309a', '#3f51d4'],
  Mastercard: ['#201d1b', '#3a2a1e', '#4a3221'],
  'American Express': ['#0369a1', '#0a8fd0', '#22b3e6'],
  Discover: ['#26262b', '#3c3c44', '#5c4a34'],
};
const DEFAULT_GRADIENT: Gradient = ['#3730a3', '#4f46e5', '#6366f1'];
const EXPIRED_GRADIENT: Gradient = ['#3a3a40', '#494950', '#585860'];

// Network mark drawn light for the dark face (CardBrandBadge is tuned for light rows).
const BrandMark = ({ brand, issuer, fg }: { brand: string; issuer: string | null; fg: string }) => {
  switch (brand) {
    case 'Visa':
      return <Text className="text-lg font-extrabold italic tracking-tight " style={{ color: fg }}>VISA</Text>;
    case 'Mastercard':
      return (
        <View className="flex-row items-center">
          <View className="w-6 h-6 rounded-full" style={{ backgroundColor: '#EB001B' }} />
          <View className="w-6 h-6 rounded-full -ml-3" style={{ backgroundColor: '#F79E1B', opacity: 0.9 }} />
        </View>
      );
    case 'American Express':
      return <Text className="text-sm font-bold tracking-[3px] " style={{ color: fg }}>AMEX</Text>;
    case 'Discover':
      return (
        <View className="flex-row items-center gap-1">
          <Text className="text-sm font-bold tracking-wide " style={{ color: fg }}>DISC</Text>
          <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FF6000' }} />
        </View>
      );
    default:
      return issuer ? (
        <Text className="text-xs font-semibold uppercase tracking-widest " style={{ color: withAlpha(fg, 0.7) }} numberOfLines={1}>
          {issuer}
        </Text>
      ) : null;
  }
};

// EMV chip glyph — gold plate with a contact grid.
const Chip = () => (
  <Gradient
    colors={['#f6e6a8', '#d9b64c', '#b8912f']}
    style={{ width: 44, height: 32, borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
  >
    <View className="w-6 h-5 rounded-sm border border-black/20" />
    <View className="absolute w-full h-px bg-black/15" />
    <View className="absolute h-full w-px bg-black/15" />
  </Gradient>
);

export const CardListItem = ({ card, onPress, onToggleFavorite, onCopied }: CardListItemProps) => {
  const entity = new CreditCard(card);
  const isExpired = entity.isExpired();
  const isExpiringSoon = !isExpired && entity.isExpiringSoon(3);
  const brand = entity.getCardBrand();

  const last4 = card.cardNumber.replace(/\D/g, '').slice(-4);
  const expiryStr = `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`;
  const theme = card.color ? getCardColorTheme(card.color) : null;
  const gradient: Gradient = theme ? theme.stops : isExpired ? EXPIRED_GRADIENT : BRAND_GRADIENT[brand] ?? DEFAULT_GRADIENT;
  const fg = theme ? theme.foreground : '#ffffff';
  const pressTint = theme && !theme.isDark ? 'active:bg-black/10' : 'active:bg-white/10';

  // Small press feedback on the whole card; skipped when reduced motion is on.
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pressIn = () => { if (!reduce) scale.value = withTiming(0.98, { duration: 120 }); };
  const pressOut = () => { scale.value = withTiming(1, { duration: reduce ? 0 : 160 }); };

  const handleCopyCardNumber = async () => {
    await Clipboard.setStringAsync(card.cardNumber.replace(/\D/g, ''));
    onCopied?.('Card number copied');
  };

  const handleCopyCvv = async () => {
    await Clipboard.setStringAsync(card.cvv);
    onCopied?.('CVV copied');
  };

  return (
    <Animated.View
      className="mx-4 mb-3.5 rounded-3xl"
      style={[
        {
          shadowColor: gradient[1],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 14,
          elevation: 6,
        },
        pressStyle,
      ]}
    >
      <Gradient colors={gradient} style={{ borderRadius: 24, overflow: 'hidden' }}>
        {/* Soft top-right glare */}
        <View className="absolute -top-12 -right-8 w-48 h-48 rounded-full" style={{ backgroundColor: withAlpha(fg, 0.1) }} />

        {/* Card face — opens detail */}
        <Pressable
          onPress={() => onPress(card)}
          onPressIn={pressIn}
          onPressOut={pressOut}
          className="px-5 pt-4 pb-3"
        >
          {/* Chip + status + favorite */}
          <View className="flex-row items-center justify-between">
            <Chip />
            <View className="flex-row items-center gap-2">
              {isExpired && (
                <View className="px-2 py-0.5 rounded-full bg-red-500">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-white">Expired</Text>
                </View>
              )}
              {isExpiringSoon && (
                <View className="px-2 py-0.5 rounded-full bg-amber-400">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-gray-900">Expiring</Text>
                </View>
              )}
              <Pressable
                onPress={() => onToggleFavorite(card.id, !card.isFavorite)}
                hitSlop={12}
                className="active:opacity-60"
              >
                <Feather
                  name="star"
                  size={22}
                  color={card.isFavorite ? '#fbbf24' : withAlpha(fg, 0.55)}
                />
              </Pressable>
            </View>
          </View>

          {/* Masked number */}
          <Text className="mt-5 text-xl font-mono tracking-[2px] " style={{ color: fg }}>
            ••••  ••••  ••••  {last4}
          </Text>

          {/* Holder / bank + expiry */}
          <View className="mt-4 flex-row items-end justify-between gap-4">
            <View className="flex-1 min-w-0">
              <Text className="text-[9px] font-semibold uppercase tracking-widest " style={{ color: withAlpha(fg, 0.5) }}>
                Card
              </Text>
              <Text className="text-base font-semibold " style={{ color: fg }} numberOfLines={1}>
                {card.cardName}
              </Text>
              {card.bankName ? (
                <Text className="text-xs " style={{ color: withAlpha(fg, 0.6) }} numberOfLines={1}>
                  {card.bankName}
                </Text>
              ) : null}
              {card.dueDay ? (
                <View className="mt-1 flex-row items-center gap-1">
                  <Feather name="calendar" size={11} color={withAlpha(fg, 0.6)} />
                  <Text className="text-[11px] " style={{ color: withAlpha(fg, 0.6) }}>Due {ordinal(card.dueDay)}</Text>
                </View>
              ) : null}
            </View>
            <View className="items-end shrink-0">
              <Text className="text-[9px] font-semibold uppercase tracking-widest " style={{ color: withAlpha(fg, 0.5) }}>
                Expires
              </Text>
              <Text className="text-sm font-mono tracking-wide " style={{ color: fg }}>{expiryStr}</Text>
            </View>
          </View>
        </Pressable>

        {/* Action bar — brand mark anchors identity, copy is the primary job */}
        <View className="flex-row items-center justify-between border-t pl-5 pr-2" style={{ borderTopColor: withAlpha(fg, 0.15) }}>
          <BrandMark brand={brand} issuer={card.cardIssuer} fg={fg} />
          <View className="flex-row items-center">
            <Pressable
              onPress={handleCopyCardNumber}
              className={`flex-row items-center gap-1.5 rounded-xl px-3 ${pressTint}`}
              style={{ minHeight: 44 }}
            >
              <Feather name="copy" size={14} color={withAlpha(fg, 0.9)} />
              <Text className="text-xs font-semibold " style={{ color: withAlpha(fg, 0.9) }}>Number</Text>
            </Pressable>
            <View className="w-px h-4" style={{ backgroundColor: withAlpha(fg, 0.15) }} />
            <Pressable
              onPress={handleCopyCvv}
              className={`flex-row items-center gap-1.5 rounded-xl px-3 ${pressTint}`}
              style={{ minHeight: 44 }}
            >
              <Feather name="copy" size={14} color={withAlpha(fg, 0.9)} />
              <Text className="text-xs font-semibold " style={{ color: withAlpha(fg, 0.9) }}>CVV</Text>
            </Pressable>
          </View>
        </View>
      </Gradient>
    </Animated.View>
  );
};
