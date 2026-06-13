import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Vite resolves the worker to a real URL; pdf.js runs parsing/rendering off the main thread.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Renders each page of the exported PDF to a PNG data URL (one per slide), for the DeckViewer's
// `imageUrl` slot. Decks are small, so rendering all pages up front is fine.
export async function renderPdfToImages(data: ArrayBuffer, scale = 1.5): Promise<string[]> {
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const images: string[] = [];
  try {
    for (let n = 1; n <= pdf.numPages; n += 1) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D canvas context unavailable');
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      images.push(canvas.toDataURL('image/png'));
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  return images;
}
