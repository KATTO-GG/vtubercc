# VTuberCC

Open-source VTuber application built with Tauri 2, TypeScript, Vite, three.js, @pixiv/three-vrm, and MediaPipe Tasks Vision.

## Features

- 🎭 **VRM Support** — Drag & drop `.vrm` files to load models
- 🎨 **Real-time Rendering** — three.js + WebGL with shadows and post-processing
- 😴 **Idle Animations** — Procedural breathing, blinking, subtle head movement
- 📷 **Camera Integration** — Device enumeration and selection (tracking coming soon)
- ⚡ **Native Performance** — Tauri 2 with Rust backend, no Electron

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| 3D | three.js, @pixiv/three-vrm |
| Tracking | MediaPipe Tasks Vision (Web Worker) |
| Desktop | Tauri 2 (Rust) |
| Build | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 20+ (via [nvm](https://github.com/nvm-sh/nvm))
- Rust 1.75+ (via [rustup](https://rustup.rs/))
- Windows 10/11 (primary target)

### Install

```bash
# Clone
git clone https://github.com/KATTO-GG/vtubercc.git
cd vtubercc

# Install dependencies
npm install

# Development (Vite + Tauri)
npm run tauri:dev

# Build for production
npm run tauri:build
```

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

## Development

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Dev server only (no Tauri)
npm run dev
```

## Roadmap

- [x] **M1**: Window opens, drag-drop .vrm loads & renders, idle animation
- [ ] **M2**: MediaPipe face tracking in worker, retarget to VRM blendshapes
- [ ] **M3**: Hand tracking, upper body IK
- [ ] **M4**: Virtual camera output (OBS compatible)
- [ ] **M5**: UI polish, settings persistence, multiple models

## License

MIT License — see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repo
2. Create a feature branch (`feat/your-feature`)
3. Make small, conventional commits (`feat:`, `fix:`, `chore:`)
4. Push and open a PR

All CI checks must pass (lint, typecheck, build).