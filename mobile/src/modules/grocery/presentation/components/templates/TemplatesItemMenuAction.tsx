import { Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';
import type { TemplateMenuActionDescriptor } from './TemplatesItemMenuActions';

interface TemplatesItemMenuActionProps {
  c: NotebookColors;
  action: TemplateMenuActionDescriptor;
  showDivider: boolean;
  onPress: () => void;
}

export function TemplatesItemMenuAction({ c, action, showDivider, onPress }: TemplatesItemMenuActionProps) {
  const color = action.destructive ? c.danger : c.ink;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-3 active:bg-black/5 ${
        showDivider ? 'border-b border-rule dark:border-rule-dark' : ''
      }`}
    >
      <Feather name={action.icon} size={18} color={color} />
      <Text className="text-base font-serif" style={{ color }}>
        {action.label}
      </Text>
    </Pressable>
  );
}
