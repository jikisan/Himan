import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLogin } from '@/modules/auth/presentation/hooks/useLogin';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading, error, loginWithEmail, loginWithGoogle } = useLogin();

  const handleLogin = async () => {
    await loginWithEmail(email, password);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-12"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Text className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              Himan
            </Text>
            <Text className="mt-2 text-base text-gray-500 dark:text-gray-400">
              Sign in to your account
            </Text>
          </View>

          <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-6 py-8 shadow-sm">
            {error ? (
              <View className="mb-5 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3">
                <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </Text>
              <TextInput
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3.5 text-base text-gray-900 dark:text-white"
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </Text>
              <TextInput
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3.5 text-base text-gray-900 dark:text-white"
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              className="w-full items-center rounded-xl bg-indigo-600 py-3.5 active:bg-indigo-700 disabled:opacity-60"
            >
              <Text className="text-base font-semibold text-white">
                {loading ? 'Signing in…' : 'Sign in'}
              </Text>
            </Pressable>

            <View className="my-6 flex-row items-center gap-3">
              <View className="flex-1 border-t border-gray-200 dark:border-gray-600" />
              <Text className="text-sm text-gray-400 dark:text-gray-500">Or continue with</Text>
              <View className="flex-1 border-t border-gray-200 dark:border-gray-600" />
            </View>

            <Pressable
              onPress={loginWithGoogle}
              className="w-full flex-row items-center justify-center gap-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 py-3.5 active:bg-gray-50 dark:active:bg-gray-600"
            >
              <View className="h-5 w-5 items-center justify-center">
                <Text className="text-sm font-bold" style={{ color: '#4285F4' }}>
                  G
                </Text>
              </View>
              <Text className="text-base font-medium text-gray-700 dark:text-gray-200">
                Sign in with Google
              </Text>
            </Pressable>
          </View>

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Don't have an account?
            </Text>
            <Pressable>
              <Text className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                Sign up
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
