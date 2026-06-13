export type GestureName = 'index' | 'pinky';

export type GestureEvent = {
  type: GestureName;
  timestamp: number;
};

export type Landmark = { x: number; y: number; z: number };
