import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/FBXLoader.js'
import { STLLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/STLLoader.js'
import { TDSLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/TDSLoader.js'

/* ----------------- Inline shaders (no fetch needed) ----------------- */
const vert = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec3 pos = position;
    pos += normal * sin(uTime * 2.0 + position.y * 10.0) * 0.002;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const frag = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    float scanline = sin(vPosition.y * 80.0 + uTime * 3.0) * 0.5 + 0.5;
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    float alpha = (scanline * 0.4 + fresnel * 0.6) * 0.85;
    gl_FragColor = vec4(uColor, alpha);
  }
`

/* ---------------- Scene setup ---------------- */
const canvas = document.querySelector('.webgl')
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(25, innerWidth / innerHeight, 0.1, 100)
camera.position.set(6, 6, 6)
scene.add(camera)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setClearColor(0x000000, 0)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

/* ---------------- Material ---------------- */
const material = new THREE.ShaderMaterial({
  vertexShader: vert,
  fragmentShader: frag,
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#70c1ff') }
  },
  transparent: true,
  wireframe: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide
})

/* ---------------- Model loading ---------------- */
let currentModel = null
const statusEl = document.getElementById('status')

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg
}

function disposeModel() {
  if (!currentModel) return
  scene.remove(currentModel)
  currentModel.traverse(o => {
    if (o.geometry) o.geometry.dispose()
  })
  currentModel = null
}

function applyMaterial(obj) {
  obj.traverse(c => {
    if (c.isMesh) c.material = material
  })
}

function centerAndScale(obj) {
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = 3 / (maxDim || 1)
  obj.scale.setScalar(scale)
  const center = box.getCenter(new THREE.Vector3())
  obj.position.sub(center.multiplyScalar(scale))
}

function loadModel(url) {
  disposeModel()
  setStatus('Loading…')
  const ext = url.split('?')[0].split('.').pop().toLowerCase()

  let loader
  if (ext === 'glb' || ext === 'gltf') loader = new GLTFLoader()
  else if (ext === 'fbx') loader = new FBXLoader()
  else if (ext === 'stl') loader = new STLLoader()
  else if (ext === '3ds') loader = new TDSLoader()
  else { setStatus('Unsupported format: ' + ext); return }

  loader.load(
    url,
    data => {
      // GLTFLoader returns { scene }, others return Object3D or BufferGeometry
      if (data.scene) {
        currentModel = data.scene
      } else if (data.isBufferGeometry) {
        // STL returns geometry
        const mesh = new THREE.Mesh(data, material)
        currentModel = mesh
      } else {
        currentModel = data
      }
      applyMaterial(currentModel)
      centerAndScale(currentModel)
      scene.add(currentModel)
      setStatus('')
    },
    xhr => {
      if (xhr.total) setStatus(`Loading… ${Math.round(xhr.loaded / xhr.total * 100)}%`)
    },
    err => {
      console.error('Model load error:', err)
      setStatus('Failed to load model. May be blocked by CORS.')
    }
  )
}

/* ---------------- NASA repo fetch ---------------- */
const select = document.getElementById('modelSelect')
const EXT = ['glb', 'gltf', 'fbx', 'stl', '3ds']

// The GitHub tree API truncates large repos. We fetch the tree SHA first,
// then request recursively. If still truncated we fall back to a curated list.
const CURATED = [
  { name: 'Curiosity Rover (STL)', path: 'Models/Curiosity/MSL_Rover.STL' },
  { name: 'Mars Pathfinder Lander', path: 'Models/Mars_Pathfinder_Lander/mars_pathfinder_lander.3ds' },
  { name: 'Hubble Space Telescope', path: 'Models/Hubble_Space_Telescope/hubble_space_telescope_2002.3ds' },
  { name: 'International Space Station', path: 'Models/ISS/ISS.glb' },
  { name: 'Voyager 1', path: 'Models/Voyager/voyager.3ds' },
  { name: 'Apollo 11 Command Module', path: 'Models/Apollo_11_Command_Module/command_module.3ds' },
  { name: 'Space Shuttle', path: 'Models/Space_Shuttle/space_shuttle.3ds' },
  { name: 'Cassini', path: 'Models/Cassini/cassini.3ds' },
  { name: 'New Horizons', path: 'Models/New_Horizons/new_horizons.3ds' },
  { name: 'Dawn', path: 'Models/Dawn/dawn.3ds' },
]

function populateSelect(models) {
  select.innerHTML = '<option value="">— Select a model —</option>'
  models.forEach(m => {
    const o = document.createElement('option')
    o.value = `https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/${m.path}`
    o.textContent = m.name || m.path.split('/').pop()
    select.appendChild(o)
  })
  setStatus(models.length + ' models available')
}

function useCurated() {
  console.warn('Using curated model list (API unavailable or rate-limited)')
  populateSelect(CURATED)
  setStatus('Using curated list — API unavailable')
}

async function fetchNASAModels() {
  setStatus('Fetching NASA model list…')
  try {
    // Step 1: get the master branch SHA
    const branchRes = await fetch(
      'https://api.github.com/repos/nasa/NASA-3D-Resources/branches/master',
      { headers: { Accept: 'application/vnd.github+json' } }
    )
    if (!branchRes.ok) throw new Error('Branch fetch failed: ' + branchRes.status)
    const branch = await branchRes.json()
    const treeSha = branch.commit.commit.tree.sha

    // Step 2: fetch recursive tree
    const treeRes = await fetch(
      `https://api.github.com/repos/nasa/NASA-3D-Resources/git/trees/${treeSha}?recursive=1`,
      { headers: { Accept: 'application/vnd.github+json' } }
    )
    if (!treeRes.ok) throw new Error('Tree fetch failed: ' + treeRes.status)
    const treeData = await treeRes.json()

    if (!treeData.tree || treeData.tree.length === 0) {
      throw new Error('Empty tree')
    }

    const models = treeData.tree
      .filter(f => f.type === 'blob' && EXT.some(e => f.path.toLowerCase().endsWith('.' + e)))
      .map(f => ({ name: f.path.split('/').pop(), path: f.path }))

    if (models.length === 0) throw new Error('No matching models found')

    if (treeData.truncated) {
      setStatus(`Tree truncated — showing ${models.length} found models`)
    }

    populateSelect(models)
  } catch (err) {
    console.error('NASA fetch error:', err)
    useCurated()
  }
}

fetchNASAModels()

select.addEventListener('change', e => {
  if (e.target.value) loadModel(e.target.value)
})

/* ---------------- Animate ---------------- */
const clock = new THREE.Clock()
function tick() {
  material.uniforms.uTime.value = clock.getElapsedTime()
  if (currentModel) currentModel.rotation.y += 0.003
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}
tick()
