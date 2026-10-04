import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  setUserActive,
  setUserRole,
  type ManagedUser,
} from '@/lib/api/users';
import type { AppRole } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2, KeyRound, Loader2, Plus, Search, ShieldCheck, ShieldOff,
  Trash2, UserCog, UserX, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function UsuariosPage() {
  const qc = useQueryClient();
  const { user: currentUser, isLocalSession } = useAuth();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    retry: false,
  });

  const [search, setSearch] = useState('');
  const [openNew, setOpenNew] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<ManagedUser | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AppRole }) => setUserRole(id, role),
    onSuccess: () => { toast.success('Permissão atualizada'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setUserActive(id, active),
    onSuccess: (_d, v) => { toast.success(v.active ? 'Usuário ativado' : 'Usuário desativado'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => { toast.success('Usuário excluído'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      u.username.toLowerCase().includes(term) ||
      u.displayName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term),
    );
  }, [users, search]);

  const adminCount = users.filter(u => u.role === 'admin').length;

  return (
    <div className="page-container">
      <PageHeader
        title="Usuários"
        description="Crie acessos, defina permissões e controle quem pode entrar no sistema"
        icon={Users}
        actions={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo usuário</Button>
            </DialogTrigger>
            <NewUserDialog onDone={() => { setOpenNew(false); invalidate(); }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MiniStat label="Total de usuários" value={users.length} icon={Users} tone="primary" />
        <MiniStat label="Administradores" value={adminCount} icon={ShieldCheck} tone="accent" />
        <MiniStat label="Ativos" value={users.filter(u => u.active).length} icon={CheckCircle2} tone="success" />
      </div>

      <Card className="glass-card overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou usuário"
              className="pl-10"
            />
          </div>
        </div>

        {error ? (
          <EmptyState
            icon={ShieldOff}
            title="Não foi possível carregar os usuários"
            description={(error as Error).message}
          />
        ) : isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
            description={search ? 'Ajuste a busca para encontrar quem procura' : 'Clique em "Novo usuário" para começar'}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Usuário</TableHead>
                <TableHead className="hidden md:table-cell">Último acesso</TableHead>
                <TableHead className="w-[150px]">Permissão</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                          {u.displayName.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {u.displayName}
                            {isSelf && <span className="text-muted-foreground font-normal"> (você)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString('pt-BR') : 'Nunca acessou'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={role => roleMutation.mutate({ id: u.id, role: role as AppRole })}
                        disabled={isSelf || roleMutation.isPending}
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="user">Usuário</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.active ? 'success' : 'muted'}>
                        {u.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="icon" title="Redefinir senha"
                          onClick={() => setPasswordTarget(u)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          title={u.active ? 'Desativar' : 'Ativar'}
                          disabled={isSelf || activeMutation.isPending}
                          onClick={() => activeMutation.mutate({ id: u.id, active: !u.active })}
                        >
                          {u.active ? <UserX className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Excluir"
                          className="text-destructive"
                          disabled={isSelf || deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Excluir o usuário "${u.displayName}"? Esta ação não pode ser desfeita.`)) {
                              deleteMutation.mutate(u.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {isLocalSession && (
        <p className="text-xs text-muted-foreground mt-4">
          Você está conectado como administrador local deste navegador. A gestão de usuários exige a conta de
          administrador na nuvem (Supabase).
        </p>
      )}

      <ResetPasswordDialog target={passwordTarget} onClose={() => setPasswordTarget(null)} />
    </div>
  );
}

function NewUserDialog({ onDone }: { onDone: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('user');

  const mutation = useMutation({
    mutationFn: () => createUser({ displayName: displayName.trim(), username: username.trim(), password, role }),
    onSuccess: (u) => {
      toast.success(`Usuário "${u.displayName}" criado com acesso @${u.username}`);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" /> Novo usuário
        </DialogTitle>
        <DialogDescription>
          O usuário entra com o nome de acesso informado abaixo (sem precisar de e-mail real).
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label>Nome completo</Label>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ex: Fernanda Souza" />
        </div>
        <div className="space-y-2">
          <Label>Nome de acesso</Label>
          <Input
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ''))}
            placeholder="fernanda.souza"
          />
          <p className="text-xs text-muted-foreground">Deixe vazio para gerar a partir do nome</p>
        </div>
        <div className="space-y-2">
          <Label>Senha inicial</Label>
          <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </div>
        <div className="space-y-2">
          <Label>Permissão</Label>
          <Select value={role} onValueChange={v => setRole(v as AppRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuário — apenas produção</SelectItem>
              <SelectItem value="admin">Administrador — acesso total</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full"
          disabled={mutation.isPending}
          onClick={() => {
            if (!displayName.trim()) return toast.error('Informe o nome completo');
            if (password.length < 6) return toast.error('A senha precisa ter pelo menos 6 caracteres');
            mutation.mutate();
          }}
        >
          {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</> : 'Criar usuário'}
        </Button>
      </div>
    </DialogContent>
  );
}

function ResetPasswordDialog({ target, onClose }: { target: ManagedUser | null; onClose: () => void }) {
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => resetUserPassword(target!.id, password),
    onSuccess: () => { toast.success('Senha redefinida'); setPassword(''); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!target} onOpenChange={open => { if (!open) { setPassword(''); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Redefinir senha
          </DialogTitle>
          <DialogDescription>
            Definir uma nova senha para {target?.displayName} (@{target?.username}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <Button
            className="w-full"
            disabled={mutation.isPending}
            onClick={() => {
              if (password.length < 6) return toast.error('A senha precisa ter pelo menos 6 caracteres');
              mutation.mutate();
            }}
          >
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Redefinir senha'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'primary' | 'accent' | 'success';
}) {
  const tones = {
    primary: 'text-primary bg-primary/10',
    accent: 'text-accent bg-accent/10',
    success: 'text-success bg-success/10',
  } as const;

  return (
    <Card className="glass-card">
      <div className="p-5 flex items-center gap-4">
        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold font-display">{value}</p>
        </div>
      </div>
    </Card>
  );
}