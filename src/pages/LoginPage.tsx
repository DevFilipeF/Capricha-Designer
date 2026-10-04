import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ensureLocalAdmin, lockRemainingMinutes } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'admin' | 'user';

export default function LoginPage() {
  const { signIn, signInLocal, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>('admin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Preencha usuário e senha');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'admin') {
        // Administrador: tenta a conta local do navegador e, se não existir,
        // cai para a conta de administrador na nuvem.
        await ensureLocalAdmin().catch(() => undefined);

        const locked = lockRemainingMinutes();
        if (locked > 0) {
          setError(`Muitas tentativas. Tente novamente em ${locked} min.`);
          return;
        }

        const local = await signInLocal(identifier, password);
        if (!local.error) return;

        const cloud = await signIn(identifier, password);
        if (cloud.error) { setError(local.error); return; }
        if (cloud.role !== 'admin') {
          await signOut();
          setError('Esta conta não tem acesso de administrador');
          return;
        }
        return;
      }

      const res = await signIn(identifier, password);
      if (res.error) setError(res.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Fundo decorativo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_75%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-bold font-display text-primary tracking-tight">CaprichaPam</h1>
          <p className="text-muted-foreground text-sm mt-2">Sistema de Personalização</p>
        </div>

        <div className="glass-card rounded-2xl shadow-xl shadow-black/[0.04]">
          <Tabs value={mode} onValueChange={v => { setMode(v as Mode); setError(''); setIdentifier(''); setPassword(''); }}>
            <div className="px-6 pt-6">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="admin" className="gap-2">
                  <ShieldCheck className="h-4 w-4" /> Administrador
                </TabsTrigger>
                <TabsTrigger value="user" className="gap-2">
                  <UserIcon className="h-4 w-4" /> Usuário
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="admin" className="px-6 pb-6 mt-0">
              <form onSubmit={handleSubmit} className="space-y-4 pt-5">
                <p className="text-xs text-muted-foreground text-center -mt-1 mb-2">
                  Acesso restrito à gestão do sistema
                </p>
                <IdentifierField value={identifier} onChange={setIdentifier} mode="admin" />
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  visible={showPassword}
                  onToggle={() => setShowPassword(v => !v)}
                />
                {error && <ErrorLine message={error} />}
                <SubmitButton loading={loading} label="Entrar como administrador" />
              </form>
            </TabsContent>

            <TabsContent value="user" className="px-6 pb-6 mt-0">
              <form onSubmit={handleSubmit} className="space-y-4 pt-5">
                <p className="text-xs text-muted-foreground text-center -mt-1 mb-2">
                  Produção de etiquetas e materiais
                </p>
                <IdentifierField value={identifier} onChange={setIdentifier} mode="user" />
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  visible={showPassword}
                  onToggle={() => setShowPassword(v => !v)}
                />
                {error && <ErrorLine message={error} />}
                <SubmitButton loading={loading} label="Entrar" />
                <p className="text-[11px] text-center text-muted-foreground">
                  Contas de usuário são criadas pelo administrador
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}

function IdentifierField({ value, onChange, mode }: { value: string; onChange: (v: string) => void; mode: Mode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`identifier-${mode}`}>Usuário ou e-mail</Label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={`identifier-${mode}`}
          type="text"
          autoComplete="username"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="pl-10"
          placeholder={mode === 'admin' ? 'admin' : 'fernanda'}
          required
        />
      </div>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  visible,
  onToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="password">Senha</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="password"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="pl-10 pr-10"
          placeholder="••••••••"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2')}>
      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <Button type="submit" className="w-full" size="lg" disabled={loading}>
      {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verificando...</> : label}
    </Button>
  );
}
