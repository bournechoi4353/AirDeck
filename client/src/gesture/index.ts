// Gesture engine — webcam capture + MediaPipe HandLandmarker + the gesture FSM
// (index / pinky finger poses) and calibration. Phases 1-3.
export { HandTrackingView } from './HandTrackingView';
export { useHandTracking } from './useHandTracking';
export type { TrackingStatus, HandTracking, UseHandTrackingOptions } from './useHandTracking';
export { CalibrationFlow } from './CalibrationFlow';
export { useCalibration } from './useCalibration';
export type { CalibrationStep, UseCalibration } from './useCalibration';
export {
  DEFAULT_CALIBRATION,
  loadCalibration,
  saveCalibration,
  clearCalibration,
  toFSMConfig,
} from './calibration';
export type { CalibrationProfile } from './calibration';
export { filterHand, getPreferredHandedness, setPreferredHandedness } from './handFilter';
export type { Handedness } from './handFilter';
export { detectIndex, detectPinky } from './detectors';
export { createFSMState, stepFSM } from './gestureFSM';
export type { FSMInternalState, FSMConfig } from './gestureFSM';
export type { GestureName, GestureEvent, Landmark } from './types';
