import { Route, Routes } from 'react-router-dom';
import { Spinner } from '@ticketing/ui';
import { lazyProvider } from './mf';
import { ProviderBoundary } from './ProviderBoundary';
import { Header } from './Header';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

const ProviderCatalog = lazyProvider('catalog', 'App');

function HomePage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
      <ProviderBoundary
        name="catalog"
        fallback={
          <div className="flex min-h-[70vh] items-center justify-center">
            <Spinner className="size-8" />
          </div>
        }
      >
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
        <Route path="/*" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </div>
  );
}

export default App;
