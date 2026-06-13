// Minimal subset of the Google Slides `presentations.get` response shape that we read.
type TextRun = { content?: string };
type TextElement = { textRun?: TextRun };
type ShapeText = { textElements?: TextElement[] };
type Placeholder = { type?: string };
type Shape = { text?: ShapeText; placeholder?: Placeholder };
type PageElement = { shape?: Shape };
type NotesPage = { pageElements?: PageElement[] };
type SlideProperties = { notesPage?: NotesPage };
type ApiSlide = { pageElements?: PageElement[]; slideProperties?: SlideProperties };

export type SlidesApiPresentation = { title?: string; slides?: ApiSlide[] };

export type ParsedSlide = { title: string; text: string; notes: string };

// Slides encodes soft line breaks as a vertical tab (U+000B); normalize those to newlines.
const VERTICAL_TAB = String.fromCharCode(11);

// Concatenates all text runs across the given page elements, skipping the slide-number placeholder.
function collectText(elements: PageElement[] | undefined): string {
  if (!elements) return '';
  const parts: string[] = [];
  for (const element of elements) {
    if (element.shape?.placeholder?.type === 'SLIDE_NUMBER') continue;
    const runs = element.shape?.text?.textElements;
    if (!runs) continue;
    for (const run of runs) {
      if (run.textRun?.content) parts.push(run.textRun.content);
    }
  }
  return parts.join('').split(VERTICAL_TAB).join('\n').trim();
}

function firstLine(text: string, fallback: string): string {
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return fallback;
}

// Pure: turns a Slides API presentation into per-slide title/text/notes. Unit-tested.
export function parseSlides(presentation: SlidesApiPresentation): {
  title: string;
  slides: ParsedSlide[];
} {
  const slides = (presentation.slides ?? []).map((slide, i) => {
    const text = collectText(slide.pageElements);
    const notes = collectText(slide.slideProperties?.notesPage?.pageElements);
    return { title: firstLine(text, `Slide ${i + 1}`), text, notes };
  });
  return { title: presentation.title ?? 'Untitled', slides };
}

export async function fetchPresentation(id: string, token: string): Promise<SlidesApiPresentation> {
  const res = await fetch(
    `https://slides.googleapis.com/v1/presentations/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Slides API failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as SlidesApiPresentation;
}
