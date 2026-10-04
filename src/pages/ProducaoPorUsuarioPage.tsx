import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productionByUser, listGenerations, type UserProduction } from '@/lib/api/generations';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, FileStack, Files, Printer, Search, Users } from 'lucide-react';

type Period = '7d' | '30d' | 'all';

const PERIODS: { value: Period; label: string; days: number | null }[] = [
  { value: '7d', label: 'Últimos 7 dias', days: 7 },
  { value: '30d', label: 'Últimos 30 dias', days: 30 },
  { value: 'all', label: 'Todo o período', days: null },
];

export default function ProducaoPorUsuarioPage() {
  const [period, setPeriod] = useState<Period>('all');
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['production-by-user', period],
    queryFn: () => productionByUser(),
    retry: false,
  });

  const { data: generations = [] } = useQuery({
    queryKey: ['generations', 'report'],
    queryFn: () => listGenerations(),
  });

  const days = PERIODS.find(p => p.value === period)?.days ?? null;

  // A janela de período é aplicada sobre as gerações detalhadas, pois a
  // agregação por usuário traz o total acumulado.
  const filtered = useMemo(() => {
    if (!days) return rows;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recent = generations.filter(g => new Date(g.created_at).getTime() >= cutoff);

    const byUser = new Map<string, UserProduction>();
    for (const g of recent) {
      const key = g.created_by ?? 'desconhecido';
      const base = rows.find(r => (r.userId ?? 'desconhecido') === key);
      const current = byUser.get(key) ?? {
        userId: g.created_by,
        displayName: base?.displayName ?? 'Usuário',
        username: base?.username ?? '—',
        role: base?.role ?? 'user',
        generations: 0,
        pages: 0,
        items: 0,
        lastAt: null,
      };
      current.generations += 1;
      current.pages += g.total_pages ?? 0;
      current.items += g.total_items ?? 0;
      if (!current.lastAt || g.created_at > current.lastAt) current.lastAt = g.created_at;
      byUser.set(key, current);
    }
    return Array.from(byUser.values()).sort((a, b) => b.generations - a.generations);
  }, [rows, generations, days]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return filtered;
    return filtered.filter(r =>
      r.displayName.toLowerCase().includes(term) || r.username.toLowerCase().includes(term),
    );
  }, [filtered, search]);

  const totals = visible.reduce(
    (acc, r) => ({
      generations: acc.generations + r.generations,
      pages: acc.pages + r.pages,
      items: acc.items + r.items,
    }),
    { generations: 0, pages: 0, items: 0 },
  );

  return (
    <div className="page-container">
      <PageHeader
        title="Produção por usuário"
        description="Quantas impressões cada pessoa gerou no sistema"
        icon={BarChart3}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="PDFs gerados" value={totals.generations} icon={Printer} tone="primary" />
        <StatCard label="Páginas impressas" value={totals.pages} icon={Files} tone="accent" />
        <StatCard label="Itens personalizados" value={totals.items} icon={FileStack} tone="success" />
      </div>

      <Card className="glass-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome"
              className="pl-10"
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {PERIODS.map(p => (
              <Button
                key={p.value}
                variant={period === p.value ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {error ? (
          <EmptyState
            icon={BarChart3}
            title="Não foi possível carregar a produção"
            description={(error as Error).message}
          />
        ) : isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhuma impressão no período"
            description="Quando alguém gerar um PDF, a produção aparece aqui automaticamente."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">PDFs</TableHead>
                <TableHead className="text-right">Páginas</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Itens</TableHead>
                <TableHead className="hidden md:table-cell">Última impressão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(row => (
                <TableRow key={row.userId ?? 'sem-responsavel'}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                        {row.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-2">
                          {row.displayName}
                          {row.role === 'admin' && <Badge variant="accent">Admin</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">@{row.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{row.generations}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.pages}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground hidden sm:table-cell">{row.items}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {row.lastAt ? new Date(row.lastAt).toLocaleString('pt-BR') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}