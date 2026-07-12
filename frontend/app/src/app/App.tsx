/**
 * Application root: global providers → router → suspense boundary.
 */
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '@/providers/AppProviders'
import { LoadingBoundary } from '@/components/feedback/LoadingBoundary'
import { AppRouter } from '@/routes/AppRouter'

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <LoadingBoundary>
          <AppRouter />
        </LoadingBoundary>
      </BrowserRouter>
    </AppProviders>
  )
}
