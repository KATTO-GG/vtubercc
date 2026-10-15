# VTuberCC — Open Source VTuber App

## Stack
- **Tauri 2** — Native Windows app (Rust backend)
- **TypeScript** — Frontend language
- **Vite** — Build tool & dev server
- **three.js** — 3D rendering
- **@pixiv/three-vrm** — VRM model loading & animation
- **MediaPipe Tasks Vision** — Face/hand tracking (Web Worker)
- **Windows-first** — No Electron

## Project Structure
```
vtubercc/
├── src/
│   ├── capture/       # Camera/microphone input
│   ├── tracking/      # MediaPipe face/hand tracking (Web Worker)
│   ├── retarget/      # Map tracking → VRM blendshapes/bones
│   ├── render/        # three.js scene, VRM renderer
│   ├── output/        # Virtual camera, streaming output
│   └── ui/            # Settings, model loader, preview
├── src-tauri/         # Tauri Rust backend
└── public/            # Static assets
```

## Commands
```bash
# Install deps
npm install

# Dev (Vite + Tauri)
npm run tauri dev

# Build
npm run tauri build

# Lint
npm run lint

# Type check
npm run typecheck
```

## Git Workflow
- `gh repo create KATTO-GG/vtubercc --public` — init repo
- Feature branches: `feat/`, `fix/`, `chore/`
- Conventional commits: `feat:`, `fix:`, `chore:`
- Push after each working milestone
- GitHub Actions: lint + build on push, release build on tag
- Only commit code that runs

## Architecture Principles
- **Tracking in Web Worker** — Offload MediaPipe to background thread
- **Modular pipeline** — capture → tracking → retarget → render → output
- **VRM-first** — Drag-drop .vrm loads and plays idle animation
- **TypeScript strict** — No `any`, explicit types
- **Test before declare done** — Verify window opens, model loads, animation plays

## Milestones
1. **M1**: Window opens, drag-drop .vrm loads & renders, idle animation
2. **M2**: MediaPipe face tracking in worker, retarget to VRM blendshapes
3. **M3**: Hand tracking, upper body IK
4. **M4**: Virtual camera output (OBS compatible)
5. **M5**: UI polish, settings persistence, multiple models