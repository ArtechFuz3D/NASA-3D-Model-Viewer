import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/FBXLoader.js'
import { STLLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/STLLoader.js'
import { TDSLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/TDSLoader.js'

/* ----------------- Shader loading (browser-safe) ----------------- */

async function loadShaders() {
  const [vert, frag] = await Promise.all([
    fetch('./shader/vert.glsl').then(r => r.text()),
    fetch('./shader/frag.glsl').then(r => r.text())
  ])
  return { vert, frag }
}

/* ---------------- Scene setup ---------------- */

const canvas = document.querySelector('.webgl')
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(25, innerWidth / innerHeight, 0.1, 100)
camera.position.set(6, 6, 6)
scene.add(camera)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

/* ---------------- Material ---------------- */

const { vert, frag } = await loadShaders()

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
  blending: THREE.AdditiveBlending
})

/* ---------------- Model loading ---------------- */

let currentModel = null

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

function loadModel(url) {
  disposeModel()

  const ext = url.split('.').pop().toLowerCase()
  let loader

  if (ext === 'glb' || ext === 'gltf') loader = new GLTFLoader()
  else if (ext === 'fbx') loader = new FBXLoader()
  else if (ext === 'stl') loader = new STLLoader()
  else if (ext === '3ds') loader = new TDSLoader()
  else return

  loader.load(url, data => {
    currentModel = data.scene || data
    applyMaterial(currentModel)
    currentModel.scale.setScalar(0.01)
    scene.add(currentModel)
  })
}

/* ---------------- NASA repo fetch ---------------- */

const select = document.getElementById('modelSelect')
const EXT = ['glb', 'gltf', 'fbx', 'stl', '3ds']

fetch('https://api.github.com/repos/nasa/NASA-3D-Resources/git/trees/master?recursive=1')
  .then(r => r.json())
  .then(data => {
    const models = data.tree.filter(f =>
      EXT.some(e => f.path.toLowerCase().endsWith(e))
    )

    models.forEach(m => {
      const o = document.createElement('option')
      o.value = `https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/${m.path}`
      o.textContent = m.path.split('/').pop()
      select.appendChild(o)
    })

    if (select.value) loadModel(select.value)
  })

select.addEventListener('change', e => loadModel(e.target.value))

/* ---------------- Animate ---------------- */

const clock = new THREE.Clock()

function tick() {
  material.uniforms.uTime.value = clock.getElapsedTime()
  if (currentModel) currentModel.rotation.y += 0.002
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}

tick()
