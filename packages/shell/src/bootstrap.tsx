import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthBootstrap } from './AuthBootstrap';
import { App } from './App';
import { loadProvidersManifest } from './mf';
import './styles.css';

const queryClient = new QueryClient();

const container = document.getElementById('root');
if (!container) throw new Error('#root element not found');

// Providers must be registered from the fetched manifest before the app
// renders - App.tsx calls lazyProvider() at module scope, and that lazy()
// wrapper can suspend as soon as React starts rendering it.
loadProvidersManifest()
  .catch((error) => {
    console.error('Failed to load remotes manifest:', error);
  })
  .finally(() => {
    createRoot(container).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthBootstrap>
              <App />
            </AuthBootstrap>
          </BrowserRouter>
        </QueryClientProvider>
      </StrictMode>,
    );
  });
