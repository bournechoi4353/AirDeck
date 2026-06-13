// Slides — deck model, viewer, and gesture-driven navigation (Phase 4A). Google OAuth +
// content extraction + PDF export land in Phase 4B/4C.
export { DeckViewer } from './DeckViewer';
export { useDeck } from './useDeck';
export type { UseDeck, UseDeckOptions } from './useDeck';
export { SAMPLE_DECK } from './sampleDeck';
export {
  createDeckState,
  clampIndex,
  goToSlide,
  nextSlide,
  prevSlide,
  gestureToDeckAction,
} from './deck';
export type { DeckState } from './deck';
export type { Deck, Slide, SlideChangeEvent, DeckAction } from './types';
