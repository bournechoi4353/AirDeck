export type GestureName = 'swipe-left' | 'swipe-right' | 'pinch' | 'point';

export type GestureEvent = {
  type: GestureName;
  timestamp: number;
};

export type Landmark = { x: number; y: number; z: number };

// Rolling window entry used by the swipe detector. The FSM owns this array across frames.
export type SwipeWindow = Array<{ x: number; t: number }>;