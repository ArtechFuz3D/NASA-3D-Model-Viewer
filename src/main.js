import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader }   from 'three/addons/loaders/DRACOLoader.js'
import { FBXLoader }     from 'three/addons/loaders/FBXLoader.js'
import { STLLoader }     from 'three/addons/loaders/STLLoader.js'
import { TDSLoader }     from 'three/addons/loaders/TDSLoader.js'
import { OBJLoader }     from 'three/addons/loaders/OBJLoader.js'
import { RGBELoader }    from 'three/addons/loaders/RGBELoader.js'

import hologramVertShader from './shaders/vert.glsl'
import hologramFragShader from './shaders/frag.glsl'

// ─────────────────────────────────────────
// RENDERER / SCENE / CAMERA
// ─────────────────────────────────────────
const canvas   = document.querySelector('canvas.webgl')
const scene    = new THREE.Scene()
const sizes    = { width: window.innerWidth, height: window.innerHeight }

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setClearColor('#0a0e1a')
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type    = THREE.PCFSoftShadowMap

const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.01, 1000)
camera.position.set(5, 3, 5)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping      = true
controls.dampingFactor      = 0.05
controls.rotateSpeed        = 0.7
controls.zoomSpeed          = 1.0
controls.panSpeed           = 0.8
controls.minDistance        = 0.5
controls.maxDistance        = 100
controls.screenSpacePanning = true

window.addEventListener('resize', () => {
    sizes.width  = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// ─────────────────────────────────────────
// LIGHTING RIG
// ─────────────────────────────────────────

// Ambient — base fill so nothing goes pure black
const ambientLight = new THREE.AmbientLight(0xffffff, 0.25)
scene.add(ambientLight)

// Key light — warm sun, casts shadows
const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.2)
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

// Fill light — soft blue bounce from opposite side
const fillLight = new THREE.DirectionalLight(0x8090ff, 0.4)
fillLight.position.set(-5, 3, -5)
scene.add(fillLight)

// Rim light — cold edge highlight from behind/below
const rimLight = new THREE.DirectionalLight(0xc0e8ff, 0.6)
rimLight.position.set(0, -3, -8)
scene.add(rimLight)

// Point light — warm accent, off by default
const pointLight = new THREE.PointLight(0xff8844, 1.5, 20)
pointLight.position.set(3, 2, 3)
pointLight.visible = false
scene.add(pointLight)

// Spot light — focused top-down beam, off by default
const spotLight = new THREE.SpotLight(0xffffff, 2.0, 30, Math.PI / 8, 0.3)
spotLight.position.set(0, 10, 0)
spotLight.target.position.set(0, 0, 0)
spotLight.visible = false
scene.add(spotLight)
scene.add(spotLight.target)

// ─────────────────────────────────────────
// BACKGROUND SYSTEM
//
// Two fully independent axes:
//   hdriLighting  — whether HDRI drives scene.environment (IBL/reflections)
//   bgSource      — what fills the background: 'solid' | 'hdri' | 'earth'
//
// All 6 combinations are valid, e.g.:
//   HDRI lighting ON  + solid color background
//   HDRI lighting ON  + earth image background
//   HDRI lighting OFF + HDRI texture background (decorative only)
//   HDRI lighting OFF + earth background
// ─────────────────────────────────────────

let hdriTexture = null
let hdriLoaded  = false

const earthLayer   = document.getElementById('earth-bg')
const planetIframe = document.getElementById('planet-iframe')

// State — two independent controls
const envState = {
    hdriLighting: false,   // HDRI → scene.environment (IBL)
    bgSource:     'solid', // 'solid' | 'hdri' | 'earth' | 'planet'
    solidColor:   '#0a0e1a',
}

// Single function that re-applies everything from current state
let iframeReady = false
function ensurePlanetIframe(cb) {
    if (iframeReady) { cb?.(); return }
    planetIframe.src = './planet-shader.html'
    planetIframe.onload = () => { iframeReady = true; cb?.() }
}

function pausePlanet()  { if (iframeReady && planetIframe.contentWindow) planetIframe.contentWindow.postMessage({ type: 'planetConfig', paused: true  }, '*') }
function resumePlanet() { if (iframeReady && planetIframe.contentWindow) planetIframe.contentWindow.postMessage({ type: 'planetConfig', paused: false }, '*') }

function applyEnvironment() {
    // 1. HDRI lighting (environment map for reflections/IBL)
    scene.environment = (envState.hdriLighting && hdriTexture)
        ? hdriTexture
        : null

    // 2. Background source — fully independent
    if (earthLayer)   earthLayer.style.opacity   = '0'
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

// Load HDRI lazily, then re-apply environment
const HDRI_URL = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/golden_gate_hills_2k.hdr'

function ensureHDRI(onReady) {
    if (hdriLoaded) { onReady(); return }
    setStatus('Loading HDRI…')
    new RGBELoader().load(
        HDRI_URL,
        tex => {
            tex.mapping = THREE.EquirectangularReflectionMapping
            hdriTexture = tex
            hdriLoaded  = true
            setStatus('')
            onReady()
        },
        undefined,
        err => {
            console.warn('HDRI failed:', err)
            setStatus('HDRI unavailable')
        }
    )
}

// ─────────────────────────────────────────
// SCENE HELPERS
// ─────────────────────────────────────────
const gridHelper = new THREE.GridHelper(10, 20, '#444444', '#222222')
gridHelper.visible = true
scene.add(gridHelper)

// Single origin axes — the only one, toggled by GUI
const axesHelper = new THREE.AxesHelper(5)
axesHelper.visible = true
scene.add(axesHelper)

// Per-model helpers — created on load, nulled on dispose
let boundingBoxHelper    = null
let boundingSphereHelper = null
let localAxesHelper      = null
let velocityArrow        = null
let trajectoryLine       = null
const trajectoryPoints   = []

// ─────────────────────────────────────────
// MATERIALS
// ─────────────────────────────────────────
const hologramMaterial = new THREE.ShaderMaterial({
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

const wireframeMaterial = new THREE.MeshBasicMaterial({
    color:     0x70c1ff,
    wireframe: true
})

const clayMaterial = new THREE.MeshStandardMaterial({
    color:     0xc8b89a,
    roughness: 0.85,
    metalness: 0.0
})

// materialMode tracks what's currently applied so toolbar/GUI stay in sync
let materialMode = 'hologram'
// Stores each mesh's original material keyed by uuid
const originalMaterials = new Map()

function storeOriginalMaterials(root) {
    originalMaterials.clear()
    root.traverse(c => {
        if (!c.isMesh) return
        originalMaterials.set(c.uuid, Array.isArray(c.material) ? c.material[0] : c.material)
    })
}

function applyMaterialMode(mode) {
    materialMode = mode
    if (!customModel) return
    customModel.traverse(c => {
        if (!c.isMesh) return
        switch (mode) {
            case 'hologram':
                c.material = hologramMaterial
                break
            case 'original':
                c.material = originalMaterials.get(c.uuid) || hologramMaterial
                break
            case 'wireframe':
                c.material = wireframeMaterial
                break
            case 'clay':
                c.material = clayMaterial
                break
        }
    })
    // Keep seg buttons in sync
    document.querySelectorAll('#mat-mode-seg .seg-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === mode)
    })
}

// ─────────────────────────────────────────
// LOADERS
// ─────────────────────────────────────────
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

// ─────────────────────────────────────────
// MODEL MANAGEMENT
// ─────────────────────────────────────────
let customModel = null

// DOM refs
const modelGrid        = document.getElementById('model-grid')
const searchInput      = document.getElementById('searchInput')
const sbStatus         = document.getElementById('sb-status')
const sbModelCount     = document.getElementById('sb-model-count')
const modelNameDisplay = document.getElementById('model-name-display')
const loadProgress     = document.getElementById('load-progress')
const fpsValue         = document.getElementById('fps-value')

const setStatus = msg => {
    const el = document.getElementById('status')
    if (el) el.textContent = msg
    if (sbStatus) sbStatus.textContent = msg
}

function disposeModel() {
    if (!customModel) return
    if (boundingBoxHelper)    { scene.remove(boundingBoxHelper);    boundingBoxHelper = null }
    if (boundingSphereHelper) { scene.remove(boundingSphereHelper); boundingSphereHelper = null }
    if (trajectoryLine)       { scene.remove(trajectoryLine); trajectoryLine.geometry.dispose(); trajectoryLine.material.dispose(); trajectoryLine = null }
    scene.remove(customModel)
    customModel.traverse(o => { if (o.geometry) o.geometry.dispose() })
    customModel = null
    trajectoryPoints.length = 0
    originalMaterials.clear()
}

function fitToView(obj) {
    const box    = new THREE.Box3().setFromObject(obj)
    const size   = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const max    = Math.max(size.x, size.y, size.z) || 1
    const s      = 3 / max
    obj.scale.setScalar(s)
    obj.position.sub(center.multiplyScalar(s))
}

function onModelLoaded(obj) {
    disposeModel()
    customModel = obj
    scene.add(customModel)

    // Capture originals BEFORE applying any override
    storeOriginalMaterials(customModel)

    // Set shadow flags on all meshes
    customModel.traverse(c => {
        if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
    })

    fitToView(customModel)

    // Apply the currently selected material mode
    applyMaterialMode(materialMode)

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
    velocityArrow = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), 2, 0xff0000, 0.5, 0.3)
    velocityArrow.visible = false
    customModel.add(velocityArrow)

    // Reset view
    camera.position.set(5, 3, 5)
    controls.target.set(0, 0, 0)
    controls.update()

    setStatus('')
    if (loadProgress) loadProgress.textContent = ''
}

function loadModel(url) {
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
    else if (ext === 'fbx')  new FBXLoader().load(url, obj => onModelLoaded(obj), onProgress, onError)
    else if (ext === 'stl')  new STLLoader().load(url, geo => onModelLoaded(new THREE.Mesh(geo, hologramMaterial)), onProgress, onError)
    else if (ext === '3ds')  new TDSLoader().load(url, obj => onModelLoaded(obj), onProgress, onError)
    else if (ext === 'obj')  new OBJLoader().load(url, obj => onModelLoaded(obj), onProgress, onError)
    else setStatus(`Unsupported format: .${ext}`)
}

// ─────────────────────────────────────────
// NASA MODEL LIST + GRID UI
// ─────────────────────────────────────────
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
        const n = m.name.toLowerCase()
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

async function fetchNASAModels() {
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

fetchNASAModels()

// ─────────────────────────────────────────
// TOOLBAR BUTTONS
// ─────────────────────────────────────────
const wire = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn) }

wire('btn-top',   () => { camera.position.set(0, 15, 0);  controls.target.set(0,0,0); controls.update() })
wire('btn-front', () => { camera.position.set(0, 0, 15);  controls.target.set(0,0,0); controls.update() })
wire('btn-side',  () => { camera.position.set(15, 0, 0);  controls.target.set(0,0,0); controls.update() })
wire('btn-iso',   () => { camera.position.set(5, 3, 5);   controls.target.set(0,0,0); controls.update() })
wire('btn-reset', () => { camera.position.set(5, 3, 5);   controls.target.set(0,0,0); controls.update() })

wire('btn-wireframe', () => {
    const next = materialMode === 'wireframe' ? 'hologram' : 'wireframe'
    applyMaterialMode(next)
    document.getElementById('btn-wireframe').classList.toggle('active', next === 'wireframe')
})
wire('btn-hologram', () => {
    const next = materialMode === 'hologram' ? 'original' : 'hologram'
    applyMaterialMode(next)
    document.getElementById('btn-hologram').classList.toggle('active-accent', next === 'hologram')
})
wire('btn-autorotate', () => {
    controls.autoRotate = !controls.autoRotate
    document.getElementById('btn-autorotate').classList.toggle('active', controls.autoRotate)
})

// ─────────────────────────────────────────
// PLANET SCENE PANEL
// ─────────────────────────────────────────
const planetPanel  = document.getElementById('planet-panel')
const menuViewBtn  = document.getElementById('menu-view')
const panelClose   = document.getElementById('planet-panel-close')

function sendPlanet(msg) {
    // postMessage into the iframe — only works when iframe is loaded
    if (planetIframe && planetIframe.contentWindow) {
        planetIframe.contentWindow.postMessage({ type: 'planetConfig', ...msg }, '*')
    }
}

function openPlanetPanel()  {
    if (!planetPanel) return
    planetPanel.classList.add('open')
    planetPanel.setAttribute('aria-hidden', 'false')
    if (menuViewBtn) menuViewBtn.classList.add('active')
    if (viewport) viewport.classList.add('planet-orbit-mode')
    controls.enabled = false
}
function closePlanetPanel() {
    if (!planetPanel) return
    planetPanel.classList.remove('open')
    planetPanel.setAttribute('aria-hidden', 'true')
    if (menuViewBtn) menuViewBtn.classList.remove('active')
    if (viewport) viewport.classList.remove('planet-orbit-mode')
    controls.enabled = true
    pfwd.active = false
}

if (menuViewBtn) {
    menuViewBtn.addEventListener('click', () => {
        const isOpen = planetPanel && planetPanel.classList.contains('open')
        isOpen ? closePlanetPanel() : openPlanetPanel()
    })
}
if (panelClose) panelClose.addEventListener('click', closePlanetPanel)

// Close on Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePlanetPanel()
})

// ── Planet orbit forwarding ──────────────────────────────
// When the panel is open, pointer events on the VIEWPORT
// (outside the panel inner box) are forwarded as orbit deltas
// to the planet shader iframe. OrbitControls is suspended.
let pfwd = { active: false, btn: -1, ctrl: false, lx: 0, ly: 0 }

const viewport = document.getElementById('viewport')

function isPlanetPanelOpen() {
    return planetPanel && planetPanel.classList.contains('open')
}

function pfwdDown(e) {
    if (!isPlanetPanelOpen()) return   // panel closed — do nothing, let OrbitControls have it
    const inner = document.getElementById('planet-panel-inner')
    if (inner && inner.contains(e.target)) return  // click inside panel UI — don't steal it
    // Panel is open and click is on viewport — take control
    e.preventDefault()
    e.stopPropagation()
    pfwd.active = true
    pfwd.btn    = e.button ?? 0
    pfwd.ctrl   = e.ctrlKey
    pfwd.lx     = e.clientX
    pfwd.ly     = e.clientY
}
function pfwdMove(e) {
    if (!pfwd.active) return
    const dx = e.clientX - pfwd.lx
    const dy = e.clientY - pfwd.ly
    pfwd.lx = e.clientX
    pfwd.ly = e.clientY
    if (pfwd.ctrl || e.ctrlKey) {
        sendPlanet({ dPanX: dx * .004, dPanY: -dy * .004 })
    } else if (pfwd.btn === 0) {
        sendPlanet({ dRotY: dx * .004, dRotX: dy * .004 })
    } else if (pfwd.btn === 2) {
        sendPlanet({ dSunX: dx * .005, dSunY: dy * .005 })
    }
}
function pfwdUp() { pfwd.active = false; pfwd.ctrl = false }
function pfwdWheel(e) {
    if (!isPlanetPanelOpen()) return
    const inner = document.getElementById('planet-panel-inner')
    if (inner && inner.contains(e.target)) return
    e.preventDefault()
    sendPlanet({ dZoom: -e.deltaY * .001 })
}

// All pfwd listeners use capture so they run before OrbitControls,
// but only act when isPlanetPanelOpen() — otherwise pass through untouched
viewport.addEventListener('mousedown',  pfwdDown,  { capture: true })
window.addEventListener ('mousemove',   pfwdMove)
window.addEventListener ('mouseup',     pfwdUp)
// Non-passive so we can preventDefault inside pfwdWheel
viewport.addEventListener('wheel', pfwdWheel, { passive: false, capture: true })
viewport.addEventListener('contextmenu', e => { if (isPlanetPanelOpen()) e.preventDefault() }, { capture: true })

// Planet preset buttons — send planet index to iframe
document.querySelectorAll('.pp-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.pp-preset').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        sendPlanet({ planet: parseInt(btn.dataset.planet) })
    })
})

// Toggle switches — send flag + value to iframe
document.querySelectorAll('.pp-tog').forEach(tog => {
    tog.addEventListener('click', () => {
        tog.classList.toggle('on')
        sendPlanet({ flag: tog.dataset.flag, value: tog.classList.contains('on') })
    })
})
// ─────────────────────────────────────────
// RIGHT PANEL — DOM WIRING
// ─────────────────────────────────────────

// ── Panel collapse / tab switching ──
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

// Help menu button → open Help pane in right panel
document.getElementById('menu-help')?.addEventListener('click', () => {
    document.querySelectorAll('.rp-tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.rp-pane').forEach(p => p.classList.remove('active'))
    document.querySelector('.rp-tab[data-pane="help"]')?.classList.add('active')
    document.querySelector('.rp-pane[data-pane="help"]')?.classList.add('active')
    rightPanel?.classList.remove('rp-collapsed')
})

// File menu dropdown
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

// Export settings JSON
document.getElementById('dd-export-settings')?.addEventListener('click', () => {
    fileDropdown?.classList.remove('open')
    const exportData = {
        meta: { app: 'NASA Hologram Viewer', version: '1.0', exportedAt: new Date().toISOString() },
        model: { name: document.getElementById('model-name-display')?.textContent ?? 'none' },
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
    a.download = `hologram-settings-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
})

// ── Helpers ──
const tog = (id, onFn, offFn, startOn) => {
    const el = document.getElementById(id)
    if (!el) return
    if (startOn) el.classList.add('on')
    el.addEventListener('click', () => {
        el.classList.toggle('on')
        el.classList.contains('on') ? onFn() : offFn()
    })
    return el
}
const slider = (id, fn) => {
    const el = document.getElementById(id)
    const valEl = document.getElementById(id + '-val')
    if (!el) return
    el.addEventListener('input', () => {
        const v = parseFloat(el.value)
        if (valEl) valEl.textContent = v.toFixed(v % 1 === 0 ? 0 : 2)
        fn(v)
    })
    return el
}
const seg = (containerId, fn) => {
    document.querySelectorAll(`#${containerId} .seg-btn`).forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll(`#${containerId} .seg-btn`).forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            fn(btn.dataset.val)
        })
    })
}

// ── VISUALIZATION ──
const matModeParam = { mode: 'hologram' }
seg('mat-mode-seg', v => applyMaterialMode(v))

document.getElementById('holo-color')?.addEventListener('input', e => {
    hologramMaterial.uniforms.uColor.value.set(e.target.value)
})
slider('aberration', v => { hologramMaterial.uniforms.uAberrationStrength.value = v })

tog('tog-grid',  () => { gridHelper.visible = true  }, () => { gridHelper.visible = false  }, true)
tog('tog-axes',  () => { axesHelper.visible = true  }, () => { axesHelper.visible = false  }, true)
tog('tog-bbox',  () => { if (boundingBoxHelper)  boundingBoxHelper.visible  = true  }, () => { if (boundingBoxHelper)  boundingBoxHelper.visible  = false })
tog('tog-laxes', () => { if (localAxesHelper)    localAxesHelper.visible    = true  }, () => { if (localAxesHelper)    localAxesHelper.visible    = false })

// ── LIGHTING ──
slider('amb-int',    v => { ambientLight.intensity = v })
tog('tog-key',  () => { keyLight.visible  = true }, () => { keyLight.visible  = false }, true)
document.getElementById('key-color')?.addEventListener('input',  e => keyLight.color.set(e.target.value))
slider('key-int',    v => { keyLight.intensity  = v })
tog('tog-fill', () => { fillLight.visible = true }, () => { fillLight.visible = false }, true)
document.getElementById('fill-color')?.addEventListener('input', e => fillLight.color.set(e.target.value))
slider('fill-int',   v => { fillLight.intensity = v })
tog('tog-rim',  () => { rimLight.visible  = true }, () => { rimLight.visible  = false }, true)
document.getElementById('rim-color')?.addEventListener('input',  e => rimLight.color.set(e.target.value))
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

// ── BACKGROUND ──
document.querySelectorAll('.bg-tile').forEach(tile => {
    tile.addEventListener('click', () => {
        document.querySelectorAll('.bg-tile').forEach(t => t.classList.remove('active'))
        tile.classList.add('active')
        envState.bgSource = tile.dataset.bg
        document.getElementById('solid-color-row').style.display = envState.bgSource === 'solid' ? '' : 'none'
        const needsHDRI = envState.bgSource === 'hdri' && !hdriLoaded
        needsHDRI ? ensureHDRI(() => applyEnvironment()) : applyEnvironment()
    })
})
document.getElementById('bg-solid-color')?.addEventListener('input', e => {
    envState.solidColor = e.target.value
    if (envState.bgSource === 'solid') applyEnvironment()
})
tog('tog-hdri', () => {
    envState.hdriLighting = true
    if (!hdriLoaded) ensureHDRI(() => applyEnvironment()); else applyEnvironment()
}, () => { envState.hdriLighting = false; applyEnvironment() })

// ── MOTION ──
const motionState = {
    enabled: false, type: 'none',
    wx: 0, wy: 0.5, wz: 0,
    vx: 0, vy: 0,   vz: 0,
    circularRadius: 3, circularSpeed: 1, circularAxis: 'xz',
    showTrajectory: false, trajectoryLength: 300,
    clearTrajectory: () => {
        trajectoryPoints.length = 0
        if (trajectoryLine) {
            scene.remove(trajectoryLine)
            trajectoryLine.geometry.dispose()
            trajectoryLine.material.dispose()
            trajectoryLine = null
        }
    }
}
tog('tog-motion', () => { motionState.enabled = true }, () => { motionState.enabled = false })
seg('motion-type-seg', v => { motionState.type = v })

slider('wx', v => { motionState.wx = v })
slider('wy', v => { motionState.wy = v })
slider('wz', v => { motionState.wz = v })
slider('vx', v => { motionState.vx = v })
slider('vy', v => { motionState.vy = v })
slider('vz', v => { motionState.vz = v })
slider('circ-r',   v => { motionState.circularRadius = v })
slider('circ-spd', v => { motionState.circularSpeed  = v })
document.getElementById('circ-axis')?.addEventListener('change', e => { motionState.circularAxis = e.target.value })

tog('tog-traj', () => { motionState.showTrajectory = true }, () => { motionState.showTrajectory = false })
slider('traj-len', v => { motionState.trajectoryLength = v })
document.getElementById('btn-clear-traj')?.addEventListener('click', () => motionState.clearTrajectory())

// ── CAMERA ──
const fovParam = { fov: 45 }
slider('cam-fov', v => { fovParam.fov = v; camera.fov = v; camera.updateProjectionMatrix() })
tog('tog-autorot', () => { controls.autoRotate = true }, () => { controls.autoRotate = false })
slider('rot-spd', v => { controls.autoRotateSpeed = v })

// ── SIMULATION ──
const simState = { running: true, timeScale: 1.0, currentTime: 0 }
tog('tog-sim-run', () => { simState.running = true }, () => { simState.running = false }, true)
slider('sim-scale', v => { simState.timeScale = v })
document.getElementById('btn-sim-reset')?.addEventListener('click', () => {
    simState.currentTime = 0
    if (customModel) { customModel.position.set(0,0,0); customModel.rotation.set(0,0,0) }
    motionState.clearTrajectory()
})

// ── PERFORMANCE (updated in tick loop) ──
const perfState = { fps: 0, frameMs: 0, renderMs: 0, memMB: 0 }
const perfFpsEl    = document.getElementById('perf-fps')
const perfFrameEl  = document.getElementById('perf-frame')
const perfRenderEl = document.getElementById('perf-render')
const perfMemEl    = document.getElementById('perf-mem')
const simTimeEl    = document.getElementById('sim-time-display')


// ─────────────────────────────────────────
// ANIMATION LOOP
// ─────────────────────────────────────────
// Single time source via performance.now() — avoids the
// getElapsedTime()/getDelta() ordering bug in THREE.Clock
let frameCount = 0
let fpsTimer   = 0
let lastTime   = performance.now()
let elapsed    = 0

// Reusable trajectory geometry — update buffer in place instead of creating new Line each frame
let trajGeo = null
let trajMat = null

const tick = () => {
    const now   = performance.now()
    const delta = Math.min((now - lastTime) / 1000, 0.05)
    lastTime    = now
    elapsed    += delta

    // FPS + perf
    frameCount++
    if (elapsed - fpsTimer > 0.5) {
        const dt = elapsed - fpsTimer
        perfState.fps     = Math.round(frameCount / dt)
        perfState.frameMs = ((dt / frameCount) * 1000).toFixed(1)
        if (fpsValue)      fpsValue.textContent      = perfState.fps
        if (perfFpsEl)     perfFpsEl.textContent     = perfState.fps
        if (perfFrameEl)   perfFrameEl.textContent   = perfState.frameMs
        frameCount = 0
        fpsTimer   = elapsed
    }
    if (simTimeEl) simTimeEl.textContent = simState.currentTime.toFixed(2) + ' s'

    // Hologram shader time
    hologramMaterial.uniforms.uTime.value = elapsed

    // Simulation clock
    if (simState.running) simState.currentTime += delta * simState.timeScale

    // ── Motion ──
    if (customModel && motionState.enabled && motionState.type !== 'none') {
        const t = elapsed // use raw elapsed so circular motion is frame-rate independent

        if (motionState.type === 'rotation') {
            customModel.rotation.x += motionState.wx * delta
            customModel.rotation.y += motionState.wy * delta
            customModel.rotation.z += motionState.wz * delta

        } else if (motionState.type === 'linear') {
            customModel.position.x += motionState.vx * delta
            customModel.position.y += motionState.vy * delta
            customModel.position.z += motionState.vz * delta

        } else if (motionState.type === 'circular') {
            const angle = t * motionState.circularSpeed * Math.PI * 2
            const r     = motionState.circularRadius
            if (motionState.circularAxis === 'xz') {
                customModel.position.x = Math.cos(angle) * r
                customModel.position.z = Math.sin(angle) * r
            } else if (motionState.circularAxis === 'xy') {
                customModel.position.x = Math.cos(angle) * r
                customModel.position.y = Math.sin(angle) * r
            } else { // yz
                customModel.position.y = Math.cos(angle) * r
                customModel.position.z = Math.sin(angle) * r
            }
        }
    }

    // ── Trajectory ──
    if (customModel && motionState.showTrajectory) {
        trajectoryPoints.push(customModel.position.clone())
        if (trajectoryPoints.length > motionState.trajectoryLength) trajectoryPoints.shift()

        if (trajectoryPoints.length > 1) {
            if (!trajGeo) {
                // First time — create line
                trajGeo = new THREE.BufferGeometry().setFromPoints(trajectoryPoints)
                trajMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.7 })
                trajectoryLine = new THREE.Line(trajGeo, trajMat)
                scene.add(trajectoryLine)
            } else {
                // Update geometry in place — much cheaper than creating a new Line every frame
                trajGeo.setFromPoints(trajectoryPoints)
            }
        }
    } else if (trajectoryLine && !motionState.showTrajectory) {
        scene.remove(trajectoryLine)
        trajGeo.dispose()
        trajMat.dispose()
        trajectoryLine = null
        trajGeo = null
        trajMat = null
    }

    // Bounding box update
    if (boundingBoxHelper && boundingBoxHelper.visible && customModel) {
        boundingBoxHelper.box.setFromObject(customModel)
    }

    controls.update()

    const t0 = performance.now()
    renderer.render(scene, camera)
    perfState.renderMs = (performance.now() - t0).toFixed(2)
    if (perfRenderEl) perfRenderEl.textContent = perfState.renderMs
    if (performance.memory) {
        perfState.memMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1)
        if (perfMemEl) perfMemEl.textContent = perfState.memMB
    }

    window.requestAnimationFrame(tick)
}

tick()