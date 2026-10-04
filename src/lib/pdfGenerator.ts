import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { LegacyPresetConfig } from './presetSchemaV2';
import { formatAge } from './presetSchemaV2';

export interface ItemData {
  nome: string;
  idade?: string;
  quantidade: number;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

function measure(font: PDFFont | undefined, text: string, size: number) {
  return font ? font.widthOfTextAtSize(text, size) : text.length * size * 0.5;
}

function breakName(name: string, maxWidth: number, fontSize: number, font: PDFFont | undefined, maxLines: number) {
  if (measure(font, name, fontSize) <= maxWidth) return [name];
  const words = name.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (measure(font, test, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, Math.max(1, maxLines));
}

/** Reduz o corpo até caber na caixa (overflow: shrink), respeitando o mínimo. */
function fitFontSize(
  text: string,
  font: PDFFont | undefined,
  startSize: number,
  maxWidth: number,
  maxLines: number,
  minSize = 8
) {
  let size = startSize;
  while (size > minSize) {
    const lines = breakName(text, maxWidth, size, font, maxLines);
    const widest = Math.max(...lines.map(l => measure(font, l, size)));
    if (widest <= maxWidth && lines.join(' ').replace(/\s+/g, ' ') === text.replace(/\s+/g, ' ')) break;
    if (widest <= maxWidth) break;
    size -= 0.5;
  }
  return size;
}

export interface GeneratePdfParams {
  presetName: string;
  templateBytes: ArrayBuffer;
  fontBytes: ArrayBuffer | null;
  config: LegacyPresetConfig;
  items: ItemData[];
}

export async function generatePdf({
  presetName,
  templateBytes,
  fontBytes,
  config,
  items,
}: GeneratePdfParams): Promise<{ pdf: Uint8Array; filename: string; totalPages: number }> {
  const outputPdf = await PDFDocument.create();
  outputPdf.registerFontkit(fontkit);
  const templatePdf = await PDFDocument.load(templateBytes.slice(0));

  // Embute a fonte UMA única vez para todo o lote.
  let fontToUse: PDFFont | undefined;
  if (fontBytes) fontToUse = await outputPdf.embedFont(fontBytes.slice(0), { subset: true });

  const color = hexToRgb(config.fontColor);
  const [templatePage] = await outputPdf.copyPages(templatePdf, [0]);
  const templatePageHeight = templatePage.getHeight();

  let totalPages = 0;

  for (const item of items) {
    const qty = Math.max(1, item.quantidade || 1);
    const nameSize = fitFontSize(item.nome, fontToUse, config.fontSize, config.areaWidth, config.maxLines, 12);
    const nameLines = breakName(item.nome, config.areaWidth, nameSize, fontToUse, config.maxLines);
    const ageText = formatAge(item.idade);
    const hasAge = ageText.length > 0;

    const lineGap = config.lineSpacing;
    const nameBlockHeight = nameLines.length * nameSize + (nameLines.length - 1) * lineGap;
    const ageBlockHeight = hasAge ? config.idadeFontSize + lineGap : 0;
    const totalHeight = nameBlockHeight + ageBlockHeight;

    // Coordenadas legadas são top-down; converte para o espaço PDF (bottom-up).
    const boxTopPdf = templatePageHeight - config.areaY;
    const blockTop = boxTopPdf - (config.areaHeight - totalHeight) / 2;

    const alignX = (text: string, size: number) => {
      const w = measure(fontToUse, text, size);
      if (config.alignment === 'center') return config.areaX + (config.areaWidth - w) / 2;
      if (config.alignment === 'right') return config.areaX + config.areaWidth - w;
      return config.areaX;
    };

    for (let q = 0; q < qty; q++) {
      const [copied] = await outputPdf.copyPages(templatePdf, [0]);
      const page = outputPdf.addPage(copied);
      totalPages++;

      let cursorTop = blockTop;

      if (hasAge && config.idadePosition === 'above') {
        page.drawText(ageText, {
          x: alignX(ageText, config.idadeFontSize),
          y: cursorTop - config.idadeFontSize,
          size: config.idadeFontSize,
          font: fontToUse,
          color,
        });
        cursorTop -= config.idadeFontSize + lineGap;
      }

      for (const line of nameLines) {
        page.drawText(line, {
          x: alignX(line, nameSize),
          y: cursorTop - nameSize,
          size: nameSize,
          font: fontToUse,
          color,
        });
        cursorTop -= nameSize + lineGap;
      }

      if (hasAge && config.idadePosition === 'below') {
        page.drawText(ageText, {
          x: alignX(ageText, config.idadeFontSize),
          y: cursorTop - config.idadeFontSize,
          size: config.idadeFontSize,
          font: fontToUse,
          color,
        });
      }
    }
  }

  const pdfBytes = await outputPdf.save();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeName = presetName.replace(/[^\p{L}\p{N}_-]+/gu, '_');
  return { pdf: pdfBytes, filename: `${safeName}_${timestamp}.pdf`, totalPages };
}
