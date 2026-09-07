import { useState } from 'react';
import { Alert } from 'react-native';
import type { GroceryListType } from '@himan/shared/grocery';
import { useGroceryLists } from './useGroceryLists';
import { useTemplates } from './useTemplates';

export interface TemplateMenuPosition {
  item: GroceryListType;
  x: number;
  y: number;
}

export function useTemplatesScreenHandlers() {
  const { lists, createList, updateList, deleteList } = useGroceryLists();
  const { duplicateTemplate } = useTemplates();

  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<GroceryListType | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menu, setMenu] = useState<TemplateMenuPosition | null>(null);

  const templates = lists.filter((l) => !l.isArchived);

  const openMenu = (item: GroceryListType, target: any) => {
    target?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
      setMenu({ item, x: x + w, y: y + h });
    });
  };

  const closeMenu = () => setMenu(null);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createList({ name });
    setNewName('');
  };

  const startRenaming = (item: GroceryListType) => {
    setRenaming(item);
    setRenameValue(item.name);
  };

  const cancelRenaming = () => setRenaming(null);

  const saveRename = async () => {
    if (!renaming) return;
    await updateList(renaming.id, { name: renameValue.trim() });
    setRenaming(null);
  };

  const confirmDelete = (t: GroceryListType) =>
    Alert.alert('Delete list?', `“${t.name}” will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteList(t.id) },
    ]);

  return {
    templates,
    newName,
    setNewName,
    handleCreate,
    renaming,
    renameValue,
    setRenameValue,
    startRenaming,
    cancelRenaming,
    saveRename,
    menu,
    openMenu,
    closeMenu,
    duplicateTemplate,
    confirmDelete,
  };
}
