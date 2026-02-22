# 🛸 NASA 3D Model Viewer

> An interactive holographic viewer for NASA's open 3D model library — spacecraft, rovers, telescopes and more, rendered in real-time WebGL with a custom GLSL hologram shader.

**[→ Live Demo](https://artechfuz3d.github.io/NASA-3D-Model-Viewer/)**  &nbsp;|&nbsp; **[→ NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources)**

---

![Three.js](https://img.shields.io/badge/Three.js-r179-70c1ff?style=flat-square&logo=threedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.x-646cff?style=flat-square&logo=vite&logoColor=white)
![WebGL](https://img.shields.io/badge/WebGL-2.0-990000?style=flat-square)
![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-181717?style=flat-square&logo=github)
![License](https://img.shields.io/badge/License-See%20Notice-ff6b8a?style=flat-square)

---

## Overview

NASA 3D Model Viewer lets you browse and interact with NASA's entire open 3D model catalogue directly in the browser. Every model loads with a signature hologram shader — scan lines, chromatic aberration, and a glowing edge effect — or switch to original, wireframe, or clay material modes. Behind the model sits a fully interactive planet scene powered by a raymarched WebGL2 fragment shader.

The interface is built entirely from scratch — no UI framework, no lil-gui. Custom dark-panel design system with collapsible tabbed right panel, left model browser sidebar, and a full toolbar.

---

## Features

### Viewer

- Browse NASA's full open 3D model catalogue with search and category filters
- Load any GLTF/GLB model with automatic centering and fit-to-view
- Save models to a Favourites list

### Materials

- **Hologram** — custom GLSL scan-line shader with chromatic aberration and rim glow
- **Original** — PBR materials as authored by NASA
- **Wireframe** — three.js wireframe overlay
- **Clay** — flat unlit material for silhouette study

### Backgrounds

- **Solid colour** — custom colour picker
- **HDRI** — image-based lighting with environment map
- **Earth** — CSS layered earth atmosphere backdrop
- **Planet Scene** — fully interactive raymarched planet shader (WebGL2)
  - 5 presets: Earth, Mars, Ice World, Lava World, Alien
  - Toggleable: surface detail, displacement, night lights, volumetric clouds, atmosphere, rings, moon, stars
  - Orbit controls: left drag to rotate, right drag to move sun, scroll to zoom, Ctrl+drag to pan

### Lighting

Full 6-light rig — ambient, key, fill, rim, point and spot — each with colour picker, intensity slider, and on/off toggle. Point light has XYZ position controls.

### Motion & Simulation

- **Rotation** — angular velocity on X/Y/Z axes
- **Linear** — translational velocity on X/Y/Z axes
- **Circular** — configurable radius, speed, and orbital plane
- Trajectory trail with adjustable length and clear control
- Independent simulation time scale and reset

### Camera

- Orbit, pan and zoom (Three.js OrbitControls)
- Adjustable FOV
- Auto-rotate with speed control
- Preset views: Top, Front, Side, Isometric

### Right Panel

Collapsible tabbed sidebar with 8 sections: Visualization, Lighting, Background, Motion, Camera, Simulation, Performance, Help & About. Fully styled to match the app design system — consistent across all browsers and environments.

### Performance Readout

Live FPS, frame time, render time, and memory usage displayed in the Performance tab and the top-right toolbar.

### Export

File → Export Settings JSON captures the complete current state: material mode, all lighting values, background config, motion parameters, camera position and FOV, simulation time.

### Intro Sequence

Fullscreen boot screen with ambient looping video, animated logo, typewriter title, cinematic progress bar, and an `[ ENTER ]` button to proceed. Video asset is a drop-in — see setup below.

---

## Tech Stack

| Layer | Technology |
|---|---|
| 3D Renderer | [Three.js r179](https://threejs.org) |
| Planet Shader | Custom WebGL2 GLSL raymarcher |
| Hologram Shader | Custom GLSL vertex/fragment — `src/shaders/` |
| Build Tool | [Vite 7](https://vitejs.dev) + [vite-plugin-glsl](https://github.com/UstymUkhman/vite-plugin-glsl) |
| GLTF Loading | Three.js `GLTFLoader` + `DRACOLoader` |
| HDRI Loading | Three.js `RGBELoader` |
| Deployment | GitHub Actions → GitHub Pages |
| Fonts | Rajdhani (UI) + JetBrains Mono (values/mono) |

---

## Getting Started

## Controls

| Input | Action |
|---|---|
| Left drag | Orbit camera |
| Right drag | Pan camera |
| Scroll | Zoom |
| Left drag *(planet mode)* | Rotate planet |
| Right drag *(planet mode)* | Move sun direction |
| Scroll *(planet mode)* | Zoom planet |
| Ctrl + drag *(planet mode)* | Pan planet |
| Escape | Close open panels |
| Enter | Dismiss intro screen |

---

## Intellectual Property Notice

The following original works are the exclusive intellectual property of **ArtechFuz3D** and are protected under copyright:

- **Blue crescent favicon & app icon** — original 3D artwork created in Blender
- **Hologram shader** — unique GLSL visual style, scan-line aesthetics and chromatic aberration effect
- **Planet shader** — raymarched WebGL2 atmosphere, cloud and surface system
- **UI design & layout** — custom interface design, iconography and panel system
- **App name & branding** — NASA 3D Model Viewer identity and ArtechFuz3D mark

3D model data is courtesy of [NASA's open 3D Resources](https://github.com/nasa/NASA-3D-Resources) under NASA's media usage guidelines. All other content © ArtechFuz3D. Unauthorised reproduction, redistribution or commercial use is prohibited.

---

## Acknowledgements

- [NASA](https://www.nasa.gov) — for making their 3D model library publicly available
- [Three.js](https://threejs.org) — the 3D engine powering the viewer
- [Vite](https://vitejs.dev) — lightning fast dev and build tooling

---

<div align="center">

Made with ♥ by [ArtechFuz3D](https://github.com/ArtechFuz3D)

</div>
