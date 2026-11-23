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

window.GAME = null;

async function main() {
  // Audio requires user gesture; start non-blocking, canvas click resumes it
  Audio.start().catch(() => {});

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

// ---------- load assets (async, no loading screen) ----------
  let roadTex = null;
  new THREE.TextureLoader().load('assets/textures/gltf_embedded_5.png', (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 400);
    tex.encoding = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    roadTex = tex;
    world.road.material.map = tex;
    world.road.material.needsUpdate = true;
  });

  let exterior = null;
  try {
    const gltf = await Promise.race([
      new Promise((res, rej) => {
        new GLTFLoader().load('assets/source/tesla_white_car_.glb', res, undefined, rej);
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('GLB load timeout')), 15000))
    ]);
    exterior = gltf.scene;
    exterior.scale.set(0.9, 0.9, 0.9);
    exterior.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    exterior.position.set(0, 0.6, 0);
    exterior.visible = false;
    scene.add(exterior);
  } catch (e) {
    console.warn('GLB load failed/timeout, using smooth proxy:', e);
  }

  // ---------- interior ----------
  const { group: interior, refs } = buildInterior();
  scene.add(interior);

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

  // ---------- start menu ----------\n  const startMenu = document.getElementById('startMenu');\n  const startBtn = document.getElementById('startBtn');\n  let gameStarted = false;\n  startBtn.addEventListener('click', () => {\n    startMenu.style.opacity = '0';\n    setTimeout(() => { startMenu.style.display = 'none'; }, 400);\n    gameStarted = true;\n    toggleCamera();\n    loop();\n    showNote('FSD-Sim ready. W/S drive · A/D steer · C camera · 1/2/3 Autopilot · P Autopark · T Tesla UI · L blinker');\n    Audio.start();\n  });\n\n  // ---------- loop ----------
  const clock = new THREE.Clock();

  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = performance.now();

    const accel = keys['KeyW'] || keys['ArrowUp'];
    const brakeKey = keys['KeyS'] || keys['ArrowDown'];
    const left = keys['KeyA'] || keys['ArrowLeft'];
    const right = keys['KeyD'] || keys['ArrowRight'];

    let throttle = 0, brake = 0, steer = 0;
    let acc = 0;
    const accelInput = accel ? 1 : 0;
    const brakeInput = brakeKey ? 1 : 0;

    if (autopilot.isOn()) {
      const ap = autopilot.update(dt, state, { cars, signals, stops, nearestAhead, signalAhead });
      throttle = ap.throttle; brake = ap.brake; steer = ap.steer;
      state.gear = 'D';
      state.blinker = autopilot.getBlinker();
    } else {
      if (state.gear === 'D' || state.gear === 'R') {
        acc = accelInput * 28 - brakeInput * 38;
      } else if (state.gear === 'N') {
        acc = -brakeInput * 20;
      }
      // P gear: strong hold brake
      if (state.gear === 'P') { acc = -Math.abs(state.speedKph) * 2; }
    }

    const sign = state.gear === 'R' ? -1 : 1;

    if (!autopilot.isOn()) {
      state.speedKph += acc * dt * sign;
      state.speedKph = THREE.MathUtils.clamp(state.speedKph, -25, 115);

      // natural drag / roll resistance
      if (accelInput < 0.05 && brakeInput < 0.05) {
        state.speedKph *= (1 - dt * 0.9);
      }
      if (Math.abs(state.speedKph) < 0.2) state.speedKph = 0;

      state.z += (state.speedKph / 3.6) * dt * sign;

      // speed-dependent steering (less sensitive at high speed)
      const speedSteerFactor = Math.max(0.25, 1 - Math.abs(state.speedKph) / 120);
      const maxSteer = state.gear === 'R' ? 1.0 : 1.6;
      const steerSpeed = state.gear === 'R' ? 1.2 : 2.0;

      let targetSteer = 0;
      if (left) targetSteer = -1;
      if (right) targetSteer = 1;
      steer = THREE.MathUtils.lerp(state.steer, targetSteer * maxSteer, dt * steerSpeed * speedSteerFactor);
      state.steer = steer;
      state.blinker = (Math.abs(steer) > 0.35) ? (steer > 0 ? 'right' : 'left') : 'off';

      const laneTarget = state.steer * 2.6;
      state.lane = THREE.MathUtils.lerp(state.lane, laneTarget, dt * 1.8 * speedSteerFactor);
      state.x = state.lane;
    }

    // collision / FSD reaction
    const lead = nearestAhead(world, state.z, state.lane, 42);
    if (lead && lead.dz < 5) {
      state.speedKph = Math.min(state.speedKph, lead.dz * 10);
      brake = Math.max(brake, 0.8);
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

main().catch(err => {
  console.error(err);
  const ov = document.getElementById('errorOverlay');
  const msg = document.getElementById('errorMsg');
  if (ov) { ov.style.display = 'flex'; }
  if (msg) { msg.textContent = err?.message || String(err); }
  document.getElementById('errorReload')?.addEventListener('click', () => location.reload());
});
