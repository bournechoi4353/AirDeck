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
  zoom: number;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  toggleZoom: () => void;
  handleGesture: (event: GestureEvent) => void;
};

const ZOOMED = 1.5;

// Holds deck position + zoom, maps gestures to navigation, and emits slide-change events. The
// navigation itself is the pure deck.ts logic; this hook only adds React state + wiring.
export function useDeck(deck: Deck, options: UseDeckOptions = {}): UseDeck {
  const [state, setState] = useState(() => createDeckState(deck));
  const [zoom, setZoom] = useState(1);

  const onChangeRef = useRef(options.onSlideChange);
  onChangeRef.current = options.onSlideChange;

  // Reset position when a different deck is loaded.
  useEffect(() => {
    setState(createDeckState(deck));
    setZoom(1);
  }, [deck]);

  // Emit on mount and whenever the current index changes.
  useEffect(() => {
    const slide = deck.slides[state.current];
    if (slide) onChangeRef.current?.({ index: state.current, total: state.total, slide });
  }, [state.current, state.total, deck]);

  const next = useCallback(() => setState((s) => nextSlide(s)), []);
  const prev = useCallback(() => setState((s) => prevSlide(s)), []);
  const goTo = useCallback((i: number) => setState((s) => goToSlide(s, i)), []);
  const toggleZoom = useCallback(() => setZoom((z) => (z > 1 ? 1 : ZOOMED)), []);

  const handleGesture = useCallback(
    (event: GestureEvent) => {
      switch (gestureToDeckAction(event.type)) {
        case 'next':
          next();
          break;
        case 'prev':
          prev();
          break;
        case 'zoom':
          toggleZoom();
          break;
        case 'none':
          break;
      }
    },
    [next, prev, toggleZoom],
  );

  const slide = deck.slides[state.current];
  return {
    current: state.current,
    total: state.total,
    slide,
    zoom,
    next,
    prev,
    goTo,
    toggleZoom,
    handleGesture,
  };
}
