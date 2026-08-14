import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { ProductType, UpdateProductDto } from '@himan/shared/grocery';
import { useProductCatalog } from '@/modules/grocery/presentation/hooks/useProductCatalog';
import { useProductStores } from '@/modules/grocery/presentation/hooks/useProductStores';
import { useCurrency } from '@/modules/grocery/presentation/hooks/useCurrency';
import {
  PaperSurface,
  SectionHeading,
  CategoryChip,
  SyncBadge,
  PressableScale,
} from '@/modules/grocery/presentation/components/notebook';
import { ProductRow } from '@/modules/grocery/presentation/components/catalog/ProductRow';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

// Strong ease-out for the dialog entrance — built-in curves feel weak.
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Filled, borderless inputs read as softer/more tactile than hairline outlines.
const INPUT =
  'rounded-xl bg-surface dark:bg-surface-dark px-3 py-2.5 text-ink dark:text-ink-dark font-serif';
// For inputs sitting inside a surface-colored card — paper fill keeps contrast.
const INPUT_CARD =
  'rounded-lg bg-paper dark:bg-paper-dark px-3 py-2 text-ink dark:text-ink-dark font-serif';
const LABEL =
  'text-[11px] uppercase tracking-[1.5px] text-ink-soft dark:text-ink-softdark font-serif mb-1.5';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className={LABEL}>{label}</Text>
      {children}
    </View>
  );
}

export default function CatalogScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;
  const { format } = useCurrency();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ProductType | null>(null);

  const filters = useMemo(
    () => ({ searchQuery: search.trim() || undefined }),
    [search]
  );
  const { products, loading, upsertProduct, updateProduct, deleteProduct } =
    useProductCatalog(filters);

  const canCreate = search.trim().length > 0 && !products.some(
    (p) => p.name.toLowerCase() === search.trim().toLowerCase()
  );

  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    await upsertProduct({ name });
    setSearch('');
  };

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-5 pt-2 pb-3 border-b border-rule dark:border-rule-dark">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 active:opacity-60">
              <Feather name="chevron-left" size={22} color={c.ink} />
              <Text className="text-ink dark:text-ink-dark font-serif">Notebook</Text>
            </Pressable>
            <SyncBadge />
          </View>
          <SectionHeading size="xl" className="mt-6">Catalog</SectionHeading>

          <View className="flex-row items-center gap-2 mt-3 rounded-2xl px-3 py-2 border border-rule dark:border-rule-dark">
            <Feather name="search" size={18} color={c.inkSoft} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, brand, barcode…"
              placeholderTextColor={c.inkSoft}
              className="flex-1 text-ink dark:text-ink-dark font-serif"
              autoCapitalize="none"
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Feather name="x" size={18} color={c.inkSoft} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <ProductRow product={item} onPress={() => setSelected(item)} />
          )}
          ListHeaderComponent={
            canCreate ? (
              <Pressable
                onPress={handleCreate}
                className="flex-row items-center gap-2 px-6 py-4 border-b border-rule dark:border-rule-dark active:bg-black/5"
              >
                <Feather name="plus-circle" size={20} color={c.accent} />
                <Text style={{ color: c.accent }}>Add “{search.trim()}” to catalog</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View className="items-center px-8 py-20">
                <Feather name="book" size={36} color={c.inkSoft} />
                <Text className="mt-3 text-center text-ink-soft dark:text-ink-softdark font-serif">
                  Your catalog is empty. Search a product name and add it.
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>

      <ProductDialog
        product={selected}
        onClose={() => setSelected(null)}
        onUpdate={async (id, dto) => {
          const updated = await updateProduct(id, dto);
          setSelected(updated);
        }}
        onDelete={async (p) => {
          setSelected(null);
          await deleteProduct(p.id);
        }}
        formatMoney={format}
      />
    </PaperSurface>
  );
}

function ProductDialog({
  product,
  onClose,
  onUpdate,
  onDelete,
  formatMoney,
}: {
  product: ProductType | null;
  onClose: () => void;
  onUpdate: (id: string, dto: UpdateProductDto) => Promise<void>;
  onDelete: (p: ProductType) => void;
  formatMoney: (n: number) => string;
}) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  // Keep the last product mounted through the exit animation so the card can
  // scale/fade out instead of vanishing.
  const [rendered, setRendered] = useState<ProductType | null>(product);
  const anim = useSharedValue(product ? 1 : 0);

  useEffect(() => {
    if (product) {
      setRendered(product);
      anim.value = withTiming(1, { duration: 240, easing: EASE_OUT });
    } else {
      anim.value = withTiming(0, { duration: 160, easing: EASE_OUT }, (finished) => {
        if (finished) runOnJS(setRendered)(null);
      });
    }
  }, [product, anim]);

  const p = product ?? rendered;

  const backdropStyle = useAnimatedStyle(() => ({ opacity: anim.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ scale: 0.96 + anim.value * 0.04 }],
  }));

  const { prices, unattachedStores, updateDetails, removeStore } = useProductStores(p?.id ?? null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [aisleDrafts, setAisleDrafts] = useState<Record<string, string>>({});
  const [showStorePicker, setShowStorePicker] = useState(false);

  useEffect(() => {
    setPriceDrafts(
      Object.fromEntries(prices.map((sp) => [sp.store.id, sp.price != null ? String(sp.price) : '']))
    );
    setAisleDrafts(Object.fromEntries(prices.map((sp) => [sp.store.id, sp.aisle ?? ''])));
  }, [prices]);

  const handlePriceCommit = async (storeId: string, raw: string) => {
    const trimmed = raw.trim();
    const price = trimmed ? Number(trimmed) : null;
    if (price != null && Number.isNaN(price)) return;
    try {
      await updateDetails({ storeId, price });
    } catch (err) {
      Alert.alert('Could not save price', err instanceof Error ? err.message : String(err));
    }
  };

  const handleAisleCommit = async (storeId: string, raw: string) => {
    try {
      await updateDetails({ storeId, aisle: raw.trim() || null });
    } catch (err) {
      Alert.alert('Could not save aisle', err instanceof Error ? err.message : String(err));
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: '',
    packageSize: '',
    lifespanDays: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIsEditing(false);
    setShowStorePicker(false);
    setForm({
      name: product?.name ?? '',
      brand: product?.brand ?? '',
      category: product?.category ?? '',
      packageSize: product?.packageSize ?? '',
      lifespanDays: product?.lifespanDays != null ? String(product.lifespanDays) : '',
      notes: product?.notes ?? '',
    });
  }, [product?.id]);

  const handleSave = async () => {
    if (!product) return;
    const name = form.name.trim();
    if (!name) return;

    setSaving(true);
    try {
      await onUpdate(product.id, {
        name,
        brand: form.brand.trim(),
        category: form.category.trim(),
        packageSize: form.packageSize.trim(),
        lifespanDays: form.lifespanDays.trim() ? Number(form.lifespanDays.trim()) : undefined,
        notes: form.notes.trim(),
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const accentTextColor = colorScheme === 'dark' ? '#201e1d' : '#ffffff';

  return (
    <Modal
      visible={!!rendered}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center px-5">
        <Pressable className="absolute inset-0" onPress={onClose}>
          <Animated.View className="flex-1 bg-black/50" style={backdropStyle} />
        </Pressable>

        <Animated.View
          style={[cardStyle, { maxHeight: '88%' }]}
          className="w-full bg-paper dark:bg-paper-dark rounded-3xl overflow-hidden"
        >
          {p ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 22 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  {isEditing ? (
                    <TextInput
                      value={form.name}
                      onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                      placeholder="Product name"
                      placeholderTextColor={c.inkSoft}
                      className="text-2xl font-serifsemi text-ink dark:text-ink-dark pb-1"
                    />
                  ) : (
                    <SectionHeading size="lg">{p.name}</SectionHeading>
                  )}
                  {!isEditing && (p.category || p.brand) ? (
                    <View className="flex-row items-center gap-2 mt-2">
                      {p.category ? <CategoryChip category={p.category} /> : null}
                      {p.brand ? (
                        <Text className="text-[13px] text-ink-soft dark:text-ink-softdark font-serif">
                          {p.brand}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
                <View className="flex-row items-center gap-1.5">
                  <PressableScale
                    onPress={() => setIsEditing((v) => !v)}
                    hitSlop={6}
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: isEditing ? c.accent : c.surface }}
                  >
                    <Feather
                      name={isEditing ? 'check' : 'edit-2'}
                      size={16}
                      color={isEditing ? accentTextColor : c.inkSoft}
                    />
                  </PressableScale>
                  <PressableScale
                    onPress={() =>
                      Alert.alert('Delete product?', `Remove “${p.name}” from your catalog.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => onDelete(p) },
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

              {isEditing ? (
                <View className="mt-6 gap-4">
                  <Field label="Category">
                    <TextInput
                      value={form.category}
                      onChangeText={(v) => setForm((f) => ({ ...f, category: v }))}
                      placeholder="Dairy, Produce, Snacks…"
                      placeholderTextColor={c.inkSoft}
                      className={INPUT}
                    />
                  </Field>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Field label="Package size">
                        <TextInput
                          value={form.packageSize}
                          onChangeText={(v) => setForm((f) => ({ ...f, packageSize: v }))}
                          placeholder="500g, 1L, 12-pack"
                          placeholderTextColor={c.inkSoft}
                          className={INPUT}
                        />
                      </Field>
                    </View>
                    <View className="flex-1">
                      <Field label="Lifespan (days)">
                        <TextInput
                          value={form.lifespanDays}
                          onChangeText={(v) =>
                            setForm((f) => ({ ...f, lifespanDays: v.replace(/[^0-9]/g, '') }))
                          }
                          placeholder="Days until it runs out"
                          placeholderTextColor={c.inkSoft}
                          keyboardType="number-pad"
                          className={INPUT}
                        />
                      </Field>
                    </View>
                  </View>

                  <Field label="Notes">
                    <TextInput
                      value={form.notes}
                      onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                      placeholder="Preferred variant, substitutes, reminders…"
                      placeholderTextColor={c.inkSoft}
                      multiline
                      className={`${INPUT} min-h-[76px]`}
                      style={{ textAlignVertical: 'top' }}
                    />
                  </Field>

                  {/* Where to buy — editable */}
                  <View>
                    <Text className={LABEL}>Where to buy</Text>
                    {prices.length === 0 ? (
                      <Text className="text-[13px] text-ink-soft dark:text-ink-softdark font-serif mb-2">
                        No stores yet. Add one below.
                      </Text>
                    ) : (
                      <View className="gap-2.5">
                        {prices.map((sp) => (
                          <View
                            key={sp.store.id}
                            className="rounded-2xl bg-surface dark:bg-surface-dark p-3.5"
                          >
                            <View className="flex-row items-center justify-between mb-2.5">
                              <Text className="text-[15px] font-serifsemi text-ink dark:text-ink-dark">
                                {sp.store.name}
                              </Text>
                              <PressableScale
                                onPress={() => removeStore(sp.store.id)}
                                hitSlop={8}
                                className="w-7 h-7 rounded-full items-center justify-center"
                              >
                                <Feather name="trash-2" size={14} color={c.inkSoft} />
                              </PressableScale>
                            </View>
                            <View className="flex-row items-center gap-2">
                              <View className="flex-[1.2] flex-row items-center rounded-lg bg-paper dark:bg-paper-dark px-3">
                                <Feather name="tag" size={13} color={c.inkSoft} />
                                <TextInput
                                  value={priceDrafts[sp.store.id] ?? ''}
                                  onChangeText={(v) =>
                                    setPriceDrafts((d) => ({
                                      ...d,
                                      [sp.store.id]: v.replace(/[^0-9.]/g, ''),
                                    }))
                                  }
                                  onBlur={() =>
                                    handlePriceCommit(sp.store.id, priceDrafts[sp.store.id] ?? '')
                                  }
                                  placeholder="0.00"
                                  placeholderTextColor={c.inkSoft}
                                  keyboardType="decimal-pad"
                                  className="flex-1 py-2 pl-2 text-ink dark:text-ink-dark font-serif"
                                  style={{ fontVariant: ['tabular-nums'] }}
                                />
                              </View>
                              <TextInput
                                value={aisleDrafts[sp.store.id] ?? ''}
                                onChangeText={(v) =>
                                  setAisleDrafts((d) => ({ ...d, [sp.store.id]: v }))
                                }
                                onBlur={() =>
                                  handleAisleCommit(sp.store.id, aisleDrafts[sp.store.id] ?? '')
                                }
                                placeholder="Aisle / section"
                                placeholderTextColor={c.inkSoft}
                                className={`flex-1 ${INPUT_CARD}`}
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {showStorePicker ? (
                      unattachedStores.length === 0 ? (
                        <Text className="text-[13px] text-ink-soft dark:text-ink-softdark font-serif mt-2.5">
                          All stores already attached.
                        </Text>
                      ) : (
                        <View className="flex-row flex-wrap gap-2 mt-2.5">
                          {unattachedStores.map((s) => (
                            <PressableScale
                              key={s.id}
                              onPress={async () => {
                                try {
                                  await updateDetails({ storeId: s.id, price: null });
                                  setShowStorePicker(false);
                                } catch (err) {
                                  Alert.alert(
                                    'Could not add store',
                                    err instanceof Error ? err.message : String(err)
                                  );
                                }
                              }}
                              className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface dark:bg-surface-dark"
                            >
                              <Feather name="plus" size={13} color={c.accent} />
                              <Text className="text-[13px] text-ink dark:text-ink-dark font-serif">
                                {s.name}
                              </Text>
                            </PressableScale>
                          ))}
                        </View>
                      )
                    ) : (
                      <PressableScale
                        onPress={() => setShowStorePicker(true)}
                        className="flex-row items-center gap-1.5 self-start mt-2.5 px-3.5 py-2 rounded-full"
                        style={{ backgroundColor: c.sticky }}
                      >
                        <Feather name="plus-circle" size={14} color={c.accentText} />
                        <Text className="text-[13px] font-serifsemi" style={{ color: c.accentText }}>
                          Add store
                        </Text>
                      </PressableScale>
                    )}
                  </View>

                  <PressableScale
                    onPress={handleSave}
                    disabled={saving || !form.name.trim()}
                    className="rounded-2xl py-3.5 items-center mt-1"
                    style={{
                      backgroundColor: c.accent,
                      opacity: saving || !form.name.trim() ? 0.5 : 1,
                    }}
                  >
                    <Text className="text-[15px] font-serifsemi" style={{ color: accentTextColor }}>
                      {saving ? 'Saving…' : 'Save changes'}
                    </Text>
                  </PressableScale>
                </View>
              ) : (
                <View className="mt-6">
                  {prices.length === 0 ? (
                    <View className="rounded-2xl bg-surface dark:bg-surface-dark p-4 items-center">
                      <Feather name="shopping-cart" size={22} color={c.inkSoft} />
                      <Text className="mt-2 text-center text-[13px] text-ink-soft dark:text-ink-softdark font-serif">
                        No store prices yet. Finish an errand to record them.
                      </Text>
                    </View>
                  ) : (
                    <View className="gap-2">
                      {/* Column headers */}
                      <View className="flex-row items-center px-4">
                        <Text className={`flex-1 ${LABEL} mb-0`}>Store</Text>
                        <Text className={`w-24 text-center ${LABEL} mb-0`}>Aisle</Text>
                        <Text className={`w-20 text-right ${LABEL} mb-0`}>Price</Text>
                      </View>
                      {prices.map((sp, i) => {
                        const isBest = i === 0 && sp.price != null && prices.length > 1;
                        return (
                          <View
                            key={sp.store.id}
                            className="flex-row items-center rounded-2xl bg-surface dark:bg-surface-dark px-4 py-3"
                          >
                            <View className="flex-1 flex-row items-center gap-2">
                              <Text className="text-[15px] font-serifsemi text-ink dark:text-ink-dark">
                                {sp.store.name}
                              </Text>
                              {isBest ? (
                                <View
                                  className="px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: c.sticky }}
                                >
                                  <Text
                                    className="text-[10px] uppercase tracking-wider font-serifsemi"
                                    style={{ color: c.accentText }}
                                  >
                                    Best
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <Text
                              className="w-24 text-center text-[13px] font-serif text-ink-soft dark:text-ink-softdark"
                              numberOfLines={1}
                            >
                              {sp.aisle || '—'}
                            </Text>
                            <Text
                              className="w-20 text-right text-[15px] font-serifsemi"
                              style={{
                                fontVariant: ['tabular-nums'],
                                color: isBest ? c.accentText : c.ink,
                              }}
                            >
                              {sp.price != null ? formatMoney(sp.price) : '—'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}
