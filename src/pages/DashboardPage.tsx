import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { countRows, listGenerations, productionByUser } from '@/lib/api/generations';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight, FileText, Settings, Printer, Type, LayoutDashboard, Sparkles, History, Users, BarChart3,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { profile, isAdmin } = useAuth();

  const { data: counts, isLoading: loadingCounts } = useQuery({
    queryKey: ['counts'],
    queryFn: async () => ({
      templates: await countRows('templates'),
      presets: await countRows('presets'),
      generations: await countRows('generations'),
      fonts: await countRows('fonts'),
    }),
  });

  const { data: recent = [], isLoading: loadingRecent } = useQuery({
    queryKey: ['generations', 'recent'],
    queryFn: () => listGenerations(5),
  });

  const { data: production = [] } = useQuery({
    queryKey: ['production-by-user'],
    queryFn: productionByUser,
    enabled: isAdmin,
    retry: false,
  });

  const firstName = (profile?.displayName ?? '').split(' ')[0];

  const stats = [
    { label: 'Templates', value: counts?.templates ?? 0, icon: FileText, tone: 'primary' as const, to: '/templates' },
    { label: 'Presets', value: counts?.presets ?? 0, icon: Settings, tone: 'accent' as const, to: '/configuracao' },
    { label: 'Gerações', value: counts?.generations ?? 0, icon: Printer, tone: 'success' as const, to: '/historico' },
    { label: 'Fontes', value: counts?.fonts ?? 0, icon: Type, tone: 'warning' as const, to: '/fontes' },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : 'Dashboard'}
        description="Visão geral da sua produção de materiais personalizados"
        icon={LayoutDashboard}
        actions={
          <Button asChild>
            <Link to="/producao">
              <Printer className="h-4 w-4 mr-2" />Gerar PDF
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            {loadingCounts ? (
              <Skeleton className="h-[104px] w-full rounded-xl" />
            ) : (
              <Link to={stat.to} className="block">
                <StatCard label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
              </Link>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-display">Últimas gerações</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/historico">Ver todas<ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingRecent ? (
              <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : recent.length === 0 ? (
              <EmptyState
                icon={Printer}
                title="Nenhuma geração ainda"
                description="Quando você gerar um PDF, ele aparece aqui com data e quantidade de itens."
                action={<Button asChild><Link to="/producao">Gerar o primeiro PDF</Link></Button>}
              />
            ) : (
              <div className="space-y-1">
                {recent.map(g => (
                  <div key={g.id} className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {g.preset_snapshot?.name ?? g.input_snapshot?.filename ?? 'Geração'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(g.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant="muted" className="shrink-0">{g.total_items} itens</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />Acesso rápido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickLink to="/producao" icon={Printer} label="Gerar PDF de um lote" />
            <QuickLink to="/historico" icon={History} label="Consultar histórico" />
            {isAdmin && <QuickLink to="/usuarios" icon={Users} label="Gerenciar usuários" />}
            {isAdmin && <QuickLink to="/templates" icon={FileText} label="Cadastrar template" />}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card className="glass-card mt-6">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />Impressões por usuário
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/producao-por-usuario">Ver relatório<ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {production.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="Nenhuma impressão registrada"
                description="A produção de cada pessoa aparece aqui assim que gerarem um PDF."
              />
            ) : (
              <div className="space-y-1">
                {production.slice(0, 6).map(row => (
                  <div key={row.userId ?? 'sem-responsavel'} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                      {row.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{row.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {row.lastAt ? `Última: ${new Date(row.lastAt).toLocaleDateString('pt-BR')}` : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="accent">{row.generations} PDFs</Badge>
                      <Badge variant="muted" className="hidden sm:inline-flex">{row.pages} págs.</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted hover:border-primary/40"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="flex-1">{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
