import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listTemplates, getTemplateFile } from '@/lib/api/templates';
import { listFonts, ensureFontFace } from '@/lib/api/fonts';
import { listPresets, createPreset, updatePreset, deletePreset, type PresetView } from '@/lib/api/presets';
import { defaultLegacyConfig, type LegacyPresetConfig } from '@/lib/presetSchemaV2';
import PresetPreview from '@/components/ui/PresetPreview';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2, Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ConfiguracaoPage() {
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: listTemplates });
  const { data: fonts = [] } = useQuery({ queryKey: ['fonts'], queryFn: listFonts });
  const { data: presets = [] } = useQuery({ queryKey: ['presets'], queryFn: listPresets });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PresetView | null>(null);
  const [nome, setNome] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [config, setConfig] = useState<LegacyPresetConfig>(defaultLegacyConfig);
  const [templateBytes, setTemplateBytes] = useState<ArrayBuffer | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [pageHeight, setPageHeight] = useState(842);
  const [fontCss, setFontCss] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = templates.find(x => x.id === templateId);
    if (!t) { setTemplateBytes(null); return; }
    setLoadingTemplate(true);
    getTemplateFile(t)
      .then(buf => { if (!cancelled) { setTemplateBytes(buf); setPageHeight(Number(t.page_height)); } })
      .catch(e => toast.error(e.message))
      .finally(() => { if (!cancelled) setLoadingTemplate(false); });
    return () => { cancelled = true; };
  }, [templateId, templates]);

  useEffect(() => {
    const f = fonts.find(x => x.id === config.fontFamily);
    if (!f) { setFontCss(null); return; }
    let cancelled = false;
    ensureFontFace(f).then(family => { if (!cancelled) setFontCss(family); }).catch(() => setFontCss(null));
    return () => { cancelled = true; };
  }, [config.fontFamily, fonts]);

  const openNew = () => {
    setEditing(null);
    setNome('');
    setTemplateId(templates[0]?.id ?? '');
    setConfig({ ...defaultLegacyConfig, fontFamily: fonts[0]?.id ?? '' });
    setOpen(true);
  };

  const openEdit = (p: PresetView) => {
    setEditing(p);
    setNome(p.nome);
    setTemplateId(p.template_id);
    setConfig(p.legacy);
    setOpen(true);
  };

  const patch = (partial: Partial<LegacyPresetConfig>) => setConfig(prev => ({ ...prev, ...partial }));

  const handleSave = async () => {
    if (!nome.trim()) return toast.error('Informe o nome do preset');
    if (!templateId) return toast.error('Selecione um template');
    if (!config.fontFamily) return toast.error('Selecione uma fonte');
    setSaving(true);
    try {
      if (editing) {
        await updatePreset({ id: editing.id, templateId, name: nome.trim(), legacy: config, pageHeight, revision: editing.revision });
      } else {
        await createPreset({ templateId, name: nome.trim(), legacy: config, pageHeight });
      }
      qc.invalidateQueries({ queryKey: ['presets'] });
      qc.invalidateQueries({ queryKey: ['counts'] });
      toast.success('Preset salvo!');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: PresetView) => {
    if (!confirm(`Excluir preset "${p.nome}"?`)) return;
    try {
      await deletePreset(p.id);
      qc.invalidateQueries({ queryKey: ['presets'] });
      toast.success('Preset excluído');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Presets"
        description="Posicionamento e tipografia aplicados sobre cada template"
        icon={Settings}
        actions={
          <Button onClick={openNew} disabled={templates.length === 0}>
            <Plus className="h-4 w-4 mr-2" />Novo Preset
          </Button>
        }
      />

      {presets.length === 0 ? (
        <Card className="glass-card">
          <EmptyState
            icon={Settings}
            title="Nenhum preset configurado"
            description={
              templates.length === 0
                ? 'Cadastre um template antes de criar um preset de personalização.'
                : 'Clique em "Novo Preset" para definir onde o nome e a idade serão impressos.'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map(p => {
            const t = templates.find(x => x.id === p.template_id);
            return (
              <Card key={p.id} className="glass-card group cursor-pointer h-full" onClick={() => openEdit(p)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2 min-w-0">
                      <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Settings className="h-4 w-4" />
                      </span>
                      <span className="truncate">{p.nome}</span>
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={e => { e.stopPropagation(); handleDelete(p); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">{t?.name ?? 'Template removido'}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="muted">{p.legacy.fontSize}pt</Badge>
                    <Badge variant="muted">{p.legacy.alignment}</Badge>
                    <Badge variant={p.validation_status === 'valid' ? 'success' : 'accent'}>
                      {p.validation_status === 'valid' ? 'Válido' : 'Revisar'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar preset' : 'Novo preset'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 pt-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do preset</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Cachepot — Nome + Idade" />
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fonte</Label>
                <Select value={config.fontFamily} onValueChange={v => patch({ fontFamily: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {fonts.map(f => <SelectItem key={f.id} value={f.id}>{f.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Corpo do nome ({config.fontSize}pt)</Label>
                  <Slider min={6} max={120} step={1} value={[config.fontSize]} onValueChange={([v]) => patch({ fontSize: v })} />
                </div>
                <div className="space-y-2">
                  <Label>Corpo da idade ({config.idadeFontSize}pt)</Label>
                  <Slider min={6} max={80} step={1} value={[config.idadeFontSize]} onValueChange={([v]) => patch({ idadeFontSize: v })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input type="color" value={config.fontColor} onChange={e => patch({ fontColor: e.target.value })} className="h-10 p-1" />
                </div>
                <div className="space-y-2">
                  <Label>Alinhamento</Label>
                  <Select value={config.alignment} onValueChange={(v: any) => patch({ alignment: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Posição da idade</Label>
                  <Select value={config.idadePosition} onValueChange={(v: any) => patch({ idadePosition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Acima do nome</SelectItem>
                      <SelectItem value="below">Abaixo do nome</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Máx. linhas ({config.maxLines})</Label>
                  <Slider min={1} max={4} step={1} value={[config.maxLines]} onValueChange={([v]) => patch({ maxLines: v })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Espaçamento entre linhas ({config.lineSpacing}pt)</Label>
                <Slider min={0} max={40} step={1} value={[config.lineSpacing]} onValueChange={([v]) => patch({ lineSpacing: v })} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['areaX', 'areaY', 'areaWidth', 'areaHeight'] as const).map(k => (
                  <div key={k} className="space-y-1">
                    <Label className="text-[11px]">{k.replace('area', '')}</Label>
                    <Input type="number" value={Math.round(config[k])} onChange={e => patch({ [k]: Number(e.target.value) } as any)} />
                  </div>
                ))}
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar preset'}
              </Button>
            </div>

            <PresetPreview
              templateBytes={templateBytes}
              fontCssFamily={fontCss}
              config={config}
              onConfigChange={patch}
              loadingTemplate={loadingTemplate}
              onPageSize={s => setPageHeight(s.height)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
