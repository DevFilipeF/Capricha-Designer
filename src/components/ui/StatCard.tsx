import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatTone = 'primary' | 'accent' | 'success' | 'warning';

const TONES: Record<StatTone, string> = {
  primary: 'text-primary bg-primary/10',
  accent: 'text-accent bg-accent/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: StatTone;
  hint?: string;
  className?: string;
}

/** Cartão de indicador usado no dashboard e nos resumos. */
export function StatCard({ label, value, icon: Icon, tone = 'primary', hint, className }: StatCardProps) {
  return (
    <Card className={cn('glass-card group transition-shadow hover:shadow-md', className)}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold font-display mt-1 tabular-nums">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
          </div>
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', TONES[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Card>
  );
}