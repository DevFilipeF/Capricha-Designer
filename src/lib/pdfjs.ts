import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export { pdfjsLib };

/** Renderiza a página 1 de um PDF num canvas e devolve dataURL PNG + dimensões em pontos. */
export async function renderFirstPage(data: ArrayBuffer, maxWidth = 520, maxHeight = 700) {
  const pdf = await pdfjsLib.getDocument({ data: data.slice(0) }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / viewport.width, maxHeight / viewport.height);
  const scaled = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(scaled.width);
  canvas.height = Math.ceil(scaled.height);
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
  return {
    canvas,
    dataUrl: canvas.toDataURL('image/png'),
    pageWidth: viewport.width,
    pageHeight: viewport.height,
    rotation: page.rotate ?? 0,
    pageCount: pdf.numPages,
  };
}
