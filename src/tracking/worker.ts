// MediaPipe Face Landmarker Web Worker
// Runs face tracking off the main thread

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

type WorkerMessage =
  | { type: 'init'; modelAssetPath: string }
  | { type: 'detect'; imageData: ImageData; timestamp: number }
  | { type: 'stop' };

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; landmarks: number[][]; blendshapes: Record<string, number>; timestamp: number }
  | { type: 'error'; message: string };

let faceLandmarker: FaceLandmarker | null = null;
let isProcessing = false;

async function initFaceLandmarker(modelAssetPath: string) {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });
}

interface FaceBlendshapeCategory {
  categoryName: string;
  score: number;
}

interface FaceLandmarkerResult {
  faceBlendshapes?: Array<{ categories: FaceBlendshapeCategory[] }>;
  landmarks?: Array<Array<{ x: number; y: number; z: number }>>;
}

function extractBlendshapes(faceLandmarkerResult: FaceLandmarkerResult): Record<string, number> {
  const blendshapes: Record<string, number> = {};
  if (faceLandmarkerResult.faceBlendshapes && faceLandmarkerResult.faceBlendshapes[0]) {
    for (const category of faceLandmarkerResult.faceBlendshapes[0].categories) {
      blendshapes[category.categoryName] = category.score;
    }
  }
  return blendshapes;
}

function extractLandmarks(faceLandmarkerResult: FaceLandmarkerResult): number[][] {
  if (faceLandmarkerResult.landmarks && faceLandmarkerResult.landmarks[0]) {
    return faceLandmarkerResult.landmarks[0].map((lm) => [lm.x, lm.y, lm.z]);
  }
  return [];
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'init': {
      try {
        await initFaceLandmarker(msg.modelAssetPath);
        (self as unknown as Worker).postMessage({ type: 'ready' } as WorkerResponse);
      } catch (err) {
        (self as unknown as Worker).postMessage({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to initialize FaceLandmarker',
        } as WorkerResponse);
      }
      break;
    }

    case 'detect': {
      if (!faceLandmarker || isProcessing) return;
      isProcessing = true;

      try {
        const { imageData, timestamp } = msg;
        const mpImage = await self.createImageBitmap(imageData);
        const result = faceLandmarker.detectForVideo(mpImage, timestamp);

        const landmarks = extractLandmarks(result);
        const blendshapes = extractBlendshapes(result);

        (self as unknown as Worker).postMessage({
          type: 'result',
          landmarks,
          blendshapes,
          timestamp,
        } as WorkerResponse);
      } catch (err) {
        (self as unknown as Worker).postMessage({
          type: 'error',
          message: err instanceof Error ? err.message : 'Detection failed',
        } as WorkerResponse);
      } finally {
        isProcessing = false;
      }
      break;
    }

    case 'stop': {
      faceLandmarker = null;
      break;
    }
  }
};

export {};