import { describe, expect, it } from 'vitest';
import { parseSlides, type SlidesApiPresentation } from './slidesApi';

const fixture: SlidesApiPresentation = {
  title: 'Deck',
  slides: [
    {
      pageElements: [
        {
          shape: {
            text: {
              textElements: [{ textRun: { content: 'Hello\n' } }, { textRun: { content: 'World' } }],
            },
          },
        },
      ],
      slideProperties: {
        notesPage: {
          pageElements: [
            {
              shape: {
                placeholder: { type: 'SLIDE_NUMBER' },
                text: { textElements: [{ textRun: { content: '1' } }] },
              },
            },
            {
              shape: {
                placeholder: { type: 'BODY' },
                text: { textElements: [{ textRun: { content: 'Speak slowly.' } }] },
              },
            },
          ],
        },
      },
    },
    { pageElements: [] },
  ],
};

describe('parseSlides', () => {
  it('extracts text and derives a title from the first line', () => {
    const { title, slides } = parseSlides(fixture);
    expect(title).toBe('Deck');
    expect(slides[0].text).toBe('Hello\nWorld');
    expect(slides[0].title).toBe('Hello');
  });

  it('extracts notes and skips the slide-number placeholder', () => {
    const { slides } = parseSlides(fixture);
    expect(slides[0].notes).toBe('Speak slowly.');
  });

  it('falls back to a numbered title for empty slides', () => {
    const { slides } = parseSlides(fixture);
    expect(slides[1].title).toBe('Slide 2');
    expect(slides[1].text).toBe('');
    expect(slides[1].notes).toBe('');
  });

  it('handles a presentation with no slides', () => {
    expect(parseSlides({}).slides).toEqual([]);
  });
});
