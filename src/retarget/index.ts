// Retarget Module
// Maps MediaPipe face tracking blendshapes to VRM blendshapes and bones

import { VRM, VRMExpressionManager } from '@pixiv/three-vrm';

// MediaPipe blendshape names (52 total)
// Reference: https://developers.google.com/mediapipe/solutions/vision/face_landmarker#blendshapes
export const MEDIAPIPE_BLENDSHAPES = [
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight', 'eyeBlinkLeft', 'eyeBlinkRight',
  'eyeLookDownLeft', 'eyeLookDownRight', 'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft',
  'eyeLookOutRight', 'eyeLookUpLeft', 'eyeLookUpRight', 'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight', 'jawForward', 'jawLeft', 'jawOpen', 'jawRight',
  'mouthClose', 'mouthDimpleLeft', 'mouthDimpleRight', 'mouthFrownLeft', 'mouthFrownRight',
  'mouthFunnel', 'mouthLeft', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthPressLeft',
  'mouthPressRight', 'mouthPucker', 'mouthRight', 'mouthRollLower', 'mouthRollUpper',
  'mouthShrugLower', 'mouthShrugUpper', 'mouthSmileLeft', 'mouthSmileRight', 'mouthStretchLeft',
  'mouthStretchRight', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'noseSneerLeft', 'noseSneerRight',
] as const;

export type MediaPipeBlendshapeName = typeof MEDIAPIPE_BLENDSHAPES[number];

// VRM blendshape names (standard VRM0/VRM1)
export const VRM_BLENDSHAPES = {
  // Eye
  blink: 'blink',
  blinkLeft: 'blinkLeft',
  blinkRight: 'blinkRight',
  eyeLookUp: 'eyeLookUp',
  eyeLookDown: 'eyeLookDown',
  eyeLookLeft: 'eyeLookLeft',
  eyeLookRight: 'eyeLookRight',
  eyeSquint: 'eyeSquint',
  eyeWide: 'eyeWide',
  // Brow
  browDown: 'browDown',
  browInnerUp: 'browInnerUp',
  browOuterUp: 'browOuterUp',
  // Mouth
  aa: 'aa',
  ih: 'ih',
  ou: 'ou',
  ee: 'ee',
  oh: 'oh',
  // Mouth shape
  mouthFrown: 'mouthFrown',
  mouthSmile: 'mouthSmile',
  mouthPucker: 'mouthPucker',
  mouthOpen: 'mouthOpen',
  // Cheek
  cheekPuff: 'cheekPuff',
  cheekSquint: 'cheekSquint',
  // Jaw
  jawOpen: 'jawOpen',
  jawLeft: 'jawLeft',
  jawRight: 'jawRight',
  jawForward: 'jawForward',
} as const;

export type VRMBlendshapeName = typeof VRM_BLENDSHAPES[keyof typeof VRM_BLENDSHAPES];

// Mapping from MediaPipe to VRM blendshapes
export const BLENDSHAPE_MAP: Record<MediaPipeBlendshapeName, { name: VRMBlendshapeName; weight: number }[]> = {
  // Eye blinks
  eyeBlinkLeft: [{ name: 'blinkLeft', weight: 1.0 }],
  eyeBlinkRight: [{ name: 'blinkRight', weight: 1.0 }],

  // Eye look
  eyeLookUpLeft: [{ name: 'eyeLookUp', weight: 0.5 }, { name: 'eyeLookLeft', weight: 0.5 }],
  eyeLookUpRight: [{ name: 'eyeLookUp', weight: 0.5 }, { name: 'eyeLookRight', weight: 0.5 }],
  eyeLookDownLeft: [{ name: 'eyeLookDown', weight: 0.5 }, { name: 'eyeLookLeft', weight: 0.5 }],
  eyeLookDownRight: [{ name: 'eyeLookDown', weight: 0.5 }, { name: 'eyeLookRight', weight: 0.5 }],
  eyeLookInLeft: [{ name: 'eyeLookLeft', weight: 1.0 }],
  eyeLookInRight: [{ name: 'eyeLookRight', weight: 1.0 }],
  eyeLookOutLeft: [{ name: 'eyeLookLeft', weight: 1.0 }],
  eyeLookOutRight: [{ name: 'eyeLookRight', weight: 1.0 }],

  // Eye squint/wide
  eyeSquintLeft: [{ name: 'eyeSquint', weight: 0.5 }],
  eyeSquintRight: [{ name: 'eyeSquint', weight: 0.5 }],
  eyeWideLeft: [{ name: 'eyeWide', weight: 0.5 }],
  eyeWideRight: [{ name: 'eyeWide', weight: 0.5 }],

  // Brow
  browDownLeft: [{ name: 'browDown', weight: 0.5 }],
  browDownRight: [{ name: 'browDown', weight: 0.5 }],
  browInnerUp: [{ name: 'browInnerUp', weight: 1.0 }],
  browOuterUpLeft: [{ name: 'browOuterUp', weight: 0.5 }],
  browOuterUpRight: [{ name: 'browOuterUp', weight: 0.5 }],

  // Mouth vowels (visemes)
  mouthClose: [{ name: 'aa', weight: 0.3 }],
  mouthFunnel: [{ name: 'ou', weight: 1.0 }],
  mouthPucker: [{ name: 'ou', weight: 0.7 }, { name: 'oh', weight: 0.3 }],
  mouthLeft: [{ name: 'ee', weight: 0.3 }, { name: 'ih', weight: 0.3 }],
  mouthRight: [{ name: 'ee', weight: 0.3 }, { name: 'ih', weight: 0.3 }],
  mouthSmileLeft: [{ name: 'mouthSmile', weight: 0.5 }],
  mouthSmileRight: [{ name: 'mouthSmile', weight: 0.5 }],
  mouthFrownLeft: [{ name: 'mouthFrown', weight: 0.5 }],
  mouthFrownRight: [{ name: 'mouthFrown', weight: 0.5 }],
  mouthStretchLeft: [{ name: 'aa', weight: 0.5 }],
  mouthStretchRight: [{ name: 'aa', weight: 0.5 }],
  mouthUpperUpLeft: [{ name: 'ee', weight: 0.3 }],
  mouthUpperUpRight: [{ name: 'ee', weight: 0.3 }],
  mouthLowerDownLeft: [{ name: 'oh', weight: 0.5 }],
  mouthLowerDownRight: [{ name: 'oh', weight: 0.5 }],
  mouthPressLeft: [{ name: 'aa', weight: 0.3 }],
  mouthPressRight: [{ name: 'aa', weight: 0.3 }],
  mouthRollLower: [{ name: 'oh', weight: 0.3 }],
  mouthRollUpper: [{ name: 'oh', weight: 0.3 }],
  mouthShrugLower: [{ name: 'mouthFrown', weight: 0.2 }],
  mouthShrugUpper: [{ name: 'mouthFrown', weight: 0.2 }],
  mouthDimpleLeft: [{ name: 'mouthSmile', weight: 0.3 }],
  mouthDimpleRight: [{ name: 'mouthSmile', weight: 0.3 }],

  // Jaw
  jawOpen: [{ name: 'jawOpen', weight: 1.0 }, { name: 'mouthOpen', weight: 0.8 }],
  jawLeft: [{ name: 'jawLeft', weight: 1.0 }],
  jawRight: [{ name: 'jawRight', weight: 1.0 }],
  jawForward: [{ name: 'jawForward', weight: 1.0 }],

  // Cheek
  cheekPuff: [{ name: 'cheekPuff', weight: 1.0 }],
  cheekSquintLeft: [{ name: 'cheekSquint', weight: 0.5 }],
  cheekSquintRight: [{ name: 'cheekSquint', weight: 0.5 }],

  // Nose
  noseSneerLeft: [{ name: 'mouthFrown', weight: 0.2 }],
  noseSneerRight: [{ name: 'mouthFrown', weight: 0.2 }],
};

export interface RetargetConfig {
  vrm: VRM;
  smoothing?: number; // 0-1, higher = more smoothing
  blendshapeMultiplier?: number; // Global multiplier for blendshape values
}

export interface RetargetResult {
  appliedBlendshapes: Record<string, number>;
  headRotation?: { x: number; y: number; z: number } | null;
}

let config: RetargetConfig | null = null;
let previousBlendshapes: Record<string, number> = {};

export function initRetarget(cfg: RetargetConfig): void {
  config = {
    smoothing: 0.3,
    blendshapeMultiplier: 1.0,
    ...cfg,
  };
  previousBlendshapes = {};
}

function smoothValue(current: number, target: number, smoothing: number): number {
  return current + (target - current) * (1 - smoothing);
}

function applyBlendshape(expressionManager: VRMExpressionManager, name: string, value: number): void {
  try {
    expressionManager.setValue(name, Math.max(0, Math.min(1, value)));
  } catch {
    // Blendshape might not exist on this model
  }
}

function getHeadRotationFromLandmarks(landmarks: number[][]): { x: number; y: number; z: number } | null {
  if (landmarks.length < 468) return null;

  // Use key landmarks for head pose estimation
  // Nose tip (1), chin (152), left eye corner (33), right eye corner (263)
  const noseTip = landmarks[1];
  const chin = landmarks[152];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];

  if (!noseTip || !chin || !leftEye || !rightEye) return null;

  // Calculate rough head rotation from landmark positions
  const dx = rightEye[0] - leftEye[0];
  const dy = rightEye[1] - leftEye[1];
  const yaw = Math.atan2(dy, dx) - Math.PI / 2;

  const noseToChinY = chin[1] - noseTip[1];
  const pitch = Math.atan2(noseToChinY, 0.1) * 0.5;

  const roll = Math.atan2(dy, dx);

  return { x: pitch, y: yaw, z: roll };
}

export function retargetFrame(mediapipeResult: {
  landmarks: number[][];
  blendshapes: Record<string, number>;
}): RetargetResult {
  if (!config?.vrm) {
    return { appliedBlendshapes: {} };
  }

  const { vrm, smoothing = 0.3, blendshapeMultiplier = 1.0 } = config;
  const expressionManager = vrm.expressionManager;
  const humanoid = vrm.humanoid;

  if (!expressionManager) {
    return { appliedBlendshapes: {} };
  }

  const appliedBlendshapes: Record<string, number> = {};

  // Map MediaPipe blendshapes to VRM blendshapes
  for (const [mpName, mpValue] of Object.entries(mediapipeResult.blendshapes)) {
    const mapping = BLENDSHAPE_MAP[mpName as MediaPipeBlendshapeName];
    if (!mapping) continue;

    const scaledValue = mpValue * blendshapeMultiplier;

    for (const { name: vrmName, weight } of mapping) {
      const targetValue = scaledValue * weight;
      const prevValue = previousBlendshapes[vrmName] ?? 0;
      const smoothedValue = smoothValue(prevValue, targetValue, smoothing);

      applyBlendshape(expressionManager, vrmName, smoothedValue);
      appliedBlendshapes[vrmName] = smoothedValue;
      previousBlendshapes[vrmName] = smoothedValue;
    }
  }

  // Decay blendshapes not in current frame
  for (const name of Object.keys(previousBlendshapes)) {
    if (!(name in appliedBlendshapes)) {
      const decayedValue = previousBlendshapes[name] * smoothing;
      applyBlendshape(expressionManager, name, decayedValue);
      appliedBlendshapes[name] = decayedValue;
      previousBlendshapes[name] = decayedValue;
    }
  }

  // Apply head rotation from landmarks
  let headRotation: { x: number; y: number; z: number } | null = null;
  if (mediapipeResult.landmarks.length > 0) {
    headRotation = getHeadRotationFromLandmarks(mediapipeResult.landmarks);
    if (headRotation && humanoid) {
      const head = humanoid.getBoneNode('head');
      if (head) {
        head.rotation.x = headRotation.x * 0.5;
        head.rotation.y = headRotation.y * 0.5;
        head.rotation.z = headRotation.z * 0.3;
      }

      // Neck follows head at reduced amplitude
      const neck = humanoid.getBoneNode('neck');
      if (neck) {
        neck.rotation.x = headRotation.x * 0.25;
        neck.rotation.y = headRotation.y * 0.25;
      }
    }
  }

  return { appliedBlendshapes, headRotation };
}

export function updateConfig(updates: Partial<RetargetConfig>): void {
  if (config) {
    config = { ...config, ...updates };
  }
}

export function getConfig(): RetargetConfig | null {
  return config;
}