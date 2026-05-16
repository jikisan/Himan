import { useLocalSearchParams } from 'expo-router';
import PasswordFormScreen from '@/modules/passwords/presentation/components/PasswordFormScreen';

export default function EditPasswordScreen() {
  const { passwordId } = useLocalSearchParams<{ passwordId: string }>();
  return <PasswordFormScreen passwordId={passwordId} />;
}
