import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

function isOpaque(v: string) {
  return v.startsWith('sb_publishable_') || v.startsWith('sb_secret_');
}

function shimFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (isOpaque(key) && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
    headers.set('apikey', key);
    return fetch(input, { ...init, headers });
  };
}

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: shimFetch(key) },
  });
}

/** Valida o JWT do chamador e garante que ele é admin. */
export async function requireAdmin(req: Request) {
  const admin = adminClient();
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return { error: 'Não autenticado', status: 401 as const, admin, userId: null };

  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return { error: 'Sessão inválida', status: 401 as const, admin, userId: null };

  const { data: roles } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roles) return { error: 'Apenas administradores', status: 403 as const, admin, userId: data.user.id };
  return { error: null, status: 200 as const, admin, userId: data.user.id };
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes.slice().buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
