import { View, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useColorScheme } from 'nativewind';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';
import { useStartErrandForm } from '@/modules/grocery/presentation/hooks/useStartErrandForm';
import { StartErrandModalHeader } from './StartErrandModalHeader';
import { StoreField } from './StoreField';
import { ErrandNameField } from './ErrandNameField';
import { ListSelector } from './ListSelector';
import { StartShoppingButton } from './StartShoppingButton';

interface StartErrandModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onStarted: () => void;
  insetsBottom: number;
}

export function StartErrandModal({ visible, onClose, userId, onStarted, insetsBottom }: StartErrandModalProps) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  const {
    templates,
    recentStores,
    selected,
    toggleList,
    store,
    setStore,
    errandName,
    setErrandName,
    canStart,
    isStarting,
    start,
  } = useStartErrandForm({ userId, enabled: visible, onStarted });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <KeyboardAvoidingView behavior="padding">
          <View
            className="rounded-t-3xl bg-paper dark:bg-paper-dark px-5 pt-4"
            style={{ paddingBottom: Math.max(insetsBottom, 24), maxHeight: '85%' }}
          >
            <StartErrandModalHeader c={c} onClose={onClose} />

            <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
              <StoreField c={c} store={store} onChangeStore={setStore} recentStores={recentStores} />
              <ErrandNameField c={c} errandName={errandName} onChangeErrandName={setErrandName} />
              <ListSelector c={c} templates={templates} selected={selected} onToggle={toggleList} />
            </ScrollView>

            <StartShoppingButton c={c} canStart={canStart} isStarting={isStarting} onPress={start} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
