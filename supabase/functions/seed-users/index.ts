import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const USERS = [
  { username: 'admin', password: 'Capricha@2026' },
  { username: 'fernanda', password: 'Fernanda@2026' },
  { username: 'tayna', password: 'Tayna@2026' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const results: unknown[] = [];
  for (const u of USERS) {
    const email = `${u.username}@caprichapam.app`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: u.password,
      email_confirm: true,
      user_metadata: { display_name: u.username },
    });
    if (error && /already/i.test(error.message)) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users.find((x) => x.email === email);
      if (existing) {
        await admin.auth.admin.updateUserById(existing.id, { password: u.password });
        results.push({ email, status: 'password_reset', id: existing.id });
        continue;
      }
    }
    results.push({ email, status: error ? `error: ${error.message}` : 'created', id: data?.user?.id });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
