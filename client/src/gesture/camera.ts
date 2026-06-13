// Webcam capture. getUserMedia requires a secure context — localhost (Vite dev) and https qualify.

export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: false,
  });
  video.srcObject = stream;
  await waitForMetadata(video);
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

// Resolves once the video has real dimensions, so the overlay canvas can be sized to match.
function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1 && video.videoWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
  });
}
