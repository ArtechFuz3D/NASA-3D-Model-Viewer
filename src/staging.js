// ─────────────────────────────────────────────────────────────────
// STAGING — renderer, scene, camera, OrbitControls, resize handler
// Named "Staging" because this is where the stage is built before
// any models, lights or effects are added.
// ─────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export const canvas = document.querySelector('canvas.webgl')
export const scene  = new THREE.Scene()
export const sizes  = { width: window.innerWidth, height: window.innerHeight }

// ── Renderer ──────────────────────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setClearColor('#0a0e1a')
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type    = THREE.PCFSoftShadowMap

// ── Camera ────────────────────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.01, 1000)
camera.position.set(5, 3, 5)
scene.add(camera)

// ── Controls ──────────────────────────────────────────────────────
export const controls = new OrbitControls(camera, canvas)
controls.enableDamping      = true
controls.dampingFactor      = 0.05
controls.rotateSpeed        = 0.7
controls.zoomSpeed          = 1.0
controls.panSpeed           = 0.8
controls.minDistance        = 0.5
controls.maxDistance        = 100
controls.screenSpacePanning = true

// ── Resize ────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    sizes.width   = window.innerWidth
    sizes.height  = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// ── Scene helpers ─────────────────────────────────────────────────
export const gridHelper = new THREE.GridHelper(10, 20, '#444444', '#222222')
gridHelper.visible = true
scene.add(gridHelper)

export const axesHelper = new THREE.AxesHelper(5)
axesHelper.visible = true
scene.add(axesHelper)
