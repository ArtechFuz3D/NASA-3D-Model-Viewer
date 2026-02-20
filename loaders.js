import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { TDSLoader } from 'three/addons/loaders/TDSLoader.js'
import * as THREE from 'three'

export function loadModel(url, material, scene, onDone) {
  const ext = url.split('.').pop().toLowerCase()

  let loader

  switch (ext) {
    case 'glb':
    case 'gltf':
      loader = new GLTFLoader()
      loader.load(url, gltf => {
        applyMaterial(gltf.scene, material)
        onDone(gltf.scene)
      })
      break

    case 'fbx':
      loader = new FBXLoader()
      loader.load(url, obj => {
        applyMaterial(obj, material)
        onDone(obj)
      })
      break

    case 'stl':
      loader = new STLLoader()
      loader.load(url, geo => {
        const mesh = new THREE.Mesh(geo, material)
        onDone(mesh)
      })
      break

    case '3ds':
      loader = new TDSLoader()
      loader.load(url, obj => {
        applyMaterial(obj, material)
        onDone(obj)
      })
      break
  }
}

function applyMaterial(object, material) {
  object.traverse(child => {
    if (child.isMesh) child.material = material
  })
}
