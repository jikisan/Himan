import { Text, View } from 'react-native';

/**
 * Handwritten-style heading — the notebook's voice. Used for store names,
 * screen titles, and section labels. Falls back gracefully if the Caveat
 * font hasn't loaded yet (system font, slightly smaller line-height).
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
  const sizeClass = size === 'xl' ? 'text-5xl' : size === 'lg' ? 'text-4xl' : 'text-3xl';
  return (
    <View className={className}>
      <Text className={`font-handbold text-ink dark:text-ink-dark ${sizeClass}`}>
        {children}
      </Text>
    </View>
  );
}
