import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listFonts, uploadFont, deleteFont, type FontRow } from '@/lib/api/fonts';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Type, Upload, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function FontesPage() {
  const qc = useQueryClient();
  const { data: fontes = [], isLoading } = useQuery({ queryKey: ['fonts'], queryFn: listFonts });
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [license, setLicense] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addMutation = useMutation({
    mutationFn: () => uploadFont({ displayName: nome.trim(), file: file!, filename: file!.name, licenseConfirmed: license }),
    onSuccess: () => {
      toast.success('Fonte validada e registrada!');
      qc.invalidateQueries({ queryKey: ['fonts'] });
      setNome(''); setFile(null); setLicense(false); setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: (f: FontRow) => deleteFont(f),
    onSuccess: () => { toast.success('Fonte excluída'); qc.invalidateQueries({ queryKey: ['fonts'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="page-container">
      <PageHeader
        title="Fontes"
        description="Fontes TrueType (.ttf) validadas no servidor"
        icon={Type}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Fonte</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar fonte</DialogTitle>
                <DialogDescription>A fonte é validada e guardada na nuvem automaticamente.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nome da fonte</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Mitthela" />
                </div>
                <div className="space-y-2">
                  <Label>Arquivo .ttf (máx. 10 MB)</Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{file ? file.name : 'Clique para selecionar a fonte'}</p>
                  </div>
                  <input ref={fileRef} type="file" accept=".ttf" className="hidden"
                    onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </div>
                <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox checked={license} onCheckedChange={v => setLicense(v === true)} className="mt-0.5" />
                  <span>Confirmo que possuo licença de uso comercial desta fonte.</span>
                </label>
                <Button
                  onClick={() => {
                    if (!nome.trim() || !file) return toast.error('Preencha o nome e selecione o arquivo');
                    if (!license) return toast.error('Confirme a licença de uso');
                    addMutation.mutate();
                  }}
                  className="w-full"
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Validando...</> : 'Registrar fonte'}
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
      ) : fontes.length === 0 ? (
        <Card className="glass-card">
          <EmptyState
            icon={Type}
            title="Nenhuma fonte registrada"
            description="Adicione arquivos .ttf para usar nos presets de personalização."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fontes.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="glass-card group h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2 min-w-0">
                      <span className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <Type className="h-4 w-4" />
                      </span>
                      <span className="truncate">{f.display_name}</span>
                    </CardTitle>
                    <Button variant="ghost" size="icon"
                      onClick={() => { if (confirm(`Excluir fonte "${f.display_name}"?`)) delMutation.mutate(f); }}
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="muted">{f.subfamily_name ?? 'Regular'} · {f.weight}</Badge>
                    {f.license_confirmed && (
                      <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" />Licenciada</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {f.family_name ?? f.original_filename} · {(f.file_size_bytes / 1024).toFixed(0)} KB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Adicionada em {new Date(f.created_at).toLocaleDateString('pt-BR')}
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
