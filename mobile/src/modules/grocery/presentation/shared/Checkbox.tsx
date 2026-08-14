import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CheckboxProps {
  checked: boolean;
  size?: number;
}

// One accent. Rounded square, 2px faint border unchecked; solid cyan fill +
// white check when checked.
export const Checkbox = ({ checked, size = 24 }: CheckboxProps) => {
  return (
    <View
      style={{ width: size, height: size }}
      className={`flex-shrink-0 rounded-2xl border-2 items-center justify-center ${
        checked ? 'bg-accent border-accent dark:bg-accent-dark dark:border-accent-dark' : 'border-ink-faint dark:border-ink-faintdark'
      }`}
    >
      {checked && <Feather name="check" size={14} color="#ffffff" />}
    </View>
  );
};
