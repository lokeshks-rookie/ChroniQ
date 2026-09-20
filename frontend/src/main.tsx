import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './styles/theme.css';
import './index.css';
import { useAuthStore } from './store/authStore';

// Restore authenticated session on application mount
useAuthStore.getState().restoreSession();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found in DOM');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
