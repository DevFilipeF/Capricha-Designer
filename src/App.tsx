import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/ui/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import TemplatesPage from '@/pages/TemplatesPage';
import FontesPage from '@/pages/FontesPage';
import ConfiguracaoPage from '@/pages/ConfiguracaoPage';
import ProducaoPage from '@/pages/ProducaoPage';
import HistoricoPage from '@/pages/HistoricoPage';
import ImportLocalDataPage from '@/pages/ImportLocalDataPage';
import UsuariosPage from '@/pages/UsuariosPage';
import ProducaoPorUsuarioPage from '@/pages/ProducaoPorUsuarioPage';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

/** Bloqueia rotas administrativas para quem não é administrador. */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthGate() {
  const { session, isLocalSession, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-display text-primary mb-2">CaprichaPam</h1>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session && !isLocalSession) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/templates" element={<AdminRoute><TemplatesPage /></AdminRoute>} />
        <Route path="/fontes" element={<AdminRoute><FontesPage /></AdminRoute>} />
        <Route path="/configuracao" element={<AdminRoute><ConfiguracaoPage /></AdminRoute>} />
        <Route path="/usuarios" element={<AdminRoute><UsuariosPage /></AdminRoute>} />
        <Route path="/producao-por-usuario" element={<AdminRoute><ProducaoPorUsuarioPage /></AdminRoute>} />
        <Route path="/importar" element={<AdminRoute><ImportLocalDataPage /></AdminRoute>} />
        <Route path="/producao" element={<ProducaoPage />} />
        <Route path="/historico" element={<HistoricoPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <AuthGate />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
