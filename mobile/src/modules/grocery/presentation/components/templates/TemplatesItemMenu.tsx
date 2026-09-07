import { View, Modal, Pressable } from 'react-native';
import type { GroceryListType } from '@himan/shared/grocery';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';
import type { TemplateMenuPosition } from '@/modules/grocery/presentation/hooks/useTemplatesScreenHandlers';
import { buildTemplateMenuActions } from './TemplatesItemMenuActions';
import { TemplatesItemMenuAction } from './TemplatesItemMenuAction';

interface TemplatesItemMenuProps {
  c: NotebookColors;
  menu: TemplateMenuPosition | null;
  onClose: () => void;
  onOpen: (item: GroceryListType) => void;
  onRename: (item: GroceryListType) => void;
  onDuplicate: (item: GroceryListType) => void;
  onDelete: (item: GroceryListType) => void;
}

export function TemplatesItemMenu({ c, menu, onClose, onOpen, onRename, onDuplicate, onDelete }: TemplatesItemMenuProps) {
  const actions = menu ? buildTemplateMenuActions({ item: menu.item, onOpen, onRename, onDuplicate, onDelete }) : [];

  return (
    <Modal visible={!!menu} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1" onPress={onClose}>
        {menu ? (
          <View
            className="absolute rounded-2xl border border-rule dark:border-rule-dark bg-paper dark:bg-paper-dark overflow-hidden"
            style={{
              top: menu.y + 4,
              left: Math.max(8, menu.x - 200),
              width: 200,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            {actions.map((action, index) => (
              <TemplatesItemMenuAction
                key={action.label}
                c={c}
                action={action}
                showDivider={index < actions.length - 1}
                onPress={() => {
                  onClose();
                  action.run();
                }}
              />
            ))}
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );
}
