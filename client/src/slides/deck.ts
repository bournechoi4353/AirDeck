import type { GestureName } from '../gesture';
import type { Deck, DeckAction } from './types';

// Pure deck navigation — no React, fully unit-tested.
export type DeckState = {
  deckId: string;
  current: number;
  total: number;
};

export function createDeckState(deck: Deck): DeckState {
  return { deckId: deck.id, current: 0, total: deck.slides.length };
}

export function clampIndex(i: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(total - 1, i));
}

export function goToSlide(state: DeckState, i: number): DeckState {
  return { ...state, current: clampIndex(i, state.total) };
}

export function nextSlide(state: DeckState): DeckState {
  return goToSlide(state, state.current + 1);
}

export function prevSlide(state: DeckState): DeckState {
  return goToSlide(state, state.current - 1);
}

// Maps a recognized gesture to a deck action: index finger → previous, pinky finger → next.
export function gestureToDeckAction(gesture: GestureName): DeckAction {
  switch (gesture) {
    case 'index':
      return 'prev';
    case 'pinky':
      return 'next';
  }
}
