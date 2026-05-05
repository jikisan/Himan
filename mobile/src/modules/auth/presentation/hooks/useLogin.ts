import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { getSupabase } from '@himan/shared';
import { MobileAuthRepository } from '../../infrastructure/api/MobileAuthRepository';

WebBrowser.maybeCompleteAuthSession();

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const repository = useMemo(() => new MobileAuthRepository(), []);

  const [_request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'not_configured',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'not_configured',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (idToken) {
        getSupabase()
          .auth.signInWithIdToken({ provider: 'google', token: idToken })
          .then(({ error: authError }) => {
            if (authError) setError(authError.message);
            else router.replace('/(app)/dashboard');
          })
          .catch((err: any) => setError(err.message))
          .finally(() => setLoading(false));
      } else {
        setError('Google sign-in failed: no ID token');
        setLoading(false);
      }
    } else if (response?.type === 'error') {
      setError(response.error?.message ?? 'Google sign-in failed');
      setLoading(false);
    }
  }, [response]);

  const loginWithEmail = async (email: string, password: string) => {
    setError(null);
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await repository.signInWithEmail({ email, password });
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    const result = await promptAsync();
    if (result.type !== 'success') {
      setLoading(false);
    }
  };

  return { loading, error, loginWithEmail, loginWithGoogle };
};
