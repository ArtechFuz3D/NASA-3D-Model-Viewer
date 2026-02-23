// ─────────────────────────────────────────────────────────────────
// MATERIALS — hologram, wireframe and clay materials
// applyMaterialMode() is called by the toolbar, panel, and on model load.
// ─────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import hologramVertShader from './shaders/vert.glsl'
import hologramFragShader from './shaders/frag.glsl'

// ── Hologram — custom GLSL scan-line shader ───────────────────────
export const hologramMaterial = new THREE.ShaderMaterial({
    vertexShader:   hologramVertShader,
    fragmentShader: hologramFragShader,
    uniforms: {
        uTime:               { value: 0 },
        uColor:              new THREE.Uniform(new THREE.Color('#70c1ff')),
        uAberrationStrength: { value: 3.0 }
    },
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
    transparent: true,
    depthWrite:  false
})

// ── Wireframe ─────────────────────────────────────────────────────
export const wireframeMaterial = new THREE.MeshBasicMaterial({
    color:     0x70c1ff,
    wireframe: true
})

// ── Clay — unlit flat for silhouette study ────────────────────────
export const clayMaterial = new THREE.MeshStandardMaterial({
    color:     0xc8b89a,
    roughness: 0.85,
    metalness: 0.0
})

// ── Material state ────────────────────────────────────────────────
// Tracks active mode so toolbar and panel stay in sync
export let materialMode = 'hologram'

// Stores each mesh's original PBR material keyed by uuid
export const originalMaterials = new Map()

export function storeOriginalMaterials(root) {
    originalMaterials.clear()
    root.traverse(c => {
        if (!c.isMesh) return
        originalMaterials.set(c.uuid, Array.isArray(c.material) ? c.material[0] : c.material)
    })
}

// customModel ref is set externally — passed in to avoid circular imports
export function applyMaterialMode(mode, customModel) {
    materialMode = mode
    if (!customModel) return
    customModel.traverse(c => {
        if (!c.isMesh) return
        switch (mode) {
            case 'hologram':  c.material = hologramMaterial; break
            case 'original':  c.material = originalMaterials.get(c.uuid) || hologramMaterial; break
            case 'wireframe': c.material = wireframeMaterial; break
            case 'clay':      c.material = clayMaterial; break
        }
    })
    // Keep right panel seg buttons in sync
    document.querySelectorAll('#mat-mode-seg .seg-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === mode)
    })
}
