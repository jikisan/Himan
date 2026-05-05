import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { Redirect, Stack } from 'expo-router';
import { ThemeProvider } from '../../contexts/ThemeProvider';

export default function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
