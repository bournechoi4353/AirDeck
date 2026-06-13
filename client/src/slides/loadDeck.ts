import { exportPresentationPdf, type DrivePresentation } from './google/driveApi';
import { fetchPresentation, parseSlides } from './google/slidesApi';
import type { Deck, Slide } from './types';

// Loads a Google Slides deck into our source-agnostic Deck shape: text/notes from the Slides API
// (for Claude) and a rendered page image per slide from the Drive PDF export (for the viewer).
export async function loadGoogleDeck(
  presentation: DrivePresentation,
  token: string,
): Promise<Deck> {
  const [apiPresentation, pdfBuffer] = await Promise.all([
    fetchPresentation(presentation.id, token),
    exportPresentationPdf(presentation.id, token),
  ]);

  const parsed = parseSlides(apiPresentation);

  let images: string[] = [];
  try {
    // Lazy-load pdf.js (large) only when a Google deck is actually loaded.
    const { renderPdfToImages } = await import('./pdf/renderPdf');
    images = await renderPdfToImages(pdfBuffer);
  } catch {
    // If PDF rendering fails, fall back to the viewer's text placeholder per slide.
    images = [];
  }

  const slides: Slide[] = parsed.slides.map((s, i) => ({
    index: i,
    title: s.title,
    text: s.text,
    notes: s.notes,
    imageUrl: images[i],
  }));

  return { id: presentation.id, title: presentation.name, slides };
}
