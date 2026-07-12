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
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { usePasswords, usePasswordCategories } from '@/modules/passwords/presentation/hooks';
import type { CreatePasswordDto, UpdatePasswordDto } from '@himan/shared/passwords';

const generatePassword = (): string => {
  const length = 16;
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  const maxValid = 256 - (256 % charset.length);

  while (password.length < length) {
    const array = new Uint8Array(1);
    crypto.getRandomValues(array);
    const value = array[0];
    if (value < maxValid) {
      password += charset[value % charset.length];
    }
  }
  return password;
};

interface FormData {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  categoryId: string | null;
  isFavorite: boolean;
}

const defaultForm = (): FormData => ({
  title: '',
  username: '',
  password: '',
  url: '',
  notes: '',
  categoryId: null,
  isFavorite: false,
});

interface PasswordFormScreenProps {
  passwordId?: string;
}

export default function PasswordFormScreen({ passwordId }: PasswordFormScreenProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { passwords, createPassword, updatePassword } = usePasswords();
  const { categories } = usePasswordCategories();

  const isEdit = !!passwordId;
  const existingPassword = isEdit ? passwords.find((p) => p.id === passwordId) ?? null : null;

  const [form, setForm] = useState<FormData>(defaultForm());
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEdit && existingPassword) {
      setForm({
        title: existingPassword.title,
        username: existingPassword.username || '',
        password: existingPassword.password,
        url: existingPassword.url || '',
        notes: existingPassword.notes || '',
        categoryId: existingPassword.categoryId,
        isFavorite: existingPassword.isFavorite,
      });
    }
  }, [isEdit, existingPassword?.id]);

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
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    const payload = {
      title: form.title.trim(),
      username: form.username.trim() || null,
      password: form.password,
      url: form.url.trim() || null,
      notes: form.notes.trim() || null,
      categoryId: form.categoryId,
      isFavorite: form.isFavorite,
    };
    try {
      if (isEdit && passwordId) {
        const result = await updatePassword(passwordId, payload as UpdatePasswordDto);
        if (result) router.back();
      } else {
        const result = await createPassword(payload as Omit<CreatePasswordDto, 'userId'>);
        if (result) router.back();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = () => {
    const generated = generatePassword();
    set('password', generated);
    setShowPassword(true);
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
          {isEdit ? 'Edit Password' : 'Add Password'}
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
          {/* Title */}
          <View>
            <Text className={labelClass}>Title *</Text>
            <TextInput
              placeholder="e.g. Gmail, Netflix"
              placeholderTextColor="#9ca3af"
              value={form.title}
              onChangeText={(v) => set('title', v)}
              maxLength={100}
              className={inputClass}
            />
            {errors.title && <Text className={errorClass}>{errors.title}</Text>}
          </View>

          {/* Username */}
          <View>
            <Text className={labelClass}>Username</Text>
            <TextInput
              placeholder="Email or username"
              placeholderTextColor="#9ca3af"
              value={form.username}
              onChangeText={(v) => set('username', v)}
              autoCapitalize="none"
              autoCorrect={false}
              className={inputClass}
            />
          </View>

          {/* Password */}
          <View>
            <Text className={labelClass}>Password *</Text>
            <View className="flex-row items-center border border-gray-300 dark:border-gray-700 rounded-xl px-4 bg-white dark:bg-gray-800">
              <TextInput
                placeholder="Enter password"
                placeholderTextColor="#9ca3af"
                value={form.password}
                onChangeText={(v) => set('password', v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 py-3 text-sm text-gray-900 dark:text-white"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} className="pl-2">
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#9ca3af" />
              </Pressable>
              <Pressable onPress={handleGenerate} className="pl-2">
                <Feather name="zap" size={18} color="#6366f1" />
              </Pressable>
            </View>
            {errors.password && <Text className={errorClass}>{errors.password}</Text>}
          </View>

          {/* URL */}
          <View>
            <Text className={labelClass}>URL</Text>
            <TextInput
              placeholder="https://example.com"
              placeholderTextColor="#9ca3af"
              value={form.url}
              onChangeText={(v) => set('url', v)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              className={inputClass}
            />
          </View>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
