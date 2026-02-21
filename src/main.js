import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader }   from 'three/addons/loaders/DRACOLoader.js'
import { FBXLoader }     from 'three/addons/loaders/FBXLoader.js'
import { STLLoader }     from 'three/addons/loaders/STLLoader.js'
import { TDSLoader }     from 'three/addons/loaders/TDSLoader.js'
import { OBJLoader }     from 'three/addons/loaders/OBJLoader.js'
import { RGBELoader }    from 'three/addons/loaders/RGBELoader.js'
import GUI from 'lil-gui'

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
// 3 modes: 'solid' | 'hdri' | 'earth'
// ─────────────────────────────────────────
let bgMode        = 'solid'
let hdriTexture   = null   // loaded RGBELoader result
let hdriLoaded    = false

// The CSS earth layer sits behind the canvas (set in style.css)
const earthLayer = document.getElementById('earth-bg')

// HDRI state — mirrors Blender's two independent toggles
const hdriState = {
    showBackground:  true,   // HDRI visible as scene background
    affectsLighting: true,   // HDRI used as environment map for lighting
}

function applyBgMode(mode) {
    bgMode = mode

    // Always hide earth layer first
    if (earthLayer) earthLayer.style.opacity = '0'

    // Reset Three.js bg/env
    scene.background  = null
    scene.environment = null
    renderer.setClearColor('#0a0e1a', 1)

    if (mode === 'solid') {
        // handled by renderer clearColor — nothing else needed
    } else if (mode === 'hdri') {
        applyHDRI()
    } else if (mode === 'earth') {
        renderer.setClearColor('#000000', 0) // transparent so CSS layer shows
        if (earthLayer) earthLayer.style.opacity = '1'
    }
}

function applyHDRI() {
    if (!hdriTexture) return

    if (hdriState.showBackground) {
        scene.background = hdriTexture
    } else {
        scene.background = null
        renderer.setClearColor('#0a0e1a', 1)
    }

    scene.environment = hdriState.affectsLighting ? hdriTexture : null
}

// Load HDRI lazily on first request (Polyhaven space-themed HDR)
// Using 'moonlit_golf' — a dark night sky HDR, good for space scenes
const HDRI_URL = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/moonlit_golf_1k.hdr'

function loadHDRI(onDone) {
    if (hdriLoaded) { onDone?.(); return }
    setStatus('Loading HDRI…')
    new RGBELoader().load(
        HDRI_URL,
        tex => {
            tex.mapping = THREE.EquirectangularReflectionMapping
            hdriTexture = tex
            hdriLoaded  = true
            setStatus('')
            onDone?.()
        },
        undefined,
        err => {
            console.warn('HDRI load failed:', err)
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
    // Keep GUI dropdown in sync
    if (matModeParam) matModeParam.mode = mode
    gui.controllersRecursive().forEach(c => c.updateDisplay())
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
// GUI
// ─────────────────────────────────────────
const gui = new GUI({ width: 280 })
gui.title('Hologram Viewer')

// — Visualization —
const matModeParam = { mode: 'hologram' }
const visFolder = gui.addFolder('👁️ Visualization')
visFolder.add(matModeParam, 'mode', ['hologram', 'original', 'wireframe', 'clay'])
    .name('Material').onChange(v => applyMaterialMode(v))
visFolder.addColor({ color: '#70c1ff' }, 'color').name('Hologram Color')
    .onChange(v => hologramMaterial.uniforms.uColor.value.set(v))
visFolder.add(hologramMaterial.uniforms.uAberrationStrength, 'value').min(0).max(10).step(0.1).name('Aberration')
visFolder.add({ bb: false }, 'bb').name('Bounding Box')
    .onChange(v => { if (boundingBoxHelper) boundingBoxHelper.visible = v })
visFolder.add({ la: false }, 'la').name('Local Axes')
    .onChange(v => { if (localAxesHelper) localAxesHelper.visible = v })
visFolder.add(gridHelper, 'visible').name('Grid')
visFolder.add(axesHelper, 'visible').name('Origin Axes')
visFolder.open()

// — Lighting —
const lightFolder = gui.addFolder('💡 Lighting')
lightFolder.add(ambientLight, 'intensity').min(0).max(2).step(0.05).name('Ambient')
lightFolder.addColor({ c: '#fff4e0' }, 'c').name('Key Color')
    .onChange(v => keyLight.color.set(v))
lightFolder.add(keyLight, 'intensity').min(0).max(4).step(0.05).name('Key Intensity')
lightFolder.add(keyLight, 'visible').name('Key Light')
lightFolder.addColor({ c: '#8090ff' }, 'c').name('Fill Color')
    .onChange(v => fillLight.color.set(v))
lightFolder.add(fillLight, 'intensity').min(0).max(2).step(0.05).name('Fill Intensity')
lightFolder.add(fillLight, 'visible').name('Fill Light')
lightFolder.addColor({ c: '#c0e8ff' }, 'c').name('Rim Color')
    .onChange(v => rimLight.color.set(v))
lightFolder.add(rimLight, 'intensity').min(0).max(2).step(0.05).name('Rim Intensity')
lightFolder.add(rimLight, 'visible').name('Rim Light')
// Point light
lightFolder.add(pointLight, 'visible').name('Point Light')
lightFolder.addColor({ c: '#ff8844' }, 'c').name('Point Color')
    .onChange(v => pointLight.color.set(v))
lightFolder.add(pointLight, 'intensity').min(0).max(5).step(0.1).name('Point Intensity')
lightFolder.add(pointLight.position, 'x').min(-10).max(10).step(0.1).name('Point X')
lightFolder.add(pointLight.position, 'y').min(-10).max(10).step(0.1).name('Point Y')
lightFolder.add(pointLight.position, 'z').min(-10).max(10).step(0.1).name('Point Z')
// Spot light
lightFolder.add(spotLight, 'visible').name('Spot Light')
lightFolder.add(spotLight, 'intensity').min(0).max(8).step(0.1).name('Spot Intensity')
lightFolder.add(spotLight, 'angle').min(0.05).max(Math.PI / 2).step(0.01).name('Spot Angle')
lightFolder.add(spotLight, 'penumbra').min(0).max(1).step(0.01).name('Spot Penumbra')

// — Background —
const bgParam = { mode: 'solid', solidColor: '#0a0e1a' }
const bgFolder = gui.addFolder('🌌 Background')
bgFolder.add(bgParam, 'mode', ['solid', 'hdri', 'earth']).name('Mode')
    .onChange(v => {
        if (v === 'hdri' && !hdriLoaded) {
            loadHDRI(() => applyBgMode('hdri'))
        } else {
            applyBgMode(v)
        }
    })
bgFolder.addColor(bgParam, 'solidColor').name('Solid Color')
    .onChange(v => { if (bgMode === 'solid') renderer.setClearColor(v, 1) })
// HDRI-specific toggles (mirrors Blender viewport shading)
bgFolder.add(hdriState, 'showBackground').name('HDRI Visible')
    .onChange(() => { if (bgMode === 'hdri') applyHDRI() })
bgFolder.add(hdriState, 'affectsLighting').name('HDRI Lighting')
    .onChange(() => { if (bgMode === 'hdri') applyHDRI() })
bgFolder.open()

// — Motion —
const motionState = {
    enabled: false,
    type: 'none',
    wx: 0, wy: 0, wz: 0,
    vx: 0, vy: 0, vz: 0,
    showTrajectory: false,
    trajectoryLength: 200,
}
const motFolder = gui.addFolder('🎮 Motion')
motFolder.add(motionState, 'enabled').name('Enable')
motFolder.add(motionState, 'type', ['none', 'rotation', 'linear', 'circular']).name('Type')
motFolder.add(motionState, 'wx').min(-5).max(5).step(0.01).name('ω X (rad/s)')
motFolder.add(motionState, 'wy').min(-5).max(5).step(0.01).name('ω Y (rad/s)')
motFolder.add(motionState, 'wz').min(-5).max(5).step(0.01).name('ω Z (rad/s)')
motFolder.add(motionState, 'showTrajectory').name('Trajectory')
motFolder.add(motionState, 'trajectoryLength').min(10).max(1000).step(10).name('Traj Length')

// — Camera —
const camFolder = gui.addFolder('📷 Camera')
const fovParam = { fov: 45 }
camFolder.add(fovParam, 'fov').min(10).max(120).step(1).name('FOV')
    .onChange(v => { camera.fov = v; camera.updateProjectionMatrix() })
camFolder.add(controls, 'autoRotate').name('Auto Rotate')
camFolder.add(controls, 'autoRotateSpeed').min(-10).max(10).step(0.5).name('Rotate Speed')

// — Simulation —
const simState = { running: true, timeScale: 1.0, currentTime: 0 }
const simFolder = gui.addFolder('⚙️ Simulation')
simFolder.add(simState, 'running').name('Running')
simFolder.add(simState, 'timeScale').min(0.1).max(10).step(0.1).name('Time Scale')
simFolder.add(simState, 'currentTime').name('Sim Time (s)').disable().listen()
simFolder.add({ reset: () => { simState.currentTime = 0; if (customModel) { customModel.position.set(0,0,0); customModel.rotation.set(0,0,0) }; trajectoryPoints.length = 0 } }, 'reset').name('🔄 Reset')
simFolder.open()

// — Performance (read-only) —
const perfState = { fps: 0, frameMs: 0, renderMs: 0, memMB: 0 }
const perfFolder = gui.addFolder('⚡ Performance')
perfFolder.add(perfState, 'fps').name('FPS').disable().listen()
perfFolder.add(perfState, 'frameMs').name('Frame (ms)').disable().listen()
perfFolder.add(perfState, 'renderMs').name('Render (ms)').disable().listen()
perfFolder.add(perfState, 'memMB').name('Memory (MB)').disable().listen()


// ─────────────────────────────────────────
// ANIMATION LOOP
// ─────────────────────────────────────────
const clock    = new THREE.Clock()
let frameCount = 0
let fpsTimer   = 0

const tick = () => {
    const elapsed = clock.getElapsedTime()
    const delta   = Math.min(clock.getDelta(), 0.05)

    // FPS
    frameCount++
    if (elapsed - fpsTimer > 0.5) {
        const dt = elapsed - fpsTimer
        perfState.fps     = Math.round(frameCount / dt)
        perfState.frameMs = ((dt / frameCount) * 1000).toFixed(1)
        if (fpsValue) fpsValue.textContent = perfState.fps
        frameCount = 0
        fpsTimer   = elapsed
    }

    // Hologram shader time
    hologramMaterial.uniforms.uTime.value = elapsed

    // Simulation
    if (simState.running) simState.currentTime += delta * simState.timeScale

    // Motion
    if (customModel && simState.running && motionState.enabled) {
        if (motionState.type === 'rotation') {
            customModel.rotation.x += motionState.wx * delta
            customModel.rotation.y += motionState.wy * delta
            customModel.rotation.z += motionState.wz * delta
        } else if (motionState.type === 'linear') {
            customModel.position.x += motionState.vx * delta
            customModel.position.y += motionState.vy * delta
            customModel.position.z += motionState.vz * delta
        } else if (motionState.type === 'circular') {
            customModel.position.x = Math.cos(elapsed) * 3
            customModel.position.z = Math.sin(elapsed) * 3
        }
    }

    // Trajectory
    if (customModel && motionState.showTrajectory) {
        trajectoryPoints.push(customModel.position.clone())
        if (trajectoryPoints.length > motionState.trajectoryLength) trajectoryPoints.shift()
        if (trajectoryPoints.length > 1) {
            if (trajectoryLine) { scene.remove(trajectoryLine); trajectoryLine.geometry.dispose(); trajectoryLine.material.dispose() }
            trajectoryLine = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(trajectoryPoints),
                new THREE.LineBasicMaterial({ color: 0x00ff00 })
            )
            scene.add(trajectoryLine)
        }
    }

    // Bounding box update
    if (boundingBoxHelper && boundingBoxHelper.visible && customModel) {
        boundingBoxHelper.box.setFromObject(customModel)
    }

    controls.update()

    const t0 = performance.now()
    renderer.render(scene, camera)
    perfState.renderMs = (performance.now() - t0).toFixed(2)
    if (performance.memory) perfState.memMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1)

    window.requestAnimationFrame(tick)
}

tick()