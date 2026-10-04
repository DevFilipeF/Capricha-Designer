import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listGenerations, generationDownloadUrl, deleteGeneration, type GenerationRow } from '@/lib/api/generations';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function HistoricoPage() {
  const qc = useQueryClient();
  const { data: geracoes = [], isLoading } = useQuery({ queryKey: ['generations'], queryFn: () => listGenerations() });

  const delMutation = useMutation({
    mutationFn: (g: GenerationRow) => deleteGeneration(g),
    onSuccess: () => {
      toast.success('Registro excluído');
      qc.invalidateQueries({ queryKey: ['generations'] });
      qc.invalidateQueries({ queryKey: ['counts'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDownload = async (g: GenerationRow) => {
    try {
      const url = await generationDownloadUrl(g);
      const a = document.createElement('a');
      a.href = url;
      a.download = g.input_snapshot?.filename ?? 'geracao.pdf';
      a.target = '_blank';
      a.click();
    } catch (e: any) {
      toast.error(e.message ?? 'PDF não disponível');
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Histórico"
        description="Todas as gerações de PDFs já realizadas"
        icon={History}
        actions={geracoes.length > 0 ? <Badge variant="muted">{geracoes.length} registros</Badge> : undefined}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-[84px] w-full rounded-xl" />)}
        </div>
      ) : geracoes.length === 0 ? (
        <Card className="glass-card">
          <EmptyState
            icon={History}
            title="Nenhuma geração no histórico"
            description="Os PDFs que você gerar aparecem aqui, prontos para baixar novamente."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {geracoes.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glass-card group">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{g.preset_snapshot?.name ?? 'Geração'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(g.created_at).toLocaleString('pt-BR')}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="muted">{g.total_items} itens</Badge>
                        <Badge variant="accent">{g.total_pages} páginas</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="outline" size="icon" onClick={() => handleDownload(g)} title="Baixar PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive"
                        onClick={() => { if (confirm('Excluir este registro?')) delMutation.mutate(g); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
