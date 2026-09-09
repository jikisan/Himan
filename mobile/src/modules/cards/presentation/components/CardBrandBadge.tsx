import { View, Text } from 'react-native';

// Text-based brand marks (no react-native-svg dependency). Recognizable, not official assets.
interface CardBrandBadgeProps {
  brand: string;
}

export const BRANDS_WITH_LOGO = ['Visa', 'Mastercard', 'American Express', 'Discover'];

export const CardBrandBadge = ({ brand }: CardBrandBadgeProps) => {
  switch (brand) {
    case 'Visa':
      return (
        <Text className="text-sm font-extrabold italic" style={{ color: '#1434CB' }}>
          VISA
        </Text>
      );
    case 'Mastercard':
      return (
        <View className="flex-row items-center">
          <View className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#EB001B' }} />
          <View className="w-3.5 h-3.5 rounded-full -ml-1.5" style={{ backgroundColor: '#F79E1B' }} />
        </View>
      );
    case 'American Express':
      return (
        <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#006FCF' }}>
          <Text className="text-[10px] font-bold text-white">AMEX</Text>
        </View>
      );
    case 'Discover':
      return (
        <View className="flex-row items-center gap-1">
          <Text className="text-xs font-bold text-gray-700 dark:text-gray-200">DISC</Text>
          <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FF6000' }} />
        </View>
      );
    default:
      return null;
  }
};
