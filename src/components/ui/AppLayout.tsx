import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Settings, Printer, History, LogOut, Type, DownloadCloud,
  LayoutDashboard, Users, ShieldCheck, Menu, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Visão geral',
    items: [{ to: '/', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    title: 'Administração',
    items: [
      { to: '/templates', icon: FileText, label: 'Templates', adminOnly: true },
      { to: '/fontes', icon: Type, label: 'Fontes', adminOnly: true },
      { to: '/configuracao', icon: Settings, label: 'Presets', adminOnly: true },
      { to: '/usuarios', icon: Users, label: 'Usuários', adminOnly: true },
      { to: '/producao-por-usuario', icon: BarChart3, label: 'Produção por usuário', adminOnly: true },
      { to: '/importar', icon: DownloadCloud, label: 'Importar dados', adminOnly: true },
    ],
  },
  {
    title: 'Produção',
    items: [
      { to: '/producao', icon: Printer, label: 'Gerar PDF' },
      { to: '/historico', icon: History, label: 'Histórico' },
    ],
  },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useAuth();

  return (
    <nav className="flex-1 overflow-y-auto p-3 space-y-6">
      {NAV_GROUPS.map(group => {
        const items = group.items.filter(i => !i.adminOnly || isAdmin);
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </p>
            <div className="space-y-1">
              {items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function UserFooter() {
  const { user, profile, isAdmin, isLocalSession, signOut } = useAuth();
  const displayName = profile?.displayName ?? user?.email?.split('@')[0] ?? 'Usuário';
  const identifier = user?.email ?? 'Administrador local';

  return (
    <div className="p-3 border-t border-border">
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
        <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-[11px] text-muted-foreground truncate">{identifier}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} title="Sair" className="shrink-0">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-1.5 px-1 pt-2">
        {isAdmin ? (
          <Badge variant="accent" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            {isLocalSession ? 'Admin local' : 'Administrador'}
          </Badge>
        ) : (
          <Badge variant="muted">Usuário</Badge>
        )}
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentLabel = NAV_GROUPS
    .flatMap(g => g.items)
    .find(i => (i.to === '/' ? location.pathname === '/' : location.pathname.startsWith(i.to)))?.label ?? 'CaprichaPam';

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar fixa (desktop) */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display text-primary leading-tight">CaprichaPam</h1>
              <p className="text-[11px] text-muted-foreground">Personalização</p>
            </div>
          </div>
        </div>
        <NavContent />
        <UserFooter />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-card/95 backdrop-blur border-b border-border">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <div className="p-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h1 className="text-lg font-bold font-display text-primary">CaprichaPam</h1>
                </div>
              </div>
              <NavContent onNavigate={() => setMobileOpen(false)} />
              <UserFooter />
            </SheetContent>
          </Sheet>
          <span className="font-medium text-sm">{currentLabel}</span>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
