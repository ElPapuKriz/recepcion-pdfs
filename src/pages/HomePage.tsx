import { useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";
import Dropzone from "../components/Dropzone";
import PdfPageCard from "../components/PdfPageCard";
import PdfViewerModal from "../components/PdfViewerModal";
import { buildPdfZip, createPagePlaceholder, openPdfPreview, renderPageThumbnail } from "../lib/pdf";
import type { PdfPageItem, SourcePdf } from "../types/pdf";

export default function HomePage() {
  const [sources, setSources] = useState<SourcePdf[]>([]);
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [previewPageId, setPreviewPageId] = useState<string | null>(null);

  const selectedCount = useMemo(
    () => pages.filter((page) => page.selected).length,
    [pages],
  );
  const allSelected = pages.length > 0 && selectedCount === pages.length;
  const previewPage = pages.find((page) => page.id === previewPageId) ?? null;
  const previewSource = previewPage
    ? sources.find((source) => source.id === previewPage.sourceId) ?? null
    : null;

  async function handleFiles(incomingFiles: File[]) {
    const allFiles = Array.from(incomingFiles);
    const pdfFiles = allFiles.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );
    const ignoredCount = allFiles.length - pdfFiles.length;

    if (pdfFiles.length === 0) {
      setNotice(allFiles.length === 0
        ? "No se detectaron archivos. Suelta los PDF dentro del recuadro."
        : "No se encontraron archivos PDF en la selección.");
      return;
    }

    setIsLoading(true);
    setNotice("");
    setLoadingMessage(`Se recibieron ${pdfFiles.length} PDF. Preparando…`);

    const errors: string[] = [];
    let processedFiles = 0;

    try {
      for (const [fileIndex, file] of pdfFiles.entries()) {
        let previewDocument: Awaited<ReturnType<typeof openPdfPreview>> | null = null;
        let source: SourcePdf | null = null;

        try {
          setLoadingMessage(`Leyendo PDF ${fileIndex + 1} de ${pdfFiles.length}: ${file.name}`);
          const bytes = new Uint8Array(await file.arrayBuffer());

          // Count pages with pdf-lib. Preview rendering is optional and must not block the upload.
          const sourceDocument = await PDFDocument.load(bytes);
          const pageCount = sourceDocument.getPageCount();
          if (pageCount === 0) {
            errors.push(`${file.name}: el documento no contiene páginas.`);
            continue;
          }

          source = {
            id: crypto.randomUUID(),
            name: file.name,
            bytes,
            pageCount,
            rotation: 0,
          };

          const initialPages: PdfPageItem[] = Array.from({ length: pageCount }, (_, index) => ({
            id: crypto.randomUUID(),
            sourceId: source!.id,
            sourceName: file.name,
            pageNumber: index + 1,
            selected: true,
            rotation: 0,
            thumbnailUrl: createPagePlaceholder(index + 1),
          }));

          // Show the document and all of its pages before opening the thumbnail renderer.
          setSources((current) => [...current, source!]);
          setPages((current) => [...current, ...initialPages]);
          processedFiles += 1;

          setLoadingMessage(`Generando vistas previas · ${file.name}`);
          try {
            previewDocument = await openPdfPreview(bytes);
          } catch (previewError) {
            const reason = previewError instanceof Error
              ? previewError.message
              : "No se pudo iniciar PDF.js.";
            errors.push(`${file.name}: se cargaron sus páginas; se usará el visor del navegador (${reason}).`);
          }

          if (previewDocument) {
            for (const page of initialPages) {
              setLoadingMessage(
                `PDF ${fileIndex + 1}/${pdfFiles.length} · ${file.name} · Página ${page.pageNumber}/${pageCount}`,
              );

              try {
                const thumbnailUrl = await renderPageThumbnail(previewDocument, page.pageNumber);
                setPages((current) => current.map((item) => item.id === page.id
                  ? { ...item, thumbnailUrl }
                  : item,
                ));
              } catch (pageError) {
                const reason = pageError instanceof Error
                  ? pageError.message
                  : "No se pudo generar la miniatura.";
                errors.push(`${file.name}, página ${page.pageNumber}: ${reason}`);
              }
            }
          }
        } catch (error) {
          const reason = error instanceof Error
            ? error.message
            : "No se pudo leer el documento.";
          errors.push(`${file.name}: ${reason}`);
          console.error(`Error al procesar ${file.name}:`, error);

          if (source) {
            setSources((current) => current.filter((item) => item.id !== source?.id));
            setPages((current) => current.filter((page) => page.sourceId !== source?.id));
          }
        } finally {
          if (previewDocument) {
            try {
              await previewDocument.destroy();
            } catch (cleanupError) {
              console.warn("No se pudo cerrar el lector PDF:", cleanupError);
            }
          }
        }
      }

      const messages: string[] = [`${processedFiles} de ${pdfFiles.length} PDF cargados.`];
      if (ignoredCount > 0) messages.push(`${ignoredCount} archivo(s) ignorados porque no eran PDF.`);
      if (errors.length > 0) {
        messages.push(errors.length === 1
          ? errors[0]!
          : `${errors.length} aviso(s) durante la carga. Los PDF válidos se conservaron.`);
        console.warn("Avisos al procesar PDF:", errors);
      }
      setNotice(messages.join(" "));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Error inesperado al procesar los archivos.";
      console.error("Error general al procesar los archivos:", error);
      setNotice(`No se pudo completar la carga: ${reason}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }

  function togglePage(pageId: string) {
    setPages((current) => current.map((page) =>
      page.id === pageId ? { ...page, selected: !page.selected } : page,
    ));
  }

  function toggleAllPages() {
    const shouldSelect = !allSelected;
    setPages((current) => current.map((page) => ({ ...page, selected: shouldSelect })));
  }

  function rotatePage(pageId: string) {
    setPages((current) => current.map((page) => page.id === pageId
      ? { ...page, rotation: (page.rotation + 90) % 360 }
      : page,
    ));
  }

  function rotateDocument(sourceId: string) {
    setSources((current) => current.map((source) => source.id === sourceId
      ? { ...source, rotation: (source.rotation + 90) % 360 }
      : source,
    ));
  }

  function rotateAllDocuments() {
    setSources((current) => current.map((source) => ({
      ...source,
      rotation: (source.rotation + 90) % 360,
    })));
  }

  async function downloadZip() {
    if (selectedCount === 0 || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);
    setNotice("");

    try {
      const zipBlob = await buildPdfZip(sources, pages, setExportProgress);
      const downloadUrl = URL.createObjectURL(zipBlob);
      const anchor = window.document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = "ElKrizKut_PDF_separados.zip";
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "No se pudo crear el archivo ZIP.";
      setNotice(reason);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }

  function clearWorkspace() {
    setPages([]);
    setSources([]);
    setPreviewPageId(null);
    setNotice("");
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <span className="brand-mark" aria-hidden="true">EK</span>
        <h1>ElKrizKut</h1>
        <p>Separa, gira y descarga tus PDF.</p>
      </header>

      <section className="upload-panel" aria-label="Cargar documentos PDF">
        <Dropzone disabled={isLoading || isExporting} onFiles={handleFiles} />
        {isLoading && (
          <div className="status-message" role="status">
            <span className="loading-spinner" />
            <span>{loadingMessage}</span>
          </div>
        )}
        {notice && (
          <div className="notice-message" role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Cerrar aviso">×</button>
          </div>
        )}
      </section>

      {sources.length > 0 && (
        <section className="workspace" aria-label="Páginas cargadas">
          <div className="workspace-summary">
            <p>
              {sources.length} PDF · {pages.length} páginas · {selectedCount} seleccionadas
            </p>
            <div className="workspace-actions">
              <button type="button" className="text-button" onClick={toggleAllPages} disabled={isLoading || isExporting}>
                {allSelected ? "Quitar selección" : "Seleccionar todas"}
              </button>
              <button type="button" className="text-button" onClick={rotateAllDocuments} disabled={isLoading || isExporting}>
                ↻ Girar todos 90°
              </button>
              <button type="button" className="text-button text-button--muted" onClick={clearWorkspace} disabled={isLoading || isExporting}>
                Limpiar
              </button>
            </div>
          </div>

          <div className="document-list">
            {sources.map((source) => {
              const documentPages = pages.filter((page) => page.sourceId === source.id);
              const documentSelectedCount = documentPages.filter((page) => page.selected).length;

              return (
                <section className="document-group" key={source.id} aria-label={`Páginas de ${source.name}`}>
                  <header className="document-group__header">
                    <h2 title={source.name}>{source.name}</h2>
                    <p>{documentPages.length} páginas · {documentSelectedCount} seleccionadas</p>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => rotateDocument(source.id)}
                      disabled={isLoading || isExporting}
                    >
                      <span aria-hidden="true">↻</span>
                      {`Girar todas 90° · ${source.rotation}°`}
                    </button>
                  </header>

                  <div className="pages-grid">
                    {documentPages.map((page) => (
                      <PdfPageCard
                        key={page.id}
                        page={page}
                        rotation={(source.rotation + page.rotation) % 360}
                        isDisabled={isLoading || isExporting}
                        onPreview={() => setPreviewPageId(page.id)}
                        onToggle={() => togglePage(page.id)}
                        onRotate={() => rotatePage(page.id)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="export-panel">
            <p>{selectedCount === 0 ? "Selecciona al menos una página" : `${selectedCount} páginas listas para descargar`}</p>
            <button
              type="button"
              className="button button--primary"
              onClick={() => void downloadZip()}
              disabled={selectedCount === 0 || isExporting || isLoading}
            >
              {isExporting ? `Creando ZIP · ${exportProgress}%` : "Descargar ZIP"}
            </button>
            {isExporting && <div className="export-progress" style={{ width: `${exportProgress}%` }} />}
          </div>
        </section>
      )}

      <footer className="app-footer">Tus documentos se procesan en este navegador.</footer>

      {previewPage && previewSource && (
        <PdfViewerModal
          page={previewPage}
          fileBytes={previewSource.bytes}
          documentRotation={previewSource.rotation}
          onClose={() => setPreviewPageId(null)}
        />
      )}
    </main>
  );
}
