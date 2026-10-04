import { useState } from 'react';
import { db } from '@/lib/db';
import { uploadTemplate } from '@/lib/api/templates';
import { uploadFont, listFonts } from '@/lib/api/fonts';
import { createPreset } from '@/lib/api/presets';
import { defaultLegacyConfig } from '@/lib/presetSchemaV2';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, CheckCircle2, DownloadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ImportLocalDataPage() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const push = (line: string) => setLog(prev => [...prev, line]);

  const handleImport = async () => {
    setRunning(true);
    setLog([]);
    try {
      const [templates, fontes, presets] = await Promise.all([
        db.templates.toArray().catch(() => []),
        db.fontes.toArray().catch(() => []),
        db.presets.toArray().catch(() => []),
      ]);

      if (!templates.length && !fontes.length && !presets.length) {
        push('Nenhum dado local encontrado neste navegador.');
        setDone(true);
        return;
      }

      const fontIdByName = new Map<string, string>();
      for (const f of fontes) {
        try {
          const row = await uploadFont({
            displayName: f.nome,
            file: new Blob([f.arquivo]),
            filename: f.arquivoNome,
            licenseConfirmed: true,
          });
          fontIdByName.set(f.nome, row.id);
          push(`Fonte importada: ${f.nome}`);
        } catch (e: any) {
          push(`Fonte "${f.nome}" ignorada: ${e.message}`);
        }
      }
      // fontes já existentes na nuvem (duplicatas) resolvem pelo nome
      for (const row of await listFonts()) {
        if (!fontIdByName.has(row.display_name)) fontIdByName.set(row.display_name, row.id);
      }

      const templateIdByLocal = new Map<number, { id: string; pageHeight: number }>();
      for (const t of templates) {
        try {
          const row = await uploadTemplate({
            name: t.nome,
            file: new Blob([t.arquivoPdf], { type: 'application/pdf' }),
            filename: t.arquivoPdfName,
          });
          templateIdByLocal.set(t.id!, { id: row.id, pageHeight: Number(row.page_height) });
          push(`Template importado: ${t.nome}`);
        } catch (e: any) {
          push(`Template "${t.nome}" ignorado: ${e.message}`);
        }
      }

      for (const p of presets) {
        const target = templateIdByLocal.get(p.templateId);
        if (!target) { push(`Preset "${p.nome}" ignorado (template não importado)`); continue; }
        try {
          await createPreset({
            templateId: target.id,
            name: p.nome,
            legacy: {
              ...defaultLegacyConfig,
              ...p.config,
              fontFamily: fontIdByName.get(p.config.fontFamily) ?? '',
            },
            pageHeight: target.pageHeight,
          });
          push(`Preset importado: ${p.nome}`);
        } catch (e: any) {
          push(`Preset "${p.nome}" ignorado: ${e.message}`);
        }
      }

      push('Importação concluída.');
      setDone(true);
      toast.success('Dados locais importados!');
    } catch (e: any) {
      toast.error(e.message ?? 'Erro na importação');
    } finally {
      setRunning(false);
    }
  };

  const handleClearLocal = async () => {
    if (!confirm('Apagar definitivamente os dados locais deste navegador?')) return;
    await db.delete();
    toast.success('Dados locais removidos');
    navigate('/');
  };

  return (
    <div className="page-container max-w-2xl">
      <PageHeader
        title="Importar dados locais"
        description="Envia templates, fontes e presets salvos neste navegador para a nuvem"
        icon={DownloadCloud}
      />

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Migração</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use esta opção apenas se você já usava a versão anterior do sistema neste computador.
            Os itens encontrados são enviados para a nuvem, sem apagar nada localmente.
          </p>
          <Button onClick={handleImport} disabled={running}>
            {running ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</> : <><Upload className="h-4 w-4 mr-2" />Iniciar importação</>}
          </Button>

          {log.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1 max-h-72 overflow-y-auto">
              {log.map((l, i) => <p key={i} className="text-muted-foreground">{l}</p>)}
            </div>
          )}

          {done && (
            <div className="flex items-center gap-3 pt-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <Button variant="outline" onClick={handleClearLocal}>Limpar dados locais</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
