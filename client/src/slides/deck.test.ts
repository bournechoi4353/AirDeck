import { describe, expect, it } from 'vitest';
import {
  clampIndex,
  createDeckState,
  gestureToDeckAction,
  goToSlide,
  nextSlide,
  prevSlide,
} from './deck';
import type { Deck } from './types';

const deck: Deck = {
  id: 'd',
  title: 't',
  slides: [0, 1, 2].map((i) => ({ index: i, title: `S${i}`, text: '' })),
};

describe('clampIndex', () => {
  it('clamps below, above, and within range', () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(5, 3)).toBe(2);
    expect(clampIndex(1, 3)).toBe(1);
  });

  it('returns 0 for an empty deck', () => {
    expect(clampIndex(2, 0)).toBe(0);
  });
});

describe('navigation', () => {
  it('starts at slide 0', () => {
    expect(createDeckState(deck).current).toBe(0);
  });

  it('advances and stops at the last slide', () => {
    let s = createDeckState(deck);
    s = nextSlide(s);
    expect(s.current).toBe(1);
    s = nextSlide(s);
    expect(s.current).toBe(2);
    s = nextSlide(s);
    expect(s.current).toBe(2);
  });

  it('retreats and stops at the first slide', () => {
    let s = goToSlide(createDeckState(deck), 2);
    s = prevSlide(s);
    expect(s.current).toBe(1);
    s = prevSlide(s);
    s = prevSlide(s);
    expect(s.current).toBe(0);
  });

  it('goToSlide clamps out-of-range targets', () => {
    expect(goToSlide(createDeckState(deck), 99).current).toBe(2);
    expect(goToSlide(createDeckState(deck), -5).current).toBe(0);
  });
});

describe('gestureToDeckAction', () => {
  it('maps gestures to deck actions', () => {
    expect(gestureToDeckAction('swipe-right')).toBe('next');
    expect(gestureToDeckAction('swipe-left')).toBe('prev');
    expect(gestureToDeckAction('pinch')).toBe('zoom');
    expect(gestureToDeckAction('point')).toBe('none');
  });
});
