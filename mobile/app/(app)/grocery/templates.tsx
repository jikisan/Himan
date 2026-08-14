import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { GroceryListType } from '@himan/shared/grocery';
import { useGroceryLists } from '@/modules/grocery/presentation/hooks/useGroceryLists';
import { useTemplates } from '@/modules/grocery/presentation/hooks/useTemplates';
import {
  PaperSurface,
  SectionHeading,
  SyncBadge,
} from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

export default function TemplatesScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;
  const { lists, createList, updateList, deleteList } = useGroceryLists();
  const { duplicateTemplate } = useTemplates();

  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<GroceryListType | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menu, setMenu] = useState<{
    item: GroceryListType;
    x: number;
    y: number;
  } | null>(null);

  const openMenu = (item: GroceryListType, target: any) => {
    target?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
      setMenu({ item, x: x + w, y: y + h });
    });
  };

  const templates = lists.filter((l) => !l.isArchived);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createList({ name });
    setNewName('');
  };

  const confirmDelete = (t: GroceryListType) =>
    Alert.alert('Delete list?', `“${t.name}” will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteList(t.id) },
    ]);

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-5 pt-8 pb-3 border-b border-rule dark:border-rule-dark">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 active:opacity-60">
              <Feather name="chevron-left" size={22} color={c.ink} />
              <Text className="text-ink dark:text-ink-dark font-serif">Notebook</Text>
            </Pressable>
            <SyncBadge />
          </View>
          <SectionHeading size="xl" className="mt-8">Lists</SectionHeading>

          <View className="flex-row items-center gap-2 mt-3 rounded-2xl px-3 py-2 border border-rule dark:border-rule-dark">
            <Feather name="plus" size={18} color={c.inkSoft} />
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="New list name…"
              placeholderTextColor={c.inkSoft}
              className="flex-1 text-ink dark:text-ink-dark font-serif"
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />
            {newName.trim() ? (
              <Pressable onPress={handleCreate} hitSlop={8}>
                <Feather name="arrow-right-circle" size={22} color={c.accent} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {renaming ? (
          <View className="px-5 py-3 border-b border-rule dark:border-rule-dark flex-row items-center gap-2">
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              className="flex-1 text-ink dark:text-ink-dark rounded-xl px-3 py-2 border border-rule dark:border-rule-dark font-serif"
            />
            <Pressable
              onPress={async () => {
                await updateList(renaming.id, { name: renameValue.trim() });
                setRenaming(null);
              }}
            >
              <Feather name="check" size={22} color={c.accent} />
            </Pressable>
            <Pressable onPress={() => setRenaming(null)}>
              <Feather name="x" size={22} color={c.inkSoft} />
            </Pressable>
          </View>
        ) : null}

        <FlatList
          data={templates}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/grocery/${item.id}`)}
              onLongPress={(e) => openMenu(item, e.currentTarget)}
              className="flex-row items-center gap-3 pl-6 pr-4 py-4 border-b border-rule dark:border-rule-dark active:bg-black/5"
            >
              <View className="absolute left-3 top-0 bottom-0 w-px" style={{ backgroundColor: c.margin }} />
              <View className="flex-1">
                <Text className="text-lg font-hand text-ink dark:text-ink-dark">{item.name}</Text>
                <Text className="text-xs text-ink-soft dark:text-ink-softdark mt-0.5 font-serif">
                  {item.itemCount} item{item.itemCount === 1 ? '' : 's'}
                  {item.memberCount > 1 ? ' · shared' : ''}
                </Text>
              </View>
              <Pressable onPress={(e) => openMenu(item, e.currentTarget)} hitSlop={10} className="p-1">
                <Feather name="more-vertical" size={20} color={c.inkSoft} />
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center px-8 py-20">
              <Feather name="clipboard" size={36} color={c.inkSoft} />
              <Text className="mt-3 text-center text-ink-soft dark:text-ink-softdark font-serif">
                No lists yet. Name one above to start a reusable template.
              </Text>
            </View>
          }
        />
      </SafeAreaView>

      <Modal
        visible={!!menu}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(null)}
      >
        <Pressable className="flex-1" onPress={() => setMenu(null)}>
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
              {[
                {
                  icon: 'external-link' as const,
                  label: 'Open',
                  run: () => router.push(`/grocery/${menu.item.id}`),
                },
                {
                  icon: 'edit-2' as const,
                  label: 'Rename',
                  run: () => {
                    setRenaming(menu.item);
                    setRenameValue(menu.item.name);
                  },
                },
                {
                  icon: 'copy' as const,
                  label: 'Duplicate',
                  run: () => duplicateTemplate(menu.item.id, menu.item.name),
                },
              ].map((a) => (
                <Pressable
                  key={a.label}
                  onPress={() => {
                    const run = a.run;
                    setMenu(null);
                    run();
                  }}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-rule dark:border-rule-dark active:bg-black/5"
                >
                  <Feather name={a.icon} size={18} color={c.ink} />
                  <Text className="text-base font-serif text-ink dark:text-ink-dark">{a.label}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => {
                  const t = menu.item;
                  setMenu(null);
                  confirmDelete(t);
                }}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-black/5"
              >
                <Feather name="trash-2" size={18} color={c.danger} />
                <Text className="text-base font-serif" style={{ color: c.danger }}>Delete</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </PaperSurface>
  );
}
