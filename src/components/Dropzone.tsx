import { useRef, useState, type DragEvent } from "react";

type DropzoneProps = {
  disabled: boolean;
  onFiles: (files: File[]) => void;
};

function getDroppedFiles(dataTransfer: DataTransfer): File[] {
  // During a normal drop, DataTransfer.files is the most reliable source.
  const files = Array.from(dataTransfer.files ?? []);
  if (files.length > 0) return files;

  // Some browsers expose files through items before exposing the FileList.
  return Array.from(dataTransfer.items ?? []).flatMap((item) => {
    if (item.kind !== "file") return [];

    try {
      const file = item.getAsFile();
      return file ? [file] : [];
    } catch {
      return [];
    }
  });
}

export default function Dropzone({ disabled, onFiles }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = disabled ? "none" : "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = getDroppedFiles(event.dataTransfer);
    onFiles(files);
  }

  return (
    <div
      className={`dropzone ${isDragging ? "dropzone--active" : ""} ${disabled ? "dropzone--disabled" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={handleDragOver}
      onDragLeave={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget === event.target) setIsDragging(false);
      }}
      onDrop={handleDrop}
      aria-label="Zona para arrastrar varios archivos PDF"
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".pdf,application/pdf"
        multiple
        disabled={disabled}
        onChange={(event) => {
          const input = event.currentTarget;
          const files = Array.from(input.files ?? []);
          input.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />

      <div className="dropzone-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
          <path d="M4 15.5v3A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-3" />
        </svg>
      </div>

      <div className="dropzone-copy">
        <p className="dropzone-title">
          {isDragging ? "Suelta tus PDF aquí" : "Arrastra varios PDF aquí"}
        </p>
        <p className="dropzone-subtitle">También puedes seleccionar varios a la vez</p>
      </div>

      <button
        type="button"
        className="button button--outline"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Seleccionar archivos
      </button>
    </div>
  );
}
