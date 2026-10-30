import type { PdfPageItem } from "../types/pdf";

type PdfPageCardProps = {
  page: PdfPageItem;
  isDisabled: boolean;
  rotation: number;
  onPreview: () => void;
  onToggle: () => void;
  onRotate: () => void;
};

export default function PdfPageCard({
  page,
  isDisabled,
  rotation,
  onPreview,
  onToggle,
  onRotate,
}: PdfPageCardProps) {
  return (
    <article className={`page-card ${page.selected ? "page-card--selected" : "page-card--disabled"}`}>
      <div className="page-card__preview-wrap">
        <button
          type="button"
          className="page-card__preview-button"
          onClick={onPreview}
          aria-label={`Abrir vista previa de ${page.sourceName}, página ${page.pageNumber}`}
        >
          <span
            className={`page-card__image-frame ${rotation % 180 !== 0 ? "page-card__image-frame--quarter-turn" : ""}`}
            style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
          >
            <img src={page.thumbnailUrl} alt={`Página ${page.pageNumber} de ${page.sourceName}`} />
          </span>
          <span className="page-card__view-hint">Ver PDF</span>
        </button>

        <button
          type="button"
          className={`selection-indicator ${page.selected ? "selection-indicator--on" : "selection-indicator--off"}`}
          onClick={onToggle}
          aria-pressed={page.selected}
          aria-label={`${page.selected ? "Excluir" : "Incluir"} página ${page.pageNumber}`}
          title={page.selected ? "Excluir del ZIP" : "Incluir en el ZIP"}
        >
          {page.selected ? "✓" : "×"}
        </button>
      </div>

      <div className="page-card__details">
        <p className="page-card__source" title={page.sourceName}>{page.sourceName}</p>
        <p className="page-card__number">Página {page.pageNumber}</p>
      </div>

      <div className="page-card__footer">
        <span className={`page-card__status ${page.selected ? "is-selected" : "is-disabled"}`}>
          {page.selected ? "Incluida" : "Excluida"}
        </span>
        <button
          type="button"
          className="rotate-button"
          onClick={onRotate}
          disabled={isDisabled}
          aria-label={`Girar página ${page.pageNumber} 90 grados`}
          title="Girar 90°"
        >
          <span aria-hidden="true">↻</span>
          Girar
        </button>
      </div>
    </article>
  );
}
