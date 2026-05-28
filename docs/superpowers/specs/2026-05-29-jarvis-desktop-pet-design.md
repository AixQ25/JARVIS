# JARVIS Desktop Pet - Design Spec

## Overview

A Windows desktop pet application that visualizes AI system state through a multi-layered holographic particle sphere, inspired by JARVIS from Iron Man. Pure visual display — no input UI. State changes are pushed from a local custom system via HTTP REST API.

## Tech Stack

- **Electron** — window management, main process, HTTP server
- **Three.js** — 3D rendering, particle systems, post-processing
- **Platform** — Windows desktop

## Window Behavior

- Size: 400x400px (default, resizable via config)
- Style: transparent, frameless, always-on-top
- Interaction: draggable anywhere on the window, right-click context menu (settings / quit)
- Background: fully transparent (alpha channel), particles float directly on desktop

## Architecture

```
jarvis-desktop/
├── main.js              # Electron main process: window, IPC, lifecycle
├── preload.js           # IPC bridge (contextBridge)
├── renderer/
│   ├── index.html       # Transparent window entry
│   ├── scene.js         # Three.js scene, camera, renderer setup
│   ├── particles.js     # Multi-layer particle system
│   ├── effects.js       # Post-processing (Bloom, color grading)
│   └── state.js         # State management, transition interpolation
├── server.js            # HTTP REST server (port 3210)
├── config.js            # Default configuration
├── package.json
└── assets/
    └── icon.ico         # Tray icon
```

### Data Flow

1. External system sends POST to `http://localhost:3210/state` with `{ state: "thinking", intensity: 0.8 }`
2. `server.js` receives request, forwards to main process via IPC
3. Main process sends state to renderer via `webContents.send()`
4. Renderer's `state.js` begins transition interpolation to new state
5. `particles.js` updates particle behavior parameters each frame based on interpolated state

## Particle System — Multi-Layer Holographic Sphere

Total particle budget: ~3000-5000 particles across all layers.

### Layer 1: Core

- A small emissive sphere or concentrated point light at center
- Color: #FFF8E1 → #FFD54F (white-gold to bright gold)
- Acts as the primary light source for the scene
- Strongest Bloom glow — this is what makes the whole球体 "self-illuminate"
- Subtle pulsing animation (scale oscillation)

### Layer 2: Light Rings (光环层)

- 2-4 concentric rings at different tilt angles (e.g., 15°, 45°, -30°, 70°)
- Each ring is composed of ~200-400 particles arranged on a circular path
- Not solid rings — fine particle lines with density variations creating bright bands
- Each ring rotates at a different speed around its own axis
- Color: #FFB300 → #FF8F00 (gold to deep gold)

### Layer 3: Particle Flow (粒子流层)

- ~1500-3000 particles distributed on the sphere surface
- Particles follow curved trajectories along invisible "magnetic field lines"
- Non-uniform density: clusters form luminous bands, sparse areas create transparency
- Flow speed and direction change based on AI state
- Color: #FFC107 → #FF6F00 (amber to orange-gold)

### Layer 4: Energy Arcs (能量弧线层)

- 3-5 visible arcs orbiting the sphere at various angles
- Arcs are either TubeGeometry meshes or dense particle聚集成线
- Arcs have breakpoints and bright spots — visual metaphor for data transmission
- Slowest rotation speed of all layers
- Color: #FFD54F with bright white highlight points

### Layer 5: Bottom Cold Light

- Blue-tinted particles or point light positioned below the sphere
- Color: #4FC3F7 → #1565C0 (light blue to deep blue)
- Provides visual contrast against the warm gold palette
- Subtle, not overpowering

### Rotation Hierarchy

Speed递减: Core (fastest) > Light Rings > Particle Flow > Energy Arcs (slowest)

### Translucency

All layers are semi-transparent. The球体 is not solid — inner layers are visible through outer layers, creating the holographic depth effect.

## State Mapping

Each AI state modifies particle system parameters:

| State | Particle Speed | Color Shift | Ring Speed | Arc Behavior | Bloom Intensity |
|-------|---------------|-------------|------------|--------------|-----------------|
| idle | Slow, gentle drift | Base gold | Slow | Slow orbit | Low |
| waiting | Rhythmic pulse (cluster→scatter) | Slightly warmer | Slow | Slow orbit | Medium |
| thinking | Fast spiral/vortex | Shift toward bright gold | Fast | Fast orbit | High |
| responding | Outward radiation, streaming | Bright amber/gold | Medium | Medium orbit | High |
| executing | Layered orbital patterns | Multi-layer gradient | Medium | Structured orbit | Medium |
| error | Chaotic jitter, flickering | Shift toward red, intermittent dims | Erratic | Shaking | Flickering |

### Transition

State changes trigger smooth interpolation (lerp) over ~0.5-1.5 seconds depending on transition type. Parameters smoothly blend: particle speed, colors, rotation rates, Bloom intensity. No abrupt jumps.

## Post-Processing Effects

1. **Bloom** — UnrealBloomPass, strength tuned per state. Core and bright particles generate light halos. This is the key effect that creates the "self-illuminating" look.
2. **Color Grading** — Subtle tint shifts based on state (warm for normal, red for error, cool blue undertone always present at bottom).
3. **Transparent Background** — Three.js renderer with `alpha: true`, Electron BrowserWindow with `transparent: true` and `backgroundColor: #00000000`.

## HTTP API

**Port:** 3210 (configurable via `config.js`)

**Endpoint:** `POST /state`

**Request Body:**
```json
{
  "state": "thinking",        // required, enum: idle | waiting | thinking | responding | executing | error
  "intensity": 0.8            // optional, 0.0-1.0, defaults to 0.5
}
```

**Response:** `200 OK` with `{ "ok": true }`

**Additional endpoints:**
- `GET /health` — returns `200 OK` with `{ "status": "running", "currentState": "idle" }`
- `GET /config` — returns current config (port, default state)

## Configuration

`config.js` provides defaults:
- HTTP port: 3210
- Default state: idle
- Particle count: 3000 (total)
- Window size: 400x400
- Transition duration: 1000ms

## Error Handling

- If HTTP server fails to bind port, show system notification and retry with port+1
- If renderer crashes, main process attempts reload after 2s
- Graceful shutdown on window close: close HTTP server, dispose Three.js resources

## Scope (MVP)

- [ ] Electron window (transparent, frameless, always-on-top, draggable)
- [ ] Three.js scene with all 5 particle layers
- [ ] 6 state animations with smooth transitions
- [ ] Bloom post-processing
- [ ] HTTP server with `/state` and `/health` endpoints
- [ ] Right-click context menu (quit)
- [ ] Basic config file

Out of scope for MVP:
- System tray integration
- Settings UI
- Sound effects
- Multiple monitor support
- Auto-start on boot
