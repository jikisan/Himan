import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Router } from './router';
import { AuthProvider } from '@auth/presentation/contexts';
import { ThemeProvider } from '@core/presentation/contexts/ThemeProvider';
import { QueryProvider } from '@core/presentation/contexts/QueryProvider';
import { SubscriptionProvider } from '@subscriptions/presentation/contexts/SubscriptionContext';

function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <ThemeProvider defaultTheme="system" storageKey="himan-ui-theme">
          <AuthProvider>
            <SubscriptionProvider>
              <Router />
              <Toaster position="bottom-right" richColors />
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}

export default App;
