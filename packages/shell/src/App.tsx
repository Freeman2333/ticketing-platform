import { Component, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { lazyProvider } from './mf';
import { Button } from '@ticketing/ui';
import { Header } from './Header';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';


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
    <div className="flex min-h-svh flex-col">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </div>
  );
}

export default App;
