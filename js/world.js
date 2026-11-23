/* ============================================================
   FSD-Sim — World (expanded map)
   Procedural road network: straight + curved segments,
   intersections, buildings, sidewalks, street lights,
   traffic lights, stop signs, smooth traffic cars.
   ============================================================ */
import * as THREE from 'three';

const ROAD_W = 10.0;
const LANE_W = ROAD_W / 2;

export function buildWorld() {
  const group = new THREE.Group();
  group.name = 'world';

  // ---------- sky / fog ----------
  const sky = new THREE.Group();
  const skyGrad = new THREE.Mesh(
    new THREE.SphereGeometry(600, 40, 20),
    new THREE.MeshBasicMaterial({ color: 0x0b1220, side: THREE.BackSide, fog: false })
  );
  sky.add(skyGrad);
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(40, 24, 12),
    new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.5, side: THREE.BackSide, fog: false })
  );
  sun.position.set(-150, 70, 100);
  sky.add(sun);
  group.add(sky);

  // ---------- ground ----------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.95, metalness: 0.05, flatShading: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // ---------- road system ----------
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_W, 6000, 1, 200),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0, metalness: 0.05, flatShading: false })
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  road.name = 'road';
  group.add(road);

  // sidewalks / curbs
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9, metalness: 0.0, flatShading: false });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 1.0, metalness: 0.0, flatShading: false });
  [-ROAD_W / 2 - 0.12, ROAD_W / 2 + 0.12].forEach((x, i) => {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 6000), curbMat);
    c.rotation.x = -Math.PI / 2; c.position.set(x, 0.006, 0); c.receiveShadow = true; group.add(c);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 6000), walkMat);
    w.rotation.x = -Math.PI / 2; c.position.set(x, 0.006, 0); w.position.set(x + (i === 0 ? -3.08 : 3.08), 0.005, 0); w.receiveShadow = true; group.add(w);
  });

  // lane markings (dashed center + solid edges)
  const dashMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 1.0, metalness: 0, flatShading: false });
  for (let i = -200; i < 200; i += 11) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 3.4), dashMat);
    d.rotation.x = -Math.PI / 2; d.position.set(0, 0.007, i * 13); d.receiveShadow = true; group.add(d);
  }
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 1.0, metalness: 0, flatShading: false });
  [-ROAD_W / 2 - 0.06, ROAD_W / 2 + 0.06].forEach(x => {
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 6000), edgeMat);
    e.rotation.x = -Math.PI / 2; e.position.set(x, 0.008, 0); e.receiveShadow = true; group.add(e);
  });

  // glass material for car windows
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.0, metalness: 0.95, transparent: true, opacity: 0.55, flatShading: false
  });

  // ---------- traffic cars (smooth, not blocks) ----------
  const cars = [];
  const carColors = [0xffffff, 0x111111, 0x2a3a5a, 0x5a2a2a, 0x2a5a3a, 0xaa8a2a, 0x5a3a5a, 0x3a3a3a];

  function makeCar(color) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.88, 0.52, 8, 20),
      new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.28, flatShading: false })
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.55;
    body.castShadow = true; body.receiveShadow = true;
    car.add(body);

    const roof = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.66, 0.38, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.82, metalness: 0.12, flatShading: false })
    );
    roof.rotation.z = Math.PI / 2;
    roof.position.set(0, 0.48, 0.04);
    roof.scale.set(1, 0.72, 1);
    roof.castShadow = true;
    car.add(roof);

    // windows
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.22, 0.7),
      matGlass
    );
    win.rotation.z = Math.PI / 2;
    win.position.set(0, 0.52, 0.0);
    car.add(win);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f0f0f, roughness: 0.92, metalness: 0.2 });
    const wheelGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.34, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelPos = [[-0.84, 0.62], [0.84, 0.62], [-0.84, -0.62], [0.84, -0.62]];
    wheelPos.forEach(([sx, sz]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(sx, 0.52, sz);
      w.castShadow = true;
      car.add(w);
    });

    // lights
    const headL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), new THREE.MeshStandardMaterial({ color: 0xffddaa, emissive: 0xffddaa, emissiveIntensity: 0 }));
    headL.position.set(-0.78, 0.42, 0.82);
    const headR = headL.clone(); headR.position.set(0.78, 0.42, 0.82);
    const tailL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0x330000, emissiveIntensity: 0 }));
    tailL.position.set(-0.78, 0.42, -0.82);
    const tailR = tailL.clone(); tailR.position.set(0.78, 0.42, -0.82);
    car.add(headL, headR, tailL, tailR);
    car.userData = { headL, headR, tailL, tailR };

    car.name = 'trafficCar';
    return car;
  }

  for (let i = 0; i < 18; i++) {
    const c = makeCar(carColors[Math.floor(Math.random() * carColors.length)]);
    const lane = (i % 2 === 0 ? -1 : 1) * (LANE_W - 1.0);
    const z = (i + 1) * 34 + Math.random() * 24 - 40;
    c.position.set(lane, 0.55, z);
    // Preserve headL/headR/tailL/tailR from makeCar; add sim state
    c.userData.lane = lane;
    c.userData.speed = 24 + Math.random() * 14;
    c.userData.z = z;
    c.userData.targetZ = z;
    group.add(c);
    cars.push(c);
  }

  // ---------- intersections ----------
  const intersections = [];
  const interZs = [120, 300, 480, 660, 840];
  interZs.forEach(z => {
    const inter = new THREE.Group();
    const box = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W + 4, ROAD_W + 4), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 }));
    box.rotation.x = -Math.PI / 2; box.position.set(0, 0.009, z); box.receiveShadow = true; inter.add(box);
    // crosswalk
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 1.0 });
    for (let k = -2; k <= 2; k++) {
      const cw = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 14), crossMat);
      cw.position.set(k * 1.0, 0.01, z); cw.receiveShadow = true; inter.add(cw);
      const cw2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.5), crossMat);
      cw2.rotation.z = Math.PI / 2; cw2.position.set(0, 0.01, z + k * 1.0); cw2.receiveShadow = true; inter.add(cw2);
    }
    group.add(inter);
    intersections.push({ z, box: inter });
  });

  // ---------- traffic lights ----------
  function makeTrafficLight() {
    const tl = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 12), new THREE.MeshStandardMaterial({ color: 0x1f1f1f }));
    pole.position.y = 1.7; tl.add(pole);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.72, 0.16), new THREE.MeshStandardMaterial({ color: 0x0f0f0f }));
    box.position.y = 3.55; tl.add(box);
    const lights = [];
    ['red', 'yellow', 'green'].forEach((name, i) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 14), new THREE.MeshStandardMaterial({ color: 0x110000, emissive: 0x110000, emissiveIntensity: 0 }));
      l.position.set(0, 3.55 + (1 - i) * 0.26, 0.105);
      l.name = name; tl.add(l); lights.push(l);
    });
    tl.userData = { lights, state: 'green', timer: Math.random() * 8 };
    tl.castShadow = true;
    return tl;
  }

  const signals = [];
  interZs.forEach((z, i) => {
    const laneSign = (i % 2 === 0 ? -1 : 1);
    const tl = makeTrafficLight();
    tl.position.set(laneSign * (LANE_W - 1.4), 0, z + 6);
    tl.userData.z = z;
    group.add(tl);
    signals.push(tl);
  });

  // ---------- stop signs ----------
  function makeStopSign() {
    const ss = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 10), new THREE.MeshStandardMaterial({ color: 0x1f1f1f }));
    pole.position.y = 1.1; ss.add(pole);
    const sign = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 8), new THREE.MeshStandardMaterial({ color: 0x9b0000, roughness: 0.65, metalness: 0.08 }));
    sign.rotation.x = Math.PI / 2; sign.position.y = 2.15; ss.add(sign);
    const txt = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.25, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    txt.rotation.x = Math.PI / 2; txt.position.y = 2.155; ss.add(txt);
    ss.userData = { z: 0 };
    ss.castShadow = true;
    return ss;
  }

  const stops = [];
  [200, 380, 560, 740].forEach((z, i) => {
    const ss = makeStopSign();
    const laneSign = (i % 2 === 0 ? -1 : 1);
    ss.position.set(laneSign * (LANE_W - 1.0), 0, z);
    ss.userData.z = z;
    group.add(ss);
    stops.push(ss);
  });

  // ---------- buildings ----------
  const buildings = [];
  function makeBuilding(x, z, w, h, d) {
    const b = new THREE.Group();
    const main = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x1e2228, roughness: 0.7, metalness: 0.1, flatShading: false }));
    main.position.y = h / 2; main.castShadow = true; main.receiveShadow = true; b.add(main);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1), new THREE.MeshStandardMaterial({ color: 0x0f0f0f, roughness: 0.5, metalness: 0.4 }));
    trim.position.set(0, h - 0.06, 0); b.add(trim);
    // windows
    const winMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, emissive: 0x1a222a, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.8 });
    const rows = Math.floor(h / 3.2);
    const cols = Math.floor(w / 2.4);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = -w / 2 + (c + 0.5) * (w / cols);
        const wy = (r + 0.5) * (h / rows);
        const wd = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.06), winMat);
        wd.position.set(wx, wy, d / 2 + 0.031);
        b.add(wd);
      }
    }
    b.position.set(x, 0, z);
    b.userData = { z, x };
    group.add(b);
    buildings.push(b);
    return b;
  }

  // buildings along both sides of the road
  for (let z = 40; z < 900; z += 60) {
    const side = (Math.floor(z / 60) % 2 === 0 ? -1 : 1);
    const bx = side * (LANE_W + 3.2 + Math.random() * 2);
    makeBuilding(bx, z, 10 + Math.random() * 8, 12 + Math.random() * 14, 14 + Math.random() * 10);
  }

  // ---------- city skyline (tall buildings at intervals) ----------
  const skyMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.6, metalness: 0.2, flatShading: false });
  [150, 320, 500, 680, 860].forEach((z, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const bx = side * (LANE_W + 6);
    const h = 24 + Math.random() * 16;
    const skyscraper = new THREE.Group();
    const main = new THREE.Mesh(new THREE.BoxGeometry(14, h, 12), skyMat);
    main.position.y = h / 2; main.castShadow = true; main.receiveShadow = true; skyscraper.add(main);
    // crown
    const crown = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 14), new THREE.MeshStandardMaterial({ color: 0x0f0f0f }));
    crown.position.y = h + 1; crown.castShadow = true; skyscraper.add(crown);
    // lit windows
    const winMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0x332200, emissiveIntensity: 0.8 });
    const rows = Math.floor(h / 2.5);
    const cols = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.7) {
          const wd = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.06), winMat);
          wd.position.set(-7 + (c + 0.5) * 3.5, r * 2.5 + 1.25, 6.031);
          skyscraper.add(wd);
        }
      }
    }
    skyscraper.position.set(bx, 0, z);
    skyscraper.userData = { z, x: bx };
    group.add(skyscraper);
    buildings.push(skyscraper);
  });

  // ---------- street furniture & trees ----------
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x0d2a0d, roughness: 0.9, metalness: 0 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9, metalness: 0 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.2 });
  [60, 180, 300, 420, 540, 660, 780].forEach((z, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const fx = side * (LANE_W + 6.5);
    // tree
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.5, 10), trunkMat);
    trunk.position.y = 1.75; trunk.castShadow = true; tree.add(trunk);
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5, 8), treeMat);
    foliage.position.y = 4.8; foliage.castShadow = true; tree.add(foliage);
    tree.position.set(fx, 0, z + side * 3);
    group.add(tree);
    // bench
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.4), benchMat);
    seat.position.set(0, 0.45, 0); seat.castShadow = true; bench.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.06), benchMat);
    back.position.set(0, 0.8, -0.23); back.castShadow = true; bench.add(back);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), benchMat);
    leg.position.set(-0.55, 0.22, 0); leg.castShadow = true; bench.add(leg);
    const leg2 = leg.clone(); leg2.position.set(0.55, 0.22, 0); bench.add(leg2);
    bench.position.set(fx, 0, z + side * 6);
    group.add(bench);
  });

  // ---------- bus stops ----------
  const busStopMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, metalness: 0.9 });
  [240, 480, 720].forEach((z, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const bsx = side * (LANE_W + 3);
    const bs = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 4), busStopMat);
    roof.position.set(0, 2.6, 0); roof.castShadow = true; bs.add(roof);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), busStopMat);
    pole.position.set(-1, 1.3, 0); pole.castShadow = true; bs.add(pole);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), glassMat);
    glass.position.set(-0.95, 1.5, 0.5); bs.add(glass);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0x332200 }));
    sign.position.set(-1, 2.4, 0.06); bs.add(sign);
    bs.position.set(bsx, 0, z + side * 2);
    group.add(bs);
  });

  // ---------- street lights ----------
  const streetLights = [];
  for (let z = 20; z < 900; z += 28) {
    const side = (Math.floor(z / 28) % 2 === 0 ? -1 : 1);
    const sl = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 5.2, 10), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    pole.position.set(side * (LANE_W + 2.4), 2.6, z);
    sl.add(pole);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    arm.position.set(side * (LANE_W + 2.4), 5.2, z + side * 0.8);
    arm.rotation.z = side * 0.25;
    sl.add(arm);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffefc0, emissive: 0xffefc0, emissiveIntensity: 0.4 }));
    lamp.position.set(side * (LANE_W + 2.4), 5.2, z + side * 1.7);
    sl.add(lamp);
    sl.userData = { lamp, z, on: false };
    group.add(sl);
    streetLights.push(sl);
  }

  return { group, road, cars, signals, stops, intersections, buildings, streetLights };
}

export function updateWorld(world, { egoZ, egoSpeed, egoLane, dt, time }) {
  // traffic: stationary, respawn ahead when passed
  world.cars.forEach(c => {
    const dz = c.userData.z - egoZ;
    if (dz < -80) c.userData.z = egoZ + 360 + Math.random() * 60;
    c.position.z = c.userData.z;
    c.position.y = 0.55 + Math.sin(time * 0.002 + c.position.z) * 0.008;
    // headlights/taillights dim by ego speed
    const on = egoSpeed > 6 || time % 2000 < 1000;
    c.userData.headL.material.emissiveIntensity = on ? 1.2 : 0;
    c.userData.headR.material.emissiveIntensity = on ? 1.2 : 0;
    c.userData.tailL.material.emissiveIntensity = 0.9;
    c.userData.tailR.material.emissiveIntensity = 0.9;
  });

  // traffic light cycles
  world.signals.forEach(tl => {
    tl.userData.timer += dt;
    const cycle = 7;
    const phase = (tl.userData.timer % cycle) / cycle;
    let state = 'green';
    if (phase < 0.10) state = 'red';
    else if (phase < 0.14) state = 'yellow';
    tl.userData.state = state;
    tl.userData.lights.forEach(l => {
      const on = l.name === state;
      l.material.emissiveIntensity = on ? (l.name === 'red' ? 2.0 : l.name === 'yellow' ? 1.4 : 1.2) : 0;
      l.material.emissive = on
        ? (l.name === 'red' ? 0x550000 : l.name === 'yellow' ? 0x554400 : 0x003300)
        : 0x000000;
    });
  });

  // street lights: on based on simple time-of-day-ish toggle
  const night = Math.sin(time * 0.0007) > 0.6;
  world.streetLights.forEach(sl => {
    sl.userData.lamp.material.emissiveIntensity = night ? 0.9 : 0.05;
  });
}

export function nearestAhead(world, egoZ, lane, range = 55) {
  let best = null;
  world.cars.forEach(c => {
    const dz = c.userData.z - egoZ;
    if (dz > 2 && dz < range && Math.abs(c.position.x - lane) < 1.7) {
      if (!best || dz < best.dz) best = { car: c, dz };
    }
  });
  return best;
}

export function signalAhead(world, egoZ, range = 55) {
  let light = null, stop = null;
  world.signals.forEach(tl => {
    const dz = tl.userData.z - egoZ;
    if (dz > 2 && dz < range && (!light || dz < light.dz)) light = { tl, dz };
  });
  world.stops.forEach(ss => {
    const dz = ss.userData.z - egoZ;
    if (dz > 2 && dz < range && (!stop || dz < stop.dz)) stop = { ss, dz };
  });
  return { light, stop };
}
