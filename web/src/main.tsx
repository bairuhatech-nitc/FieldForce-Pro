import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { migrateAuthStorage } from './utils/auth-migration';
import App from './App';

// Run auth storage migration on app initialization
migrateAuthStorage();

// Initialize i18next
i18n.use(initReactI18next).init({
  resources: {},
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
  },
});

// Load translations
fetch('/locales/en/common.json')
  .then((res) => res.json())
  .then((translations) => {
    i18n.addResourceBundle('en', 'translation', translations);
  });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
