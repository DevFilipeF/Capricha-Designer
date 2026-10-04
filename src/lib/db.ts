import Dexie, { type Table } from 'dexie';

export interface User {
  id?: number;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

export interface Template {
  id?: number;
  nome: string;
  arquivoPdf: ArrayBuffer;
  arquivoPdfName: string;
  createdAt: Date;
}

export interface Preset {
  id?: number;
  templateId: number;
  nome: string;
  config: PresetConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresetConfig {
  areaX: number;
  areaY: number;
  areaWidth: number;
  areaHeight: number;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  alignment: 'center' | 'left' | 'right';
  idadePosition: 'above' | 'below';
  idadeFontSize: number;
  lineSpacing: number;
  maxLines: number;
}

export interface Geracao {
  id?: number;
  templateId: number;
  presetId: number;
  templateNome: string;
  arquivoSaida?: ArrayBuffer;
  arquivoSaidaNome: string;
  totalItens: number;
  createdAt: Date;
}

export interface ItemGerado {
  id?: number;
  geracaoId: number;
  nome: string;
  idade?: string;
  quantidade: number;
}

export interface FonteRegistrada {
  id?: number;
  nome: string;
  arquivo: ArrayBuffer;
  arquivoNome: string;
  createdAt: Date;
}

class CaprichaPamDB extends Dexie {
  users!: Table<User>;
  templates!: Table<Template>;
  presets!: Table<Preset>;
  geracoes!: Table<Geracao>;
  itensGerados!: Table<ItemGerado>;
  fontes!: Table<FonteRegistrada>;

  constructor() {
    super('caprichapam');
    this.version(1).stores({
      users: '++id, username',
      templates: '++id, nome',
      presets: '++id, templateId, nome',
      geracoes: '++id, templateId, presetId, createdAt',
      itensGerados: '++id, geracaoId',
      fontes: '++id, nome',
    });
    this.version(2).stores({
      templates: '++id, nome, createdAt',
      presets: '++id, templateId, nome, createdAt',
      fontes: '++id, nome, createdAt',
    });
  }
}

export const db = new CaprichaPamDB();

// Compatibilidade: mantém o antigo inicializador delegando ao módulo de auth.
export async function initializeAdmin() {
  const { ensureLocalAdmin } = await import('./auth');
  await ensureLocalAdmin();
}
