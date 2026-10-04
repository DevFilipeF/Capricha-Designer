import { supabase } from '@/integrations/supabase/client';
import {
  legacyToV2,
  readLegacyConfig,
  validatePreset,
  type LegacyPresetConfig,
  type PresetConfigV2,
} from '@/lib/presetSchemaV2';

export interface PresetRow {
  id: string;
  template_id: string;
  schema_version: number;
  config_json: any;
  revision: number;
  validation_status: string;
  validation_errors: any;
  created_at: string;
  updated_at: string;
}

export interface PresetView extends PresetRow {
  nome: string;
  legacy: LegacyPresetConfig;
}

function toView(row: PresetRow): PresetView {
  return {
    ...row,
    nome: row.config_json?.name ?? 'Preset',
    legacy: readLegacyConfig(row.config_json),
  };
}

export async function listPresets(): Promise<PresetView[]> {
  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as PresetRow[]).map(toView);
}

function buildConfig(name: string, legacy: LegacyPresetConfig, pageHeight: number): PresetConfigV2 {
  return legacyToV2(name, legacy, pageHeight);
}

export async function createPreset(params: {
  templateId: string;
  name: string;
  legacy: LegacyPresetConfig;
  pageHeight: number;
}) {
  const config = buildConfig(params.name, params.legacy, params.pageHeight);
  const validation = validatePreset(config);
  const { data, error } = await supabase
    .from('presets')
    .insert({
      template_id: params.templateId,
      schema_version: 2,
      config_json: config as any,
      validation_status: validation.status,
      validation_errors: validation.errors as any,
    })
    .select()
    .single();
  if (error) throw error;
  return toView(data as PresetRow);
}

export async function updatePreset(params: {
  id: string;
  templateId: string;
  name: string;
  legacy: LegacyPresetConfig;
  pageHeight: number;
  revision: number;
}) {
  const config = buildConfig(params.name, params.legacy, params.pageHeight);
  const validation = validatePreset(config);
  const { data, error } = await supabase
    .from('presets')
    .update({
      template_id: params.templateId,
      config_json: config as any,
      revision: params.revision + 1,
      validation_status: validation.status,
      validation_errors: validation.errors as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single();
  if (error) throw error;
  return toView(data as PresetRow);
}

export async function deletePreset(id: string) {
  const { error } = await supabase.from('presets').delete().eq('id', id);
  if (error) throw error;
}
