import { z } from 'zod';

/**
 * Schema V2 de presets — CaprichaPam
 *
 * Espaço de coordenadas: "pdf" (origem no canto INFERIOR esquerdo, unidade = ponto).
 * A UI de edição ainda usa o formato legado (origem no canto superior esquerdo);
 * o adapter `legacyToV2` converte entre os dois.
 */

// ---------- Legado (formato usado pelo editor atual) ----------

export interface LegacyPresetConfig {
  areaX: number;
  areaY: number;
  areaWidth: number;
  areaHeight: number;
  /** id (uuid) da fonte na tabela `fonts` */
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  alignment: 'center' | 'left' | 'right';
  idadePosition: 'above' | 'below';
  idadeFontSize: number;
  lineSpacing: number;
  maxLines: number;
}

export const legacyPresetConfigSchema = z.object({
  areaX: z.number(),
  areaY: z.number(),
  areaWidth: z.number().positive(),
  areaHeight: z.number().positive(),
  fontFamily: z.string(),
  fontSize: z.number().positive(),
  fontColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  alignment: z.enum(['center', 'left', 'right']),
  idadePosition: z.enum(['above', 'below']),
  idadeFontSize: z.number().positive(),
  lineSpacing: z.number(),
  maxLines: z.number().int().min(1).max(4),
});

export const defaultLegacyConfig: LegacyPresetConfig = {
  areaX: 50,
  areaY: 200,
  areaWidth: 200,
  areaHeight: 80,
  fontFamily: '',
  fontSize: 24,
  fontColor: '#000000',
  alignment: 'center',
  idadePosition: 'below',
  idadeFontSize: 16,
  lineSpacing: 4,
  maxLines: 2,
};

// ---------- V2 ----------

export const textSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('name') }),
  z.object({
    type: z.literal('age'),
    singularTemplate: z.string().default('{age} ano'),
    pluralTemplate: z.string().default('{age} anos'),
    hideWhenEmpty: z.boolean().default(true),
  }),
  z.object({ type: z.literal('static'), value: z.string() }),
]);

export type TextSource = z.infer<typeof textSourceSchema>;

export const textLayerSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  source: textSourceSchema,
  /** Caixa em pontos PDF, origem no canto inferior esquerdo */
  box: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  rotation: z.number().min(-360).max(360).default(0),
  /** uuid da fonte em `fonts` */
  fontId: z.string().uuid().nullable(),
  fontSize: z.number().positive(),
  minFontSize: z.number().positive().default(12),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  align: z.enum(['left', 'center', 'right']).default('center'),
  verticalAlign: z.enum(['top', 'middle', 'bottom']).default('middle'),
  lineHeight: z.number().positive().default(1.15),
  letterSpacing: z.number().default(0),
  maxLines: z.number().int().min(1).max(4).default(2),
  overflow: z.enum(['shrink', 'wrap', 'clip']).default('shrink'),
  outline: z
    .object({
      enabled: z.boolean().default(false),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
      width: z.number().min(0).default(0),
    })
    .optional(),
  visible: z.boolean().default(true),
});

export type TextLayer = z.infer<typeof textLayerSchema>;

export const presetConfigV2Schema = z.object({
  schema_version: z.literal(2),
  coordinate_space: z.literal('pdf'),
  name: z.string().min(1),
  page: z.object({ index: z.number().int().min(0).default(0) }),
  layers: z.array(textLayerSchema).min(1),
  /** Cópia do formato legado, usada pelo editor atual (Fase 1). */
  legacy: legacyPresetConfigSchema.optional(),
});

export type PresetConfigV2 = z.infer<typeof presetConfigV2Schema>;

export interface PresetValidationResult {
  status: 'valid' | 'invalid';
  errors: { path: string; message: string }[];
}

export function validatePreset(config: unknown): PresetValidationResult {
  const parsed = presetConfigV2Schema.safeParse(config);
  if (parsed.success) {
    const extra: PresetValidationResult['errors'] = [];
    parsed.data.layers.forEach((l, i) => {
      if (!l.fontId) extra.push({ path: `layers.${i}.fontId`, message: 'Camada sem fonte associada' });
    });
    return extra.length ? { status: 'invalid', errors: extra } : { status: 'valid', errors: [] };
  }
  return {
    status: 'invalid',
    errors: parsed.error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
  };
}

/**
 * Converte o formato legado (origem superior esquerda) para V2 (origem inferior esquerda).
 */
export function legacyToV2(
  name: string,
  legacy: LegacyPresetConfig,
  pageHeight: number
): PresetConfigV2 {
  const fontId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(legacy.fontFamily)
    ? legacy.fontFamily
    : null;

  const pdfY = pageHeight - legacy.areaY - legacy.areaHeight;
  const box = { x: legacy.areaX, y: pdfY, width: legacy.areaWidth, height: legacy.areaHeight };

  const layers: TextLayer[] = [
    {
      id: 'name',
      label: 'Nome',
      source: { type: 'name' },
      box,
      rotation: 0,
      fontId,
      fontSize: legacy.fontSize,
      minFontSize: 12,
      color: legacy.fontColor,
      align: legacy.alignment,
      verticalAlign: 'middle',
      lineHeight: 1.15,
      letterSpacing: 0,
      maxLines: legacy.maxLines,
      overflow: 'shrink',
      visible: true,
    },
    {
      id: 'age',
      label: 'Idade',
      source: { type: 'age', singularTemplate: '{age} ano', pluralTemplate: '{age} anos', hideWhenEmpty: true },
      box: {
        ...box,
        y: legacy.idadePosition === 'below' ? box.y - legacy.idadeFontSize - legacy.lineSpacing : box.y + box.height + legacy.lineSpacing,
        height: legacy.idadeFontSize + legacy.lineSpacing,
      },
      rotation: 0,
      fontId,
      fontSize: legacy.idadeFontSize,
      minFontSize: 8,
      color: legacy.fontColor,
      align: legacy.alignment,
      verticalAlign: 'middle',
      lineHeight: 1.15,
      letterSpacing: 0,
      maxLines: 1,
      overflow: 'shrink',
      visible: true,
    },
  ];

  return {
    schema_version: 2,
    coordinate_space: 'pdf',
    name,
    page: { index: 0 },
    layers,
    legacy,
  };
}

/** Lê o formato legado a partir de um config_json salvo (V2 ou legado puro). */
export function readLegacyConfig(configJson: any): LegacyPresetConfig {
  if (configJson?.legacy) return { ...defaultLegacyConfig, ...configJson.legacy };
  if (configJson?.areaX !== undefined) return { ...defaultLegacyConfig, ...configJson };
  return { ...defaultLegacyConfig };
}

export function formatAge(age: number | string | null | undefined): string {
  if (age === null || age === undefined || `${age}`.trim() === '') return '';
  const n = Number(age);
  if (Number.isNaN(n)) return `${age}`;
  return n === 1 ? `${n} ano` : `${n} anos`;
}
