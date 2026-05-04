import { Redirect } from 'expo-router';

export default function Index() {
  // TODO: check auth state and redirect to (tabs) when authenticated
  return <Redirect href="/login" />;
}
