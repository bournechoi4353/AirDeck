// Mirror of client/src/slides/types.ts — keep in sync manually.
// Server cannot import across workspace boundaries at compile time.
export type Slide = {
  index: number;
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