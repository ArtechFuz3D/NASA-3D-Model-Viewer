// ─────────────────────────────────────────────────────────────────
// LIGHTING — 6-light studio rig
// All lights are exported so panel.js can wire controls directly.
// ─────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import { scene } from './staging.js'

// ── Ambient — base fill so nothing goes pure black ────────────────
export const ambientLight = new THREE.AmbientLight(0xffffff, 0.25)
scene.add(ambientLight)

// ── Key light — warm sun, casts shadows ──────────────────────────
export const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.2)
keyLight.position.set(5, 8, 5)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(2048, 2048)
keyLight.shadow.camera.near   = 0.1
keyLight.shadow.camera.far    = 50
keyLight.shadow.camera.left   = -10
keyLight.shadow.camera.right  = 10
keyLight.shadow.camera.top    = 10
keyLight.shadow.camera.bottom = -10
scene.add(keyLight)

// ── Fill light — soft blue bounce from opposite side ──────────────
export const fillLight = new THREE.DirectionalLight(0x8090ff, 0.4)
fillLight.position.set(-5, 3, -5)
scene.add(fillLight)

// ── Rim light — cold edge highlight from behind/below ────────────
export const rimLight = new THREE.DirectionalLight(0xc0e8ff, 0.6)
rimLight.position.set(0, -3, -8)
scene.add(rimLight)

// ── Point light — warm accent, off by default ─────────────────────
export const pointLight = new THREE.PointLight(0xff8844, 1.5, 20)
pointLight.position.set(3, 2, 3)
pointLight.visible = false
scene.add(pointLight)

// ── Spot light — focused top-down beam, off by default ───────────
export const spotLight = new THREE.SpotLight(0xffffff, 2.0, 30, Math.PI / 8, 0.3)
spotLight.position.set(0, 10, 0)
spotLight.target.position.set(0, 0, 0)
spotLight.visible = false
scene.add(spotLight)
scene.add(spotLight.target)
