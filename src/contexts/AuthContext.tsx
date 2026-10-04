import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getLocalSession, localLogin, localLogout, type AuthSession } from '@/lib/auth';

/** Papéis disponíveis no sistema. */
export type AppRole = 'admin' | 'user';

/** Perfil exibido na interface. */
export interface AuthProfile {
  id: string;
  displayName: string;
  role: AppRole;
  active: boolean;
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  role: AppRole | null;
  isAdmin: boolean;
  isUser: boolean;
  /** Login local (administrador guardado no navegador), sem depender da nuvem. */
  isLocalSession: boolean;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null; role: AppRole | null }>;
  signInLocal: (username: string, password: string) => Promise<{ error: string | null; role: AppRole | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/** Converte "fernanda" em "fernanda@caprichapam.app" quando não é um e-mail. */
export function normalizeIdentifier(identifier: string) {
  const value = identifier.trim();
  return value.includes('@') ? value : `${value.toLowerCase()}@caprichapam.app`;
}

export const AuthContext = createContext<AuthContextType | null>(null);

function traduzir(msg: string) {
  if (/Invalid login credentials/i.test(msg)) return 'Usuário ou senha incorretos';
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar';
  if (/User already registered/i.test(msg)) return 'Este e-mail já está cadastrado';
  if (/Password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres';
  if (/pwned|leaked/i.test(msg)) return 'Essa senha apareceu em vazamentos de dados. Escolha outra.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão com o servidor. Verifique sua internet.';
  return msg;
}

async function loadProfile(user: User): Promise<AuthProfile> {
  const [{ data: roleRow }, { data: profileRow }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
  ]);

  const role: AppRole = roleRow?.role === 'admin' ? 'admin' : 'user';
  const fallbackName = user.email?.split('@')[0] ?? 'Usuário';

  return {
    id: user.id,
    displayName: profileRow?.display_name || (user.user_metadata?.display_name as string) || fallbackName,
    role,
    active: true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [local, setLocal] = useState<AuthSession | null>(() => getLocalSession());
  const [loading, setLoading] = useState(true);

  const syncProfile = useCallback(async (s: Session | null) => {
    if (!s?.user) { setProfile(null); return; }
    try {
      setProfile(await loadProfile(s.user));
    } catch {
      // Sem acesso à nuvem: mantém um perfil mínimo para não travar a interface.
      setProfile({
        id: s.user.id,
        displayName: (s.user.user_metadata?.display_name as string) || s.user.email?.split('@')[0] || 'Usuário',
        role: 'user',
        active: true,
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      setLoading(false);
      // O Supabase recomenda adiar chamadas de rede dentro do callback.
      setTimeout(() => { if (active) void syncProfile(s); }, 0);
    });

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        void syncProfile(data.session);
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [syncProfile]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const email = normalizeIdentifier(identifier);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: traduzir(error.message), role: null as AppRole | null };

    // Descobre o papel imediatamente para a interface já abrir no lugar certo.
    let role: AppRole = 'user';
    if (data.user) {
      try {
        const p = await loadProfile(data.user);
        role = p.role;
        setProfile(p);
      } catch {
        role = 'user';
      }
    }
    return { error: null, role };
  }, []);

  const signInLocal = useCallback(async (username: string, password: string) => {
    const found = await localLogin(username.trim().toLowerCase(), password);
    if (!found) return { error: 'Usuário ou senha incorretos', role: null as AppRole | null };
    setLocal(found);
    return { error: null, role: 'admin' as AppRole };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName.trim() || email.split('@')[0] },
      },
    });
    return { error: error ? traduzir(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    localLogout();
    setLocal(null);
    setProfile(null);
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => { await syncProfile(session); }, [session, syncProfile]);

  const user = session?.user ?? null;
  const role: AppRole | null = local ? 'admin' : profile?.role ?? null;

  const value = useMemo<AuthContextType>(() => ({
    session,
    user,
    profile,
    role,
    isAdmin: role === 'admin',
    isUser: role === 'user',
    isLocalSession: !!local,
    loading,
    signIn,
    signInLocal,
    signUp,
    signOut,
    refreshProfile,
  }), [session, user, profile, role, local, loading, signIn, signInLocal, signUp, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { useAuth } from '@/hooks/useAuth';
