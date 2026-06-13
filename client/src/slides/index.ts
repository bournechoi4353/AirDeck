// Slides — deck model, viewer, gesture-driven navigation (Phase 4A), and the Google Slides
// connection: OAuth, content extraction, and PDF render (Phase 4B/4C).
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

// Google integration
export { GoogleConnect } from './GoogleConnect';
export { useGoogleDeck } from './useGoogleDeck';
export type { UseGoogleDeck, GoogleDeckStatus } from './useGoogleDeck';
export { loadGoogleDeck } from './loadDeck';
export { isGoogleConfigured } from './google/config';
export { parseSlides } from './google/slidesApi';
export type { SlidesApiPresentation, ParsedSlide } from './google/slidesApi';
export type { DrivePresentation } from './google/driveApi';
