import { describe, expect, it } from 'vitest';
import { DEFAULT_CALIBRATION, loadCalibration, toFSMConfig } from './calibration';

describe('calibration', () => {
  it('defaults to no handedness preference', () => {
    expect(DEFAULT_CALIBRATION.handedness).toBeNull();
  });

  it('loads the default profile when nothing is stored', () => {
    expect(loadCalibration()).toEqual(DEFAULT_CALIBRATION);
  });

  it('toFSMConfig produces a config object', () => {
    expect(toFSMConfig({ handedness: 'Right' })).toEqual({});
  });
});
