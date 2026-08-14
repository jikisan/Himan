import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { GroceryItemType, UpdateGroceryItemDto, CreateGroceryItemDto } from '@himan/shared/grocery';

const GROCERY_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Pantry',
  'Beverages',
  'Snacks',
  'Condiments & Sauces',
  'Breakfast & Cereal',
  'Pasta, Rice & Grains',
  'Canned Goods',
  'Spices & Seasonings',
  'Cooking Oils',
  'Deli',
  'Organic & Healthy',
  'International Foods',
  'Baby Products',
  'Pet Supplies',
  'Health & Wellness',
  'Household',
  'Cleaning Supplies',
  'Laundry',
  'Paper Products',
  'Personal Care',
  'Beauty & Cosmetics',
  'Pharmacy',
  'Alcohol',
  'Tobacco',
  'Party Supplies',
  'Kitchen Supplies',
  'Office Supplies',
  'Electronics',
  'Seasonal',
] as const;

const GROCERY_UNITS = [
  'pcs',
  'kg',
  'g',
  'L',
  'mL',
  'lb',
  'oz',
  'tray',
  'pack',
  'bottle',
  'can',
  'box',
  'bag',
  'dozen',
  'bunch',
] as const;

type ItemDetailMode = 'add' | 'edit';

interface ItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: GroceryItemType | null;
  mode?: ItemDetailMode;
  onSave: (id: string, dto: UpdateGroceryItemDto) => void;
  onAdd?: (dto: CreateGroceryItemDto) => void;
  onDelete: (id: string) => void;
  listId?: string | null;
}

export const ItemDetailSheet = ({
  open,
  onOpenChange,
  item,
  mode = 'edit',
  onSave,
  onAdd,
  onDelete,
  listId,
}: ItemDetailSheetProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [isOtherUnit, setIsOtherUnit] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const insets = useSafeAreaInsets();

  const isAddMode = mode === 'add';

  useEffect(() => {
    if (isAddMode) {
      setName('');
      setCategory('');
      setCustomCategory('');
      setIsOtherCategory(false);
      setQuantity('1');
      setUnit('');
      setCustomUnit('');
      setIsOtherUnit(false);
      setNotes('');
    } else if (item) {
      setName(item.name);
      const cat = item.category ?? '';
      const isPredefined = GROCERY_CATEGORIES.includes(cat as typeof GROCERY_CATEGORIES[number]);
      if (cat && !isPredefined) {
        setCategory('Other');
        setCustomCategory(cat);
        setIsOtherCategory(true);
      } else {
        setCategory(cat);
        setCustomCategory('');
        setIsOtherCategory(false);
      }
      setQuantity(String(item.quantity));
      const u = item.unit ?? '';
      const isPredefinedUnit = GROCERY_UNITS.includes(u as typeof GROCERY_UNITS[number]);
      if (u && !isPredefinedUnit) {
        setUnit('Other');
        setCustomUnit(u);
        setIsOtherUnit(true);
      } else {
        setUnit(u);
        setCustomUnit('');
        setIsOtherUnit(false);
      }
      setNotes(item.notes ?? '');
    }
  }, [item, isAddMode, open]);

  const handleSave = () => {
    if (!name.trim()) return;

    const resolvedCategory = isOtherCategory
      ? customCategory.trim() || undefined
      : category || undefined;

    const resolvedUnit = isOtherUnit
      ? customUnit.trim() || undefined
      : unit || undefined;

    if (isAddMode) {
      if (!onAdd) return;
      onAdd({
        listId: listId || '',
        name: name.trim(),
        category: resolvedCategory,
        quantity: parseFloat(quantity) || 1,
        unit: resolvedUnit,
        notes: notes.trim() || undefined,
      });
    } else {
      if (!item) return;
      onSave(item.id, {
        name: name.trim(),
        category: resolvedCategory,
        quantity: parseFloat(quantity) || 1,
        unit: resolvedUnit,
        notes: notes.trim() || undefined,
      });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!item || isAddMode) return;
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete(item.id);
          onOpenChange(false);
        },
      },
    ]);
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => onOpenChange(false)}
        />
        <Pressable className="bg-paper dark:bg-paper-dark rounded-t-3xl max-h-[85%]">
          <ScrollView keyboardShouldPersistTaps="handled" className="p-6" contentContainerStyle={{ paddingBottom: insets.bottom }}>
            {/* Drag Handle */}
            <View className="items-center mb-4">
              <View className="w-10 h-1 rounded-full bg-ink-faint/40 dark:bg-ink-faintdark/40" />
            </View>

            {/* Header */}
            <View className="flex flex-row items-center justify-between mb-6">
              <View className="flex flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-sticky dark:bg-sticky-dark items-center justify-center">
                  <Feather name={isAddMode ? 'plus' : 'edit-2'} size={20} color="#0088b0" />
                </View>
                <Text className="text-2xl font-serifsemi text-ink dark:text-ink-dark">
                  {isAddMode ? 'Add Item' : 'Edit Item'}
                </Text>
              </View>
              <Pressable
                onPress={() => onOpenChange(false)}
                className="w-9 h-9 rounded-full bg-surface dark:bg-surface-dark items-center justify-center active:opacity-70"
              >
                <Feather name="x" size={18} color="#7d7979" />
              </Pressable>
            </View>

            {/* Form */}
            <View className="gap-5">
              {/* Name - Full width */}
              <View>
                <View className="flex flex-row items-center gap-2 mb-2">
                  <Feather name="tag" size={14} color="#0088b0" />
                  <Text className="text-[14px] font-serifsemi text-ink dark:text-ink-dark">Item Name</Text>
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onSubmitEditing={handleSave}
                  placeholder="Enter item name"
                  placeholderTextColor="#9b9797"
                  autoFocus
                  className="border border-rule dark:border-rule-dark rounded-sm p-3.5 text-base font-serif text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark"
                />
              </View>

              {/* Category */}
              <View>
                <View className="flex flex-row items-center gap-2 mb-2">
                  <Feather name="folder" size={14} color="#0088b0" />
                  <Text className="text-[14px] font-serifsemi text-ink dark:text-ink-dark">Category</Text>
                </View>
                <Pressable
                  onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className="border border-rule dark:border-rule-dark rounded-sm p-3.5 bg-surface dark:bg-surface-dark flex flex-row items-center justify-between"
                >
                  <Text className={`text-base ${
                    category
                      ? 'text-ink dark:text-ink-dark'
                      : 'text-ink-faint dark:text-ink-faintdark'
                  }`}>
                    {isOtherCategory ? 'Other' : category || 'Select a category'}
                  </Text>
                  <Feather name={categoryDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#9b9797" />
                </Pressable>
                {categoryDropdownOpen && (
                  <View className="border border-rule dark:border-rule-dark rounded-sm mt-1 bg-paper dark:bg-paper-dark overflow-hidden">
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                      {GROCERY_CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat}
                          onPress={() => {
                            setCategory(cat);
                            setIsOtherCategory(false);
                            setCustomCategory('');
                            setCategoryDropdownOpen(false);
                          }}
                          className={`px-4 py-3 border-b border-rule dark:border-rule-dark ${
                            category === cat ? 'bg-sticky dark:bg-sticky-dark' : 'active:bg-surface dark:active:bg-surface-dark'
                          }`}
                        >
                          <Text className={`text-base ${
                            category === cat
                              ? 'text-accent-text dark:text-accent-textdark font-serifsemi'
                              : 'text-ink dark:text-ink-dark'
                          }`}>
                            {cat}
                          </Text>
                        </Pressable>
                      ))}
                      <Pressable
                        onPress={() => {
                          setCategory('Other');
                          setIsOtherCategory(true);
                          setCategoryDropdownOpen(false);
                        }}
                        className={`px-4 py-3 ${
                          isOtherCategory ? 'bg-sticky dark:bg-sticky-dark' : 'active:bg-surface dark:active:bg-surface-dark'
                        }`}
                      >
                        <Text className={`text-base font-serif ${
                          isOtherCategory
                            ? 'text-accent-text dark:text-accent-textdark font-serifsemi'
                            : 'text-ink dark:text-ink-dark'
                        }`}>
                          Other
                        </Text>
                      </Pressable>
                    </ScrollView>
                  </View>
                )}
                {isOtherCategory && (
                  <TextInput
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    placeholder="Enter custom category"
                    placeholderTextColor="#9b9797"
                    className="border border-rule dark:border-rule-dark rounded-sm p-3.5 text-base font-serif text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark mt-2"
                  />
                )}
              </View>

              {/* Quantity & Unit - Row */}
              <View className="flex flex-row gap-3">
                <View className="flex-[0.4]">
                  <View className="flex flex-row items-center gap-2 mb-2">
                    <Feather name="hash" size={14} color="#0088b0" />
                    <Text className="text-[14px] font-serifsemi text-ink dark:text-ink-dark">Qty</Text>
                  </View>
                  <TextInput
                    value={quantity}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
                      setQuantity(filtered);
                    }}
                    keyboardType="decimal-pad"
                    className="border border-rule dark:border-rule-dark rounded-sm p-3.5 text-base font-serif text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark text-center"
                  />
                </View>
                <View className="flex-1">
                  <View className="flex flex-row items-center gap-2 mb-2">
                    <Feather name="box" size={14} color="#0088b0" />
                    <Text className="text-[14px] font-serifsemi text-ink dark:text-ink-dark">Unit</Text>
                  </View>
                  <Pressable
                    onPress={() => setUnitDropdownOpen(!unitDropdownOpen)}
                    className="border border-rule dark:border-rule-dark rounded-sm p-3.5 bg-surface dark:bg-surface-dark flex flex-row items-center justify-between"
                  >
                    <Text className={`text-base ${
                      unit
                        ? 'text-ink dark:text-ink-dark'
                        : 'text-ink-faint dark:text-ink-faintdark'
                    }`}>
                      {isOtherUnit ? 'Other' : unit || 'Select'}
                    </Text>
                    <Feather name={unitDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#9b9797" />
                  </Pressable>
                </View>
              </View>
              {unitDropdownOpen && (
                <View className="border border-rule dark:border-rule-dark rounded-sm bg-paper dark:bg-paper-dark overflow-hidden">
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                    {GROCERY_UNITS.map((u) => (
                      <Pressable
                        key={u}
                        onPress={() => {
                          setUnit(u);
                          setIsOtherUnit(false);
                          setCustomUnit('');
                          setUnitDropdownOpen(false);
                        }}
                        className={`px-4 py-3 border-b border-rule dark:border-rule-dark ${
                          unit === u ? 'bg-sticky dark:bg-sticky-dark' : 'active:bg-surface dark:active:bg-surface-dark'
                        }`}
                      >
                        <Text className={`text-base ${
                          unit === u
                            ? 'text-accent-text dark:text-accent-textdark font-serifsemi'
                            : 'text-ink dark:text-ink-dark'
                        }`}>
                          {u}
                        </Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => {
                        setUnit('Other');
                        setIsOtherUnit(true);
                        setUnitDropdownOpen(false);
                      }}
                      className={`px-4 py-3 ${
                        isOtherUnit ? 'bg-sticky dark:bg-sticky-dark' : 'active:bg-surface dark:active:bg-surface-dark'
                      }`}
                    >
                      <Text className={`text-base ${
                        isOtherUnit
                          ? 'text-accent-text dark:text-accent-textdark font-serifsemi'
                          : 'text-ink dark:text-ink-dark'
                      }`}>
                        Other
                      </Text>
                    </Pressable>
                  </ScrollView>
                </View>
              )}
              {isOtherUnit && (
                <TextInput
                  value={customUnit}
                  onChangeText={setCustomUnit}
                  placeholder="Enter custom unit"
                  placeholderTextColor="#9b9797"
                  className="border border-rule dark:border-rule-dark rounded-sm p-3.5 text-base font-serif text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark"
                />
              )}

              {/* Notes */}
              <View>
                <View className="flex flex-row items-center gap-2 mb-2">
                  <Feather name="file-text" size={14} color="#0088b0" />
                  <Text className="text-[14px] font-serifsemi text-ink dark:text-ink-dark">Notes</Text>
                  <Text className="text-[13px] font-serif text-ink-faint dark:text-ink-faintdark">(Optional)</Text>
                </View>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g., organic, low fat, preferred brand"
                  placeholderTextColor="#9b9797"
                  multiline
                  numberOfLines={3}
                  className="border border-rule dark:border-rule-dark rounded-sm p-3.5 text-base font-serif text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark min-h-[80px]"
                  textAlignVertical="top"
                />
              </View>

              {/* Action Buttons */}
              <View className="flex flex-row gap-3 pt-2">
                <Pressable
                  onPress={handleSave}
                  disabled={!name.trim()}
                  className={`flex-1 flex flex-row items-center justify-center gap-2 py-3.5 rounded-xl ${
                    name.trim() ? 'bg-accent dark:bg-accent-dark active:opacity-90' : 'bg-surface dark:bg-surface-dark'
                  }`}
                >
                  <Feather name="check" size={18} color="#ffffff" />
                  <Text className="text-white font-semibold text-base">
                    {isAddMode ? 'Add Item' : 'Save Changes'}
                  </Text>
                </Pressable>
                {!isAddMode && (
                  <Pressable
                    onPress={handleDelete}
                    className="flex flex-row items-center justify-center gap-2 rounded-sm py-3.5 px-5 border border-margin"
                  >
                    <Feather name="trash-2" size={18} color="#aa0b56" />
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
