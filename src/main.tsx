import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/globals.css';
import App from './App'
import { AuthProvider } from './context/AuthContext';
import { supabase } from './config/supabase';
import { NotificationProvider } from './context/NotificationContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

if (!supabase) {
  root.render(
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      fontFamily: 'sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ color: '#ff4444' }}>Yapılandırma Hatası</h1>
      <p>Supabase bağlantı bilgileri eksik.</p>
      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        textAlign: 'left'
      }}>
        <p>Lütfen <code>.env</code> dosyasını şu bilgilerle güncelleyin:</p>
        <pre style={{ color: '#44ff44', backgroundColor: '#000', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>
          VITE_SUPABASE_URL=your_project_url{'\n'}
          VITE_SUPABASE_ANON_KEY=your_anon_key
        </pre>
        <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>
          Bu bilgileri <a href="https://supabase.com/dashboard/project/_/settings/api" target="_blank" rel="noopener noreferrer" style={{ color: '#4488ff' }}>Supabase Dashboard</a> üzerinden alabilirsiniz.
        </p>
      </div>
    </div>
  );
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
