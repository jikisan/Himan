import { View, Text } from 'react-native';
import { LABEL } from './constants';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className={LABEL}>{label}</Text>
      {children}
    </View>
  );
}
