import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from './config/supabase';
import { useAuth } from '@/context/AuthContext';

// --- Lazy-loaded Components ---
const Login = lazy(() => import('@/features/auth/components/Login'));
const Dashboard = lazy(() => import('@/components/layout/Dashboard'));
const AutoQuizGenerator = lazy(() => import('@/features/quiz/components/AutoQuizGenerator').then(module => ({ default: module.AutoQuizGenerator })));

const ModalLoader = () => (
  <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-sm font-medium">Yükleniyor...</span>
    </div>
  </div>
);

export default function App() {
  const { user, logout, loading } = useAuth();

  if (loading) return <ModalLoader />;

  if (!supabase) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
        <div className="bg-destructive/10 p-6 rounded-2xl border border-destructive/20 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Veritabanı Bağlantı Hatası</h2>
          <p className="text-muted-foreground mb-4">
            Supabase bağlantısı kurulamadı. Lütfen <code className="bg-black/20 px-1.5 py-0.5 rounded text-sm">.env</code> dosyasındaki API anahtarlarını kontrol edin.
          </p>
          <div className="text-xs text-muted-foreground/50 font-mono bg-black/5 p-2 rounded">
            VITE_SUPABASE_URL<br />
            VITE_SUPABASE_ANON_KEY
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <Suspense fallback={<ModalLoader />}>
        {!user ? (
          <Login />
        ) : window.location.pathname === '/autoquiz' ? (
          <AutoQuizGenerator />
        ) : (
          <Dashboard logout={logout} />
        )}
      </Suspense>
    </div>
  );
}
