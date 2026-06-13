import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CALIBRATION,
  deriveSwipeThresholds,
  derivePinchThreshold,
  toFSMConfig,
} from './calibration';

describe('deriveSwipeThresholds', () => {
  it('falls back to defaults with no samples', () => {
    expect(deriveSwipeThresholds([])).toEqual(DEFAULT_CALIBRATION.swipe);
  });

  it('sets thresholds to a fraction of the median sample', () => {
    const r = deriveSwipeThresholds(
      [
        { velocity: 0.004, displacement: 0.3 },
        { velocity: 0.004, displacement: 0.3 },
      ],
      0.5,
    );
    expect(r.minVelocity).toBeCloseTo(0.002, 6);
    expect(r.minDisplacement).toBeCloseTo(0.15, 6);
  });

  it('clamps extreme values to sane bounds', () => {
    const r = deriveSwipeThresholds([{ velocity: 1, displacement: 1 }], 0.5);
    expect(r.minVelocity).toBeLessThanOrEqual(0.004);
    expect(r.minDisplacement).toBeLessThanOrEqual(0.35);
  });
});

describe('derivePinchThreshold', () => {
  it('defaults with no samples', () => {
    expect(derivePinchThreshold([])).toBe(DEFAULT_CALIBRATION.pinchThreshold);
  });

  it('uses factor * median', () => {
    expect(derivePinchThreshold([0.05, 0.05, 0.05], 1.4)).toBeCloseTo(0.07, 6);
  });

  it('clamps small and large medians', () => {
    expect(derivePinchThreshold([0.001], 1.4)).toBeGreaterThanOrEqual(0.03);
    expect(derivePinchThreshold([0.5], 1.4)).toBeLessThanOrEqual(0.14);
  });
});

describe('toFSMConfig', () => {
  it('maps a profile onto FSM config fields', () => {
    const cfg = toFSMConfig({
      handedness: 'Right',
      swipe: { minVelocity: 0.001, minDisplacement: 0.1 },
      pinchThreshold: 0.07,
    });
    expect(cfg.swipeThresholds).toEqual({ minVelocity: 0.001, minDisplacement: 0.1 });
    expect(cfg.pinchThreshold).toBe(0.07);
  });
});
