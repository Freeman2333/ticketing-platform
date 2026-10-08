import { Component, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { lazyProvider } from './mf';
import { Button } from '@ticketing/ui';

// ProviderBoundary catches the lazy() rejection that fires when a provider's
// remoteEntry.js can't be fetched (provider not running, network error,
// etc.). Without it any one missing provider unmounts the whole consumer
// tree. React has no built-in functional error boundary so this is a class.
// Wrap each <ProviderBoundary> in your router of choice if you need routing.
class ProviderBoundary extends Component<
  { children: ReactNode; name: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert">
          <p>
            Provider &quot;{this.props.name}&quot; unavailable:{' '}
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return (
      <Suspense fallback={<p>Loading {this.props.name}...</p>}>
        {this.props.children}
      </Suspense>
    );
  }
}

const ProviderCatalog = lazyProvider('catalog', 'App');

function HomePage() {
  return (
    <main>
      <h1>shell</h1>
      <Button variant={'destructive'}>Test button (Tailwind + shadcn)</Button>
      <ProviderBoundary name="catalog">
        <ProviderCatalog />
      </ProviderBoundary>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}

export default App;
