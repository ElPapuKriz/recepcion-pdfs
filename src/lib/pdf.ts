import JSZip from "jszip";
import { degrees, PDFDocument } from "pdf-lib";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PdfPageItem, SourcePdf } from "../types/pdf";

GlobalWorkerOptions.workerSrc = workerUrl;

export function createPagePlaceholder(pageNumber: number): string {
  const markup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">
      <rect width="360" height="480" rx="18" fill="#f8fafc"/>
      <path d="M112 96h100l42 42v220H112z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="5" stroke-linejoin="round"/>
      <path d="M212 96v44h42" fill="none" stroke="#94a3b8" stroke-width="5"/>
      <path d="M140 190h86M140 220h86M140 250h62" stroke="#94a3b8" stroke-width="7" stroke-linecap="round"/>
      <text x="180" y="405" text-anchor="middle" fill="#334155" font-family="Arial,sans-serif" font-size="25" font-weight="700">PDF</text>
      <text x="180" y="438" text-anchor="middle" fill="#64748b" font-family="Arial,sans-serif" font-size="17">Página ${pageNumber}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

export async function openPdfPreview(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const loadingTask = getDocument({ data: bytes.slice() });
  let timeoutId = 0;

  try {
    return await Promise.race([
      loadingTask.promise,
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error("El lector PDF tardó demasiado en responder.")),
          15_000,
        );
      }),
    ]);
  } catch (error) {
    try {
      await loadingTask.destroy();
    } catch (cleanupError) {
      console.warn("No se pudo detener la carga de PDF.js:", cleanupError);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function renderPageThumbnail(
  document: PDFDocumentProxy,
  pageNumber: number,
  extraRotation = 0,
  scale = 0.55,
): Promise<string> {
  const page = await document.getPage(pageNumber);
  const rotation = (page.rotate + extraRotation) % 360;
  const viewport = page.getViewport({ scale, rotation });
  const canvas = window.document.createElement("canvas");

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  try {
    await page.render({ canvas, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    page.cleanup();
    canvas.width = 0;
    canvas.height = 0;
  }
}

function safeFileName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim() || "documento";
}

function createUniqueName(baseName: string, usedNames: Set<string>): string {
  let candidate = `${baseName}.pdf`;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} (${suffix}).pdf`;
    suffix += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

export async function buildPdfZip(
  sources: SourcePdf[],
  pages: PdfPageItem[],
  onProgress: (percent: number) => void,
): Promise<Blob> {
  const selectedPages = pages.filter((page) => page.selected);

  if (selectedPages.length === 0) {
    throw new Error("Selecciona al menos una página para crear el ZIP.");
  }

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const loadedDocuments = new Map<string, PDFDocument>();
  const zip = new JSZip();
  const usedNames = new Set<string>();

  try {
    for (const [index, pageItem] of selectedPages.entries()) {
      const source = sourceById.get(pageItem.sourceId);

      if (!source) {
        throw new Error(`No se encontró el PDF original: ${pageItem.sourceName}`);
      }

      let originalDocument = loadedDocuments.get(source.id);

      if (!originalDocument) {
        originalDocument = await PDFDocument.load(source.bytes);
        loadedDocuments.set(source.id, originalDocument);
      }

      const outputDocument = await PDFDocument.create();
      const [copiedPage] = await outputDocument.copyPages(originalDocument, [
        pageItem.pageNumber - 1,
      ]);

      outputDocument.addPage(copiedPage);

      const originalRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(
        degrees((originalRotation + source.rotation + pageItem.rotation) % 360),
      );

      const outputBytes = await outputDocument.save();
      const outputName = createUniqueName(
        `${safeFileName(source.name)}_pagina_${String(pageItem.pageNumber).padStart(3, "0")}`,
        usedNames,
      );

      zip.file(outputName, outputBytes);
      onProgress(Math.round(((index + 1) / selectedPages.length) * 85));
    }

    const zipBlob = await zip.generateAsync(
      {
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      },
      (metadata) => onProgress(85 + Math.round(metadata.percent * 0.15)),
    );

    return zipBlob;
  } finally {
    loadedDocuments.clear();
  }
}
