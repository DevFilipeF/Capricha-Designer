import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireAdmin } from '../_shared/admin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const EMAIL_DOMAIN = 'caprichapam.app';

/** "Fernanda Souza" -> "fernanda.souza" */
function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 40);
}

function publicUser(u: {
  id: string;
  email?: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  user_metadata?: Record<string, unknown> | null;
}, role: string, displayName: string | null) {
  return {
    id: u.id,
    email: u.email ?? '',
    username: (u.email ?? '').split('@')[0],
    displayName: displayName ?? (u.user_metadata?.display_name as string) ?? '',
    role,
    active: !u.banned_until || new Date(u.banned_until) < new Date(),
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const guard = await requireAdmin(req);
  if (guard.error) return json({ error: guard.error }, guard.status);
  const admin = guard.admin;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corpo da requisição inválido' }, 400);
  }

  const action = String(body.action ?? '');

  try {
    switch (action) {
      case 'list': {
        const { data: authData, error: authErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (authErr) throw authErr;

        const [{ data: roles }, { data: profiles }] = await Promise.all([
          admin.from('user_roles').select('user_id, role'),
          admin.from('profiles').select('id, display_name'),
        ]);

        const roleByUser = new Map((roles ?? []).map(r => [r.user_id, r.role as string]));
        const nameByUser = new Map((profiles ?? []).map(p => [p.id, p.display_name as string | null]));

        const users = (authData?.users ?? [])
          .map(u => publicUser(u, roleByUser.get(u.id) ?? 'user', nameByUser.get(u.id) ?? null))
          .sort((a, b) => a.username.localeCompare(b.username, 'pt-BR'));

        return json({ users });
      }

      case 'create': {
        const displayName = String(body.displayName ?? '').trim();
        const password = String(body.password ?? '');
        const role = body.role === 'admin' ? 'admin' : 'user';
        let username = slugify(String(body.username ?? '') || displayName);

        if (!displayName) return json({ error: 'Informe o nome do usuário' }, 400);
        if (password.length < 6) return json({ error: 'A senha precisa ter pelo menos 6 caracteres' }, 400);
        if (!username) username = `usuario${Date.now().toString().slice(-5)}`;

        const email = `${username}@${EMAIL_DOMAIN}`;

        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: displayName },
        });
        if (error) {
          if (/already|registered|exists/i.test(error.message)) {
            return json({ error: `O usuário "${username}" já existe` }, 409);
          }
          throw error;
        }

        const userId = data.user!.id;
        await admin.from('profiles').upsert({ id: userId, display_name: displayName });
        await admin.from('user_roles').delete().eq('user_id', userId);
        await admin.from('user_roles').insert({ user_id: userId, role });

        return json({ user: publicUser(data.user!, role, displayName) }, 201);
      }

      case 'setRole': {
        const userId = String(body.userId ?? '');
        const role = body.role === 'admin' ? 'admin' : 'user';
        if (!userId) return json({ error: 'Usuário não informado' }, 400);

        if (userId === guard.userId && role !== 'admin') {
          return json({ error: 'Você não pode remover o seu próprio acesso de administrador' }, 400);
        }

        await admin.from('user_roles').delete().eq('user_id', userId);
        const { error } = await admin.from('user_roles').insert({ user_id: userId, role });
        if (error) throw error;

        return json({ ok: true, role });
      }

      case 'setActive': {
        const userId = String(body.userId ?? '');
        const active = body.active === true;
        if (!userId) return json({ error: 'Usuário não informado' }, 400);
        if (userId === guard.userId && !active) {
          return json({ error: 'Você não pode desativar a sua própria conta' }, 400);
        }

        const { error } = await admin.auth.admin.updateUserById(userId, {
          ban_duration: active ? 'none' : '876000h',
        });
        if (error) throw error;

        return json({ ok: true, active });
      }

      case 'resetPassword': {
        const userId = String(body.userId ?? '');
        const password = String(body.password ?? '');
        if (!userId) return json({ error: 'Usuário não informado' }, 400);
        if (password.length < 6) return json({ error: 'A senha precisa ter pelo menos 6 caracteres' }, 400);

        const { error } = await admin.auth.admin.updateUserById(userId, { password });
        if (error) throw error;

        return json({ ok: true });
      }

      case 'delete': {
        const userId = String(body.userId ?? '');
        if (!userId) return json({ error: 'Usuário não informado' }, 400);
        if (userId === guard.userId) return json({ error: 'Você não pode excluir a sua própria conta' }, 400);

        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;

        return json({ ok: true });
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro inesperado' }, 500);
  }
});