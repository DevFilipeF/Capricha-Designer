import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listPresets } from '@/lib/api/presets';
import { listTemplates, getTemplateFile } from '@/lib/api/templates';
import { listFonts, getFontFile } from '@/lib/api/fonts';
import { generatePdf } from '@/lib/pdfGenerator';
import { saveGeneration } from '@/lib/api/generations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Printer, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ItemRow { id: number; nome: string; idade: string; quantidade: number; }
let nextRowId = 1;

export default function ProducaoPage() {
  const qc = useQueryClient();
  const { data: presets = [] } = useQuery({ queryKey: ['presets'], queryFn: listPresets });
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: listTemplates });
  const { data: fonts = [] } = useQuery({ queryKey: ['fonts'], queryFn: listFonts });

  const [presetId, setPresetId] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ id: nextRowId++, nome: '', idade: '', quantidade: 1 }]);
  const [generating, setGenerating] = useState(false);

  const totalPaginas = useMemo(
    () => items.filter(i => i.nome.trim()).reduce((s, i) => s + (i.quantidade || 1), 0),
    [items]
  );

  const addRow = () => {
    if (items.length >= 150) return toast.error('Máximo de 150 registros por lote');
    setItems(prev => [...prev, { id: nextRowId++, nome: '', idade: '', quantidade: 1 }]);
  };
  const removeRow = (id: number) => { if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id)); };
  const updateRow = (id: number, field: keyof ItemRow, value: string | number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const handleGenerate = async () => {
    if (!presetId) return toast.error('Selecione um produto');
    const validItems = items.filter(i => i.nome.trim());
    if (validItems.length === 0) return toast.error('Adicione pelo menos um nome');
    if (totalPaginas > 300) return toast.error('Limite de 300 páginas por lote excedido');

    const preset = presets.find(p => p.id === presetId);
    const template = templates.find(t => t.id === preset?.template_id);
    if (!preset || !template) return toast.error('Preset ou template não encontrado');

    setGenerating(true);
    try {
      const templateBytes = await getTemplateFile(template);
      const font = fonts.find(f => f.id === preset.legacy.fontFamily);
      const fontBytes = font ? await getFontFile(font) : null;

      const payload = validItems.map(i => ({
        nome: i.nome.trim(),
        idade: i.idade.trim() || undefined,
        quantidade: i.quantidade || 1,
      }));

      const { pdf, filename, totalPages } = await generatePdf({
        presetName: preset.nome,
        templateBytes,
        fontBytes,
        config: preset.legacy,
        items: payload,
      });

      await saveGeneration({
        pdf,
        filename,
        templateId: template.id,
        presetSnapshot: { id: preset.id, name: preset.nome, config: preset.config_json },
        inputSnapshot: { template: template.name, items: payload },
        items: payload.map(p => ({ ...p, templateId: template.id })),
        totalPages,
      });

      const blob = new Blob([pdf.slice().buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);

      qc.invalidateQueries({ queryKey: ['generations'] });
      qc.invalidateQueries({ queryKey: ['counts'] });
      toast.success(`PDF gerado com ${totalPages} páginas!`);
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + (e.message ?? e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Produção"
        description="Monte o lote e gere o PDF personalizado"
        icon={Printer}
        actions={
          <Badge variant={totalPaginas > 300 ? 'destructive' : 'muted'} className="text-sm py-1">
            {totalPaginas} {totalPaginas === 1 ? 'página' : 'páginas'}
          </Badge>
        }
      />

      <Card className="glass-card mb-6">
        <CardHeader className="pb-3"><CardTitle className="text-base">Produto</CardTitle></CardHeader>
        <CardContent>
          {presets.length === 0 ? (
            <EmptyState
              icon={Printer}
              title="Nenhum preset disponível"
              description="Um administrador precisa cadastrar um preset antes de gerar PDFs."
            />
          ) : (
            <Select value={presetId} onValueChange={setPresetId}>
              <SelectTrigger><SelectValue placeholder="Selecione o preset" /></SelectTrigger>
              <SelectContent>
                {presets.map(p => {
                  const t = templates.find(x => x.id === p.template_id);
                  return <SelectItem key={p.id} value={p.id}>{p.nome}{t ? ` — ${t.name}` : ''}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Registros ({items.length}/150)</CardTitle>
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="hidden sm:grid grid-cols-[1fr_100px_90px_40px] gap-2 text-xs text-muted-foreground px-1">
            <span>Nome</span><span>Idade</span><span>Qtd.</span><span />
          </div>
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-[1fr_100px_90px_40px] gap-2 items-center">
              <Input value={item.nome} onChange={e => updateRow(item.id, 'nome', e.target.value)} placeholder={`Nome ${i + 1}`} />
              <Input value={item.idade} onChange={e => updateRow(item.id, 'idade', e.target.value)} placeholder="Idade" />
              <Input type="number" min={1} value={item.quantidade}
                onChange={e => updateRow(item.id, 'quantidade', Math.max(1, Number(e.target.value)))} />
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRow(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
          <div className="pt-4 flex items-center justify-between border-t border-border mt-2">
            <p className="text-sm text-muted-foreground">Total: <b>{totalPaginas}</b> páginas</p>
            <Button onClick={handleGenerate} disabled={generating || presets.length === 0} size="lg">
              {generating
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</>
                : <><Printer className="h-4 w-4 mr-2" />Gerar PDF</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
