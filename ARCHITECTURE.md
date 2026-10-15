# VTuberCC Architecture

## Overview
Real-time VTuber application with modular pipeline: Capture → Tracking → Retarget → Render → Output

## Module Diagram
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Capture    │────▶│  Tracking   │────▶│  Retarget   │────▶│   Render    │────▶│  Output     │
│  (camera)   │     │ (MediaPipe) │     │ (blendshape)│     │ (three.js)  │     │ (virtual    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     │  cam/stream)│
                                                                                 └─────────────┘
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
   MediaStream       Web Worker           Mapping JSON        three.js
   (getUserMedia)    (offscreen)          (blendshape map)    (WebGL)
```

## Module Specifications

### capture/
- `CameraManager.ts` — `getUserMedia`, device enumeration, resolution/fps config
- `AudioManager.ts` — Microphone input for lip-sync (future)

### tracking/ (Web Worker)
- `FaceTracker.ts` — MediaPipe FaceLandmarker, 478 landmarks @ 30fps
- `HandTracker.ts` — MediaPipe HandLandmarker, 21 landmarks/hand
- `TrackingWorker.ts` — Worker entry, message passing, result postMessage
- `types.ts` — Shared types: `FaceResult`, `HandResult`, `TrackingConfig`

### retarget/
- `BlendshapeMapper.ts` — MediaPipe landmarks → VRM blendshape weights (52 ARKit)
- `BoneMapper.ts` — Head/neck/eye rotation from landmarks
- `HandMapper.ts` — Hand landmarks → VRM hand bones
- `config/` — JSON mapping tables (user-editable)

### render/
- `VRMScene.ts` — three.js scene setup, VRM loader, animation mixer
- `VRMLoader.ts` — Drag-drop .vrm, `@pixiv/three-vrm` integration
- `IdleAnimation.ts` — Breathing, blinking, subtle motion
- `Renderer.ts` — Render loop, resize, pixel ratio

### output/
- `VirtualCamera.ts` — OBS Virtual Camera / DirectShow output (Windows)
- `StreamOutput.ts` — RTMP/SRT streaming (future)

### ui/
- `ModelLoader.tsx` — Drag-drop zone, file validation, load progress
- `SettingsPanel.tsx` — Camera select, tracking quality, blendshape tuning
- `Preview.tsx` — Live render preview canvas
- `App.tsx` — Main layout, state management

## Data Flow
```typescript
// Tracking → Retarget (per frame)
interface TrackingFrame {
  timestamp: number;
  face?: FaceLandmarks;      // 478 points
  leftHand?: HandLandmarks;  // 21 points
  rightHand?: HandLandmarks; // 21 points
}

interface RetargetFrame {
  blendshapes: Map<string, number>; // 52 ARKit weights [0,1]
  bones: Map<string, Euler>;        // Head, neck, eyes, hands
}

// Render consumes RetargetFrame at display refresh rate (60/120/144Hz)
```

## Threading Model
| Thread | Responsibility |
|--------|----------------|
| Main (UI) | React UI, three.js render loop, VRM loading |
| Worker (Tracking) | MediaPipe inference, landmark extraction |
| Tauri (Rust) | System APIs: virtual camera, global hotkeys, auto-start |

## Configuration
- `tracking.config.json` — MediaPipe model paths, confidence thresholds
- `retarget.config.json` — Blendshape mapping curves, bone limits
- `render.config.json` — Shadow quality, post-processing, background
- `app.config.json` — Window size, auto-load model, hotkeys

## VRM Requirements
- VRM 0.x / 1.0 compatible
- Humanoid rig with ARKit blendshapes (52)
- Idle animation via `VRMAnimation` or procedural

## Performance Targets
- Tracking: 30 FPS on mid-range laptop (MediaPipe GPU delegate)
- Render: 60+ FPS at 1080p, VRM < 50k triangles
- Latency: < 100ms camera → display (target 50ms)

## Future Extensions
- Expression presets (JSON)
- Physics (spring bones, colliders)
- Audio-driven lip-sync (Whisper/Rhubarb)
- Multi-model switching
- Plugin API for custom trackers