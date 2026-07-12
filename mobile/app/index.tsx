import { Redirect } from 'expo-router';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Redirect href={user ? '/(app)/dashboard' : '/(auth)/login'} />;
}
