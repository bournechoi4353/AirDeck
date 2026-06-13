// A single slide. `text`/`notes` feed Claude (Phase 5); `imageUrl` is an optional rendered page
// (Google thumbnails or pdf.js output in Phase 4C). When absent, the viewer renders a placeholder.
export type Slide = {
  index: number; // 0-based
  title: string;
  text: string;
  notes?: string;
  imageUrl?: string;
};

export type Deck = {
  id: string;
  title: string;
  slides: Slide[];
};

// Emitted whenever the current slide changes — carries the slide content for downstream (Claude).
export type SlideChangeEvent = {
  index: number;
  total: number;
  slide: Slide;
};

export type DeckAction = 'next' | 'prev';
