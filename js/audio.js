/* ============================================================
   FSD-Sim — Audio (Web Audio API, synthesized Tesla sounds)
   ============================================================ */
export const Audio = {
  ctx: null,
  master: null,
  musicGain: null,
  sfxGain: null,
  started: false,
  motorOsc: null,
  motorGain: null,
  motorFilter: null,
  turnL: null, turnR: null,
  blinkerGain: null,
  chimeBuf: null,
  clickBuf: null,
  doorBuf: null,
  crashBuf: null,
  musicTone: null,

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination); this.master.gain.value = 0.55;
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master); this.sfxGain.gain.value = 0.7;
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master); this.musicGain.gain.value = 0.25;
  },
  async start() {
    this.init();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.started = true;
    this._buildMotor();
    this._buildBlinker();
    this._buildBuffers();
  },
  _buildMotor() {
    // EV motor whine: two detuned sawtooth-ish oscillators through a lowpass, controlled by speed/pedal
    this.motorOsc = [];
    this.motorGain = this.ctx.createGain(); this.motorGain.connect(this.master); this.motorGain.gain.value = 0.0;
    this.motorFilter = this.ctx.createBiquadFilter(); this.motorFilter.type = 'lowpass'; this.motorFilter.frequency.value = 900;
    this.motorFilter.Q.value = 3; this.motorFilter.connect(this.motorGain);
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth';
      const g = this.ctx.createGain(); g.gain.value = 0.05;
      o.connect(g); g.connect(this.motorFilter);
      o.frequency.value = 110 * (i + 1);
      o.start();
      this.motorOsc.push({ osc: o, gain: g, base: 110 * (i + 1) });
    }
  },
  setMotor(pedal, speedKph) {
    if (!this.motorOsc) return;
    const target = Math.max(0, Math.min(1, pedal * 0.6 + speedKph / 220));
    const cur = this.motorGain.gain.value;
    this.motorGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
    const baseFreq = 140 + speedKph * 1.6;
    const lp = Math.max(400, Math.min(2600, 500 + speedKph * 12 + pedal * 700));
    this.motorFilter.frequency.setTargetAtTime(lp, this.ctx.currentTime, 0.08);
    this.motorOsc.forEach((m, i) => {
      m.osc.frequency.setTargetAtTime(m.base * (1 + speedKph / 300), this.ctx.currentTime, 0.1);
    });
  },
  stopMotor() {
    if (this.motorGain) this.motorGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  },
  _buildBlinker() {
    this.blinkerGain = this.ctx.createGain(); this.blinkerGain.connect(this.sfxGain); this.blinkerGain.gain.value = 0.0;
  },
  setBlinker(on) {
    if (!this.blinkerGain) return;
    this.blinkerGain.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, on ? 0 : 0.15);
  },
  _tickBuffer() {
    const sr = this.ctx.sampleRate, len = sr * 0.05;
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      d[i] = (Math.sin(2 * Math.PI * 880 * t) * 0.5 + Math.sin(2 * Math.PI * 1320 * t) * 0.3) * Math.exp(-t * 22);
    }
    return buf;
  },
  async _buildBuffers() {
    this.clickBuf = this._tickBuffer();
    const sr = this.ctx.sampleRate;
    const chimeLen = sr * 0.5;
    const chime = this.ctx.createBuffer(1, chimeLen, sr); const cd = chime.getChannelData(0);
    for (let i = 0; i < chimeLen; i++) {
      const t = i / sr;
      cd[i] = (Math.sin(2 * Math.PI * 660 * t) + 0.5 * Math.sin(2 * Math.PI * 990 * t) + 0.3 * Math.sin(2 * Math.PI * 1320 * t)) * Math.exp(-t * 3.5);
    }
    this.chimeBuf = chime;
    const doorLen = sr * 0.55;
    const door = this.ctx.createBuffer(1, doorLen, sr); const dd = door.getChannelData(0);
    for (let i = 0; i < doorLen; i++) {
      const t = i / sr;
      dd[i] = (Math.random() * 2 - 1) * Math.exp(-t * 18) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 120 * t));
    }
    this.doorBuf = door;
    const crashLen = sr * 1.0;
    const crash = this.ctx.createBuffer(1, crashLen, sr); const crd = crash.getChannelData(0);
    for (let i = 0; i < crashLen; i++) {
      const t = i / sr;
      crd[i] = (Math.random() * 2 - 1) * Math.exp(-t * 6) * (0.8 + 0.3 * Math.sin(2 * Math.PI * 60 * t));
    }
    this.crashBuf = crash;
  },
  playClick() { this._playBuf(this.clickBuf, 0.12); },
  playChime() { this._playBuf(this.chimeBuf, 0.5); },
  playDoor() { this._playBuf(this.doorBuf, 0.5); },
  playCrash() { this._playBuf(this.crashBuf, 0.9); },
  _playBuf(buf, vol) {
    if (!this.started || !buf) return;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(this.sfxGain); src.start();
  },
  // background driving ambience / light music drone
  setMusic(on) {
    if (!this.musicTone) {
      this.musicTone = this.ctx.createOscillator(); this.musicTone.type = 'triangle';
      const g = this.ctx.createGain(); g.gain.value = 0.02;
      this.musicTone.connect(g); g.connect(this.musicGain);
      this.musicTone.frequency.value = 220; this.musicTone.start();
    }
    this.musicGain.gain.setTargetAtTime(on ? 0.14 : 0, this.ctx.currentTime, 0.4);
  }
};
