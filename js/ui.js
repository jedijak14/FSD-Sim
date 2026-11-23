/* ============================================================
   FSD-Sim — Tesla UI (center screen replica + apps)
   ============================================================ */
export class TeslaUI {
  constructor() {
    this.root = document.getElementById('teslaUI');
    this.content = document.getElementById('uiContent');
    this.modal = document.getElementById('uiModal');
    this.modalBox = document.getElementById('uiModalBox');
    this.modalClose = document.getElementById('uiModalClose');
    this.open = false;
    this.media = {
      playing: false,
      track: 'Tesla Radio',
      artist: 'Streaming',
      service: 'spotify',
      progress: 0
    };
    this._bindShell();
    this._renderPages();
    this._bindApps();
    this._startClock();
    this._mediaLoop();
  }

  openUI() { this.root.classList.add('open'); this.root.classList.remove('closing'); this.open = true; this.root.setAttribute('aria-hidden', 'false'); }
  closeUI() { this.root.classList.add('closing'); setTimeout(() => { this.root.classList.remove('open', 'closing'); this.open = false; this.root.setAttribute('aria-hidden', 'true'); this.closeModal(); }, 280); }
  toggle() { this.open ? this.closeUI() : this.openUI(); }

  // ---------- shell ----------
  _bindShell() {
    document.getElementById('btnCloseUI').onclick = () => this.closeUI();
    document.getElementById('btnNav').onclick = () => this.showPage('nav');
    document.getElementById('btnMedia').onclick = () => this.showPage('media');
    document.getElementById('btnPhone').onclick = () => this.showPage('phone');
    document.getElementById('btnTheater').onclick = () => this.showPage('theater');
    document.getElementById('btnBrowser').onclick = () => this.showPage('browser');
    document.getElementById('btnClimate').onclick = () => this.showPage('climate');
    document.getElementById('btnControls').onclick = () => this.showPage('controls');
    document.getElementById('btnSettings').onclick = () => this.showPage('settings');
    this.modalClose.onclick = () => this.closeModal();
    this.modal.onclick = (e) => { if (e.target === this.modal) this.closeModal(); };
    document.getElementById('miniPlay').onclick = () => this.toggleMedia();
    document.getElementById('uiMediaMini').onclick = () => this.showPage('media');
  }

  showPage(name) {
    // highlight app bar
    const map = { nav:'btnNav', media:'btnMedia', phone:'btnPhone', theater:'btnTheater', browser:'btnBrowser', climate:'btnClimate', controls:'btnControls', settings:'btnSettings' };
    Object.values(map).forEach(id => document.getElementById(id).classList.remove('active'));
    if (map[name]) document.getElementById(map[name]).classList.add('active');
    // pages
    this.content.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + name);
    if (page) page.classList.add('active');
    if (name === 'browser') this._resizeBrowser();
  }

  closeModal() { this.modal.classList.remove('open'); this.modalBox.innerHTML = ''; }

  alert(title, html) {
    this.modalBox.innerHTML = `<h3>${title}</h3>${html}`;
    this.modal.classList.add('open');
  }

  // ---------- clock ----------
  _startClock() {
    const tick = () => {
      const now = new Date();
      document.getElementById('uiTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      requestAnimationFrame(tick);
    };
    tick();
  }

  // ---------- media ----------
  toggleMedia() { this.media.playing = !this.media.playing; this._refreshMini(); }
  setMedia(service, track, artist) {
    this.media.service = service; this.media.track = track; this.media.artist = artist; this.media.playing = true;
    this._refreshMini();
    if (this.open) this.showPage('media');
  }
  _refreshMini() {
    document.getElementById('miniTrack').textContent = this.media.playing ? this.media.track : 'Paused';
    document.getElementById('miniArtist').textContent = this.media.artist;
    document.getElementById('miniPlay').textContent = this.media.playing ? '⏸' : '▶';
  }
  _mediaLoop() {
    if (this.media.playing) {
      this.media.progress += 0.5;
      if (this.media.progress > 100) this.media.progress = 0;
      const el = document.getElementById('mediaProgFill');
      if (el) el.style.width = this.media.progress + '%';
    }
    requestAnimationFrame(() => this._mediaLoop());
  }

  // ---------- page rendering ----------
  _renderPages() {
    this.content.innerHTML = `
    <div class="app-page" id="page-nav">
      <div class="page-title">Navigation</div>
      <div class="tile-grid">
        <div class="tile" onclick="UI.setRoute('Home')"><div class="t-icon">🏠</div><div class="t-label">Home</div></div>
        <div class="tile" onclick="UI.setRoute('Work')"><div class="t-icon">💼</div><div class="t-label">Work</div></div>
        <div class="tile" onclick="UI.setRoute('Supercharger')"><div class="t-icon">⚡</div><div class="t-label">Supercharger</div></div>
        <div class="tile" onclick="UI.setRoute('Search…')"><div class="t-icon">🔍</div><div class="t-label">Search</div></div>
      </div>
      <div style="margin-top:14px;border-top:1px solid rgba(255,255,255,.06);padding-top:10px;">
        <div style="font-size:.85rem;color:var(--tesla-text-dim)">Route guidance</div>
        <div id="navRoute" style="font-size:1.1rem;color:#fff;margin-top:4px">No destination set</div>
      </div>
    </div>

    <div class="app-page active" id="page-media">
      <div class="page-title">Media</div>
      <div class="media-player">
        <div class="media-art" id="mediaArt">🎵</div>
        <div class="media-info">
          <div class="media-title" id="mediaTitle">${this.media.track}</div>
          <div class="media-sub" id="mediaSub">${this.media.artist}</div>
        </div>
        <div class="media-prog"><div class="media-prog-fill" id="mediaProgFill"></div></div>
        <div class="media-controls">
          <div class="media-btn" onclick="UI.prevTrack()">⏮</div>
          <div class="media-btn primary" onclick="UI.toggleMedia()" id="mediaPlayBtn">▶</div>
          <div class="media-btn" onclick="UI.nextTrack()">⏭</div>
          <div style="color:#666;font-size:.8rem">Shuffle · Repeat</div>
        </div>
      </div>
      <div class="tile-grid" style="margin-top:14px;">
        <div class="tile spotify" onclick="UI.openService('spotify','Spotify','Today\'s Top Hits')"><div class="t-icon">🟢</div><div class="t-label">Spotify</div></div>
        <div class="tile apple" onclick="UI.openService('apple','Apple Music','Apple Music 1')"><div class="t-icon">🍎</div><div class="t-label">Apple Music</div></div>
        <div class="tile audible" onclick="UI.openService('audible','Audible','Audiobooks')"><div class="t-icon">🎧</div><div class="t-label">Audible</div></div>
        <div class="tile youtube" onclick="UI.openService('youtube','YouTube Music','YouTube')"><div class="t-icon">▶</div><div class="t-label">YouTube Music</div></div>
      </div>
    </div>

    <div class="app-page" id="page-phone">
      <div class="page-title">Phone</div>
      <div class="tile-grid">
        <div class="tile" onclick="UI.dial('Recent')"><div class="t-icon">🕘</div><div class="t-label">Recent</div></div>
        <div class="tile" onclick="UI.dial('Contacts')"><div class="t-icon">👥</div><div class="t-label">Contacts</div></div>
        <div class="tile" onclick="UI.dial('Favorites')"><div class="t-icon">⭐</div><div class="t-label">Favorites</div></div>
        <div class="tile" onclick="UI.dial('Keypad')"><div class="t-icon">🔢</div><div class="t-label">Keypad</div></div>
      </div>
    </div>

    <div class="app-page" id="page-theater">
      <div class="page-title">Theater (Parked)</div>
      <div class="theater-grid">
        <div class="theater-tile netflix" onclick="UI.launchTheater('Netflix','https://www.netflix.com')">Netflix</div>
        <div class="theater-tile disney" onclick="UI.launchTheater('Disney+','https://www.disneyplus.com')">Disney+</div>
        <div class="theater-tile hulu" onclick="UI.launchTheater('Hulu','https://www.hulu.com')">Hulu</div>
        <div class="theater-tile hbo" onclick="UI.launchTheater('HBO Max','https://www.hbomax.com')">HBO Max</div>
        <div class="theater-tile youtube" onclick="UI.launchTheater('YouTube','https://www.youtube.com')">YouTube</div>
        <div class="theater-tile" onclick="UI.launchTheater('Twitch','https://www.twitch.tv')">Twitch</div>
      </div>
      <div style="font-size:.8rem;color:var(--tesla-text-dim);margin-top:10px">Theater requires Park. Streaming services may block in-car embedding.</div>
    </div>

    <div class="app-page" id="page-browser">
      <div class="page-title">Web Browser</div>
      <div class="browser-wrap">
        <div class="browser-bar">
          <div class="browser-url" id="browserUrl">https://www.tesla.com</div>
          <button class="browser-go" onclick="UI.goBrowser()">Go</button>
        </div>
        <div class="browser-view">
          <iframe id="browserFrame" src="https://www.tesla.com" referrerpolicy="no-referrer-when-downgrade" sandbox="allow-same-origin allow-scripts allow-popups allow-forms"></iframe>
        </div>
      </div>
    </div>

    <div class="app-page" id="page-climate">
      <div class="page-title">Climate</div>
      <div style="display:flex;gap:16px;">
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:2.6rem;font-weight:700;color:#fff" id="climateTemp">72°</div>
          <div style="font-size:.9rem;color:var(--tesla-text-dim);margin-top:6px">Driver</div>
          <div style="margin-top:14px;display:flex;gap:8px;">
            <button class="ui-btn" style="height:40px;font-size:1rem" onclick="UI.adjustTemp(-1)">−</button>
            <button class="ui-btn" style="height:40px;font-size:1rem" onclick="UI.adjustTemp(1)">+</button>
          </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:2.6rem;font-weight:700;color:#fff" id="climateTemp2">72°</div>
          <div style="font-size:.9rem;color:var(--tesla-text-dim);margin-top:6px">Passenger</div>
          <div style="margin-top:14px;display:flex;gap:8px;">
            <button class="ui-btn" style="height:40px;font-size:1rem" onclick="UI.adjustTemp2(-1)">−</button>
            <button class="ui-btn" style="height:40px;font-size:1rem" onclick="UI.adjustTemp2(1)">+</button>
          </div>
        </div>
      </div>
      <div class="tile-grid" style="margin-top:18px;">
        <div class="tile" onclick="UI.toggleAC()"><div class="t-icon">❄️</div><div class="t-label">A/C</div></div>
        <div class="tile" onclick="UI.toggleSeatHeat('driver')"><div class="t-icon">🪑</div><div class="t-label">Seat Heat D</div></div>
        <div class="tile" onclick="UI.toggleSeatHeat('pass')"><div class="t-icon">🪑</div><div class="t-label">Seat Heat P</div></div>
        <div class="tile" onclick="UI.toggleDefrost()"><div class="t-icon">🌬️</div><div class="t-label">Defrost</div></div>
      </div>
    </div>

    <div class="app-page" id="page-controls">
      <div class="page-title">Controls</div>
      <div class="tile-grid">
        <div class="tile" onclick="UI.toggleLock()"><div class="t-icon">🔒</div><div class="t-label">Locks</div></div>
        <div class="tile" onclick="UI.toggleFrunk()"><div class="t-icon">🛒</div><div class="t-label">Frunk</div></div>
        <div class="tile" onclick="UI.toggleTrunk()"><div class="t-icon">📦</div><div class="t-label">Trunk</div></div>
        <div class="tile" onclick="UI.chargePort()"><div class="t-icon">⚡</div><div class="t-label">Charge Port</div></div>
      </div>
    </div>

    <div class="app-page" id="page-settings">
      <div class="page-title">Settings</div>
      <div class="settings-list">
        <div class="setting-row"><label>Autopilot</label><div class="toggle" id="togAutopilot" onclick="UI.toggleSetting('autopilot')"></div></div>
        <div class="setting-row"><label>FSD Beta</label><div class="toggle" id="togFSD" onclick="UI.toggleSetting('fsd')"></div></div>
        <div class="setting-row"><label>Speed Limit Assist</label><div class="toggle" id="togSpeed" onclick="UI.toggleSetting('speed')"></div></div>
        <div class="setting-row"><label>Stopping Mode</label><span class="val" style="cursor:pointer" onclick="UI.cycleStopping()">Hold</span></div>
        <div class="setting-row"><label>Steering Mode</label><span class="val" style="cursor:pointer" onclick="UI.cycleSteering()">Comfort</span></div>
        <div class="setting-row"><label>Units</label><span class="val" style="cursor:pointer" onclick="UI.toggleUnits()">mph</span></div>
        <div class="setting-row"><label>Display Brightness</label><span class="val">90%</span></div>
        <div class="setting-row"><label>Language</label><span class="val">English</span></div>
        <div class="setting-row"><label>Software</label><span class="val" style="cursor:pointer" onclick="UI.checkUpdate()">2024.38.12</span></div>
      </div>
    </div>
    `;
  }

  // ---------- app actions ----------
  setRoute(dest) {
    document.getElementById('navRoute').textContent = `Navigating to ${dest}…`;
    this.alert('Navigation', `Setting route to <b>${dest}</b>. Estimated arrival in <b>12 min</b>.<br>FSD will follow the route, stop at signals and yield to traffic.`);
  }

  openService(service, name, station) {
    this.setMedia(service, station, name);
    this.alert(name, `Now playing <b>${station}</b> on <b>${name}</b>. Use the Media player controls or the mini-player at the bottom of the screen.`);
  }

  prevTrack() { this.setMedia(this.media.service, 'Previous Track', this.media.artist); }
  nextTrack() { this.setMedia(this.media.service, 'Next Track', this.media.artist); }

  dial(tab) { this.alert('Phone', `Opened <b>${tab}</b>. Contacts sync with your paired phone. Tap a number to call via the car speaker.`); }

  launchTheater(name, url) {
    this.alert(`${name} Theater`, `<b>${name}</b> would open full-screen here.<br><br>Note: most streaming services (Netflix, Disney+, Hulu, HBO Max, YouTube) block embedding in third-party iframes for DRM/rights reasons, so in a real car they run in Tesla's own Chromium-based Theater app. In this sim, tap <b>Go</b> below to open the site in the Web Browser app instead.`);
  }

  goBrowser() {
    const u = document.getElementById('browserUrl').value.trim();
    const frame = document.getElementById('browserFrame');
    if (!u) return;
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
    document.getElementById('browserUrl').value = u;
    frame.src = u;
  }

  adjustTemp(d) { const el = document.getElementById('climateTemp'); const v = parseInt(el.textContent) + d; el.textContent = v + '°'; }
  adjustTemp2(d) { const el = document.getElementById('climateTemp2'); const v = parseInt(el.textContent) + d; el.textContent = v + '°'; }
  toggleAC() { this._toast('A/C toggled'); }
  toggleSeatHeat(s) { this._toast(`Seat heat ${s === 'driver' ? 'driver' : 'passenger'} toggled`); }
  toggleDefrost() { this._toast('Defrost on'); }
  toggleLock() { this._toast('Doors locked'); }
  toggleFrunk() { this._toast('Frunk opened'); }
  toggleTrunk() { this._toast('Trunk opened'); }
  chargePort() { this._toast('Charge port door opened'); }

  toggleSetting(key) {
    const els = { autopilot:'togAutopilot', fsd:'togFSD', speed:'togSpeed' };
    const el = document.getElementById(els[key]);
    const on = el.classList.toggle('on');
    this._toast(`${key} ${on ? 'on' : 'off'}`);
    if (window.GAME) {
      if (key === 'autopilot') window.GAME.setDriveMode(on ? 1 : 0);
      if (key === 'fsd') window.GAME.setDriveMode(on ? 2 : (window.GAME.autopilot.mode === 2 ? 0 : window.GAME.autopilot.mode));
      if (key === 'speed') { /* speed limit assist */ }
    }
  }
  cycleStopping() { this._toast('Stopping Mode: Hold'); }
  cycleSteering() { this._toast('Steering Mode: Comfort'); }
  toggleUnits() { this._toast('Units: mph'); }
  checkUpdate() { this.alert('Software', 'Your software is up to date. Version 2024.38.12'); }

  _toast(msg) { if (window.GAME) window.GAME.notify(msg); }

  // resize browser iframe container
  _resizeBrowser() {}
}
