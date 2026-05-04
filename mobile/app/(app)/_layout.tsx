import { Stack } from 'expo-router';
import { ThemeProvider } from '../../contexts/ThemeProvider';

export default function AppLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
