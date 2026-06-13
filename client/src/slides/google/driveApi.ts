import { googleGet } from './http';

export type DrivePresentation = { id: string; name: string };

// Lists the user's Google Slides files, most-recently-modified first.
export async function listPresentations(token: string): Promise<DrivePresentation[]> {
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.presentation' and trashed=false",
    orderBy: 'modifiedTime desc',
    pageSize: '25',
    fields: 'files(id,name)',
  });
  const res = await googleGet(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    token,
    'Drive list',
  );
  const data = (await res.json()) as { files?: DrivePresentation[] };
  return data.files ?? [];
}

// Exports a Google Slides file to a single PDF (one page per slide) for rendering with pdf.js.
export async function exportPresentationPdf(id: string, token: string): Promise<ArrayBuffer> {
  const res = await googleGet(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}/export?mimeType=application/pdf`,
    token,
    'PDF export',
  );
  return res.arrayBuffer();
}
