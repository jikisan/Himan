import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { ProductType } from '@himan/shared/grocery';
import { PressableScale, CategoryChip, SectionHeading } from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

interface ProductDialogHeaderProps {
  product: ProductType;
  isEditing: boolean;
  formName: string;
  onEditToggle: () => void;
  onNameChange: (name: string) => void;
  onDelete: (product: ProductType) => void;
  onClose: () => void;
}

export function ProductDialogHeader({
  product,
  isEditing,
  formName,
  onEditToggle,
  onNameChange,
  onDelete,
  onClose,
}: ProductDialogHeaderProps) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;
  const accentTextColor = colorScheme === 'dark' ? '#201e1d' : '#ffffff';

  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        {isEditing ? (
          <TextInput
            value={formName}
            onChangeText={onNameChange}
            placeholder="Product name"
            placeholderTextColor={c.inkSoft}
            className="text-2xl font-serifsemi text-ink dark:text-ink-dark pb-1"
          />
        ) : (
          <SectionHeading size="lg">{product.name}</SectionHeading>
        )}
        {!isEditing && (product.category || product.brand) ? (
          <View className="flex-row items-center gap-2 mt-2">
            {product.category ? <CategoryChip category={product.category} /> : null}
            {product.brand ? (
              <Text className="text-[13px] text-ink-soft dark:text-ink-softdark font-serif">
                {product.brand}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <View className="flex-row items-center gap-1.5">
        {!isEditing && <PressableScale
            onPress={onEditToggle}
            hitSlop={6}
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: c.surface }}
        >
          <Feather
              name={'edit-2'}
              size={16}
              color={c.inkSoft}
          />
        </PressableScale>}

        <PressableScale
          onPress={() =>
            Alert.alert('Delete product?', `Remove "${product.name}" from your catalog.`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(product) },
            ])
          }
          hitSlop={6}
          className="w-9 h-9 rounded-full items-center justify-center bg-surface dark:bg-surface-dark"
        >
          <Feather name="trash-2" size={15} color={c.margin} />
        </PressableScale>
        <PressableScale
          onPress={onClose}
          hitSlop={6}
          className="w-9 h-9 rounded-full items-center justify-center bg-surface dark:bg-surface-dark"
        >
          <Feather name="x" size={16} color={c.inkSoft} />
        </PressableScale>
      </View>
    </View>
  );
}
