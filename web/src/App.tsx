import { BrowserRouter } from 'react-router-dom';
import { Router } from './router';
import { AuthProvider } from '@auth/presentation/contexts';
import { ThemeProvider } from '@core/presentation/contexts/ThemeProvider';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="himan-ui-theme">
        <AuthProvider>
          <Router />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
