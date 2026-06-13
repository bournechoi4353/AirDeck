// Gesture engine — webcam capture + MediaPipe HandLandmarker + the gesture FSM
// (swipe / pinch / point) and calibration. Phases 1-3.
export { HandTrackingView } from './HandTrackingView';
export { useHandTracking } from './useHandTracking';
export type { TrackingStatus, HandTracking } from './useHandTracking';
export { mirrorX, updateSwipeWindow, detectSwipe, wristX, detectPinch, detectPoint } from './detectors';
export { createFSMState, stepFSM } from './gestureFSM';
export type { FSMInternalState, FSMConfig, CooldownDurations } from './gestureFSM';
export type { GestureName, GestureEvent, Landmark, SwipeWindow } from './types';
