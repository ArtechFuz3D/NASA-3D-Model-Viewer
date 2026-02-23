// ─────────────────────────────────────────────────────────────────
// MOTION — motion state, trajectory system, per-frame update
// ─────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import { scene } from './staging.js'

// ── Trajectory geometry reused across frames ──────────────────────
let trajGeo = null
let trajMat = null

// ── Motion state ──────────────────────────────────────────────────
export const motionState = {
    enabled:          false,
    type:             'none',    // 'none' | 'rotation' | 'linear' | 'circular'
    wx: 0, wy: 0.5,  wz: 0,     // angular velocity (rad/s)
    vx: 0, vy: 0,    vz: 0,     // linear velocity (units/s)
    circularRadius:   3,
    circularSpeed:    1,
    circularAxis:     'xz',      // 'xz' | 'xy' | 'yz'
    showTrajectory:   false,
    trajectoryLength: 300,
}

export const trajectoryPoints = []
export let   trajectoryLine   = null

export function clearTrajectory() {
    trajectoryPoints.length = 0
    if (trajectoryLine) {
        scene.remove(trajectoryLine)
        trajectoryLine.geometry.dispose()
        trajectoryLine.material.dispose()
        trajectoryLine = null
    }
    if (trajGeo) { trajGeo.dispose(); trajGeo = null }
    if (trajMat) { trajMat.dispose(); trajMat = null }
}

// ── Per-frame motion + trajectory update ─────────────────────────
// Called from the main tick loop, receives customModel and elapsed time.
export function tickMotion(customModel, elapsed, delta) {
    if (!customModel) return

    // ── Motion ────────────────────────────────────────────────────
    if (motionState.enabled && motionState.type !== 'none') {
        if (motionState.type === 'rotation') {
            customModel.rotation.x += motionState.wx * delta
            customModel.rotation.y += motionState.wy * delta
            customModel.rotation.z += motionState.wz * delta

        } else if (motionState.type === 'linear') {
            customModel.position.x += motionState.vx * delta
            customModel.position.y += motionState.vy * delta
            customModel.position.z += motionState.vz * delta

        } else if (motionState.type === 'circular') {
            const angle = elapsed * motionState.circularSpeed * Math.PI * 2
            const r     = motionState.circularRadius
            if (motionState.circularAxis === 'xz') {
                customModel.position.x = Math.cos(angle) * r
                customModel.position.z = Math.sin(angle) * r
            } else if (motionState.circularAxis === 'xy') {
                customModel.position.x = Math.cos(angle) * r
                customModel.position.y = Math.sin(angle) * r
            } else {
                customModel.position.y = Math.cos(angle) * r
                customModel.position.z = Math.sin(angle) * r
            }
        }
    }

    // ── Trajectory ────────────────────────────────────────────────
    if (motionState.showTrajectory) {
        trajectoryPoints.push(customModel.position.clone())
        if (trajectoryPoints.length > motionState.trajectoryLength) trajectoryPoints.shift()

        if (trajectoryPoints.length > 1) {
            if (!trajGeo) {
                trajGeo = new THREE.BufferGeometry().setFromPoints(trajectoryPoints)
                trajMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.7 })
                trajectoryLine = new THREE.Line(trajGeo, trajMat)
                scene.add(trajectoryLine)
            } else {
                trajGeo.setFromPoints(trajectoryPoints)
            }
        }
    } else if (trajectoryLine) {
        scene.remove(trajectoryLine)
        trajGeo.dispose()
        trajMat.dispose()
        trajectoryLine = null
        trajGeo = null
        trajMat = null
    }
}
