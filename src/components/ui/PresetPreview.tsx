import { useEffect, useRef, useState, useCallback } from 'react';
import { pdfjsLib } from '@/lib/pdfjs';
import type { LegacyPresetConfig } from '@/lib/presetSchemaV2';
import { formatAge } from '@/lib/presetSchemaV2';

interface Props {
  templateBytes: ArrayBuffer | null;
  fontCssFamily: string | null;
  config: LegacyPresetConfig;
  onConfigChange: (partial: Partial<LegacyPresetConfig>) => void;
  onPageSize?: (size: { width: number; height: number }) => void;
  sampleName?: string;
  sampleAge?: string;
  loadingTemplate?: boolean;
}

type DragMode = null | 'move' | 'nw' | 'ne' | 'sw' | 'se';

export default function PresetPreview({
  templateBytes,
  fontCssFamily,
  config,
  onConfigChange,
  onPageSize,
  sampleName = 'Ana Clara',
  sampleAge = '5',
  loadingTemplate = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; orig: LegacyPresetConfig } | null>(null);

  useEffect(() => {
    if (!templateBytes) {
      setPageSize({ width: 0, height: 0 });
      return;
    }
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: templateBytes.slice(0) }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(520 / viewport.width, 700 / viewport.height);
        const scaled = page.getViewport({ scale });
        if (cancelled) return;

        const canvas = canvasRef.current!;
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
        if (cancelled) return;

        setPageSize({ width: viewport.width, height: viewport.height });
        setRenderSize({ width: scaled.width, height: scaled.height });
        onPageSize?.({ width: viewport.width, height: viewport.height });
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Erro ao carregar template');
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateBytes]);

  const scale = pageSize.width ? renderSize.width / pageSize.width : 1;

  const boxStyle = {
    left: config.areaX * scale,
    top: config.areaY * scale,
    width: config.areaWidth * scale,
    height: config.areaHeight * scale,
  };

  const handlePointerDown = useCallback((mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, orig: { ...config } };
  }, [config]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !d.mode) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    const o = d.orig;
    const patch: Partial<LegacyPresetConfig> = {};
    if (d.mode === 'move') {
      patch.areaX = Math.max(0, Math.min(pageSize.width - o.areaWidth, o.areaX + dx));
      patch.areaY = Math.max(0, Math.min(pageSize.height - o.areaHeight, o.areaY + dy));
    } else {
      let x = o.areaX, y = o.areaY, w = o.areaWidth, h = o.areaHeight;
      if (d.mode.includes('w')) { x = o.areaX + dx; w = o.areaWidth - dx; }
      if (d.mode.includes('e')) { w = o.areaWidth + dx; }
      if (d.mode.includes('n')) { y = o.areaY + dy; h = o.areaHeight - dy; }
      if (d.mode.includes('s')) { h = o.areaHeight + dy; }
      patch.areaX = x;
      patch.areaY = y;
      patch.areaWidth = Math.max(20, w);
      patch.areaHeight = Math.max(20, h);
    }
    Object.keys(patch).forEach(k => {
      (patch as any)[k] = Math.round((patch as any)[k]);
    });
    onConfigChange(patch);
  }, [scale, pageSize, onConfigChange]);

  const handlePointerUp = useCallback(() => { dragRef.current = null; }, []);

  const fontFamilyCss = fontCssFamily ? `${fontCssFamily}, sans-serif` : 'sans-serif';
  const textAlign = config.alignment as 'left' | 'center' | 'right';
  const ageText = formatAge(sampleAge);
  const hasAge = ageText.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Preview ao vivo</span>
        {pageSize.width > 0 && (
          <span className="tabular-nums">
            {Math.round(pageSize.width)} × {Math.round(pageSize.height)} pt
          </span>
        )}
      </div>
      <div
        className="relative inline-block bg-muted/40 rounded-md border border-border overflow-hidden select-none"
        style={{ minHeight: 300, width: renderSize.width || '100%' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {loadingTemplate && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground z-10">
            Carregando template...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive p-4 text-center z-10">
            {error}
          </div>
        )}
        {!templateBytes && !loadingTemplate && (
          <div className="flex items-center justify-center text-sm text-muted-foreground p-12 text-center">
            Selecione um template para visualizar o preview
          </div>
        )}
        <canvas ref={canvasRef} className="block" />

        {pageSize.width > 0 && (
          <div
            className="absolute border-2 border-primary/80 bg-primary/5 cursor-move"
            style={boxStyle}
            onPointerDown={handlePointerDown('move')}
          >
            <div
              className="w-full h-full flex flex-col justify-center pointer-events-none px-1"
              style={{
                textAlign,
                alignItems: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
                color: config.fontColor,
                fontFamily: fontFamilyCss,
                lineHeight: 1,
              }}
            >
              {hasAge && config.idadePosition === 'above' && (
                <span style={{ fontSize: config.idadeFontSize * scale, marginBottom: config.lineSpacing * scale }}>
                  {ageText}
                </span>
              )}
              <span style={{ fontSize: config.fontSize * scale, whiteSpace: 'nowrap' }}>{sampleName}</span>
              {hasAge && config.idadePosition === 'below' && (
                <span style={{ fontSize: config.idadeFontSize * scale, marginTop: config.lineSpacing * scale }}>
                  {ageText}
                </span>
              )}
            </div>

            {(['nw', 'ne', 'sw', 'se'] as const).map(corner => (
              <div
                key={corner}
                onPointerDown={handlePointerDown(corner)}
                className="absolute w-3 h-3 bg-primary border border-background rounded-sm"
                style={{
                  top: corner.includes('n') ? -6 : undefined,
                  bottom: corner.includes('s') ? -6 : undefined,
                  left: corner.includes('w') ? -6 : undefined,
                  right: corner.includes('e') ? -6 : undefined,
                  cursor: `${corner}-resize`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Arraste a caixa para reposicionar · use os cantos para redimensionar · texto de exemplo: <b>{sampleName}</b>
      </p>
    </div>
  );
}
