import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { PaperSurface, SectionHeading } from '@/modules/grocery/presentation/components/notebook';
import {
  TemplatesHeader,
  TemplatesCreateListInput,
  TemplatesRenameBar,
  TemplatesList,
  TemplatesItemMenu,
} from '@/modules/grocery/presentation/components/templates';
import { useTemplatesScreenHandlers } from '@/modules/grocery/presentation/hooks/useTemplatesScreenHandlers';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

export default function TemplatesScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  const {
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
  } = useTemplatesScreenHandlers();

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-5 pt-8 pb-3 border-b border-rule dark:border-rule-dark">
          <TemplatesHeader c={c} />
          <SectionHeading size="xl" className="mt-8">Lists</SectionHeading>
          <TemplatesCreateListInput c={c} value={newName} onChangeText={setNewName} onSubmit={handleCreate} />
        </View>

        {renaming ? (
          <TemplatesRenameBar
            c={c}
            value={renameValue}
            onChangeText={setRenameValue}
            onSave={saveRename}
            onCancel={cancelRenaming}
          />
        ) : null}

        <TemplatesList
          c={c}
          templates={templates}
          onOpenItem={(item) => router.push(`/grocery/${item.id}`)}
          onOpenMenu={openMenu}
        />
      </SafeAreaView>

      <TemplatesItemMenu
        c={c}
        menu={menu}
        onClose={closeMenu}
        onOpen={(item) => router.push(`/grocery/${item.id}`)}
        onRename={startRenaming}
        onDuplicate={(item) => duplicateTemplate(item.id, item.name)}
        onDelete={confirmDelete}
      />
    </PaperSurface>
  );
}
