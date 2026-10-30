# ElKrizKut

Aplicación web para cargar varios PDF de una sola vez, separar cada página, revisar la vista ampliada, girar páginas o documentos completos y descargar las páginas seleccionadas en un ZIP.

## Requisitos

- Node.js `22.22.0` o superior.
- npm.

## Instalación

```bash
npm install
npm run dev
```

Abre la dirección local que muestre Vite.

## Uso

1. Arrastra varios PDF juntos al recuadro superior o selecciónalos con el botón.
2. ElKrizKut cuenta las páginas y las muestra progresivamente, agrupadas por documento.
3. Las páginas aparecen primero con una tarjeta de respaldo; después se generan las miniaturas. Si PDF.js falla o tarda más de 15 segundos en abrir el archivo, la carga principal continúa y la vista ampliada usa el visor PDF integrado del navegador.
4. Pulsa la miniatura para abrir la vista ampliada de esa página.
5. Usa el círculo verde/rojo para incluir o excluir la página del ZIP.
6. Usa **Girar todas 90°** en el grupo de un documento, **Girar todos 90°** para rotar todos los documentos cargados, o **Girar** para modificar una sola página.
7. Pulsa **Descargar ZIP** para obtener un PDF independiente por cada página seleccionada.

La carga múltiple funciona tanto desde el selector de archivos como mediante arrastrar y soltar. Las páginas aparecen conforme se procesan; si falla una miniatura, se conserva la página y se intenta mostrar con el visor PDF del navegador. Si un archivo no se puede leer, los demás se siguen procesando.

## Comprobar compilación

```bash
npm run build
npm run preview
```

## Tecnologías

- React 19.3 + TypeScript 7.
- Vite 8.
- Tailwind CSS 4.
- React Router 8.
- PDF.js (`pdfjs-dist`) para leer y mostrar páginas.
- `pdf-lib` para crear los PDF individuales y aplicar rotaciones.
- JSZip para generar el archivo ZIP.

## Privacidad

El procesamiento ocurre localmente en el navegador. Los archivos no se suben a un servidor. En documentos grandes, el uso de memoria del navegador puede aumentar porque los archivos y sus miniaturas se conservan durante el trabajo.


### Rotación

- **Girar páginas 90°** aplica una rotación a todas las páginas del documento original.
- **Girar todos 90°** aplica una rotación a todos los documentos cargados.
- El giro es inmediato y no depende del generador de miniaturas de PDF.js.
- La rotación individual de una página se conserva y se suma a la rotación de su documento.
- Los cambios se aplican al PDF de salida dentro del ZIP.
