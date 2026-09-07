import { Text, View } from 'react-native';

/**
 * Serif heading — the chrome's voice. Everything is Source Serif 4. Used for
 * screen titles and section labels. Big and calm, iOS-Notes scale.
 */
export function SectionHeading({
  children,
  size = 'lg',
  className = '',
}: {
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeClass = size === 'xl' ? 'text-[32px]' : size === 'lg' ? 'text-2xl' : 'text-xl';
  return (
    <View className={className}>
      <Text className={`font-serifsemi text-ink dark:text-ink-dark ${sizeClass}`}>
        {children}
      </Text>
    </View>
  );
}
