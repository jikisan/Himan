import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useCards, useCardCategories } from '@/modules/cards/presentation/hooks';
import { CardColorPicker } from './CardColorPicker';
import type { CreateCreditCardDto, UpdateCreditCardDto } from '@himan/shared/cards';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => CURRENT_YEAR + i);
const CARD_TYPES = ['Credit', 'Debit', 'Prepaid'];
const DUE_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const luhnCheck = (cardNumber: string): boolean => {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
};

const formatCardNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

interface FormData {
  cardName: string;
  cardNumber: string;
  cvv: string;
  expiryMonth: number;
  expiryYear: number;
  bankName: string;
  cardType: string;
  categoryId: string | null;
  notes: string;
  isFavorite: boolean;
  dueDay: number | null;
  color: string | null;
}

const defaultForm = (): FormData => ({
  cardName: '',
  cardNumber: '',
  cvv: '',
  expiryMonth: new Date().getMonth() + 1,
  expiryYear: CURRENT_YEAR,
  bankName: '',
  cardType: '',
  categoryId: null,
  notes: '',
  isFavorite: false,
  dueDay: null,
  color: null,
});

export default function CardFormScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { cardId } = useLocalSearchParams<{ cardId?: string }>();

  const { cards, createCard, updateCard } = useCards();
  const { categories } = useCardCategories();

  const isEdit = !!cardId;
  const existingCard = isEdit ? cards.find((c) => c.id === cardId) ?? null : null;

  const [form, setForm] = useState<FormData>(defaultForm());
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEdit && existingCard) {
      setForm({
        cardName: existingCard.cardName,
        cardNumber: formatCardNumber(existingCard.cardNumber),
        cvv: existingCard.cvv,
        expiryMonth: existingCard.expiryMonth,
        expiryYear: existingCard.expiryYear,
        bankName: existingCard.bankName || '',
        cardType: existingCard.cardType || '',
        categoryId: existingCard.categoryId,
        notes: existingCard.notes || '',
        isFavorite: existingCard.isFavorite,
        dueDay: existingCard.dueDay,
        color: existingCard.color ?? null,
      });
    }
  }, [isEdit, existingCard?.id]);

  const set = (key: keyof FormData, value: FormData[keyof FormData]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.cardName.trim()) errs.cardName = 'Card name is required';
    const rawNumber = form.cardNumber.replace(/\D/g, '');
    if (!rawNumber) {
      errs.cardNumber = 'Card number is required';
    } else if (!luhnCheck(rawNumber)) {
      errs.cardNumber = 'Invalid card number';
    }
    if (!form.cvv.trim()) {
      errs.cvv = 'CVV is required';
    } else if (!/^\d{3,4}$/.test(form.cvv)) {
      errs.cvv = 'CVV must be 3-4 digits';
    }
    const expiry = new Date(form.expiryYear, form.expiryMonth - 1);
    const minDate = new Date();
    minDate.setMonth(minDate.getMonth() - 1);
    if (expiry < minDate) errs.expiry = 'Card is expired';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    const rawNumber = form.cardNumber.replace(/\D/g, '');
    const payload = {
      cardName: form.cardName.trim(),
      cardNumber: rawNumber,
      cvv: form.cvv,
      expiryMonth: form.expiryMonth,
      expiryYear: form.expiryYear,
      bankName: form.bankName.trim() || null,
      cardType: form.cardType || null,
      categoryId: form.categoryId,
      notes: form.notes.trim() || null,
      isFavorite: form.isFavorite,
      dueDay: form.dueDay,
      color: form.color,
    };
    try {
      if (isEdit && cardId) {
        const result = await updateCard(cardId, payload as UpdateCreditCardDto);
        if (result) router.back();
      } else {
        const result = await createCard(payload as Omit<CreateCreditCardDto, 'userId'>);
        if (result) router.back();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800';
  const labelClass = 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1';
  const errorClass = 'text-xs text-red-500 mt-1';

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        <Pressable onPress={() => router.back()} className="p-2 -ml-1">
          <Feather name="arrow-left" size={22} color={isDark ? '#e5e7eb' : '#111827'} />
        </Pressable>
        <Text className="text-base font-bold text-gray-900 dark:text-white">
          {isEdit ? 'Edit Card' : 'Add Card'}
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          className={`px-4 py-2 rounded-xl ${isSaving ? 'bg-gray-200 dark:bg-gray-700' : 'bg-indigo-500 active:bg-indigo-600'}`}
        >
          {isSaving ? (
            <ActivityIndicator size={16} color="#6366f1" />
          ) : (
            <Text className="text-white font-semibold text-sm">Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 20 }}
        >
          {/* Card Name */}
          <View>
            <Text className={labelClass}>Card Name *</Text>
            <TextInput
              placeholder="My Visa Card"
              placeholderTextColor="#9ca3af"
              value={form.cardName}
              onChangeText={(v) => set('cardName', v)}
              maxLength={100}
              className={inputClass}
            />
            {errors.cardName && <Text className={errorClass}>{errors.cardName}</Text>}
          </View>

          {/* Card Number */}
          <View>
            <Text className={labelClass}>Card Number *</Text>
            <View className="flex-row items-center border border-gray-300 dark:border-gray-700 rounded-xl px-4 bg-white dark:bg-gray-800">
              <TextInput
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#9ca3af"
                value={form.cardNumber}
                onChangeText={(v) => set('cardNumber', formatCardNumber(v))}
                keyboardType="number-pad"
                secureTextEntry={!showCardNumber}
                maxLength={23}
                className="flex-1 py-3 text-sm text-gray-900 dark:text-white"
              />
              <Pressable onPress={() => setShowCardNumber((v) => !v)} className="pl-2">
                <Feather name={showCardNumber ? 'eye-off' : 'eye'} size={18} color="#9ca3af" />
              </Pressable>
            </View>
            {errors.cardNumber && <Text className={errorClass}>{errors.cardNumber}</Text>}
          </View>

          {/* CVV */}
          <View>
            <Text className={labelClass}>CVV *</Text>
            <View className="flex-row items-center border border-gray-300 dark:border-gray-700 rounded-xl px-4 bg-white dark:bg-gray-800">
              <TextInput
                placeholder="123"
                placeholderTextColor="#9ca3af"
                value={form.cvv}
                onChangeText={(v) => set('cvv', v.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                secureTextEntry={!showCvv}
                maxLength={4}
                className="flex-1 py-3 text-sm text-gray-900 dark:text-white"
              />
              <Pressable onPress={() => setShowCvv((v) => !v)} className="pl-2">
                <Feather name={showCvv ? 'eye-off' : 'eye'} size={18} color="#9ca3af" />
              </Pressable>
            </View>
            {errors.cvv && <Text className={errorClass}>{errors.cvv}</Text>}
          </View>

          {/* Expiry */}
          <View>
            <Text className={labelClass}>Expiry Date *</Text>
            <View className="gap-2">
              <Text className="text-xs text-gray-400 dark:text-gray-500">Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {MONTHS.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => set('expiryMonth', m)}
                      className={`px-3 py-2 rounded-lg border ${
                        form.expiryMonth === m
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          form.expiryMonth === m ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {String(m).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Text className="text-xs text-gray-400 dark:text-gray-500">Year</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {YEARS.map((y) => (
                    <Pressable
                      key={y}
                      onPress={() => set('expiryYear', y)}
                      className={`px-3 py-2 rounded-lg border ${
                        form.expiryYear === y
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          form.expiryYear === y ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {y}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
            {errors.expiry && <Text className={errorClass}>{errors.expiry}</Text>}
          </View>

          {/* Bank Name */}
          <View>
            <Text className={labelClass}>Bank Name</Text>
            <TextInput
              placeholder="Chase, Bank of America..."
              placeholderTextColor="#9ca3af"
              value={form.bankName}
              onChangeText={(v) => set('bankName', v)}
              className={inputClass}
            />
          </View>

          {/* Card Type */}
          <View>
            <Text className={labelClass}>Card Type</Text>
            <View className="flex-row gap-2">
              {CARD_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => set('cardType', form.cardType === type ? '' : type)}
                  className={`px-3 py-2 rounded-lg border ${
                    form.cardType === type
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      form.cardType === type ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Payment Due Day */}
          <View>
            <Text className={labelClass}>Payment Due Day</Text>
            <Text className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              Day of the month this bill is due, e.g. 29
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => set('dueDay', null)}
                  className={`px-3 py-2 rounded-lg border ${
                    form.dueDay === null
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      form.dueDay === null ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    None
                  </Text>
                </Pressable>
                {DUE_DAYS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => set('dueDay', d)}
                    className={`px-3 py-2 rounded-lg border ${
                      form.dueDay === d
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        form.dueDay === d ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Category */}
          {categories.length > 0 && (
            <View>
              <Text className={labelClass}>Category</Text>
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => set('categoryId', null)}
                  className={`px-3 py-2 rounded-lg border ${
                    form.categoryId === null
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      form.categoryId === null ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    None
                  </Text>
                </Pressable>
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => set('categoryId', form.categoryId === cat.id ? null : cat.id)}
                    className={`px-3 py-2 rounded-lg border ${
                      form.categoryId === cat.id
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        form.categoryId === cat.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Favorite */}
          <Pressable
            onPress={() => set('isFavorite', !form.isFavorite)}
            className={`flex-row items-center gap-3 px-4 py-3.5 rounded-xl border ${
              form.isFavorite
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <Feather
              name="star"
              size={18}
              color={form.isFavorite ? '#f59e0b' : '#9ca3af'}
            />
            <Text
              className={`text-sm font-medium flex-1 ${
                form.isFavorite ? 'text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Mark as favorite
            </Text>
            <View
              className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                form.isFavorite ? 'bg-amber-400 border-amber-400' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {form.isFavorite && <Feather name="check" size={11} color="#ffffff" />}
            </View>
          </Pressable>

          <CardColorPicker
            value={form.color}
            onChange={(c) => set('color', c)}
            labelClass={labelClass}
            inputClass={inputClass}
          />

          {/* Notes */}
          <View>
            <Text className={labelClass}>Notes</Text>
            <TextInput
              placeholder="Any additional notes..."
              placeholderTextColor="#9ca3af"
              value={form.notes}
              onChangeText={(v) => set('notes', v)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className={`${inputClass} min-h-[80px]`}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
