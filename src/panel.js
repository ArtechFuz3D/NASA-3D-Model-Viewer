// ─────────────────────────────────────────────────────────────────
// PANEL — right panel DOM wiring
// Imports scene objects and wires all sliders, toggles, seg buttons.
// ─────────────────────────────────────────────────────────────────

import { camera, controls, gridHelper, axesHelper } from './staging.js'
import { ambientLight, keyLight, fillLight, rimLight, pointLight, spotLight } from './lighting.js'
import { hologramMaterial, applyMaterialMode } from './materials.js'
import { envState, ensureHDRI, applyEnvironment } from './environment.js'
import { motionState, clearTrajectory } from './motion.js'
import * as Models from './models.js'

// ── Helper: DOM toggle ────────────────────────────────────────────
export const tog = (id, onFn, offFn, startOn) => {
    const el = document.getElementById(id)
    if (!el) return
    if (startOn) el.classList.add('on')
    el.addEventListener('click', () => {
        el.classList.toggle('on')
        el.classList.contains('on') ? onFn() : offFn()
    })
    return el
}

// ── Helper: range slider with live value display ──────────────────
export const slider = (id, fn) => {
    const el    = document.getElementById(id)
    const valEl = document.getElementById(id + '-val')
    if (!el) return
    el.addEventListener('input', () => {
        const v = parseFloat(el.value)
        if (valEl) valEl.textContent = v.toFixed(v % 1 === 0 ? 0 : 2)
        fn(v)
    })
    return el
}

// ── Helper: segmented button group ───────────────────────────────
export const seg = (containerId, fn) => {
    document.querySelectorAll(`#${containerId} .seg-btn`).forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll(`#${containerId} .seg-btn`).forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            fn(btn.dataset.val)
        })
    })
}

// ── Panel collapse / tab switching ───────────────────────────────
const rightPanel = document.getElementById('right-panel')
const rpToggle   = document.getElementById('rp-toggle')
rpToggle?.addEventListener('click', () => rightPanel?.classList.toggle('rp-collapsed'))

document.querySelectorAll('.rp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const pane = tab.dataset.pane
        document.querySelectorAll('.rp-tab').forEach(t => t.classList.remove('active'))
        document.querySelectorAll('.rp-pane').forEach(p => p.classList.remove('active'))
        tab.classList.add('active')
        document.querySelector(`.rp-pane[data-pane="${pane}"]`)?.classList.add('active')
        if (rightPanel?.classList.contains('rp-collapsed')) rightPanel.classList.remove('rp-collapsed')
    })
})

// Help menu → open Help pane
document.getElementById('menu-help')?.addEventListener('click', () => {
    document.querySelectorAll('.rp-tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.rp-pane').forEach(p => p.classList.remove('active'))
    document.querySelector('.rp-tab[data-pane="help"]')?.classList.add('active')
    document.querySelector('.rp-pane[data-pane="help"]')?.classList.add('active')
    rightPanel?.classList.remove('rp-collapsed')
})

// ── VISUALIZATION ─────────────────────────────────────────────────
seg('mat-mode-seg', v => applyMaterialMode(v, Models.customModel))

document.getElementById('holo-color')?.addEventListener('input', e => {
    hologramMaterial.uniforms.uColor.value.set(e.target.value)
})
slider('aberration', v => { hologramMaterial.uniforms.uAberrationStrength.value = v })

tog('tog-grid',  () => { gridHelper.visible = true  }, () => { gridHelper.visible = false  }, true)
tog('tog-axes',  () => { axesHelper.visible = true  }, () => { axesHelper.visible = false  }, true)
tog('tog-bbox',  () => { if (Models.boundingBoxHelper) Models.boundingBoxHelper.visible = true  }, () => { if (Models.boundingBoxHelper) Models.boundingBoxHelper.visible = false })
tog('tog-laxes', () => { if (Models.localAxesHelper)   Models.localAxesHelper.visible   = true  }, () => { if (Models.localAxesHelper)   Models.localAxesHelper.visible   = false })

// ── LIGHTING ──────────────────────────────────────────────────────
slider('amb-int',    v => { ambientLight.intensity   = v })
tog('tog-key',  () => { keyLight.visible  = true }, () => { keyLight.visible  = false }, true)
document.getElementById('key-color')?.addEventListener('input',   e => keyLight.color.set(e.target.value))
slider('key-int',    v => { keyLight.intensity  = v })
tog('tog-fill', () => { fillLight.visible = true }, () => { fillLight.visible = false }, true)
document.getElementById('fill-color')?.addEventListener('input',  e => fillLight.color.set(e.target.value))
slider('fill-int',   v => { fillLight.intensity = v })
tog('tog-rim',  () => { rimLight.visible  = true }, () => { rimLight.visible  = false }, true)
document.getElementById('rim-color')?.addEventListener('input',   e => rimLight.color.set(e.target.value))
slider('rim-int',    v => { rimLight.intensity  = v })
tog('tog-point', () => { pointLight.visible = true }, () => { pointLight.visible = false })
document.getElementById('point-color')?.addEventListener('input', e => pointLight.color.set(e.target.value))
slider('point-int',  v => { pointLight.intensity   = v })
slider('point-x',    v => { pointLight.position.x  = v })
slider('point-y',    v => { pointLight.position.y  = v })
slider('point-z',    v => { pointLight.position.z  = v })
tog('tog-spot',  () => { spotLight.visible = true }, () => { spotLight.visible = false })
slider('spot-int',   v => { spotLight.intensity = v })
slider('spot-angle', v => { spotLight.angle     = v })
slider('spot-pen',   v => { spotLight.penumbra  = v })

// ── BACKGROUND ────────────────────────────────────────────────────
document.querySelectorAll('.bg-tile').forEach(tile => {
    tile.addEventListener('click', () => {
        document.querySelectorAll('.bg-tile').forEach(t => t.classList.remove('active'))
        tile.classList.add('active')
        envState.bgSource = tile.dataset.bg
        document.getElementById('solid-color-row').style.display = envState.bgSource === 'solid' ? '' : 'none'
        const needsHDRI = envState.bgSource === 'hdri' && !envState.hdriLoaded
        needsHDRI ? ensureHDRI(() => applyEnvironment()) : applyEnvironment()
    })
})
document.getElementById('bg-solid-color')?.addEventListener('input', e => {
    envState.solidColor = e.target.value
    if (envState.bgSource === 'solid') applyEnvironment()
})
tog('tog-hdri', () => {
    envState.hdriLighting = true
    ensureHDRI(() => applyEnvironment())
}, () => { envState.hdriLighting = false; applyEnvironment() })

// ── MOTION ────────────────────────────────────────────────────────
tog('tog-motion', () => { motionState.enabled = true  }, () => { motionState.enabled = false })
seg('motion-type-seg', v => { motionState.type = v })
slider('wx',       v => { motionState.wx             = v })
slider('wy',       v => { motionState.wy             = v })
slider('wz',       v => { motionState.wz             = v })
slider('vx',       v => { motionState.vx             = v })
slider('vy',       v => { motionState.vy             = v })
slider('vz',       v => { motionState.vz             = v })
slider('circ-r',   v => { motionState.circularRadius = v })
slider('circ-spd', v => { motionState.circularSpeed  = v })
document.getElementById('circ-axis')?.addEventListener('change', e => { motionState.circularAxis = e.target.value })
tog('tog-traj', () => { motionState.showTrajectory = true  }, () => { motionState.showTrajectory = false })
slider('traj-len', v => { motionState.trajectoryLength = v })
document.getElementById('btn-clear-traj')?.addEventListener('click', clearTrajectory)

// ── CAMERA ────────────────────────────────────────────────────────
export const fovParam = { fov: 45 }
slider('cam-fov', v => { fovParam.fov = v; camera.fov = v; camera.updateProjectionMatrix() })
tog('tog-autorot', () => { controls.autoRotate = true  }, () => { controls.autoRotate = false })
slider('rot-spd',  v => { controls.autoRotateSpeed = v })

// ── SIMULATION ────────────────────────────────────────────────────
export const simState = { running: true, timeScale: 1.0, currentTime: 0 }
tog('tog-sim-run', () => { simState.running = true }, () => { simState.running = false }, true)
slider('sim-scale', v => { simState.timeScale = v })
document.getElementById('btn-sim-reset')?.addEventListener('click', () => {
    simState.currentTime = 0
    if (Models.customModel) { Models.customModel.position.set(0, 0, 0); Models.customModel.rotation.set(0, 0, 0) }
    clearTrajectory()
})

// ── PERFORMANCE readout elements ──────────────────────────────────
export const perfEls = {
    fps:    document.getElementById('perf-fps'),
    frame:  document.getElementById('perf-frame'),
    render: document.getElementById('perf-render'),
    mem:    document.getElementById('perf-mem'),
    simTime: document.getElementById('sim-time-display'),
}
