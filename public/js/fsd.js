/* ============================================================
   FSD-Sim — Autopilot: Manual / Autosteer / FSD / Autopark
   ============================================================ */
import * as THREE from 'three';

export const DriveMode = { MANUAL: 0, AUTO_STEER: 1, FSD: 2 };

export class Autopilot {
  constructor() {
    this.mode = DriveMode.MANUAL;
    this.enabled = false;
    this.autopark = false;
    this.autoparking = false;
    this.parkSide = 'right';
    this.parkProgress = 0;
    this.leadCar = null;
    this.signal = null;
    this.followDist = 22;
    this.message = '';
    this.msgTime = 0;
  }

  setMode(m) {
    this.mode = m;
    this.enabled = (m !== DriveMode.MANUAL);
    if (m === DriveMode.MANUAL) { this.autopark = false; this.autoparking = false; }
    this._notify(m === DriveMode.MANUAL ? 'Autopilot off' :
      m === DriveMode.AUTO_STEER ? 'Autosteer on' :
      m === DriveMode.FSD ? 'FSD Beta on' : '');
  }

  toggleAutopark() {
    if (this.mode === DriveMode.MANUAL) { this._notify('Shift to D to use Autopark'); return; }
    this.autopark = !this.autopark;
    if (this.autopark) { this.autoparking = true; this.parkProgress = 0; this._notify('Autopark: searching…'); }
    else { this.autoparking = false; this._notify('Autopark canceled'); }
  }

  _notify(msg) { this.message = msg; this.msgTime = Date.now(); }

  _shouldStop() {
    const { light, stop } = this.signal || {};
    if (light && light.tl.userData.state === 'red' && light.dz < 34) return true;
    if (stop && stop.dz < 18) return true;
    return false;
  }

  update(dt, state, world) {
    this.leadCar = world.nearestAhead(world, state.z, state.lane, 45);
    this.signal = world.signalAhead(world, state.z, 50);

    const wantStop = this._shouldStop();
    const leadGap = this.leadCar ? this.leadCar.dz : null;

    let throttle = 0, brake = 0, steer = 0;

    if (this.enabled && state.gear === 'D') {
      const limit = this.mode === DriveMode.FSD ? 72 : 68;
      const atLight = this.signal.light && this.signal.light.tl.userData.state === 'red' && this.signal.dz < 30;
      const atStop = this.signal.stop && this.signal.dz < 16;
      const hardStop = wantStop || atLight || atStop || (leadGap !== null && leadGap < 6);
      const slow = (leadGap !== null && leadGap < this.followDist)
        || (this.signal.light && this.signal.dz < 45 && this.signal.light.tl.userData.state === 'yellow');

      if (hardStop) {
        brake = 1; throttle = 0;
        if (Math.abs(state.speedKph) < 1.5 && (atLight || atStop)) this._notify('Stopped for signal');
      } else if (slow) {
        brake = 0.35; throttle = 0;
        if (leadGap !== null) this._notify('Vehicle ahead');
      } else {
        const speedErr = (limit - state.speedKph) / limit;
        throttle = Math.max(0, Math.min(1, speedErr * 1.2));
        brake = 0;
      }

      // lateral: stay centered in lane, react to lead car offset
      const laneErr = 0 - state.lane;
      steer = THREE.MathUtils.clamp(laneErr * 1.4 + (this.leadCar ? (this.leadCar.car.position.x - state.lane) * 0.3 : 0), -1, 1);
    }

    // Autopark maneuver (simplified pull-in)
    if (this.autoparking) {
      this.parkProgress = Math.min(1, this.parkProgress + dt * 0.35);
      steer = this.parkSide === 'right' ? 0.9 : -0.9;
      throttle = 0.25;
      brake = this.parkProgress > 0.9 ? 0.6 : 0;
      if (this.parkProgress >= 1) {
        this.autoparking = false; this.autopark = false; brake = 1;
        this._notify('Parking complete');
      }
    }

    return { throttle, brake, steer, wantStop };
  }

  getStatus() {
    if (this.autoparking) return 'AUTOPARK';
    if (!this.enabled) return 'OFF';
    return this.mode === DriveMode.FSD ? 'FSD BETA' : 'AUTOSTEER';
  }

  isOn() { return this.enabled; }
}
