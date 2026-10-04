import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listTemplates, uploadTemplate, deleteTemplate, type TemplateRow } from '@/lib/api/templates';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, FileText, Upload, Loader2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function TemplatesPage() {
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({ queryKey: ['templates'], queryFn: listTemplates });
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addMutation = useMutation({
    mutationFn: () => uploadTemplate({ name: nome.trim(), file: file!, filename: file!.name }),
    onSuccess: () => {
      toast.success('Template adicionado!');
      qc.invalidateQueries({ queryKey: ['templates'] });
      setNome(''); setFile(null); setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: (t: TemplateRow) => deleteTemplate(t),
    onSuccess: () => {
      toast.success('Template excluído');
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['presets'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="page-container">
      <PageHeader
        title="Templates"
        description="PDFs base que servem de molde para os produtos"
        icon={FileText}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Template</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar template</DialogTitle>
                <DialogDescription>O PDF é validado e guardado na nuvem automaticamente.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nome do produto</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Cachepot Floral" />
                </div>
                <div className="space-y-2">
                  <Label>Arquivo PDF</Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{file ? file.name : 'Clique para selecionar o PDF'}</p>
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                    onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </div>
                <Button
                  onClick={() => {
                    if (!nome.trim() || !file) return toast.error('Preencha o nome e selecione um PDF');
                    addMutation.mutate();
                  }}
                  className="w-full"
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Validando...</> : 'Salvar template'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-[150px] w-full rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card className="glass-card">
          <EmptyState
            icon={FileText}
            title="Nenhum template cadastrado"
            description='Clique em "Novo Template" para enviar o primeiro PDF de produto.'
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="glass-card group h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2 min-w-0">
                      <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="truncate">{t.name}</span>
                    </CardTitle>
                    <Button variant="ghost" size="icon"
                      onClick={() => { if (confirm(`Excluir template "${t.name}"? Os presets ligados a ele também serão removidos.`)) delMutation.mutate(t); }}
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="muted">{Math.round(Number(t.page_width))} × {Math.round(Number(t.page_height))} pt</Badge>
                    <Badge variant="accent" className="gap-1"><Layers className="h-3 w-3" />{t.page_count} pág.</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adicionado em {new Date(t.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
