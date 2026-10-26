import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { Spinner, Toaster } from '@ticketing/ui';
import { lazyProvider } from './mf';
import { ProviderBoundary } from './ProviderBoundary';
import { Header } from './Header';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { RequireRole } from './RequireRole';

const ProviderCatalog = lazyProvider('catalog', 'App');
const ProviderOrganizer = lazyProvider('organizer', 'App');

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

function OrganizerPage() {
  return (
    <RequireRole role="organizer">
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <ProviderBoundary
          name="organizer"
          fallback={
            <div className="flex min-h-[70vh] items-center justify-center">
              <Spinner className="size-8" />
            </div>
          }
        >
          <ProviderOrganizer />
        </ProviderBoundary>
      </main>
    </RequireRole>
  );
}

function Layout() {
  return (
    <div className="flex h-full flex-col">
      <Toaster />
      <Header />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/*', element: <HomePage /> },
      { path: '/organizer/*', element: <OrganizerPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
