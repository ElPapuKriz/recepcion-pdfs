import { useEffect, useState } from "react";
import { openPdfPreview, renderPageThumbnail } from "../lib/pdf";
import type { PdfPageItem } from "../types/pdf";

type PdfViewerModalProps = {
  page: PdfPageItem;
  fileBytes: Uint8Array;
  documentRotation: number;
  onClose: () => void;
};

export default function PdfViewerModal({
  page,
  fileBytes,
  documentRotation,
  onClose,
}: PdfViewerModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const pdfBlob = new Blob([fileBytes.slice().buffer], { type: "application/pdf" });
    const browserPdfUrl = URL.createObjectURL(pdfBlob);

    setPreviewUrl(null);
    setFallbackUrl(`${browserPdfUrl}#page=${page.pageNumber}&view=FitH`);
    setError("");

    async function loadPreview() {
      let pdfDocument: Awaited<ReturnType<typeof openPdfPreview>> | null = null;

      try {
        pdfDocument = await openPdfPreview(fileBytes);
        const imageUrl = await renderPageThumbnail(
          pdfDocument,
          page.pageNumber,
          (documentRotation + page.rotation) % 360,
          1.65,
        );

        if (!cancelled) setPreviewUrl(imageUrl);
      } catch (previewError) {
        const message = previewError instanceof Error
          ? previewError.message
          : "No se pudo mostrar esta página con PDF.js.";
        if (!cancelled) setError(message);
      } finally {
        if (pdfDocument) {
          try {
            await pdfDocument.loadingTask.destroy();
          } catch (cleanupError) {
            console.warn("No se pudo cerrar la vista previa:", cleanupError);
          }
        }
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
      URL.revokeObjectURL(browserPdfUrl);
    };
  }, [fileBytes, page.pageNumber, page.rotation, documentRotation]);

  return (
    <div
      className="viewer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="viewer-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa: ${page.sourceName}, página ${page.pageNumber}`}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
        tabIndex={-1}
      >
        <header className="viewer-header">
          <div className="viewer-heading">
            <p className="viewer-title">{page.sourceName}</p>
            <p className="viewer-subtitle">Página {page.pageNumber}</p>
          </div>
          <button type="button" className="viewer-close" onClick={onClose} aria-label="Cerrar vista previa">
            ×
          </button>
        </header>

        <div className="viewer-content">
          {previewUrl ? (
            <img className="viewer-image" src={previewUrl} alt={`Vista ampliada de la página ${page.pageNumber}`} />
          ) : fallbackUrl ? (
            <div className="viewer-fallback">
              <p className="viewer-message">
                {error ? "Vista previa alternativa del navegador." : "Abriendo documento…"}
              </p>
              <iframe
                className="viewer-fallback-frame"
                src={fallbackUrl}
                title={`PDF ${page.sourceName}, página ${page.pageNumber}`}
              />
            </div>
          ) : (
            <p className="viewer-message">Preparando vista previa…</p>
          )}
        </div>
      </section>
    </div>
  );
}
