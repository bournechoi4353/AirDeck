import type { Deck } from './types';

// Placeholder deck for Phase 4A (no Google yet). Replaced by real decks loaded from Google
// Slides / exported PDF in Phase 4C.
export const SAMPLE_DECK: Deck = {
  id: 'sample',
  title: 'AirDeck demo deck',
  slides: [
    {
      index: 0,
      title: 'AirDeck',
      text: 'Present with your hands.',
      notes: 'Open strong: no clicker, no note cards — just your hands and an AI copilot.',
    },
    {
      index: 1,
      title: 'The problem',
      text: 'Clickers get lost. Note cards break eye contact. Memorizing is stressful.',
      notes: 'Name the pain the audience feels before pitching the fix.',
    },
    {
      index: 2,
      title: 'How it works',
      text: 'A webcam tracks your hands. A finger gesture moves slides. Claude reads each slide and whispers your next line.',
      notes: 'Walk the loop end to end: gesture in, slide changes, cue in your ear.',
    },
    {
      index: 3,
      title: 'Gestures',
      text: 'Index finger to go back, pinky finger to go forward.',
      notes: 'Demo each gesture live right here on this slide.',
    },
    {
      index: 4,
      title: 'Thanks',
      text: 'Just you, your hands, and an AI that has your back.',
      notes: 'Close on the tagline, then invite questions.',
    },
  ],
};
