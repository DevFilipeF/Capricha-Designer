import { supabase } from '@/integrations/supabase/client';
import { signedUrl } from './storage';
import { listUsers } from './users';

export interface GenerationRow {
  id: string;
  created_by: string | null;
  status: string;
  input_snapshot: any;
  preset_snapshot: any;
  total_items: number;
  total_pages: number;
  output_file_path: string | null;
  output_size_bytes: number | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface GenerationItemInput {
  nome: string;
  idade?: string;
  quantidade: number;
  templateId: string;
}

export async function listGenerations(limit?: number): Promise<GenerationRow[]> {
  let q = supabase.from('generations').select('*').order('created_at', { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as GenerationRow[];
}

export async function countRows(table: 'templates' | 'presets' | 'fonts' | 'generations') {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export interface UserProduction {
  userId: string | null;
  displayName: string;
  username: string;
  role: 'admin' | 'user';
  generations: number;
  pages: number;
  items: number;
  lastAt: string | null;
}

/**
 * Agrega a produção (impressões) por usuário.
 * Visível apenas para administradores — as policies de `generations` já
 * restringem a leitura ao dono ou a quem tem papel de admin.
 */
export async function productionByUser(): Promise<UserProduction[]> {
  const [{ data: generations, error }, { data: profiles }, { data: roles }, users] = await Promise.all([
    supabase.from('generations').select('created_by, total_pages, total_items, created_at'),
    supabase.from('profiles').select('id, display_name'),
    supabase.from('user_roles').select('user_id, role'),
    // A lista de usuários vem da Edge Function (exige admin); se falhar,
    // a produção ainda é exibida com os nomes dos perfis.
    listUsers().catch(() => [] as { id: string; username: string; displayName: string; role: 'admin' | 'user' }[]),
  ]);
  if (error) throw error;

  const nameByUser = new Map((profiles ?? []).map(p => [p.id, p.display_name as string | null]));
  const roleByUser = new Map((roles ?? []).map(r => [r.user_id, r.role as 'admin' | 'user']));
  const usernameByUser = new Map(users.map(u => [u.id, u.username]));

  const acc = new Map<string, UserProduction>();
  for (const g of generations ?? []) {
    const key = g.created_by ?? 'desconhecido';
    const current = acc.get(key) ?? {
      userId: g.created_by,
      displayName: nameByUser.get(key) ?? (g.created_by ? 'Usuário' : 'Sem responsável'),
      username: usernameByUser.get(key) ?? '—',
      role: roleByUser.get(key) ?? 'user',
      generations: 0,
      pages: 0,
      items: 0,
      lastAt: null,
    };
    current.generations += 1;
    current.pages += g.total_pages ?? 0;
    current.items += g.total_items ?? 0;
    if (!current.lastAt || g.created_at > current.lastAt) current.lastAt = g.created_at;
    acc.set(key, current);
  }

  return Array.from(acc.values()).sort((a, b) => b.generations - a.generations);
}

export async function saveGeneration(params: {
  pdf: Uint8Array;
  filename: string;
  templateId: string;
  presetSnapshot: any;
  inputSnapshot: any;
  items: GenerationItemInput[];
  totalPages: number;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Sessão expirada');

  const path = `${uid}/${crypto.randomUUID()}.pdf`;
  const blob = new Blob([params.pdf.slice().buffer as ArrayBuffer], { type: 'application/pdf' });
  const { error: upErr } = await supabase.storage.from('outputs').upload(path, blob, {
    contentType: 'application/pdf',
  });
  if (upErr) throw upErr;

  const totalItems = params.items.reduce((s, i) => s + (i.quantidade || 1), 0);

  const { data, error } = await supabase
    .from('generations')
    .insert({
      created_by: uid,
      status: 'completed',
      input_snapshot: { ...params.inputSnapshot, filename: params.filename } as any,
      preset_snapshot: params.presetSnapshot as any,
      total_items: totalItems,
      total_pages: params.totalPages,
      output_file_path: path,
      output_size_bytes: blob.size,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  const generation = data as GenerationRow;

  const itemRows = params.items.map((i, idx) => ({
    generation_id: generation.id,
    template_id: params.templateId,
    name: i.nome,
    age: i.idade && !Number.isNaN(Number(i.idade)) ? Number(i.idade) : null,
    quantity: i.quantidade || 1,
    sort_order: idx,
    rendered_values: { nome: i.nome, idade: i.idade ?? null } as any,
  }));
  if (itemRows.length) {
    const { error: itemErr } = await supabase.from('generation_items').insert(itemRows);
    if (itemErr) throw itemErr;
  }

  return generation;
}

export async function generationDownloadUrl(g: GenerationRow) {
  if (!g.output_file_path) throw new Error('PDF não disponível');
  return signedUrl('outputs', g.output_file_path, 300);
}

export async function deleteGeneration(g: GenerationRow) {
  if (g.output_file_path) await supabase.storage.from('outputs').remove([g.output_file_path]);
  const { error } = await supabase.from('generations').delete().eq('id', g.id);
  if (error) throw error;
}
