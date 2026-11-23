/* ============================================================
   FSD-Sim — World (road, traffic, signals)
   Everything is smooth-shaded; no raw blocks for cars.
   ============================================================ */
import * as THREE from 'three';

const ROAD_W = 12;
const ROAD_SEG = 400;

export function buildWorld() {
  const group = new THREE.Group();
  group.name = 'world';

  // ---------- Sky / fog ----------
  const sky = new THREE.Group();
  const grad = new THREE.Mesh(
    new THREE.SphereGeometry(500, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x0b1020, side: THREE.BackSide, fog: false })
  );
  sky.add(grad);
  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(60, 24, 12),
    new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.35, side: THREE.BackSide, fog: false })
  );
  sunGlow.position.set(-120, 60, 80);
  sky.add(sunGlow);
  group.add(sky);

  // ---------- Ground (road + verges) ----------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.9, metalness: 0.1, flatShading: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_W, 4000, 1, 200),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0, metalness: 0.05, flatShading: false })
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  road.name = 'road';
  group.add(road);

  // lane markings (dashed)
  const dashGeo = new THREE.PlaneGeometry(0.35, 3.2, 2, 4);
  const dashMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 1.0, metalness: 0, flatShading: false });
  for (let i = -150; i < 150; i += 9) {
    const d = new THREE.Mesh(dashGeo, dashMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(0, 0.01, i * 13);
    d.receiveShadow = true;
    group.add(d);
  }
  // solid edge lines
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 1.0, metalness: 0 });
  [-ROAD_W / 2 - 0.1, ROAD_W / 2 + 0.1].forEach(x => {
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 4000), edgeMat);
    e.rotation.x = -Math.PI / 2;
    e.position.set(x, 0.011, 0);
    e.receiveShadow = true;
    group.add(e);
  });

  // ---------- Other cars (smooth, not blocks) ----------
  function makeCar(color) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.85, 0.55, 6, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25, flatShading: false })
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.55;
    body.castShadow = true; body.receiveShadow = true;
    car.add(body);

    const roof = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.62, 0.4, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.8, metalness: 0.1, flatShading: false })
    );
    roof.rotation.z = Math.PI / 2;
    roof.position.set(0, 0.5, 0.05);
    roof.scale.set(1, 0.7, 1);
    roof.castShadow = true;
    car.add(roof);

    // wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.2 });
    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.32, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    ['fl','fr','rl','rr'].forEach((k, i) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      const sx = i % 2 === 0 ? -0.82 : 0.82;
      const sz = i < 2 ? 0.62 : -0.62;
      w.position.set(sx, 0.52, sz);
      w.castShadow = true;
      car.add(w);
    });
    car.name = 'trafficCar';
    return car;
  }

  const cars = [];
  const colors = [0xffffff, 0x1a1a1a, 0x3a5a8a, 0x8a3a3a, 0x2a5a3a, 0xaa8a2a];
  for (let i = 0; i < 14; i++) {
    const c = makeCar(colors[Math.floor(Math.random() * colors.length)]);
    const lane = (i % 2 === 0 ? -1 : 1) * (ROAD_W / 2 - 1.2);
    const z = (i + 1) * 28 + Math.random() * 20 - 40;
    c.position.set(lane, 0.55, z);
    c.userData = { lane, speed: 22 + Math.random() * 14, z };
    group.add(c);
    cars.push(c);
  }

  // ---------- Traffic lights ----------
  function makeTrafficLight() {
    const tl = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 12), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    pole.position.y = 1.6;
    tl.add(pole);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.72, 0.18), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    box.position.y = 3.4;
    tl.add(box);
    const lights = [];
    ['red','yellow','green'].forEach((name, i) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0x110000, emissiveIntensity: 0 }));
      l.position.set(0, 3.4 + (1 - i) * 0.24, 0.105);
      l.name = name;
      tl.add(l);
      lights.push(l);
    });
    tl.userData = { lights, state: 'red', timer: 0 };
    tl.castShadow = true;
    return tl;
  }

  const signals = [];
  for (let i = 0; i < 4; i++) {
    const tl = makeTrafficLight();
    const lane = (i % 2 === 0 ? -1 : 1) * (ROAD_W / 2 - 1.6);
    const z = 60 + i * 130;
    tl.position.set(lane, 0, z);
    tl.userData.z = z;
    group.add(tl);
    signals.push(tl);
  }

  // ---------- Stop signs ----------
  function makeStopSign() {
    const ss = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 10), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    pole.position.y = 1.0;
    ss.add(pole);
    const sign = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.04, 8),
      new THREE.MeshStandardMaterial({ color: 0x9b0000, roughness: 0.6, metalness: 0.1 })
    );
    sign.rotation.x = Math.PI / 2;
    sign.position.y = 2.0;
    ss.add(sign);
    const txt = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    txt.rotation.x = Math.PI / 2;
    txt.position.y = 2.005;
    ss.add(txt);
    ss.userData = { z: 0 };
    ss.castShadow = true;
    return ss;
  }

  const stops = [];
  for (let i = 0; i < 3; i++) {
    const ss = makeStopSign();
    const lane = (i % 2 === 0 ? -1 : 1) * (ROAD_W / 2 - 1.0);
    const z = 100 + i * 150;
    ss.position.set(lane, 0, z);
    ss.userData.z = z;
    group.add(ss);
    stops.push(ss);
  }

  // ---------- Street lights ----------
  for (let i = -3; i <= 3; i++) {
    const sl = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 5, 10), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    pole.position.set(i * 18, 2.5, 0);
    sl.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffefc0, emissive: 0xffefc0, emissiveIntensity: 0.6 }));
    lamp.position.set(i * 18, 5, 0.15);
    sl.add(lamp);
    group.add(sl);
  }

  return { group, road, cars, signals, stops };
}

export function updateWorld(world, { egoZ, egoSpeed, egoLane, dt }) {
  // traffic is stationary; the ego drives past it. Respawn passed cars ahead.
  world.cars.forEach(c => {
    const dz = c.userData.z - egoZ;
    if (dz < -70) c.userData.z = egoZ + 340 + Math.random() * 60;
    c.position.z = c.userData.z;
    c.position.y = 0.55 + Math.sin(Date.now() * 0.002 + c.position.z) * 0.01;
  });

  // traffic light cycle
  world.signals.forEach(tl => {
    tl.userData.timer += dt;
    const cycle = 6;
    const phase = (tl.userData.timer % cycle) / cycle;
    let state = 'green';
    if (phase < 0.08) state = 'red';
    else if (phase < 0.12) state = 'yellow';
    tl.userData.state = state;
    tl.userData.lights.forEach(l => {
      const on = l.name === state;
      l.material.emissiveIntensity = on ? (l.name === 'red' ? 2 : 1.2) : 0;
      l.material.emissive = on ? (l.name === 'red' ? 0x550000 : l.name === 'yellow' ? 0x554400 : 0x003300) : 0x000000;
    });
  });
}

export function nearestAhead(world, egoZ, lane, range = 60) {
  let best = null;
  world.cars.forEach(c => {
    const dz = c.userData.z - egoZ;
    if (dz > 0 && dz < range && Math.abs(c.position.x - lane) < 1.6) {
      if (!best || dz < best.dz) best = { car: c, dz };
    }
  });
  return best;
}

export function signalAhead(world, egoZ, range = 55) {
  let light = null, stop = null;
  world.signals.forEach(tl => {
    const dz = tl.userData.z - egoZ;
    if (dz > 0 && dz < range && (!light || dz < light.dz)) light = { tl, dz };
  });
  world.stops.forEach(ss => {
    const dz = ss.userData.z - egoZ;
    if (dz > 0 && dz < range && (!stop || dz < stop.dz)) stop = { ss, dz };
  });
  return { light, stop };
}
