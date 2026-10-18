import './index.css';
import '@core/infrastructure/config/supabase';
import { Toaster } from 'sonner';
import { RenterLinkScreen } from '@rentals/presentation/renter/RenterLinkScreen';

// The tenant's link page on its own: no router, auth, theme or app shell.
export default function RenterApp() {
  const part = window.location.pathname.split('/')[2] ?? '';
  let token = part;
  try { token = decodeURIComponent(part); } catch { /* keep it as typed */ }
  return <>
    <RenterLinkScreen token={token} />
    <Toaster position="top-center" richColors />
  </>;
}
