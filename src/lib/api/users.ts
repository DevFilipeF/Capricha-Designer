import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/contexts/AuthContext';

export interface ManagedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: AppRole;
  active: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

interface ManageUsersResponse {
  users?: ManagedUser[];
  user?: ManagedUser;
  error?: string;
  ok?: boolean;
}

/**
 * Todas as operações de gestão de usuários passam pela Edge Function
 * `manage-users`, que valida o JWT do chamador e exige papel de administrador.
 */
async function invoke(body: Record<string, unknown>): Promise<ManageUsersResponse> {
  const { data, error } = await supabase.functions.invoke('manage-users', { body });

  if (error) {
    // A Edge Function devolve { error } no corpo mesmo em status 4xx/5xx.
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const parsed = await context.clone().json() as ManageUsersResponse;
        if (parsed?.error) return parsed;
      } catch {
        // mantém a mensagem original abaixo
      }
    }
    return { error: traduzirErro(error.message) };
  }

  return (data ?? {}) as ManageUsersResponse;
}

function traduzirErro(message: string) {
  if (/Failed to send|not found|404/i.test(message)) {
    return 'Função de gestão de usuários não encontrada. Faça o deploy da função "manage-users" no Supabase.';
  }
  if (/non-2xx|Edge Function/i.test(message)) return 'Falha ao falar com o servidor de usuários';
  return message;
}

export async function listUsers(): Promise<ManagedUser[]> {
  const res = await invoke({ action: 'list' });
  if (res.error) throw new Error(res.error);
  return res.users ?? [];
}

export async function createUser(params: {
  displayName: string;
  username: string;
  password: string;
  role: AppRole;
}): Promise<ManagedUser> {
  const res = await invoke({ action: 'create', ...params });
  if (res.error) throw new Error(res.error);
  return res.user!;
}

export async function setUserRole(userId: string, role: AppRole) {
  const res = await invoke({ action: 'setRole', userId, role });
  if (res.error) throw new Error(res.error);
}

export async function setUserActive(userId: string, active: boolean) {
  const res = await invoke({ action: 'setActive', userId, active });
  if (res.error) throw new Error(res.error);
}

export async function resetUserPassword(userId: string, password: string) {
  const res = await invoke({ action: 'resetPassword', userId, password });
  if (res.error) throw new Error(res.error);
}

export async function deleteUser(userId: string) {
  const res = await invoke({ action: 'delete', userId });
  if (res.error) throw new Error(res.error);
}