import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { STLLoader }  from 'three/addons/loaders/STLLoader.js'
import { TDSLoader }  from 'three/addons/loaders/TDSLoader.js'
import { OBJLoader }  from 'three/addons/loaders/OBJLoader.js'
import GUI from 'lil-gui'

import hologramVertShader from './shaders/vert.glsl'
import hologramFragShader from './shaders/frag.glsl'

/**
 * ==================== BASE SETUP ====================
 */
const gui = new GUI({ width: 350 })
gui.title('Advanced Robotics Control System v2.0')

const canvas = document.querySelector('canvas.webgl')
const scene  = new THREE.Scene()

const sizes = {
    width:  window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    sizes.width  = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * ==================== CAMERA ====================
 */
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

/**
 * ==================== RENDERER ====================
 */
const rendererParameters = { clearColor: '#0a0e1a' }
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setClearColor(rendererParameters.clearColor)
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type    = THREE.PCFSoftShadowMap

/**
 * ==================== ROBOT CONFIGURATION ====================
 */
const robotConfig = {
    name:      'Robot Model',
    dof:       6,
    baseHeight: 0,
    toolOffset: new THREE.Vector3(0, 0, 0),
    massKg:    50.0,
    payload:   10.0,
    reach:     5.0
}

/**
 * ==================== COORDINATE FRAMES ====================
 */
const frameParameters = {
    showWorldFrame:  true,
    showBaseFrame:   true,
    showToolFrame:   true,
    showTargetFrame: false,
    frameScale:      1.0,
    worldFrameX: 0, worldFrameY: 0, worldFrameZ: 0,
    baseFrameX:  0, baseFrameY:  0, baseFrameZ:  0,
    transformMode: 'world'
}

/**
 * ==================== KINEMATICS ====================
 */
const kinematicsParameters = {
    mode:        'forward',
    positionX:   0, positionY: 0, positionZ: 0,
    rotationX:   0, rotationY: 0, rotationZ: 0,
    roll:        0, pitch:     0, yaw:       0,
    useEuler:    true,
    useQuaternion: false,
    quaternionW: 1, quaternionX: 0, quaternionY: 0, quaternionZ: 0,
    ikSolver:    'jacobian',
    ikIterations: 100,
    ikTolerance:  0.001,
    singularityCheck:     true,
    singularityThreshold: 0.01,
    inSingularity:        false,
    workspace:   'rectangular',

    solveIK: () => {
        console.log('IK Solver:', kinematicsParameters.ikSolver)
        console.log('Target Position:', {
            x: kinematicsParameters.positionX,
            y: kinematicsParameters.positionY,
            z: kinematicsParameters.positionZ
        })
        console.log('Target Orientation:', {
            roll: kinematicsParameters.roll,
            pitch: kinematicsParameters.pitch,
            yaw: kinematicsParameters.yaw
        })
    },
    computeFK: () => {
        console.log('Forward Kinematics from joint angles:', jointParameters)
    },
    resetPose: () => {
        kinematicsParameters.positionX = 0
        kinematicsParameters.positionY = 0
        kinematicsParameters.positionZ = 0
        kinematicsParameters.rotationX = 0
        kinematicsParameters.rotationY = 0
        kinematicsParameters.rotationZ = 0
        kinematicsParameters.roll  = 0
        kinematicsParameters.pitch = 0
        kinematicsParameters.yaw   = 0
        if (customModel) {
            customModel.position.set(0, 0, 0)
            customModel.rotation.set(0, 0, 0)
        }
        gui.controllersRecursive().forEach(c => c.updateDisplay())
    },
    snapTo90: () => {
        kinematicsParameters.rotationX = Math.round(kinematicsParameters.rotationX / 90) * 90
        kinematicsParameters.rotationY = Math.round(kinematicsParameters.rotationY / 90) * 90
        kinematicsParameters.rotationZ = Math.round(kinematicsParameters.rotationZ / 90) * 90
        gui.controllersRecursive().forEach(c => c.updateDisplay())
    }
}

/**
 * ==================== JOINT CONTROL ====================
 */
const jointParameters = {
    joint1: 0, joint2: 0, joint3: 0,
    joint4: 0, joint5: 0, joint6: 0,
    joint1Min: -180, joint1Max: 180,
    joint2Min: -180, joint2Max: 180,
    joint3Min: -180, joint3Max: 180,
    joint4Min: -180, joint4Max: 180,
    joint5Min: -180, joint5Max: 180,
    joint6Min: -180, joint6Max: 180,
    joint1Vel: 0, joint2Vel: 0, joint3Vel: 0,
    joint4Vel: 0, joint5Vel: 0, joint6Vel: 0,
    maxJointVel: 180,
    joint1Torque: 0, joint2Torque: 0, joint3Torque: 0,
    joint4Torque: 0, joint5Torque: 0, joint6Torque: 0,
    maxTorque:    100,
    interpolationType: 'linear',
    interpolationTime: 1.0,
    enableJointLimits: true,

    zeroAllJoints: () => {
        for (let i = 1; i <= 6; i++) jointParameters[`joint${i}`] = 0
        gui.controllersRecursive().forEach(c => c.updateDisplay())
    },
    homePosition: () => {
        jointParameters.joint1 = 0
        jointParameters.joint2 = -90
        jointParameters.joint3 = 90
        jointParameters.joint4 = 0
        jointParameters.joint5 = 90
        jointParameters.joint6 = 0
        gui.controllersRecursive().forEach(c => c.updateDisplay())
    }
}

/**
 * ==================== PATH PLANNING ====================
 */
const pathParameters = {
    plannerType:     'linear',
    startPoint:      new THREE.Vector3(0, 0, 0),
    endPoint:        new THREE.Vector3(5, 5, 5),
    waypoints:       [],
    numWaypoints:    10,
    pathSmoothing:   0.5,
    velocityProfile: 'trapezoidal',
    maxVelocity:     1.0,
    maxAcceleration: 2.0,
    maxJerk:         5.0,
    executePath:     false,
    pathProgress:    0,
    loopPath:        false,
    reverseDirection: false,
    showPath:        true,
    pathColor:       '#00ff00',
    pathWidth:       2,

    planPath: () => {
        console.log('Planning path:', pathParameters.plannerType)
        generatePath()
    }
}

/**
 * ==================== COLLISION DETECTION ====================
 */
const collisionParameters = {
    enabled:                  true,
    checkSelfCollision:       true,
    checkEnvironmentCollision: true,
    collisionMargin:          0.05,
    showCollisionBounds:      false,
    collisionVisualization:   'sphere',
    obstacleCount:            0,
    inCollision:              false,
    collisionForce:           0,
    safetyStop:               true,

    addObstacle: () => {
        const obstacle = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 })
        )
        obstacle.position.set(
            Math.random() * 6 - 3,
            Math.random() * 3,
            Math.random() * 6 - 3
        )
        obstacle.castShadow = true
        obstacle.receiveShadow = true
        scene.add(obstacle)
        obstacles.push(obstacle)
        collisionParameters.obstacleCount = obstacles.length
    },
    clearObstacles: () => {
        obstacles.forEach(obs => {
            scene.remove(obs)
            obs.geometry.dispose()
            obs.material.dispose()
        })
        obstacles.length = 0
        collisionParameters.obstacleCount = 0
    }
}

/**
 * ==================== SENSOR SIMULATION ====================
 */
const sensorParameters = {
    lidarEnabled:      false,
    lidarRange:        10,
    lidarFOV:          180,
    lidarResolution:   1,
    lidarVisualization: true,
    lidarColor:        '#ff0000',
    forceSensorEnabled: false,
    forceX: 0, forceY: 0, forceZ: 0,
    torqueX: 0, torqueY: 0, torqueZ: 0,
    forceThreshold:    10,
    imuEnabled:        false,
    accelX: 0, accelY: 0, accelZ: 9.81,
    gyroX:  0, gyroY:  0, gyroZ:  0,
    cameraEnabled:     false,
    cameraFOV:         60,
    cameraResolution:  '1920x1080',
    showCameraFrustum: false,
    proximitySensors:  6,
    proximityRange:    0.5,
    showProximitySensors: false
}

/**
 * ==================== DYNAMICS & PHYSICS ====================
 */
const dynamicsParameters = {
    enableGravity:   false,
    gravityX:        0,
    gravityY:        -9.81,
    gravityZ:        0,
    enableInertia:   true,
    mass:            robotConfig.massKg,
    centerOfMassX:   0, centerOfMassY: 0, centerOfMassZ: 0,
    showCenterOfMass: false,
    friction:        0.5,
    damping:         0.1,
    restitution:     0.3,
    windForceX:      0, windForceY: 0, windForceZ: 0,
    externalForceX:  0, externalForceY: 0, externalForceZ: 0,
    showForceVectors: false,
    computeDynamics: true
}

/**
 * ==================== MOTION CONTROL ====================
 */
const motionParameters = {
    controlMode:        'position',
    enableAnimation:    false,
    animationType:      'none',
    velocityX:          0, velocityY: 0, velocityZ: 0,
    angularVelocityX:   0, angularVelocityY: 0, angularVelocityZ: 0,
    accelerationX:      0, accelerationY: 0, accelerationZ: 0,
    jerkLimit:          10.0,
    followTrajectory:   false,
    trajectorySpeed:    1.0,
    lookAhead:          0.1,
    stiffnessX:         100, stiffnessY: 100, stiffnessZ: 100,
    dampingX:           10,  dampingY:   10,  dampingZ:   10,
    complianceEnabled:  false,
    complianceThreshold: 5.0
}

/**
 * ==================== TELEMETRY ====================
 */
const telemetryParameters = {
    logFrequency:         10,
    enableLogging:        false,
    dataBuffer:           [],
    bufferSize:           1000,
    showTelemetry:        true,
    telemetryDisplay:     'overlay',
    cpuLoad:              0,
    memoryUsage:          0,
    communicationLatency: 0,
    controlFrequency:     0,
    errorCount:           0,
    warningCount:         0,
    uptime:               0,

    exportTelemetry: () => {
        const blob = new Blob(
            [JSON.stringify({ timestamp: Date.now(), telemetry: telemetryParameters.dataBuffer }, null, 2)],
            { type: 'application/json' }
        )
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `telemetry_${Date.now()}.json`
        a.click()
    },
    clearBuffer: () => { telemetryParameters.dataBuffer = [] }
}

/**
 * ==================== VISUALIZATION ====================
 */
const visualizationParameters = {
    renderMode:          'hologram',
    materialColor:       '#70c1ff',
    secondaryColor:      '#ff00ff',
    opacity:             1.0,
    aberrationStrength:  3.0,
    emissiveIntensity:   0.5,
    showBoundingBox:     false,
    showBoundingSphere:  false,
    showLocalAxes:       false,
    showJointAxes:       true,
    showTrajectory:      true,
    trajectoryLength:    200,
    showVelocityVectors: false,
    vectorScale:         1.0,
    showGhost:           false,
    ghostOpacity:        0.3,
    ghostColor:          '#ffffff',
    showGrid:            true,
    gridSize:            10,
    gridDivisions:       20,
    gridColor1:          '#444444',
    gridColor2:          '#222222',
    showOrigin:          true,
    originSize:          5,
    ambientIntensity:    0.3,
    directionalIntensity: 0.8,
    directionalX:        5, directionalY: 5, directionalZ: 5,
    shadowsEnabled:      true
}

/**
 * ==================== WORKSPACE ANALYSIS ====================
 */
const workspaceParameters = {
    analyzeWorkspace:   false,
    workspaceType:      'reachable',
    resolution:         20,
    showWorkspaceCloud: false,
    workspaceColor:     '#00ffff',
    workspaceOpacity:   0.2,
    pointCloudSize:     0.05,

    computeWorkspace: () => {
        console.log('Computing workspace:', workspaceParameters.workspaceType)
        generateWorkspaceCloud()
    },
    clearWorkspace: () => {
        if (workspaceCloud) {
            scene.remove(workspaceCloud)
            workspaceCloud.geometry.dispose()
            workspaceCloud.material.dispose()
            workspaceCloud = null
        }
    }
}

/**
 * ==================== CAMERA PARAMETERS ====================
 */
const cameraParameters = {
    viewMode:          'free',
    fov:               45,
    near:              0.01,
    far:               1000,
    trackingTarget:    'robot',
    trackingSmoothing: 0.1,
    trackingDistance:  10,
    trackingHeight:    5,
    trackingAngle:     45,
    autoRotate:        false,
    autoRotateSpeed:   1.0,
    cinematicSpeed:    1.0,
    cinematicPath:     'orbit',
    cinematicProgress: 0,
    playCinematic:     false,

    setTopView:       () => { camera.position.set(0, 15, 0);    controls.target.set(0,0,0); controls.update() },
    setFrontView:     () => { camera.position.set(0, 0, 15);    controls.target.set(0,0,0); controls.update() },
    setSideView:      () => { camera.position.set(15, 0, 0);    controls.target.set(0,0,0); controls.update() },
    setIsometricView: () => { camera.position.set(10, 10, 10);  controls.target.set(0,0,0); controls.update() },
    resetCamera:      () => { camera.position.set(5, 3, 5);     controls.target.set(0,0,0); controls.update() }
}

/**
 * ==================== SIMULATION CONTROL ====================
 */
const simulationParameters = {
    running:        true,
    timeScale:      1.0,
    fixedTimestep:  true,
    deltaTime:      0.01,
    currentTime:    0,
    simulationRate: 100,
    realTimeRatio:  1.0,
    recordSimulation: false,
    playbackMode:   false,
    playbackSpeed:  1.0,

    stepSimulation: () => {
        simulationParameters.currentTime += simulationParameters.deltaTime
    },
    resetSimulation: () => {
        simulationParameters.currentTime = 0
        kinematicsParameters.resetPose()
        jointParameters.zeroAllJoints()
    }
}

/**
 * ==================== PERFORMANCE ====================
 */
const performanceParameters = {
    showStats:  true,
    fps:        0,
    frameTime:  0,
    physicsTime: 0,
    renderTime: 0,
    memoryMB:   0,
    triangles:  0,
    drawCalls:  0
}

/**
 * ==================== DATA STRUCTURES ====================
 */
const obstacles      = []
const trajectoryPoints = []
let plannedPath      = null
let workspaceCloud   = null

/**
 * ==================== SCENE SETUP ====================
 */

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, visualizationParameters.ambientIntensity)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, visualizationParameters.directionalIntensity)
directionalLight.position.set(
    visualizationParameters.directionalX,
    visualizationParameters.directionalY,
    visualizationParameters.directionalZ
)
directionalLight.castShadow = visualizationParameters.shadowsEnabled
directionalLight.shadow.mapSize.set(2048, 2048)
directionalLight.shadow.camera.near   = 0.1
directionalLight.shadow.camera.far    = 50
directionalLight.shadow.camera.left   = -10
directionalLight.shadow.camera.right  = 10
directionalLight.shadow.camera.top    = 10
directionalLight.shadow.camera.bottom = -10
scene.add(directionalLight)

// Grid
const gridHelper = new THREE.GridHelper(
    visualizationParameters.gridSize,
    visualizationParameters.gridDivisions,
    visualizationParameters.gridColor1,
    visualizationParameters.gridColor2
)
gridHelper.visible = visualizationParameters.showGrid
scene.add(gridHelper)

// Axes
const axesHelper = new THREE.AxesHelper(visualizationParameters.originSize)
axesHelper.visible = visualizationParameters.showOrigin
scene.add(axesHelper)

// Ground (shadow catcher only)
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.3 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Coordinate frames
const worldFrame  = new THREE.AxesHelper(2)
worldFrame.visible = frameParameters.showWorldFrame
scene.add(worldFrame)

const baseFrame   = new THREE.AxesHelper(1.5)
baseFrame.visible = frameParameters.showBaseFrame
scene.add(baseFrame)

const toolFrame   = new THREE.AxesHelper(1)
toolFrame.visible = frameParameters.showToolFrame

const targetFrame = new THREE.AxesHelper(1)
targetFrame.visible = frameParameters.showTargetFrame
scene.add(targetFrame)

// Per-model helpers (populated when model loads)
let trajectoryLine    = null
let velocityArrow     = null
let boundingBoxHelper = null
let boundingSphereHelper = null
let localAxesHelper   = null

/**
 * ==================== HELPER FUNCTIONS ====================
 */

function generatePath() {
    if (plannedPath) {
        scene.remove(plannedPath)
        plannedPath.geometry.dispose()
        plannedPath.material.dispose()
        plannedPath = null
    }

    const points = []
    const n = pathParameters.numWaypoints

    if (pathParameters.plannerType === 'linear') {
        for (let i = 0; i <= n; i++) {
            points.push(new THREE.Vector3().lerpVectors(
                pathParameters.startPoint,
                pathParameters.endPoint,
                i / n
            ))
        }
    } else if (pathParameters.plannerType === 'circular') {
        const center = new THREE.Vector3()
            .addVectors(pathParameters.startPoint, pathParameters.endPoint)
            .multiplyScalar(0.5)
        const radius = pathParameters.startPoint.distanceTo(center)
        for (let i = 0; i <= n; i++) {
            const angle = (i / n) * Math.PI
            points.push(new THREE.Vector3(
                center.x + Math.cos(angle) * radius,
                center.y,
                center.z + Math.sin(angle) * radius
            ))
        }
    }

    if (points.length > 1) {
        plannedPath = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({ color: pathParameters.pathColor })
        )
        plannedPath.visible = pathParameters.showPath
        scene.add(plannedPath)
    }
}

function generateWorkspaceCloud() {
    workspaceParameters.clearWorkspace()

    const points = []
    const res    = workspaceParameters.resolution

    for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
            for (let k = 0; k < res; k++) {
                const x = (i / res) * 10 - 5
                const y = (j / res) * 5
                const z = (k / res) * 10 - 5
                const d = Math.sqrt(x*x + y*y + z*z)
                if (d < robotConfig.reach && d > 1) points.push(new THREE.Vector3(x, y, z))
            }
        }
    }

    workspaceCloud = new THREE.Points(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.PointsMaterial({
            color:       workspaceParameters.workspaceColor,
            size:        workspaceParameters.pointCloudSize,
            transparent: true,
            opacity:     workspaceParameters.workspaceOpacity
        })
    )
    workspaceCloud.visible = workspaceParameters.showWorkspaceCloud
    scene.add(workspaceCloud)
}

/**
 * ==================== MATERIAL ====================
 */
const material = new THREE.ShaderMaterial({
    vertexShader:   hologramVertShader,
    fragmentShader: hologramFragShader,
    uniforms: {
        uTime:               { value: 0 },
        uColor:              new THREE.Uniform(new THREE.Color(visualizationParameters.materialColor)),
        uAberrationStrength: { value: visualizationParameters.aberrationStrength }
    },
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
    transparent: true,
    depthWrite:  false,
    wireframe:   visualizationParameters.renderMode === 'wireframe'
})

/**
 * ==================== MODEL LOADING ====================
 * Replaces the old hardcoded gltfLoader.load() call.
 * Supports GLB/GLTF, STL, OBJ, 3DS from any URL (NASA API or local).
 */
let customModel = null

// DOM elements injected by index.html
const modelSelect = document.getElementById('modelSelect')
const statusEl    = document.getElementById('status')
const setStatus   = msg => { if (statusEl) statusEl.textContent = msg }

function disposeModel() {
    if (!customModel) return

    // Remove attached helpers first
    if (boundingBoxHelper)   { scene.remove(boundingBoxHelper);   boundingBoxHelper = null }
    if (boundingSphereHelper){ scene.remove(boundingSphereHelper); boundingSphereHelper = null }

    scene.remove(customModel)
    customModel.traverse(o => { if (o.geometry) o.geometry.dispose() })
    customModel = null
    trajectoryPoints.length = 0
    if (trajectoryLine) {
        scene.remove(trajectoryLine)
        trajectoryLine.geometry.dispose()
        trajectoryLine.material.dispose()
        trajectoryLine = null
    }
}

function applyMaterial(obj) {
    obj.traverse(c => {
        if (c.isMesh) {
            c.material     = material
            c.castShadow   = true
            c.receiveShadow = true
        }
    })
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
    customModel = obj
    scene.add(customModel)
    applyMaterial(customModel)
    fitToView(customModel)

    // Attach tool frame
    customModel.add(toolFrame)

    // Bounding box helper
    const box = new THREE.Box3().setFromObject(customModel)
    boundingBoxHelper = new THREE.Box3Helper(box, 0x00ff00)
    boundingBoxHelper.visible = visualizationParameters.showBoundingBox
    scene.add(boundingBoxHelper)

    // Bounding sphere helper
    const sphere = new THREE.Sphere()
    box.getBoundingSphere(sphere)
    boundingSphereHelper = new THREE.Mesh(
        new THREE.SphereGeometry(sphere.radius, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.3 })
    )
    boundingSphereHelper.position.copy(sphere.center)
    boundingSphereHelper.visible = visualizationParameters.showBoundingSphere
    scene.add(boundingSphereHelper)

    // Local axes
    localAxesHelper = new THREE.AxesHelper(2)
    localAxesHelper.visible = visualizationParameters.showLocalAxes
    customModel.add(localAxesHelper)

    // Velocity arrow
    velocityArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 0),
        2, 0xff0000, 0.5, 0.3
    )
    velocityArrow.visible = false
    customModel.add(velocityArrow)

    // Reset camera to frame the new model
    cameraParameters.resetCamera()
    setStatus('')
}

function loadModel(url) {
    disposeModel()
    setStatus('Loading…')

    const ext = url.split('?')[0].split('.').pop().toLowerCase()

    const onProgress = xhr => {
        if (xhr.total) setStatus(`Loading… ${Math.round(xhr.loaded / xhr.total * 100)}%`)
    }
    const onError = err => {
        console.error(err)
        setStatus('Failed to load — CORS or unsupported format')
    }

    if (ext === 'glb' || ext === 'gltf') {
        new GLTFLoader().load(url, d => onModelLoaded(d.scene), onProgress, onError)
    } else if (ext === 'stl') {
        new STLLoader().load(url, geo => onModelLoaded(new THREE.Mesh(geo, material)), onProgress, onError)
    } else if (ext === '3ds') {
        new TDSLoader().load(url, obj => onModelLoaded(obj), onProgress, onError)
    } else if (ext === 'obj') {
        new OBJLoader().load(url, obj => onModelLoaded(obj), onProgress, onError)
    } else {
        setStatus(`Unsupported format: .${ext}`)
    }
}

/**
 * ==================== NASA MODEL LIST ====================
 */
const BASE_RAW = 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/'
const EXTS     = ['glb', 'gltf', 'stl', 'obj', '3ds']

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

function populateSelect(models) {
    if (!modelSelect) return
    modelSelect.innerHTML = '<option value="">— Select a model —</option>'
    models.forEach(m => {
        const o       = document.createElement('option')
        o.value       = BASE_RAW + m.path
        o.textContent = m.name || m.path.split('/').pop()
        modelSelect.appendChild(o)
    })
    setStatus(`${models.length} models available`)
}

async function fetchNASAModels() {
    setStatus('Fetching model list…')
    try {
        const bRes = await fetch(
            'https://api.github.com/repos/nasa/NASA-3D-Resources/branches/master',
            { headers: { Accept: 'application/vnd.github+json' } }
        )
        if (!bRes.ok) throw new Error(`Branch API ${bRes.status}`)
        const branch = await bRes.json()
        const sha    = branch.commit.commit.tree.sha

        const tRes = await fetch(
            `https://api.github.com/repos/nasa/NASA-3D-Resources/git/trees/${sha}?recursive=1`,
            { headers: { Accept: 'application/vnd.github+json' } }
        )
        if (!tRes.ok) throw new Error(`Tree API ${tRes.status}`)
        const tData = await tRes.json()

        const models = (tData.tree || [])
            .filter(f => f.type === 'blob' && EXTS.some(e => f.path.toLowerCase().endsWith('.' + e)))
            .map(f => ({ name: f.path.split('/').pop(), path: f.path }))

        if (!models.length) throw new Error('No models found in tree')
        populateSelect(models)
        if (tData.truncated) setStatus(`Tree truncated — ${models.length} models found`)
    } catch (err) {
        console.warn('GitHub API failed:', err.message)
        populateSelect(CURATED)
        setStatus('API unavailable — showing curated list')
    }
}

if (modelSelect) {
    fetchNASAModels()
    modelSelect.addEventListener('change', e => { if (e.target.value) loadModel(e.target.value) })
}

/**
 * ==================== GUI ====================
 */

// System Info
const systemFolder = gui.addFolder('📡 System Info')
systemFolder.add(robotConfig, 'name').disable()
systemFolder.add(robotConfig, 'dof').name('Degrees of Freedom').disable()
systemFolder.add(robotConfig, 'massKg').name('Mass (kg)').min(1).max(500).step(1)
systemFolder.add(robotConfig, 'payload').name('Payload (kg)').min(0).max(100).step(1)
systemFolder.add(robotConfig, 'reach').name('Reach (m)').min(0.1).max(20).step(0.1)

// Coordinate Frames
const frameFolder = gui.addFolder('🎯 Coordinate Frames')
frameFolder.add(frameParameters, 'showWorldFrame').name('World Frame')
    .onChange(() => { worldFrame.visible = frameParameters.showWorldFrame })
frameFolder.add(frameParameters, 'showBaseFrame').name('Base Frame')
    .onChange(() => { baseFrame.visible = frameParameters.showBaseFrame })
frameFolder.add(frameParameters, 'showToolFrame').name('Tool Frame')
    .onChange(() => { toolFrame.visible = frameParameters.showToolFrame })
frameFolder.add(frameParameters, 'showTargetFrame').name('Target Frame')
    .onChange(() => { targetFrame.visible = frameParameters.showTargetFrame })
frameFolder.add(frameParameters, 'frameScale').min(0.1).max(3).step(0.1).name('Frame Scale')
frameFolder.add(frameParameters, 'transformMode', ['world', 'base', 'tool']).name('Transform Mode')

// Kinematics
const kinematicsFolder = gui.addFolder('⚙️ Kinematics')
kinematicsFolder.add(kinematicsParameters, 'mode', ['forward', 'inverse', 'teach']).name('Mode')
kinematicsFolder.add(kinematicsParameters, 'positionX').min(-10).max(10).step(0.001).name('X (m)')
    .onChange(() => { if (customModel) customModel.position.x = kinematicsParameters.positionX })
kinematicsFolder.add(kinematicsParameters, 'positionY').min(-10).max(10).step(0.001).name('Y (m)')
    .onChange(() => { if (customModel) customModel.position.y = kinematicsParameters.positionY })
kinematicsFolder.add(kinematicsParameters, 'positionZ').min(-10).max(10).step(0.001).name('Z (m)')
    .onChange(() => { if (customModel) customModel.position.z = kinematicsParameters.positionZ })
kinematicsFolder.add(kinematicsParameters, 'roll').min(-180).max(180).step(0.01).name('Roll (°)')
kinematicsFolder.add(kinematicsParameters, 'pitch').min(-180).max(180).step(0.01).name('Pitch (°)')
kinematicsFolder.add(kinematicsParameters, 'yaw').min(-180).max(180).step(0.01).name('Yaw (°)')
kinematicsFolder.add(kinematicsParameters, 'ikSolver', ['jacobian', 'ccd', 'fabrik']).name('IK Solver')
kinematicsFolder.add(kinematicsParameters, 'ikIterations').min(10).max(500).step(10).name('IK Iterations')
kinematicsFolder.add(kinematicsParameters, 'ikTolerance').min(0.0001).max(0.1).step(0.0001).name('IK Tolerance')
kinematicsFolder.add(kinematicsParameters, 'solveIK').name('🎯 Solve IK')
kinematicsFolder.add(kinematicsParameters, 'computeFK').name('📐 Compute FK')
kinematicsFolder.add(kinematicsParameters, 'singularityCheck').name('Singularity Check')
kinematicsFolder.add(kinematicsParameters, 'resetPose').name('🔄 Reset Pose')
kinematicsFolder.add(kinematicsParameters, 'snapTo90').name('↻ Snap to 90°')

// Joints
const jointFolder = gui.addFolder('🔧 Joint Control')
for (let i = 1; i <= 6; i++) {
    jointFolder.add(jointParameters, `joint${i}`).min(-180).max(180).step(0.01).name(`J${i} (°)`)
}
jointFolder.add(jointParameters, 'maxJointVel').min(1).max(360).step(1).name('Max Vel (°/s)')
jointFolder.add(jointParameters, 'maxTorque').min(1).max(500).step(1).name('Max Torque (Nm)')
jointFolder.add(jointParameters, 'interpolationType', ['linear', 'cubic', 'quintic']).name('Interpolation')
jointFolder.add(jointParameters, 'interpolationTime').min(0.1).max(10).step(0.1).name('Interp Time (s)')
jointFolder.add(jointParameters, 'enableJointLimits').name('Enable Limits')
jointFolder.add(jointParameters, 'zeroAllJoints').name('🔄 Zero All')
jointFolder.add(jointParameters, 'homePosition').name('🏠 Home Position')

// Path Planning
const pathFolder = gui.addFolder('🛣️ Path Planning')
pathFolder.add(pathParameters, 'plannerType', ['linear', 'circular', 'bezier', 'rrt', 'prm']).name('Planner')
pathFolder.add(pathParameters, 'numWaypoints').min(5).max(100).step(5).name('Waypoints')
pathFolder.add(pathParameters, 'pathSmoothing').min(0).max(1).step(0.1).name('Smoothing')
pathFolder.add(pathParameters, 'velocityProfile', ['trapezoidal', 's-curve', 'polynomial']).name('Velocity Profile')
pathFolder.add(pathParameters, 'maxVelocity').min(0.1).max(10).step(0.1).name('Max Vel (m/s)')
pathFolder.add(pathParameters, 'maxAcceleration').min(0.1).max(20).step(0.1).name('Max Accel (m/s²)')
pathFolder.add(pathParameters, 'planPath').name('🗺️ Plan Path')
pathFolder.add(pathParameters, 'executePath').name('Execute Path')
pathFolder.add(pathParameters, 'loopPath').name('Loop Path')
pathFolder.add(pathParameters, 'showPath').name('Show Path')
    .onChange(() => { if (plannedPath) plannedPath.visible = pathParameters.showPath })
pathFolder.addColor(pathParameters, 'pathColor').name('Path Color')

// Collision Detection
const collisionFolder = gui.addFolder('🛡️ Collision Detection')
collisionFolder.add(collisionParameters, 'enabled').name('Enabled')
collisionFolder.add(collisionParameters, 'checkSelfCollision').name('Self Collision')
collisionFolder.add(collisionParameters, 'checkEnvironmentCollision').name('Environment Collision')
collisionFolder.add(collisionParameters, 'collisionMargin').min(0).max(0.5).step(0.01).name('Margin (m)')
collisionFolder.add(collisionParameters, 'showCollisionBounds').name('Show Bounds')
collisionFolder.add(collisionParameters, 'addObstacle').name('➕ Add Obstacle')
collisionFolder.add(collisionParameters, 'clearObstacles').name('🗑️ Clear Obstacles')
collisionFolder.add(collisionParameters, 'obstacleCount').name('Obstacle Count').disable().listen()
collisionFolder.add(collisionParameters, 'safetyStop').name('Safety Stop')

// Sensors
const sensorFolder = gui.addFolder('📡 Sensor Simulation')
sensorFolder.add(sensorParameters, 'lidarEnabled').name('LIDAR Enabled')
sensorFolder.add(sensorParameters, 'lidarRange').min(1).max(50).step(1).name('LIDAR Range (m)')
sensorFolder.add(sensorParameters, 'lidarFOV').min(30).max(360).step(10).name('LIDAR FOV (°)')
sensorFolder.add(sensorParameters, 'lidarVisualization').name('Show LIDAR')
sensorFolder.add(sensorParameters, 'forceSensorEnabled').name('Force Sensor')
sensorFolder.add(sensorParameters, 'forceThreshold').min(0).max(100).step(1).name('Force Threshold (N)')
sensorFolder.add(sensorParameters, 'imuEnabled').name('IMU Enabled')
sensorFolder.add(sensorParameters, 'cameraEnabled').name('Camera Enabled')
sensorFolder.add(sensorParameters, 'showCameraFrustum').name('Show Frustum')

// Dynamics
const dynamicsFolder = gui.addFolder('⚡ Dynamics & Physics')
dynamicsFolder.add(dynamicsParameters, 'enableGravity').name('Enable Gravity')
dynamicsFolder.add(dynamicsParameters, 'gravityY').min(-20).max(0).step(0.1).name('Gravity (m/s²)')
dynamicsFolder.add(dynamicsParameters, 'enableInertia').name('Enable Inertia')
dynamicsFolder.add(dynamicsParameters, 'mass').min(1).max(200).step(1).name('Mass (kg)')
dynamicsFolder.add(dynamicsParameters, 'friction').min(0).max(1).step(0.01).name('Friction')
dynamicsFolder.add(dynamicsParameters, 'damping').min(0).max(1).step(0.01).name('Damping')
dynamicsFolder.add(dynamicsParameters, 'showCenterOfMass').name('Show CoM')
dynamicsFolder.add(dynamicsParameters, 'showForceVectors').name('Show Forces')

// Motion Control
const motionFolder = gui.addFolder('🎮 Motion Control')
motionFolder.add(motionParameters, 'controlMode', ['position', 'velocity', 'torque', 'impedance']).name('Control Mode')
motionFolder.add(motionParameters, 'enableAnimation').name('Enable Animation')
motionFolder.add(motionParameters, 'animationType', ['none', 'rotation', 'linear', 'circular', 'sinusoidal']).name('Animation Type')
motionFolder.add(motionParameters, 'angularVelocityX').min(-5).max(5).step(0.01).name('ω X (rad/s)')
motionFolder.add(motionParameters, 'angularVelocityY').min(-5).max(5).step(0.01).name('ω Y (rad/s)')
motionFolder.add(motionParameters, 'angularVelocityZ').min(-5).max(5).step(0.01).name('ω Z (rad/s)')
motionFolder.add(motionParameters, 'followTrajectory').name('Follow Trajectory')
motionFolder.add(motionParameters, 'trajectorySpeed').min(0.1).max(5).step(0.1).name('Traj Speed')

// Workspace Analysis
const workspaceFolder = gui.addFolder('📊 Workspace Analysis')
workspaceFolder.add(workspaceParameters, 'workspaceType', ['reachable', 'dexterous', 'force']).name('Type')
workspaceFolder.add(workspaceParameters, 'resolution').min(5).max(50).step(5).name('Resolution')
workspaceFolder.add(workspaceParameters, 'computeWorkspace').name('🔍 Compute')
workspaceFolder.add(workspaceParameters, 'showWorkspaceCloud').name('Show Cloud')
    .onChange(() => { if (workspaceCloud) workspaceCloud.visible = workspaceParameters.showWorkspaceCloud })
workspaceFolder.addColor(workspaceParameters, 'workspaceColor').name('Cloud Color')
workspaceFolder.add(workspaceParameters, 'workspaceOpacity').min(0).max(1).step(0.05).name('Opacity')
workspaceFolder.add(workspaceParameters, 'clearWorkspace').name('🗑️ Clear')

// Visualization
const visualFolder = gui.addFolder('👁️ Visualization')
visualFolder.add(visualizationParameters, 'renderMode', ['hologram', 'solid', 'wireframe', 'points', 'xray']).name('Render Mode')
    .onChange(() => { material.wireframe = visualizationParameters.renderMode === 'wireframe' })
visualFolder.addColor(visualizationParameters, 'materialColor').name('Color')
    .onChange(() => { material.uniforms.uColor.value.set(visualizationParameters.materialColor) })
visualFolder.add(visualizationParameters, 'opacity').min(0).max(1).step(0.01).name('Opacity')
visualFolder.add(visualizationParameters, 'aberrationStrength').min(0).max(10).step(0.1).name('Aberration')
    .onChange(() => { material.uniforms.uAberrationStrength.value = visualizationParameters.aberrationStrength })
visualFolder.add(visualizationParameters, 'showBoundingBox').name('Bounding Box')
    .onChange(() => { if (boundingBoxHelper) boundingBoxHelper.visible = visualizationParameters.showBoundingBox })
visualFolder.add(visualizationParameters, 'showBoundingSphere').name('Bounding Sphere')
    .onChange(() => { if (boundingSphereHelper) boundingSphereHelper.visible = visualizationParameters.showBoundingSphere })
visualFolder.add(visualizationParameters, 'showLocalAxes').name('Local Axes')
    .onChange(() => { if (localAxesHelper) localAxesHelper.visible = visualizationParameters.showLocalAxes })
visualFolder.add(visualizationParameters, 'showTrajectory').name('Trajectory')
visualFolder.add(visualizationParameters, 'trajectoryLength').min(10).max(1000).step(10).name('Traj Length')
visualFolder.add(visualizationParameters, 'showVelocityVectors').name('Velocity Vectors')
visualFolder.add(visualizationParameters, 'showGrid').name('Grid')
    .onChange(() => { gridHelper.visible = visualizationParameters.showGrid })
visualFolder.add(visualizationParameters, 'showOrigin').name('Origin')
    .onChange(() => { axesHelper.visible = visualizationParameters.showOrigin })
visualFolder.add(visualizationParameters, 'ambientIntensity').min(0).max(2).step(0.1).name('Ambient Light')
    .onChange(() => { ambientLight.intensity = visualizationParameters.ambientIntensity })
visualFolder.add(visualizationParameters, 'shadowsEnabled').name('Shadows')
    .onChange(() => {
        directionalLight.castShadow    = visualizationParameters.shadowsEnabled
        renderer.shadowMap.enabled     = visualizationParameters.shadowsEnabled
    })

// Camera
const cameraFolder = gui.addFolder('📷 Camera Control')
cameraFolder.add(cameraParameters, 'viewMode', ['free', 'fixed', 'tracking', 'cinematic']).name('View Mode')
cameraFolder.add(cameraParameters, 'fov').min(10).max(120).step(1).name('FOV')
    .onChange(() => { camera.fov = cameraParameters.fov; camera.updateProjectionMatrix() })
cameraFolder.add(cameraParameters, 'trackingTarget', ['robot', 'tool', 'custom']).name('Track Target')
cameraFolder.add(cameraParameters, 'trackingDistance').min(1).max(30).step(0.5).name('Track Distance')
cameraFolder.add(cameraParameters, 'autoRotate').name('Auto Rotate')
    .onChange(() => { controls.autoRotate = cameraParameters.autoRotate })
cameraFolder.add(cameraParameters, 'autoRotateSpeed').min(-10).max(10).step(0.5).name('Rotate Speed')
    .onChange(() => { controls.autoRotateSpeed = cameraParameters.autoRotateSpeed })
cameraFolder.add(cameraParameters, 'setTopView').name('📐 Top')
cameraFolder.add(cameraParameters, 'setFrontView').name('📐 Front')
cameraFolder.add(cameraParameters, 'setSideView').name('📐 Side')
cameraFolder.add(cameraParameters, 'setIsometricView').name('📐 Isometric')
cameraFolder.add(cameraParameters, 'resetCamera').name('🔄 Reset')

// Simulation
const simulationFolder = gui.addFolder('⚙️ Simulation Control')
simulationFolder.add(simulationParameters, 'running').name('Running').listen()
simulationFolder.add(simulationParameters, 'timeScale').min(0.1).max(10).step(0.1).name('Time Scale')
simulationFolder.add(simulationParameters, 'fixedTimestep').name('Fixed Timestep')
simulationFolder.add(simulationParameters, 'deltaTime').min(0.001).max(0.1).step(0.001).name('Δt (s)')
simulationFolder.add(simulationParameters, 'simulationRate').min(10).max(1000).step(10).name('Rate (Hz)').disable()
simulationFolder.add(simulationParameters, 'currentTime').name('Sim Time (s)').disable().listen()
simulationFolder.add(simulationParameters, 'stepSimulation').name('⏯️ Single Step')
simulationFolder.add(simulationParameters, 'resetSimulation').name('🔄 Reset')
simulationFolder.add(simulationParameters, 'recordSimulation').name('⏺️ Record')

// Telemetry
const telemetryFolder = gui.addFolder('📊 Telemetry')
telemetryFolder.add(telemetryParameters, 'enableLogging').name('Enable Logging')
telemetryFolder.add(telemetryParameters, 'logFrequency').min(1).max(100).step(1).name('Freq (Hz)')
telemetryFolder.add(telemetryParameters, 'showTelemetry').name('Show Display')
telemetryFolder.add(telemetryParameters, 'controlFrequency').name('Control Hz').disable().listen()
telemetryFolder.add(telemetryParameters, 'communicationLatency').name('Latency (ms)').disable().listen()
telemetryFolder.add(telemetryParameters, 'errorCount').name('Errors').disable().listen()
telemetryFolder.add(telemetryParameters, 'exportTelemetry').name('📤 Export')
telemetryFolder.add(telemetryParameters, 'clearBuffer').name('🗑️ Clear Buffer')

// Performance
const perfFolder = gui.addFolder('⚡ Performance')
perfFolder.add(performanceParameters, 'showStats').name('Show Stats')
perfFolder.add(performanceParameters, 'fps').name('FPS').disable().listen()
perfFolder.add(performanceParameters, 'frameTime').name('Frame (ms)').disable().listen()
perfFolder.add(performanceParameters, 'renderTime').name('Render (ms)').disable().listen()
perfFolder.add(performanceParameters, 'memoryMB').name('Memory (MB)').disable().listen()

// Background colour
gui.addColor(rendererParameters, 'clearColor').name('Background')
    .onChange(() => { renderer.setClearColor(rendererParameters.clearColor) })

/**
 * ==================== ANIMATION LOOP ====================
 */
const clock      = new THREE.Clock()
let frameCount   = 0
let fpsTime      = 0

const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    // Use a consistent delta — avoid calling getDelta() twice (it resets the internal timer)
    const deltaTime   = simulationParameters.fixedTimestep
        ? simulationParameters.deltaTime
        : Math.min(clock.getDelta(), 0.05) // cap at 50ms to avoid spiral-of-death

    // FPS counter
    frameCount++
    if (elapsedTime - fpsTime > 0.5) {
        const elapsed = elapsedTime - fpsTime
        performanceParameters.fps         = Math.round(frameCount / elapsed)
        performanceParameters.frameTime   = ((elapsed / frameCount) * 1000).toFixed(1)
        performanceParameters.controlFrequency   = performanceParameters.fps
        telemetryParameters.controlFrequency     = performanceParameters.fps
        frameCount = 0
        fpsTime    = elapsedTime
    }

    // Simulation time
    if (simulationParameters.running) {
        simulationParameters.currentTime += deltaTime * simulationParameters.timeScale
        telemetryParameters.uptime = Math.round(simulationParameters.currentTime)
    }

    // Shader time
    material.uniforms.uTime.value = elapsedTime

    if (customModel && simulationParameters.running) {
        // Motion control
        if (motionParameters.enableAnimation) {
            if (motionParameters.animationType === 'rotation') {
                customModel.rotation.x += motionParameters.angularVelocityX * deltaTime
                customModel.rotation.y += motionParameters.angularVelocityY * deltaTime
                customModel.rotation.z += motionParameters.angularVelocityZ * deltaTime
            } else if (motionParameters.animationType === 'linear') {
                customModel.position.x += motionParameters.velocityX * deltaTime
                customModel.position.y += motionParameters.velocityY * deltaTime
                customModel.position.z += motionParameters.velocityZ * deltaTime
            } else if (motionParameters.animationType === 'circular') {
                customModel.position.x = Math.cos(elapsedTime) * 3
                customModel.position.z = Math.sin(elapsedTime) * 3
            }

            // Sync kinematics display
            kinematicsParameters.positionX = customModel.position.x
            kinematicsParameters.positionY = customModel.position.y
            kinematicsParameters.positionZ = customModel.position.z
        }

        // Trajectory recording
        if (visualizationParameters.showTrajectory) {
            trajectoryPoints.push(customModel.position.clone())
            if (trajectoryPoints.length > visualizationParameters.trajectoryLength) {
                trajectoryPoints.shift()
            }
            if (trajectoryPoints.length > 1) {
                if (trajectoryLine) {
                    scene.remove(trajectoryLine)
                    trajectoryLine.geometry.dispose()
                    trajectoryLine.material.dispose()
                }
                trajectoryLine = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(trajectoryPoints),
                    new THREE.LineBasicMaterial({ color: 0x00ff00 })
                )
                scene.add(trajectoryLine)
            }
        }

        // Velocity vector
        if (visualizationParameters.showVelocityVectors && velocityArrow) {
            const vel   = new THREE.Vector3(motionParameters.velocityX, motionParameters.velocityY, motionParameters.velocityZ)
            const speed = vel.length()
            if (speed > 0.01) {
                velocityArrow.setDirection(vel.normalize())
                velocityArrow.setLength(speed * visualizationParameters.vectorScale)
                velocityArrow.visible = true
            } else {
                velocityArrow.visible = false
            }
        }

        // Update bounding box helper
        if (boundingBoxHelper && visualizationParameters.showBoundingBox) {
            boundingBoxHelper.box.setFromObject(customModel)
        }

        // Camera tracking mode
        if (cameraParameters.viewMode === 'tracking') {
            const offset = new THREE.Vector3(
                cameraParameters.trackingDistance,
                cameraParameters.trackingHeight,
                cameraParameters.trackingDistance
            )
            camera.position.lerp(customModel.position.clone().add(offset), cameraParameters.trackingSmoothing)
            camera.lookAt(customModel.position)
        }
    }

    // Sync frame positions
    baseFrame.position.set(frameParameters.baseFrameX, frameParameters.baseFrameY, frameParameters.baseFrameZ)
    targetFrame.position.set(kinematicsParameters.positionX, kinematicsParameters.positionY, kinematicsParameters.positionZ)

    // Telemetry logging
    if (telemetryParameters.enableLogging) {
        const logInterval = 1 / telemetryParameters.logFrequency
        if (elapsedTime % logInterval < deltaTime) {
            telemetryParameters.dataBuffer.push({
                time:     simulationParameters.currentTime,
                position: { x: kinematicsParameters.positionX, y: kinematicsParameters.positionY, z: kinematicsParameters.positionZ },
                joints:   { j1: jointParameters.joint1, j2: jointParameters.joint2, j3: jointParameters.joint3 }
            })
            if (telemetryParameters.dataBuffer.length > telemetryParameters.bufferSize) {
                telemetryParameters.dataBuffer.shift()
            }
        }
    }

    controls.update()

    const renderStart = performance.now()
    renderer.render(scene, camera)
    performanceParameters.renderTime = (performance.now() - renderStart).toFixed(2)

    if (performance.memory) {
        performanceParameters.memoryMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1)
    }

    window.requestAnimationFrame(tick)
}

tick()

// Open key folders by default
kinematicsFolder.open()
visualFolder.open()
simulationFolder.open()