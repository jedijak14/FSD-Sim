/* ============================================================
   FSD-Sim — Tesla Model 3 Simulator
   Real-time driving game. Not affiliated with Tesla, Inc.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Audio } from './audio.js';
import { buildInterior, updateInterior } from './interior.js';
import { buildWorld, updateWorld, nearestAhead, signalAhead } from './world.js';
import { Autopilot, DriveMode } from './fsd.js';
import { TeslaUI } from './ui.js';

// ---------- vignette / film grain shader ----------
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 0.55 },
    vignette: { value: 0.85 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float opacity;
    uniform float vignette;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float dist = distance(vUv, vec2(0.5));
      color.rgb *= mix(vec3(1.0), vec3(0.0), smoothstep(0.0, vignette, dist) * opacity);
      gl_FragColor = color;
    }
  `
};

const loadFill = document.getElementById('loadFill');
const loadText = document.getElementById('loadText');
const loadPct = document.getElementById('loadPct');
let loadTarget = 0;
let loadCurrent = 0;

function setLoad(p, t) {
  loadTarget = Math.min(100, Math.max(0, p));
  if (t && loadText) loadText.textContent = t;
  if (loadPct) loadPct.textContent = Math.round(loadTarget) + '%';
}

// Smoothly animate the loading bar toward target
function tickLoad() {
  loadCurrent += (loadTarget - loadCurrent) * 0.10;
  if (loadFill) loadFill.style.width = Math.round(loadCurrent) + '%';
  if (Math.abs(loadTarget - loadCurrent) < 0.5) {
    loadCurrent = loadTarget;
    if (loadFill) loadFill.style.width = loadCurrent + '%';
  }
  return loadCurrent < 100 || Math.abs(loadTarget - loadCurrent) > 0.5;
}

window.GAME = null;

async function main() {
  await Audio.start();

  const canvas = document.getElementById('glcanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080a0f);
  scene.fog = new THREE.FogExp2(0x080a0f, 0.0015);

  // ---------- lights ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1.3);
  dir.position.set(-50, 70, 30);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.near = 5; dir.shadow.camera.far = 200;
  dir.shadow.camera.left = -40; dir.shadow.camera.right = 40;
  dir.shadow.camera.top = 40; dir.shadow.camera.bottom = -40;
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0x5a7aa0, 0.4);
  fill.position.set(50, 25, -25);
  scene.add(fill);
  const hemi = new THREE.HemisphereLight(0x1a2a4a, 0x0a0a0a, 0.6);
  scene.add(hemi);

  // ---------- world ----------
  const world = buildWorld();
  const { group: worldGroup, cars, signals, stops, streetLights } = world;
  scene.add(worldGroup);

// ---------- preload all assets with real progress ----------
  const loaderMgr = new THREE.LoadingManager();
  let assetsLoaded = 0;
  const assetsTotal = 2; // GLB + road texture
  loaderMgr.onProgress = (url, loaded, total) => {
    const pct = Math.round((loaded / total) * 60); // 0-60% for asset loading
    setLoad(pct, 'loading assets…');
  };
  loaderMgr.onLoad = () => {
    assetsLoaded = assetsTotal;
    setLoad(60, 'assets ready');
  };

  // preload road texture + GLB exterior through the manager
  const texLoader = new THREE.TextureLoader(loaderMgr);
  const gltfLoader = new GLTFLoader(loaderMgr);

  let roadTex = null;
  texLoader.load('assets/textures/gltf_embedded_5.png', (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 400);
    tex.encoding = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    roadTex = tex;
  });

  let exterior = null;
  let gltfResult = null;
  try {
    setLoad(10, 'loading exterior model…');
    gltfResult = await new Promise((res, rej) => {
      gltfLoader.load('assets/source/tesla_white_car_.glb', res, undefined, rej);
    });
    exterior = gltfResult.scene;
    exterior.scale.set(0.9, 0.9, 0.9);
    exterior.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    exterior.position.set(0, 0.6, 0);
    exterior.visible = false;
    scene.add(exterior);
  } catch (e) {
    console.warn('GLB load failed, using smooth proxy:', e);
  }

  // wait for all preloads to finish
  await new Promise(resolve => {
    const check = () => {
      if (assetsLoaded >= assetsTotal || loadCurrent >= 60) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });

  // apply road texture once loaded
  if (roadTex) {
    world.road.material.map = roadTex;
    world.road.material.needsUpdate = true;
  }

  // ---------- interior ----------
  const { group: interior, refs } = buildInterior();
  scene.add(interior);

  setLoad(70, 'building world…');

  const proxy = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.9, 0.55, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.3, flatShading: false })
  );
  body.rotation.z = Math.PI / 2; body.position.y = 0.05;
  body.castShadow = true; body.receiveShadow = true; proxy.add(body);
  const roof = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.68, 0.4, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.85, metalness: 0.1, flatShading: false })
  );
  roof.rotation.z = Math.PI / 2; roof.position.set(0, 0.5, 0.02); roof.scale.set(1, 0.62, 1);
  roof.castShadow = true; proxy.add(roof);
  proxy.visible = false;
  scene.add(proxy);

  // ---------- cameras ----------
  const fov = 55;
  const camFP = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
  const camTP = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
  let camera = camFP;
  let cameraMode = 'first';

  // ---------- post-processing ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.4, 0.85);
  composer.addPass(bloom);
  const vignette = new ShaderPass(VignetteShader);
  composer.addPass(vignette);

  // ---------- player state ----------
  const state = {
    x: 0, z: 0, lane: 0,
    speedKph: 0,
    gear: 'P',
    steer: 0, throttle: 0, brake: 0,
    blinker: 'off'
  };

  const autopilot = new Autopilot();
  const ui = new TeslaUI();
  window.GAME = {
    setDriveMode(m) { autopilot.setMode(m); state.autopilotOn = autopilot.isOn(); },
    notify(msg) { showNote(msg); },
    autopilot,
    ui
  };
  window.UI = ui;

  // ---------- input ----------
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.code] = true; onKeyDown(e); });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { Object.keys(keys).forEach(k => keys[k] = false); });

  function onKeyDown(e) {
    const c = e.code;
    if (c === 'Escape' || c === 'KeyT') { e.preventDefault(); ui.toggle(); }
    if (c === 'KeyC') { e.preventDefault(); toggleCamera(); }
    if (c === 'Digit1') { e.preventDefault(); autopilot.setMode(DriveMode.MANUAL); state.autopilotOn = false; }
    if (c === 'Digit2') { e.preventDefault(); autopilot.setMode(DriveMode.AUTO_STEER); state.autopilotOn = true; }
    if (c === 'Digit3') { e.preventDefault(); autopilot.setMode(DriveMode.FSD); state.autopilotOn = true; }
    if (c === 'KeyR') { e.preventDefault(); shiftGear('R'); }
    if (c === 'KeyD') { e.preventDefault(); shiftGear('D'); }
    if (c === 'KeyN') { e.preventDefault(); shiftGear('N'); }
    if (c === 'KeyP') {
      e.preventDefault();
      if (state.gear === 'P') autopilot.toggleAutopark();
      else if (Math.abs(state.speedKph) < 1.5) shiftGear('P');
      else showNote('Stop to shift to Park');
    }
    if (c === 'KeyL') { e.preventDefault(); state.blinker = state.blinker === 'off' ? 'left' : 'off'; Audio.playClick(); }
    if (c === 'KeyRight') { e.preventDefault(); state.blinker = state.blinker === 'off' ? 'right' : 'off'; Audio.playClick(); }
  }

  function shiftGear(g) {
    if (g === state.gear) return;
    if (Math.abs(state.speedKph) > 2 && g !== 'N') { showNote('Stop to shift'); return; }
    state.gear = g;
    showNote('Gear ' + g);
    Audio.playChime();
  }

  function toggleCamera() {
    cameraMode = cameraMode === 'first' ? 'third' : 'first';
    camera = cameraMode === 'first' ? camFP : camTP;
    if (cameraMode === 'first') {
      camFP.add(interior); interior.visible = true;
      exterior && (exterior.visible = false); proxy.visible = false;
    } else {
      scene.add(interior); interior.visible = false;
      exterior && (exterior.visible = true); proxy.visible = !exterior;
    }
    showNote(cameraMode === 'first' ? 'First Person' : 'Third Person');
  }
  toggleCamera();

  // ---------- HUD ----------
  const elSpeed = document.getElementById('speedVal');
  const elGear = document.getElementById('gearDisp');
  const elApMode = document.getElementById('apMode');
  const elApStatus = document.getElementById('apStatus');
  const elNote = document.getElementById('hudNote');
  function showNote(msg, ms = 2200) {
    if (!elNote) return;
    elNote.textContent = msg; elNote.style.display = 'block';
    clearTimeout(window._noteT);
    window._noteT = setTimeout(() => elNote.style.display = 'none', ms);
  }

  // ---------- loop ----------
  const clock = new THREE.Clock();

  setLoad(90, 'starting…');

  function loop() {
    requestAnimationFrame(loop);
    tickLoad();
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = performance.now();

    const accel = keys['KeyW'] || keys['ArrowUp'];
    const brakeKey = keys['KeyS'] || keys['ArrowDown'];
    const left = keys['KeyA'] || keys['ArrowLeft'];
    const right = keys['KeyD'] || keys['ArrowRight'];

    let throttle = 0, brake = 0, steer = 0;

    if (autopilot.isOn()) {
      const ap = autopilot.update(dt, state, { cars, signals, stops, nearestAhead, signalAhead });
      throttle = ap.throttle; brake = ap.brake; steer = ap.steer;
      state.gear = 'D';
      state.blinker = autopilot.getBlinker();
    } else {
      if (state.gear === 'D') { throttle = accel ? 1 : 0; brake = brakeKey ? 0.8 : 0; }
      if (state.gear === 'R') { throttle = accel ? 0.6 : 0; brake = brakeKey ? 0.8 : 0; }
      if (state.gear === 'N') { throttle = 0; brake = brakeKey ? 0.5 : 0; }
      if (state.gear === 'P') { brake = 1; throttle = 0; }

      let targetSteer = 0;
      if (left) targetSteer = -1;
      if (right) targetSteer = 1;
      steer = THREE.MathUtils.lerp(state.steer, targetSteer, 0.15);
      state.steer = steer;
      state.blinker = (Math.abs(steer) > 0.35) ? (steer > 0 ? 'right' : 'left') : 'off';
    }

    const sign = state.gear === 'R' ? -1 : 1;
    const acc = throttle * 30 - brake * 42;
    state.speedKph += acc * dt * sign;
    state.speedKph = THREE.MathUtils.clamp(state.speedKph, -25, 115);
    if (Math.abs(throttle) < 0.05 && brake < 0.05) state.speedKph *= (1 - dt * 1.1);
    if (Math.abs(state.speedKph) < 0.3) state.speedKph = 0;

    state.z += (state.speedKph / 3.6) * dt * sign;
    const laneTarget = state.steer * 2.8;
    state.lane = THREE.MathUtils.lerp(state.lane, laneTarget, dt * 2.0);
    state.x = state.lane;

    // collision / FSD reaction
    const lead = nearestAhead(world, state.z, state.lane, 42);
    if (lead && lead.dz < 5) {
      state.speedKph = Math.min(state.speedKph, lead.dz * 12);
      brake = Math.max(brake, 0.7);
    }

    // audio
    if (state.gear !== 'P') Audio.setMotor(throttle, Math.abs(state.speedKph));
    else Audio.stopMotor();

    // HUD
    elSpeed.textContent = Math.abs(Math.round(state.speedKph));
    elGear.textContent = state.gear;
    elGear.style.color = state.gear === 'D' ? '#4ade80' : state.gear === 'R' ? '#fbbf24' : '#fff';
    elApMode.textContent = autopilot.getStatus();
    elApStatus.textContent = autopilot.isOn() ? 'ON' : 'OFF';
    elApStatus.className = autopilot.isOn() ? 'ap-on' : 'ap-off';

    // cameras
    if (cameraMode === 'first') {
      camFP.position.set(state.x, 0.62, state.z);
      camFP.lookAt(state.x + steer * 1.5, 0.66, state.z + 24);
      camFP.rotation.x = THREE.MathUtils.lerp(camFP.rotation.x, brake * 0.03 - throttle * 0.015, 0.1);
    } else {
      const dist = 7.5, height = 3.6;
      camTP.position.set(state.x * 0.5, height, state.z - dist);
      camTP.lookAt(state.x, 0.9, state.z + 14);
    }

    updateInterior(refs, { steer, throttle, brake, gear: state.gear, blinker: state.blinker });

    updateWorld(world, { egoZ: state.z, egoSpeed: Math.abs(state.speedKph), egoLane: state.lane, dt, time });

    if (exterior) { exterior.position.set(state.x, 0.6, state.z); exterior.rotation.y = steer * 0.5; }
    proxy.position.set(state.x, 0.6, state.z); proxy.rotation.y = steer * 0.5;

    composer.render();
  }

  setLoad(100, 'ready');

  // animate loading bar to 100, wait minimum time, then fade out
  await new Promise(resolve => {
    const finish = () => {
      tickLoad();
      if (loadCurrent < 100 || Math.abs(loadTarget - loadCurrent) > 0.5) {
        requestAnimationFrame(finish);
      } else {
        resolve();
      }
    };
    finish();
  });

  // minimum loading screen display time for polish
  await new Promise(resolve => setTimeout(resolve, 800));

  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.transition = 'opacity 0.5s ease';
    loadingEl.style.opacity = '0';
    setTimeout(() => { loadingEl.style.display = 'none'; }, 500);
  }

  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camFP.aspect = camTP.aspect = w / h;
    camFP.updateProjectionMatrix(); camTP.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  });

  canvas.addEventListener('click', () => { Audio.start(); canvas.focus(); });
  canvas.focus();

  loop();
  showNote('FSD-Sim ready. W/S drive · A/D steer · C camera · 1/2/3 Autopilot · P Autopark · T Tesla UI · L blinker');
}

main().catch(err => { console.error(err); if (loadText) loadText.textContent = 'Error: ' + err.message; });
