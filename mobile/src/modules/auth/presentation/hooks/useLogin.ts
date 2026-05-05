import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getSupabase } from '@himan/shared';
import { MobileAuthRepository } from '../../infrastructure/api/MobileAuthRepository';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
});

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const repository = useMemo(() => new MobileAuthRepository(), []);

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
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('Google sign-in failed: no ID token');
      const { error: authError } = await getSupabase().auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (authError) throw new Error(authError.message);
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled, no error shown
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign-in already in progress');
      } else {
        setError(err.message ?? 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, loginWithEmail, loginWithGoogle };
};
