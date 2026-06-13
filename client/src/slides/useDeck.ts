import { useCallback, useEffect, useRef, useState } from 'react';
import type { GestureEvent } from '../gesture';
import { createDeckState, goToSlide, gestureToDeckAction, nextSlide, prevSlide } from './deck';
import type { Deck, Slide, SlideChangeEvent } from './types';

export type UseDeckOptions = {
  onSlideChange?: (event: SlideChangeEvent) => void;
};

export type UseDeck = {
  current: number;
  total: number;
  slide: Slide;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  handleGesture: (event: GestureEvent) => void;
};

// Holds deck position, maps gestures to navigation, and emits slide-change events. The navigation
// itself is the pure deck.ts logic; this hook only adds React state + wiring.
export function useDeck(deck: Deck, options: UseDeckOptions = {}): UseDeck {
  const [state, setState] = useState(() => createDeckState(deck));

  const onChangeRef = useRef(options.onSlideChange);
  onChangeRef.current = options.onSlideChange;

  // Reset position when a different deck is loaded.
  useEffect(() => {
    setState(createDeckState(deck));
  }, [deck]);

  // Emit on mount and whenever the current index changes.
  useEffect(() => {
    const slide = deck.slides[state.current];
    if (slide) onChangeRef.current?.({ index: state.current, total: state.total, slide });
  }, [state.current, state.total, deck]);

  const next = useCallback(() => setState((s) => nextSlide(s)), []);
  const prev = useCallback(() => setState((s) => prevSlide(s)), []);
  const goTo = useCallback((i: number) => setState((s) => goToSlide(s, i)), []);

  const handleGesture = useCallback(
    (event: GestureEvent) => {
      switch (gestureToDeckAction(event.type)) {
        case 'next':
          next();
          break;
        case 'prev':
          prev();
          break;
      }
    },
    [next, prev],
  );

  const slide = deck.slides[state.current];
  return { current: state.current, total: state.total, slide, next, prev, goTo, handleGesture };
}
