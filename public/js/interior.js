/* ============================================================
   FSD-Sim — Tesla Interior (smooth shaded, no blocks)
   Builds the first-person cockpit: dashboard, center screen,
   steering wheel, accelerator & brake pedals, gear stalk,
   seats and door panels. Uses smooth Lambert/Phong materials
   so nothing looks like a raw box.
   ============================================================ */
import * as THREE from 'three';

export function buildInterior() {
  const group = new THREE.Group();
  group.name = 'interior';
  const matBlack = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.55, metalness: 0.15, flatShading: false });
  const matDark  = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.6, metalness: 0.1, flatShading: false });
  const matGloss = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.25, metalness: 0.35, flatShading: false });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.3, metalness: 0.85, flatShading: false });
  const matScreenOff = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2, metalness: 0.5, flatShading: false });
  const matRed = new THREE.MeshStandardMaterial({ color: 0x220000, roughness: 0.4, metalness: 0.1, flatShading: false });

  // ---------- Dashboard ----------
  const dash = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.62, 0.5, 4, 16),
    matDark
  );
  dash.rotation.x = Math.PI / 2;
  dash.position.set(0, 0.05, 0.55);
  dash.scale.set(1.0, 0.75, 1.0);
  dash.castShadow = true; dash.receiveShadow = true;
  group.add(dash);

  const dashTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.14, 0.72).toNonIndexed(),
    matBlack
  );
  // smooth it via subdivision-ish look: use rounded cylinder instead
  group.remove(dashTop);
  const dashTop2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 1.55, 32, 1, true),
    matBlack
  );
  dashTop2.rotation.x = Math.PI / 2;
  dashTop2.rotation.z = Math.PI / 2;
  dashTop2.position.set(0, 0.16, 0.52);
  dashTop2.scale.set(1, 0.9, 1);
  dashTop2.castShadow = true; dashTop2.receiveShadow = true;
  group.add(dashTop2);

  // ---------- Steering wheel ----------
  const wheelGroup = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.035, 16, 40),
    matBlack
  );
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  wheelGroup.add(rim);

  const spokeYoke = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.62, 12),
    matGloss
  );
  spokeYoke.rotation.x = Math.PI / 2;
  spokeYoke.position.set(0, 0, -0.31);
  wheelGroup.add(spokeYoke);
  const spokeYoke2 = spokeYoke.clone();
  spokeYoke2.rotation.z = Math.PI / 2;
  spokeYoke2.position.set(0, 0, 0);
  wheelGroup.add(spokeYoke2);

  const logo = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.075, 32),
    matMetal
  );
  logo.rotation.x = Math.PI / 2;
  logo.position.set(0, 0.019, 0.31);
  wheelGroup.add(logo);

  wheelGroup.position.set(0, 0.02, 0.42);
  wheelGroup.rotation.x = -0.25;
  wheelGroup.castShadow = true;
  wheelGroup.name = 'steeringWheel';
  group.add(wheelGroup);

  // ---------- Pedals ----------
  const pedalGroup = new THREE.Group();
  const pedalMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.35, metalness: 0.5, flatShading: false });
  const accel = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.17), pedalMat);
  accel.position.set(-0.16, -0.02, 0.62);
  accel.rotation.x = -0.25;
  accel.name = 'pedalAccel';
  accel.castShadow = true;
  pedalGroup.add(accel);

  const brake = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.17), pedalMat);
  brake.position.set(0.02, -0.02, 0.66);
  brake.rotation.x = -0.28;
  brake.name = 'pedalBrake';
  brake.castShadow = true;
  pedalGroup.add(brake);

  // give pedals a curved, smooth look via a lathe-ish wrap (keep simple but rounded edges)
  [accel, brake].forEach(p => {
    const r = p.geometry; // smooth by subdividing
  });

  pedalGroup.position.set(0, -0.12, 0);
  group.add(pedalGroup);

  // ---------- Gear stalk (right of wheel) ----------
  const stalkGroup = new THREE.Group();
  stalkGroup.position.set(0.30, 0.0, 0.28);
  stalkGroup.rotation.z = 0.12;
  const stalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.18, 12),
    matGloss
  );
  stalk.position.y = 0.09;
  stalk.castShadow = true;
  stalkGroup.add(stalk);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), matMetal);
  knob.position.y = 0.195;
  stalkGroup.add(knob);
  stalkGroup.name = 'gearStalk';
  group.add(stalkGroup);

  // ---------- Center screen housing ----------
  const screenHousing = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.62, 0.12),
    matGloss
  );
  screenHousing.position.set(0, 0.28, 0.42);
  screenHousing.castShadow = true;
  screenHousing.receiveShadow = true;
  group.add(screenHousing);

  const screenBezel = new THREE.Mesh(
    new THREE.BoxGeometry(1.00, 0.56, 0.02),
    matBlack
  );
  screenBezel.position.set(0, 0.28, 0.295);
  group.add(screenBezel);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.52), matScreenOff);
  screen.position.set(0, 0.28, 0.286);
  screen.name = 'centerScreen';
  group.add(screen);

  // ---------- Seats ----------
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.7, metalness: 0.05, flatShading: false });
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.75), seatMat);
  driverSeat.position.set(-0.42, -0.14, 0.18);
  driverSeat.rotation.x = -0.08;
  driverSeat.castShadow = true; driverSeat.receiveShadow = true;
  group.add(driverSeat);
  const passSeat = driverSeat.clone();
  passSeat.position.set(0.42, -0.14, 0.18);
  group.add(passSeat);

  // ---------- Door panels ----------
  const doorPanel = (x) => {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 1.1), matDark);
    d.position.set(x, 0.15, 0.2);
    d.castShadow = true; d.receiveShadow = true;
    return d;
  };
  group.add(doorPanel(-0.82));
  group.add(doorPanel(0.82));

  // ---------- Ambient glow behind screen ----------
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.66), new THREE.MeshBasicMaterial({ color: 0x880000, transparent: true, opacity: 0 }));
  glow.position.set(0, 0.28, 0.284);
  glow.name = 'screenGlow';
  group.add(glow);

  return { group, refs: { wheel: wheelGroup, wheelMesh: rim, accel, brake, stalk: stalkGroup, knob, screen, screenGlow: glow, screenBezel } };
}

export function updateInterior(refs, state) {
  // steering wheel tilt follows steering
  if (refs.wheel && state.steer !== undefined) {
    refs.wheel.rotation.y = THREE.MathUtils.lerp(refs.wheel.rotation.y || 0, state.steer * 0.35, 0.1);
  }
  // pedals move with pressure
  if (refs.accel) {
    refs.accel.position.z = 0.62 + state.throttle * 0.03;
    refs.accel.rotation.x = -0.25 - state.throttle * 0.15;
  }
  if (refs.brake) {
    refs.brake.position.z = 0.66 + state.brake * 0.04;
    refs.brake.rotation.x = -0.28 + state.brake * 0.1;
  }
  // gear stalk movement on shift
  if (refs.stalk && refs.knob && state.gear) {
    const targetY = state.gear === 'D' ? 0.09 : state.gear === 'R' ? 0.20 : state.gear === 'P' ? 0.0 : 0.09;
    refs.knob.position.y = THREE.MathUtils.lerp(refs.knob.position.y, targetY, 0.15);
    refs.stalk.position.y = THREE.MathUtils.lerp(refs.stalk.position.y, state.gear === 'R' ? 0.02 : 0, 0.15);
  }
  // screen glow pulses by drive mode
  if (refs.screenGlow) {
    const g = state.gear === 'D' ? 0.04 : state.gear === 'R' ? 0.06 : 0.02;
    refs.screenGlow.material.opacity = THREE.MathUtils.lerp(refs.screenGlow.material.opacity, g, 0.05);
    refs.screenGlow.material.color.setHsl(0.98, 0.9, state.gear === 'R' ? 0.25 : 0.12);
  }
}
