export type SourcePdf = {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
  rotation: number;
};

export type PdfPageItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  pageNumber: number;
  selected: boolean;
  rotation: number;
  thumbnailUrl: string;
};
