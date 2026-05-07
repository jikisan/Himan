import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CheckboxProps {
  checked: boolean;
  color?: string;
  size?: number;
}

export const Checkbox = ({
  checked,
  color = 'indigo',
  size = 22,
}: CheckboxProps) => {
  const colorClasses = {
    indigo: checked ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-gray-600',
    green: checked ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600',
  };

  return (
    <View
      className={`flex-shrink-0 h-[${size}px] w-[${size}px] rounded-full border-2 flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      {checked && <Feather name="check" size={12} color="#ffffff" />}
    </View>
  );
};
