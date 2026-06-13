import { HandLandmarker, type DrawingUtils, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

const CONNECTION_STYLE = { color: '#22d3ee', lineWidth: 4 };
const LANDMARK_STYLE = { color: '#f97316', lineWidth: 1, radius: 4 };

// Draws the 21-point hand skeleton for each detected hand onto the overlay canvas.
export function drawHands(
  ctx: CanvasRenderingContext2D,
  drawingUtils: DrawingUtils,
  result: HandLandmarkerResult,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  for (const landmarks of result.landmarks) {
    drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, CONNECTION_STYLE);
    drawingUtils.drawLandmarks(landmarks, LANDMARK_STYLE);
  }
}
