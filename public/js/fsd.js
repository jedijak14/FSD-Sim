/* ============================================================
   FSD-Sim — Autopilot (smarter)
   Manual / Autosteer / FSD Beta / Autopark.
   - Lane keeping with smooth steering
   - Adaptive cruise (follow lead car, keep gap)
   - Stops at red traffic lights & stop signs
   - Yields when vehicles ahead slow
   - Resumes automatically when clear
   - Autopark maneuver
   ============================================================ */
import * as THREE from 'three';

export const DriveMode = { MANUAL: 0, AUTO_STEER: 1, FSD: 2 };

const KP_SPEED = 0.018;
const KD_SPEED = 0.06;
const KP_STEER = 1.15;
const KD_STEER = 0.5;

export class Autopilot {
  constructor() {
    this.mode = DriveMode.MANUAL;
    this.enabled = false;
    this.autopark = false;
    this.autoparking = false;
    this.parkSide = 'right';
    this.parkProgress = 0;
    this.parkStage = 'approach'; // approach | pullup | backin | done
    this.leadCar = null;
    this.signal = null;
    this.followDist = 24;
    this.minFollowDist = 9;
    this.message = '';
    this.msgTime = 0;
    this.prevSpeedErr = 0;
    this.speedIntegral = 0;
    this.blinker = 'off';
    this.blinkerTime = 0;
  }

  setMode(m) {
    this.mode = m;
    this.enabled = (m !== DriveMode.MANUAL);
    if (m === DriveMode.MANUAL) { this.autopark = false; this.autoparking = false; this.parkStage = 'approach'; }
    this._notify(m === DriveMode.MANUAL ? 'Autopilot off' :
      m === DriveMode.AUTO_STEER ? 'Autosteer on' :
      m === DriveMode.FSD ? 'FSD Beta on' : '');
  }

  toggleAutopark() {
    if (this.mode === DriveMode.MANUAL) { this._notify('Shift to D to use Autopark'); return; }
    this.autopark = !this.autopark;
    if (this.autopark) {
      this.autoparking = true; this.parkProgress = 0; this.parkStage = 'approach';
      this.parkSide = Math.random() < 0.5 ? 'right' : 'left';
      this._notify(`Autopark: searching (${this.parkSide})…`);
    } else {
      this.autoparking = false; this.parkStage = 'approach';
      this._notify('Autopark canceled');
    }
  }

  _notify(msg) { this.message = msg; this.msgTime = Date.now(); }

  _pidSpeed(target, current, dt) {
    const err = target - current;
    this.speedIntegral = THREE.MathUtils.clamp(this.speedIntegral + err * dt, -1.5, 1.5);
    const d = (err - this.prevSpeedErr) / Math.max(dt, 0.001);
    this.prevSpeedErr = err;
    return THREE.MathUtils.clamp(err * KP_SPEED + this.speedIntegral * 0.01 + d * KD_SPEED, 0, 1);
  }

  update(dt, state, world) {
    this.leadCar = world.nearestAhead(world, state.z, state.lane, 50);
    this.signal = world.signalAhead(world, state.z, 52);

    let throttle = 0, brake = 0, steer = 0;

    // ---------- signals ----------
    const atRedLight = this.signal.light && this.signal.light.tl.userData.state === 'red' && this.signal.dz < 30;
    const atYellowLight = this.signal.light && this.signal.light.tl.userData.state === 'yellow' && this.signal.dz < 22;
    const atStopSign = this.signal.stop && this.signal.dz < 16;
    const hardStop = atRedLight || atStopSign || (this.leadCar && this.leadCar.dz < this.minFollowDist);
    const slowDown = atYellowLight || (this.leadCar && this.leadCar.dz < this.followDist);

    // ---------- autopark ----------
    if (this.autoparking) {
      return this._updateAutopark(dt, state);
    }

    // ---------- FSD / Autosteer longitudinal ----------
    if (this.enabled && state.gear === 'D') {
      const limit = this.mode === DriveMode.FSD ? 70 : 64;
      if (hardStop) {
        brake = 1; throttle = 0;
        if (Math.abs(state.speedKph) < 1.5) {
          if (atRedLight) this._notify('Stopped for red light');
          else if (atStopSign) this._notify('Stopped at stop sign');
          else this._notify('Stopped for traffic');
        }
      } else if (slowDown) {
        brake = 0.45; throttle = 0;
        if (this.leadCar && this.leadCar.dz < this.followDist) this._notify('Vehicle ahead');
        else if (atYellowLight) this._notify('Yellow light — slowing');
      } else {
        const t = this._pidSpeed(limit, state.speedKph, dt);
        throttle = t; brake = 0;
      }

      // lateral: keep centered in lane (lane center = 0)
      const laneErr = 0 - state.lane;
      const leadOffset = this.leadCar ? (this.leadCar.car.position.x - state.lane) * 0.25 : 0;
      steer = THREE.MathUtils.clamp(laneErr * KP_STEER + leadOffset, -1, 1);
    }

    // blinker logic for lane changes (none in sim, but keep state)
    const now = Date.now();
    if (state.steer && Math.abs(state.steer) > 0.4) {
      if (now - this.blinkerTime > 500) { this.blinker = state.steer > 0 ? 'right' : 'left'; this.blinkerTime = now; }
    } else {
      this.blinker = 'off';
    }

    return { throttle, brake, steer, wantStop: hardStop };
  }

  _updateAutopark(dt, state) {
    // Simplified park: slow approach, then pull alongside & back in
    let throttle = 0, brake = 0, steer = 0;
    this.parkProgress = Math.min(1, this.parkProgress + dt * 0.25);

    if (this.parkStage === 'approach') {
      throttle = 0.22; steer = this.parkSide === 'right' ? 0.35 : -0.35;
      if (this.parkProgress > 0.45) { this.parkStage = 'pullup'; this._notify('Pulling up alongside…'); }
    } else if (this.parkStage === 'pullup') {
      brake = 0.5; throttle = 0; steer = 0;
      if (this.parkProgress > 0.65) { this.parkStage = 'backin'; this._notify('Backing into spot…'); }
    } else if (this.parkStage === 'backin') {
      throttle = 0.18; steer = this.parkSide === 'right' ? -0.85 : 0.85; brake = 0;
      if (this.parkProgress > 0.92) { this.parkStage = 'done'; }
    } else {
      brake = 1; throttle = 0; steer = 0;
      this.autoparking = false; this.autopark = false;
      this._notify('Parking complete');
    }

    if (this.parkStage === 'done') { brake = 1; throttle = 0; steer = 0; }
    return { throttle, brake, steer, wantStop: this.parkStage === 'done' };
  }

  getStatus() {
    if (this.autoparking) return `AUTOPARK (${this.parkStage})`;
    if (!this.enabled) return 'OFF';
    return this.mode === DriveMode.FSD ? 'FSD BETA' : 'AUTOSTEER';
  }

  isOn() { return this.enabled; }
  getBlinker() { return this.blinker; }
}
