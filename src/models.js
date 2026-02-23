// ─────────────────────────────────────────────────────────────────
// MODELS — loaders, NASA model catalogue, grid UI, model lifecycle
// ─────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { FBXLoader }  from 'three/addons/loaders/FBXLoader.js'
import { STLLoader }  from 'three/addons/loaders/STLLoader.js'
import { TDSLoader }  from 'three/addons/loaders/TDSLoader.js'
import { OBJLoader }  from 'three/addons/loaders/OBJLoader.js'

import { scene, camera, controls } from './staging.js'
import { hologramMaterial, storeOriginalMaterials, applyMaterialMode, materialMode, originalMaterials } from './materials.js'

// ── DOM refs ──────────────────────────────────────────────────────
const modelGrid        = document.getElementById('model-grid')
const searchInput      = document.getElementById('searchInput')
const sbModelCount     = document.getElementById('sb-model-count')
export const modelNameDisplay = document.getElementById('model-name-display')
export const loadProgress     = document.getElementById('load-progress')

export const setStatus = msg => {
    const el = document.getElementById('status')
    if (el) el.textContent = msg
    const sb = document.getElementById('sb-status')
    if (sb) sb.textContent = msg
}

// ── Loaders ───────────────────────────────────────────────────────
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

// ── Model state ───────────────────────────────────────────────────
export let customModel = null

// Per-model scene helpers — nulled on dispose
export let boundingBoxHelper    = null
export let boundingSphereHelper = null
export let localAxesHelper      = null
export let velocityArrow        = null
export let trajectoryLine       = null
export const trajectoryPoints   = []

// ── Dispose ───────────────────────────────────────────────────────
export function disposeModel() {
    if (!customModel) return
    if (boundingBoxHelper)    { scene.remove(boundingBoxHelper);    boundingBoxHelper = null }
    if (boundingSphereHelper) { scene.remove(boundingSphereHelper); boundingSphereHelper = null }
    if (trajectoryLine) {
        scene.remove(trajectoryLine)
        trajectoryLine.geometry.dispose()
        trajectoryLine.material.dispose()
        trajectoryLine = null
    }
    scene.remove(customModel)
    customModel.traverse(o => { if (o.geometry) o.geometry.dispose() })
    customModel = null
    trajectoryPoints.length = 0
    originalMaterials.clear()
}

// ── Fit model to view ─────────────────────────────────────────────
export function fitToView(obj) {
    const box    = new THREE.Box3().setFromObject(obj)
    const size   = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const max    = Math.max(size.x, size.y, size.z) || 1
    const s      = 3 / max
    obj.scale.setScalar(s)
    obj.position.sub(center.multiplyScalar(s))
}

// ── On model loaded ───────────────────────────────────────────────
export function onModelLoaded(obj) {
    disposeModel()
    customModel = obj
    scene.add(customModel)

    storeOriginalMaterials(customModel)

    customModel.traverse(c => {
        if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
    })

    fitToView(customModel)
    applyMaterialMode(materialMode, customModel)

    // Bounding box helper
    const box = new THREE.Box3().setFromObject(customModel)
    boundingBoxHelper = new THREE.Box3Helper(box, 0x00ff00)
    boundingBoxHelper.visible = false
    scene.add(boundingBoxHelper)

    // Bounding sphere helper
    const sphere = new THREE.Sphere()
    box.getBoundingSphere(sphere)
    boundingSphereHelper = new THREE.Mesh(
        new THREE.SphereGeometry(sphere.radius, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.3 })
    )
    boundingSphereHelper.position.copy(sphere.center)
    boundingSphereHelper.visible = false
    scene.add(boundingSphereHelper)

    // Local axes on the model
    localAxesHelper = new THREE.AxesHelper(2)
    localAxesHelper.visible = false
    customModel.add(localAxesHelper)

    // Velocity arrow
    velocityArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 2, 0xff0000, 0.5, 0.3
    )
    velocityArrow.visible = false
    customModel.add(velocityArrow)

    // Reset view
    camera.position.set(5, 3, 5)
    controls.target.set(0, 0, 0)
    controls.update()

    setStatus('')
    if (loadProgress) loadProgress.textContent = ''
}

// ── Load model by URL ─────────────────────────────────────────────
export function loadModel(url) {
    setStatus('Loading…')
    const ext = url.split('?')[0].split('.').pop().toLowerCase()

    const onProgress = xhr => {
        if (xhr.total) {
            const pct = Math.round(xhr.loaded / xhr.total * 100)
            setStatus(`Loading… ${pct}%`)
            if (loadProgress) loadProgress.textContent = `${pct}%`
        }
    }
    const onError = err => {
        console.error(err)
        setStatus('Failed — CORS or unsupported format')
        if (loadProgress) loadProgress.textContent = 'ERR'
    }

    if      (ext === 'glb' || ext === 'gltf') gltfLoader.load(url, d => onModelLoaded(d.scene), onProgress, onError)
    else if (ext === 'fbx') new FBXLoader().load(url, obj => onModelLoaded(obj), onProgress, onError)
    else if (ext === 'stl') new STLLoader().load(url, geo => onModelLoaded(new THREE.Mesh(geo, hologramMaterial)), onProgress, onError)
    else if (ext === '3ds') new TDSLoader().load(url, obj => onModelLoaded(obj), onProgress, onError)
    else if (ext === 'obj') new OBJLoader().load(url, obj => onModelLoaded(obj), onProgress, onError)
    else setStatus(`Unsupported format: .${ext}`)
}

// ── NASA model catalogue ──────────────────────────────────────────
const BASE_RAW = 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/'
const EXTS     = ['glb', 'gltf', 'fbx', 'stl', 'obj', '3ds']

const CURATED = [
    { name: 'Curiosity Rover',             path: 'Models/Curiosity/MSL_Rover.STL' },
    { name: 'Hubble Space Telescope',      path: 'Models/Hubble_Space_Telescope/hubble_space_telescope_2002.3ds' },
    { name: 'Mars Pathfinder Lander',      path: 'Models/Mars_Pathfinder_Lander/mars_pathfinder_lander.3ds' },
    { name: 'Voyager Spacecraft',          path: 'Models/Voyager/voyager.3ds' },
    { name: 'Cassini',                     path: 'Models/Cassini/cassini.3ds' },
    { name: 'New Horizons',                path: 'Models/New_Horizons/new_horizons.3ds' },
    { name: 'Dawn Spacecraft',             path: 'Models/Dawn/dawn.3ds' },
    { name: 'Space Shuttle',               path: 'Models/Space_Shuttle/space_shuttle.3ds' },
    { name: 'Apollo 11 Command Module',    path: 'Models/Apollo_11_Command_Module/command_module.3ds' },
    { name: 'Mars Reconnaissance Orbiter', path: 'Models/Mars_Reconnaissance_Orbiter/mars_reconnaissance_orbiter.3ds' },
    { name: 'MAVEN',                       path: 'Models/MAVEN/maven.3ds' },
    { name: 'Juno',                        path: 'Models/Juno/juno.3ds' },
]

const ICON_MAP = [
    [/rover|curiosity|msl/i,     '🤖'],
    [/shuttle|orbiter/i,         '🚀'],
    [/station|iss/i,             '🛸'],
    [/hubble|telescope/i,        '🔭'],
    [/apollo|command|module/i,   '🛸'],
    [/voyager|pioneer|new.hor/i, '🛰️'],
    [/cassini|saturn/i,          '🪐'],
    [/mars|pathfinder|maven/i,   '🔴'],
    [/juno|dawn/i,               '🌌'],
    [/lunar|moon/i,              '🌑'],
]
const getIcon = name => { for (const [re, ic] of ICON_MAP) if (re.test(name)) return ic; return '📦' }

const CAT_KEYWORDS = {
    all:        null,
    spacecraft: /shuttle|voyager|cassini|dawn|juno|pioneer|new.hor|maven|orbiter|spacecraft|probe/i,
    rovers:     /rover|curiosity|msl|opportunity|spirit|perseverance/i,
    stations:   /station|iss|gateway/i,
    telescopes: /hubble|telescope|webb/i,
}

let allModels      = []
let activeCategory = 'all'
let searchQuery    = ''
let selectedCard   = null

function renderGrid() {
    if (!modelGrid) return
    modelGrid.innerHTML = ''
    const filtered = allModels.filter(m => {
        const n  = m.name.toLowerCase()
        const re = CAT_KEYWORDS[activeCategory]
        if (re && !re.test(n)) return false
        if (searchQuery && !n.includes(searchQuery)) return false
        return true
    })
    if (!filtered.length) {
        modelGrid.innerHTML = '<div class="grid-loading"><div style="color:var(--text-dim);font-size:11px">No models match</div></div>'
        return
    }
    filtered.forEach(m => {
        const ext  = m.path.split('.').pop().toUpperCase()
        const card = document.createElement('div')
        card.className = 'model-card'
        card.innerHTML = `
            <div class="model-icon">${getIcon(m.name)}</div>
            <div class="model-label">${m.name.replace(/\.[^.]+$/, '')}</div>
            <div class="model-ext">${ext}</div>
        `
        card.addEventListener('click', () => {
            if (selectedCard) selectedCard.classList.remove('selected')
            card.classList.add('selected')
            selectedCard = card
            if (modelNameDisplay) modelNameDisplay.textContent = m.name.replace(/\.[^.]+$/, '').toUpperCase()
            loadModel(BASE_RAW + m.path)
        })
        modelGrid.appendChild(card)
    })
}

function populateGrid(models) {
    allModels = models
    if (sbModelCount) sbModelCount.textContent = `${models.length} models`
    renderGrid()
}

if (searchInput) {
    searchInput.addEventListener('input', e => {
        searchQuery = e.target.value.toLowerCase().trim()
        renderGrid()
    })
}

document.querySelectorAll('.ctab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        activeCategory = btn.dataset.cat
        renderGrid()
    })
})

export async function fetchNASAModels() {
    if (modelGrid) modelGrid.innerHTML = '<div class="grid-loading"><div class="spinner"></div><div id="status">Fetching models…</div></div>'
    try {
        const bRes = await fetch('https://api.github.com/repos/nasa/NASA-3D-Resources/branches/master', { headers: { Accept: 'application/vnd.github+json' } })
        if (!bRes.ok) throw new Error(`Branch API ${bRes.status}`)
        const { commit: { commit: { tree: { sha } } } } = await bRes.json()

        const tRes = await fetch(`https://api.github.com/repos/nasa/NASA-3D-Resources/git/trees/${sha}?recursive=1`, { headers: { Accept: 'application/vnd.github+json' } })
        if (!tRes.ok) throw new Error(`Tree API ${tRes.status}`)
        const tData = await tRes.json()

        const models = (tData.tree || [])
            .filter(f => f.type === 'blob' && EXTS.some(e => f.path.toLowerCase().endsWith('.' + e)))
            .map(f => ({ name: f.path.split('/').pop(), path: f.path }))

        if (!models.length) throw new Error('empty')
        populateGrid(models)
        if (tData.truncated) setStatus(`${models.length} models (truncated)`)
    } catch (err) {
        console.warn('GitHub API:', err.message)
        populateGrid(CURATED)
        setStatus('Showing curated list')
    }
}
