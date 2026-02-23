// ─────────────────────────────────────────────────────────────────
// ENVIRONMENT — background system and HDRI
//
// Two fully independent axes:
//   hdriLighting  — whether HDRI drives scene.environment (IBL)
//   bgSource      — what fills the background:
//                   'solid' | 'hdri' | 'earth' | 'planet'
//
// All combinations are valid, e.g. HDRI lighting ON + solid colour bg.
// ─────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { scene, renderer } from './staging.js'

// ── DOM refs ──────────────────────────────────────────────────────
export const earthLayer   = document.getElementById('earth-bg')
export const planetIframe = document.getElementById('planet-iframe')

// ── Shared state ──────────────────────────────────────────────────
export const envState = {
    hdriLighting: false,
    bgSource:     'solid',
    solidColor:   '#0a0e1a',
}

// ── HDRI ──────────────────────────────────────────────────────────
const HDRI_URL = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/golden_gate_hills_2k.hdr'

let hdriTexture = null
let hdriLoaded  = false

export function ensureHDRI(onReady, setStatus) {
    if (hdriLoaded) { onReady(); return }
    setStatus?.('Loading HDRI…')
    new RGBELoader().load(
        HDRI_URL,
        tex => {
            tex.mapping = THREE.EquirectangularReflectionMapping
            hdriTexture = tex
            hdriLoaded  = true
            setStatus?.('')
            onReady()
        },
        undefined,
        err => {
            console.warn('HDRI failed:', err)
            setStatus?.('HDRI unavailable')
        }
    )
}

// ── Planet iframe ─────────────────────────────────────────────────
let iframeReady = false

export function ensurePlanetIframe(cb) {
    if (iframeReady) { cb?.(); return }
    planetIframe.src = './planet-shader.html'
    planetIframe.onload = () => { iframeReady = true; cb?.() }
}

export function pausePlanet() {
    if (iframeReady && planetIframe.contentWindow)
        planetIframe.contentWindow.postMessage({ type: 'planetConfig', paused: true }, '*')
}

export function resumePlanet() {
    if (iframeReady && planetIframe.contentWindow)
        planetIframe.contentWindow.postMessage({ type: 'planetConfig', paused: false }, '*')
}

// ── Apply environment from current state ──────────────────────────
export function applyEnvironment() {
    // 1. HDRI lighting — drives scene.environment for IBL/reflections
    scene.environment = (envState.hdriLighting && hdriTexture) ? hdriTexture : null

    // 2. Background source — fully independent of lighting
    if (earthLayer)   earthLayer.style.opacity = '0'
    if (planetIframe) planetIframe.classList.remove('active')
    scene.background = null

    if (envState.bgSource === 'solid') {
        renderer.setClearColor(envState.solidColor, 1)
        pausePlanet()

    } else if (envState.bgSource === 'hdri') {
        if (hdriTexture) {
            scene.background = hdriTexture
            renderer.setClearColor('#000000', 0)
        } else {
            renderer.setClearColor(envState.solidColor, 1)
        }
        pausePlanet()

    } else if (envState.bgSource === 'earth') {
        renderer.setClearColor('#000000', 0)
        if (earthLayer) earthLayer.style.opacity = '1'
        pausePlanet()

    } else if (envState.bgSource === 'planet') {
        renderer.setClearColor('#000000', 0)
        ensurePlanetIframe(() => {
            resumePlanet()
            planetIframe.classList.add('active')
        })
    }
}
