import { useParams } from 'react-router-dom';
import PortfolioScreen from './PortfolioScreen';

// The authenticated app keeps its router; cold public visits don't need it.
export default function PortfolioPage() {
  const params = useParams<{ token: string; handle: string; slug: string }>();
  return <PortfolioScreen {...params} />;
}
