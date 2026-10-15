// Face Tracking Module
// Manages camera input, Web Worker communication, and tracking state

export interface FaceTrackingResult {
  landmarks: number[][];
  blendshapes: Record<string, number>;
  timestamp: number;
}

export interface FaceTrackingConfig {
  cameraIndex: number;
  faceConfidence: number;
  onResult: (result: FaceTrackingResult) => void;
  onError: (error: string) => void;
}

let worker: Worker | null = null;
let videoElement: HTMLVideoElement | null = null;
let animationFrameId: number | null = null;
let config: FaceTrackingConfig | null = null;
let isRunning = false;

async function getCameraStream(cameraIndex: number): Promise<MediaStream> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(d => d.kind === 'videoinput');

  if (videoDevices.length === 0) {
    throw new Error('No cameras found');
  }

  const deviceId = videoDevices[cameraIndex]?.deviceId || videoDevices[0].deviceId;

  return navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: { exact: deviceId },
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 },
    },
  });
}

function initWorker(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create worker from the worker.ts module
    const workerUrl = new URL('./worker.ts', import.meta.url);
    worker = new Worker(workerUrl, { type: 'module' });

    worker.onmessage = (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'ready':
          resolve();
          break;
        case 'result':
          config?.onResult({
            landmarks: msg.landmarks,
            blendshapes: msg.blendshapes,
            timestamp: msg.timestamp,
          });
          break;
        case 'error':
          config?.onError(msg.message);
          break;
      }
    };

    worker.onerror = (err) => {
      reject(new Error(`Worker error: ${err.message}`));
    };

    // Initialize with MediaPipe model
    worker.postMessage({
      type: 'init',
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    });
  });
}

async function processFrame() {
  if (!videoElement || !worker || !isRunning || !config) return;

  if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(videoElement, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const timestamp = performance.now();

      worker.postMessage({ type: 'detect', imageData, timestamp });
    }
  }

  animationFrameId = requestAnimationFrame(processFrame);
}

export async function startFaceTracking(cfg: FaceTrackingConfig): Promise<void> {
  if (isRunning) return;

  config = cfg;

  try {
    // Initialize worker
    await initWorker();

    // Get camera stream
    const stream = await getCameraStream(cfg.cameraIndex);
    videoElement = document.createElement('video');
    videoElement.srcObject = stream;
    videoElement.playsInline = true;
    videoElement.muted = true;
    await videoElement.play();

    isRunning = true;
    processFrame();
  } catch (err) {
    config.onError(err instanceof Error ? err.message : 'Failed to start tracking');
    throw err;
  }
}

export function stopFaceTracking(): void {
  isRunning = false;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (videoElement?.srcObject) {
    const stream = videoElement.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
  }
  videoElement = null;

  if (worker) {
    worker.postMessage({ type: 'stop' });
    worker.terminate();
    worker = null;
  }

  config = null;
}

export function setCameraIndex(index: number): void {
  if (config) {
    config.cameraIndex = index;
  }
}

export function setFaceConfidence(confidence: number): void {
  // This would need worker reconfiguration - for now just store
  if (config) {
    config.faceConfidence = confidence;
  }
}

export function isTracking(): boolean {
  return isRunning;
}