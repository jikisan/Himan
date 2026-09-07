import { View, type ViewProps } from 'react-native';

/**
 * The page. A warm paper fill that reads as a notebook sheet in both themes.
 * Ruled lines are drawn per-row (see RuledRow) so long lists stay cheap.
 */
export function PaperSurface({ className = '', children, ...rest }: ViewProps & { className?: string }) {
  return (
    <View className={`flex-1 bg-paper dark:bg-paper-dark ${className}`} {...rest}>
      {children}
    </View>
  );
}
