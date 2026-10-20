import { useParams } from 'react-router-dom';
import { RenterLinkScreen } from './RenterLinkScreen';

// Inside the signed-in app (a landlord opening a tenant's link); cold visits load RenterApp instead.
export default function RenterLinkPage() {
  return <RenterLinkScreen token={useParams<{ token: string }>().token ?? ''} />;
}
