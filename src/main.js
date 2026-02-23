// ─────────────────────────────────────────────────────────────────
// MAIN — orchestrator
// Imports all modules, wires the toolbar + planet panel,
// runs the animation loop.
// ─────────────────────────────────────────────────────────────────

import { scene, renderer, camera, controls } from './staging.js'
import { hologramMaterial, applyMaterialMode } from './materials.js'
import { envState, ensureHDRI, applyEnvironment, planetIframe } from './environment.js'
import { fetchNASAModels, setStatus, modelNameDisplay } from './models.js'
import { motionState, tickMotion } from './motion.js'
import { fovParam, simState, perfEls } from './panel.js'
import * as Models from './models.js'

// ── Kick off model catalogue fetch ───────────────────────────────
fetchNASAModels()

// ── DOM refs ──────────────────────────────────────────────────────
const fpsValue = document.getElementById('fps-value')

// ─────────────────────────────────────────
// TOOLBAR BUTTONS
// ─────────────────────────────────────────
const wire = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn) }

wire('btn-top',   () => { camera.position.set(0, 15, 0); controls.target.set(0,0,0); controls.update() })
wire('btn-front', () => { camera.position.set(0, 0, 15); controls.target.set(0,0,0); controls.update() })
wire('btn-side',  () => { camera.position.set(15, 0, 0); controls.target.set(0,0,0); controls.update() })
wire('btn-iso',   () => { camera.position.set(5, 3, 5);  controls.target.set(0,0,0); controls.update() })
wire('btn-reset', () => { camera.position.set(5, 3, 5);  controls.target.set(0,0,0); controls.update() })

wire('btn-wireframe', () => {
    const next = Models.materialMode === 'wireframe' ? 'hologram' : 'wireframe'
    applyMaterialMode(next, Models.customModel)
    document.getElementById('btn-wireframe').classList.toggle('active', next === 'wireframe')
})
wire('btn-hologram', () => {
    const next = Models.materialMode === 'hologram' ? 'original' : 'hologram'
    applyMaterialMode(next, Models.customModel)
    document.getElementById('btn-hologram').classList.toggle('active-accent', next === 'hologram')
})
wire('btn-autorotate', () => {
    controls.autoRotate = !controls.autoRotate
    document.getElementById('btn-autorotate').classList.toggle('active', controls.autoRotate)
})

// ─────────────────────────────────────────
// FILE MENU — dropdown + export
// ─────────────────────────────────────────
const fileDropdown = document.getElementById('file-dropdown')
const menuFileBtn  = document.getElementById('menu-file')

menuFileBtn?.addEventListener('click', e => {
    e.stopPropagation()
    const rect = menuFileBtn.getBoundingClientRect()
    if (fileDropdown) {
        fileDropdown.style.left = rect.left + 'px'
        fileDropdown.classList.toggle('open')
    }
})
document.addEventListener('click', () => fileDropdown?.classList.remove('open'))

document.getElementById('dd-export-settings')?.addEventListener('click', () => {
    fileDropdown?.classList.remove('open')
    const exportData = {
        meta:          { app: 'NASA 3D Model Viewer', version: '1.0', exportedAt: new Date().toISOString() },
        model:         { name: modelNameDisplay?.textContent ?? 'none' },
        visualization: {
            materialMode: document.querySelector('#mat-mode-seg .seg-btn.active')?.dataset.val ?? 'hologram',
            holoColor:    document.getElementById('holo-color')?.value ?? '#70c1ff',
            aberration:   parseFloat(document.getElementById('aberration')?.value ?? 3),
            grid:         document.getElementById('tog-grid')?.classList.contains('on'),
            originAxes:   document.getElementById('tog-axes')?.classList.contains('on'),
            boundingBox:  document.getElementById('tog-bbox')?.classList.contains('on'),
            localAxes:    document.getElementById('tog-laxes')?.classList.contains('on'),
        },
        lighting: {
            ambientIntensity: parseFloat(document.getElementById('amb-int')?.value ?? 0.25),
            key:   { on: document.getElementById('tog-key')?.classList.contains('on'),   color: document.getElementById('key-color')?.value,   intensity: parseFloat(document.getElementById('key-int')?.value) },
            fill:  { on: document.getElementById('tog-fill')?.classList.contains('on'),  color: document.getElementById('fill-color')?.value,  intensity: parseFloat(document.getElementById('fill-int')?.value) },
            rim:   { on: document.getElementById('tog-rim')?.classList.contains('on'),   color: document.getElementById('rim-color')?.value,   intensity: parseFloat(document.getElementById('rim-int')?.value) },
            point: { on: document.getElementById('tog-point')?.classList.contains('on'), color: document.getElementById('point-color')?.value, intensity: parseFloat(document.getElementById('point-int')?.value), x: parseFloat(document.getElementById('point-x')?.value), y: parseFloat(document.getElementById('point-y')?.value), z: parseFloat(document.getElementById('point-z')?.value) },
            spot:  { on: document.getElementById('tog-spot')?.classList.contains('on'),  intensity: parseFloat(document.getElementById('spot-int')?.value), angle: parseFloat(document.getElementById('spot-angle')?.value), penumbra: parseFloat(document.getElementById('spot-pen')?.value) },
        },
        background: {
            source:       envState.bgSource,
            solidColor:   envState.solidColor,
            hdriLighting: envState.hdriLighting,
        },
        motion: {
            enabled: motionState.enabled, type: motionState.type,
            wx: motionState.wx, wy: motionState.wy, wz: motionState.wz,
            vx: motionState.vx, vy: motionState.vy, vz: motionState.vz,
            circularRadius: motionState.circularRadius, circularSpeed: motionState.circularSpeed, circularAxis: motionState.circularAxis,
            showTrajectory: motionState.showTrajectory, trajectoryLength: motionState.trajectoryLength,
        },
        camera: {
            fov:             fovParam.fov,
            autoRotate:      controls.autoRotate,
            autoRotateSpeed: controls.autoRotateSpeed,
            position:        camera.position.toArray(),
            target:          controls.target.toArray(),
        },
        simulation: {
            running: simState.running, timeScale: simState.timeScale, currentTime: simState.currentTime,
        },
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `model-viewer-settings-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
})

// ─────────────────────────────────────────
// PLANET SCENE PANEL
// ─────────────────────────────────────────
const planetPanel = document.getElementById('planet-panel')
const menuViewBtn = document.getElementById('menu-view')
const panelClose  = document.getElementById('planet-panel-close')
const viewport    = document.getElementById('viewport')

function sendPlanet(msg) {
    if (planetIframe?.contentWindow)
        planetIframe.contentWindow.postMessage({ type: 'planetConfig', ...msg }, '*')
}

function isPlanetPanelOpen() {
    return planetPanel?.classList.contains('open')
}

function openPlanetPanel() {
    if (!planetPanel) return
    planetPanel.classList.add('open')
    planetPanel.setAttribute('aria-hidden', 'false')
    menuViewBtn?.classList.add('active')
    viewport?.classList.add('planet-orbit-mode')
    controls.enabled = false
}

function closePlanetPanel() {
    if (!planetPanel) return
    planetPanel.classList.remove('open')
    planetPanel.setAttribute('aria-hidden', 'true')
    menuViewBtn?.classList.remove('active')
    viewport?.classList.remove('planet-orbit-mode')
    controls.enabled = true
    pfwd.active = false
}

menuViewBtn?.addEventListener('click', () => isPlanetPanelOpen() ? closePlanetPanel() : openPlanetPanel())
panelClose?.addEventListener('click', closePlanetPanel)
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePlanetPanel() })

document.querySelectorAll('.pp-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.pp-preset').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        sendPlanet({ planet: parseInt(btn.dataset.planet) })
    })
})
document.querySelectorAll('.pp-tog').forEach(t => {
    t.addEventListener('click', () => {
        t.classList.toggle('on')
        sendPlanet({ flag: t.dataset.flag, value: t.classList.contains('on') })
    })
})

// ── Planet orbit forwarding ───────────────────────────────────────
let pfwd = { active: false, btn: -1, ctrl: false, lx: 0, ly: 0 }

function pfwdDown(e) {
    if (!isPlanetPanelOpen()) return
    const inner = document.getElementById('planet-panel-inner')
    if (inner?.contains(e.target)) return
    e.preventDefault(); e.stopPropagation()
    pfwd.active = true; pfwd.btn = e.button ?? 0; pfwd.ctrl = e.ctrlKey
    pfwd.lx = e.clientX; pfwd.ly = e.clientY
}
function pfwdMove(e) {
    if (!pfwd.active) return
    const dx = e.clientX - pfwd.lx, dy = e.clientY - pfwd.ly
    pfwd.lx = e.clientX; pfwd.ly = e.clientY
    if (pfwd.ctrl || e.ctrlKey)  sendPlanet({ dPanX: dx * .004, dPanY: -dy * .004 })
    else if (pfwd.btn === 0)     sendPlanet({ dRotY: dx * .004, dRotX: dy * .004 })
    else if (pfwd.btn === 2)     sendPlanet({ dSunX: dx * .005, dSunY: dy * .005 })
}
function pfwdUp() { pfwd.active = false; pfwd.ctrl = false }
function pfwdWheel(e) {
    if (!isPlanetPanelOpen()) return
    const inner = document.getElementById('planet-panel-inner')
    if (inner?.contains(e.target)) return
    e.preventDefault()
    sendPlanet({ dZoom: -e.deltaY * .001 })
}

viewport?.addEventListener('mousedown',   pfwdDown,  { capture: true })
window.addEventListener  ('mousemove',    pfwdMove)
window.addEventListener  ('mouseup',      pfwdUp)
viewport?.addEventListener('wheel',       pfwdWheel, { passive: false, capture: true })
viewport?.addEventListener('contextmenu', e => { if (isPlanetPanelOpen()) e.preventDefault() }, { capture: true })

// ─────────────────────────────────────────
// ANIMATION LOOP
// ─────────────────────────────────────────
let frameCount = 0
let fpsTimer   = 0
let lastTime   = performance.now()
let elapsed    = 0

const tick = () => {
    const now   = performance.now()
    const delta = Math.min((now - lastTime) / 1000, 0.05)
    lastTime    = now
    elapsed    += delta

    // FPS + frame time
    frameCount++
    if (elapsed - fpsTimer > 0.5) {
        const dt      = elapsed - fpsTimer
        const fps     = Math.round(frameCount / dt)
        const frameMs = ((dt / frameCount) * 1000).toFixed(1)
        if (fpsValue)        fpsValue.textContent        = fps
        if (perfEls.fps)     perfEls.fps.textContent     = fps
        if (perfEls.frame)   perfEls.frame.textContent   = frameMs
        frameCount = 0
        fpsTimer   = elapsed
    }

    if (perfEls.simTime) perfEls.simTime.textContent = simState.currentTime.toFixed(2) + ' s'

    hologramMaterial.uniforms.uTime.value = elapsed

    if (simState.running) simState.currentTime += delta * simState.timeScale

    tickMotion(Models.customModel, elapsed, delta)

    if (Models.boundingBoxHelper?.visible && Models.customModel) {
        Models.boundingBoxHelper.box.setFromObject(Models.customModel)
    }

    controls.update()

    const t0 = performance.now()
    renderer.render(scene, camera)
    const renderMs = (performance.now() - t0).toFixed(2)
    if (perfEls.render) perfEls.render.textContent = renderMs

    if (performance.memory) {
        if (perfEls.mem) perfEls.mem.textContent = (performance.memory.usedJSHeapSize / 1048576).toFixed(1)
    }

    window.requestAnimationFrame(tick)
}

tick()