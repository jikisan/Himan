import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

// Public links load only the portfolio; editors and authenticated providers
// stay in the app chunk. The app router still handles in-app navigation.
const isPortfolio = /^\/p\/[^/]+(?:\/[^/]+)?\/?$/.test(window.location.pathname)
const App = isPortfolio
  ? lazy(() => import('./PortfolioApp.tsx'))
  : lazy(() => import('./App.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div role="status" style={{ display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', background: '#031942', color: 'white' }}>{isPortfolio ? 'Loading portfolio…' : 'Loading…'}</div>}>
      <App />
    </Suspense>
  </StrictMode>,
)
