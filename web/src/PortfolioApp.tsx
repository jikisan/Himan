import { QueryProvider } from '@core/presentation/contexts/QueryProvider';
import PortfolioScreen from '@career/presentation/portfolio/PortfolioScreen';
import './portfolio-base.css';

export default function PortfolioApp() {
  const parts = window.location.pathname.replace(/\/$/, '').split('/').slice(2).map((part) => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  const params = parts.length === 2 ? { handle: parts[0], slug: parts[1] } : { token: parts[0] };
  return (
      <QueryProvider>
        <PortfolioScreen {...params} />
      </QueryProvider>
  );
}
