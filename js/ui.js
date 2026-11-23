/* ============================================================
   FSD-Sim — Tesla UI (premium)
   Authentic Tesla center display. All apps functional.
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
      progress: 0,
      art: '🎵'
    };
    this.climate = { driver: 72, passenger: 72, ac: false, seatHeatD: 0, seatHeatP: 0, defrost: false };
    this.settings = { autopilot: false, fsd: false, speedAssist: true, units: 'mph', stopping: 'Hold', steering: 'Comfort' };
    this.version = '2024.38.12';
    this.navDestination = null;
    this._bindShell();
    this._renderPages();
    this._bindApps();
    this._startClock();
    this._mediaLoop();
  }

  openUI() { this.root.classList.add('open'); this.root.classList.remove('closing'); this.open = true; this.root.setAttribute('aria-hidden', 'false'); }
  closeUI() {
    this.root.classList.add('closing');
    setTimeout(() => {
      this.root.classList.remove('open', 'closing');
      this.open = false;
      this.root.setAttribute('aria-hidden', 'true');
      this.closeModal();
    }, 280);
  }
  toggle() { this.open ? this.closeUI() : this.openUI(); }

  _bindApps() {
    // App-level bindings for Tesla UI tiles and mini-player.
    // Individual app actions are wired via inline onclick in _renderPages();
    // this method exists to keep the constructor contract and can be extended
    // for programmatic bindings (e.g. media service deep-links, theater DRM).
    document.getElementById('miniPlay').onclick = () => this.toggleMedia();
    document.getElementById('uiMediaMini').onclick = () => this.showPage('media');
  }

  _bindShell() {
    document.getElementById('btnCloseUI').onclick = () => this.closeUI();
    const apps = { nav:'btnNav', media:'btnMedia', phone:'btnPhone', theater:'btnTheater', browser:'btnBrowser', climate:'btnClimate', controls:'btnControls', settings:'btnSettings' };
    Object.entries(apps).forEach(([name, id]) => {
      document.getElementById(id).onclick = () => this.showPage(name);
    });
    this.modalClose.onclick = () => this.closeModal();
    this.modal.onclick = (e) => { if (e.target === this.modal) this.closeModal(); };
    document.getElementById('miniPlay').onclick = () => this.toggleMedia();
    document.getElementById('uiMediaMini').onclick = () => this.showPage('media');
  }

  showPage(name) {
    const apps = { nav:'btnNav', media:'btnMedia', phone:'btnPhone', theater:'btnTheater', browser:'btnBrowser', climate:'btnClimate', controls:'btnControls', settings:'btnSettings' };
    Object.values(apps).forEach(id => document.getElementById(id).classList.remove('active'));
    if (apps[name]) document.getElementById(apps[name]).classList.add('active');
    this.content.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + name);
    if (page) page.classList.add('active');
    if (name === 'browser') this._resizeBrowser();
  }

  closeModal() { this.modal.classList.remove('open'); this.modalBox.innerHTML = ''; }

  alert(title, html) {
    this.modalBox.innerHTML = `<div style="text-align:center"><h3 style="margin:0 0 14px;font-size:1.4rem;color:#fff">${title}</h3><div style="font-size:0.98rem;color:#c7c7c7;line-height:1.6">${html}</div></div>`;
    this.modal.classList.add('open');
  }

  _startClock() {
    const tick = () => {
      const now = new Date();
      document.getElementById('uiTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      requestAnimationFrame(tick);
    };
    tick();
  }

  toggleMedia() { this.media.playing = !this.media.playing; this._refreshMini(); }
  setMedia(service, track, artist, art) {
    this.media.service = service; this.media.track = track; this.media.artist = artist; this.media.art = art || '🎵'; this.media.playing = true;
    this._refreshMini();
    if (this.open) this.showPage('media');
  }
  _refreshMini() {
    const elTrack = document.getElementById('miniTrack');
    const elArtist = document.getElementById('miniArtist');
    const elPlay = document.getElementById('miniPlay');
    if (elTrack) elTrack.textContent = this.media.playing ? this.media.track : 'Paused';
    if (elArtist) elArtist.textContent = this.media.artist;
    if (elPlay) elPlay.textContent = this.media.playing ? '⏸' : '▶';
    const elTitle = document.getElementById('mediaTitle');
    const elSub = document.getElementById('mediaSub');
    const elArt = document.getElementById('mediaArt');
    if (elTitle) elTitle.textContent = this.media.track;
    if (elSub) elSub.textContent = this.media.artist;
    if (elArt) elArt.textContent = this.media.art;
    const elFill = document.getElementById('mediaProgFill');
    if (elFill) elFill.style.width = this.media.progress + '%';
  }
  _mediaLoop() {
    if (this.media.playing) {
      this.media.progress += 0.25;
      if (this.media.progress > 100) this.media.progress = 0;
      const el = document.getElementById('mediaProgFill');
      if (el) el.style.width = this.media.progress + '%';
    }
    requestAnimationFrame(() => this._mediaLoop());
  }

  _renderPages() {
    this.content.innerHTML = `
    <div class="app-page active" id="page-nav">
      <div class="page-title">Navigation</div>
      <div class="tile-grid">
        <div class="tile" onclick="UI.setRoute('Home')"><div class="t-icon">🏠</div><div class="t-label">Home</div></div>
        <div class="tile" onclick="UI.setRoute('Work')"><div class="t-icon">💼</div><div class="t-label">Work</div></div>
        <div class="tile" onclick="UI.setRoute('Supercharger')"><div class="t-icon">⚡</div><div class="t-label">Supercharger</div></div>
        <div class="tile" onclick="UI.setRoute('Search…')"><div class="t-icon">🔍</div><div class="t-label">Search</div></div>
      </div>
      <div style="margin-top:20px;border-top:1px solid rgba(255,255,255,0.06);padding-top:14px;">
        <div style="font-size:0.85rem;color:var(--tesla-text-dim)">Route guidance</div>
        <div id="navRoute" style="font-size:1.2rem;color:#fff;margin-top:6px">${this.navDestination ? 'Navigating to ' + this.navDestination : 'No destination set'}</div>
      </div>
    </div>

    <div class="app-page" id="page-media">
      <div class="page-title">Media</div>
      <div class="media-player">
        <div class="media-art" id="mediaArt">${this.media.art}</div>
        <div class="media-info">
          <div class="media-title" id="mediaTitle">${this.media.track}</div>
          <div class="media-sub" id="mediaSub">${this.media.artist}</div>
          <div class="media-prog"><div class="media-prog-fill" id="mediaProgFill"></div></div>
        </div>
        <div class="media-controls">
          <div class="media-btn" onclick="UI.prevTrack()">⏮</div>
          <div class="media-btn primary" onclick="UI.toggleMedia()" id="mediaPlayBtn">${this.media.playing ? '⏸' : '▶'}</div>
          <div class="media-btn" onclick="UI.nextTrack()">⏭</div>
          <div style="color:#666;font-size:0.8rem">Shuffle · Repeat</div>
        </div>
      </div>
      <div class="tile-grid" style="margin-top:16px;">
        <div class="tile spotify" onclick="UI.openService('spotify','Spotify','Today\'s Top Hits','🟢')"><div class="t-icon">🟢</div><div class="t-label">Spotify</div></div>
        <div class="tile apple" onclick="UI.openService('apple','Apple Music','Apple Music 1','🍎')"><div class="t-icon">🍎</div><div class="t-label">Apple Music</div></div>
        <div class="tile audible" onclick="UI.openService('audible','Audible','Audiobooks','🎧')"><div class="t-icon">🎧</div><div class="t-label">Audible</div></div>
        <div class="tile youtube" onclick="UI.openService('youtube','YouTube Music','YouTube','▶')"><div class="t-icon">▶</div><div class="t-label">YouTube Music</div></div>
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
        <div class="theater-tile netflix" onclick="UI.launchTheater('Netflix','https://www.netflix.com')"><div class="t-icon">N</div><div class="t-label">Netflix</div></div>
        <div class="theater-tile disney" onclick="UI.launchTheater('Disney+','https://www.disneyplus.com')"><div class="t-icon">D</div><div class="t-label">Disney+</div></div>
        <div class="theater-tile hulu" onclick="UI.launchTheater('Hulu','https://www.hulu.com')"><div class="t-icon">H</div><div class="t-label">Hulu</div></div>
        <div class="theater-tile hbo" onclick="UI.launchTheater('HBO Max','https://www.hbomax.com')"><div class="t-icon">H</div><div class="t-label">HBO Max</div></div>
        <div class="theater-tile youtube" onclick="UI.launchTheater('YouTube','https://www.youtube.com')"><div class="t-icon">Y</div><div class="t-label">YouTube</div></div>
        <div class="theater-tile" onclick="UI.launchTheater('Twitch','https://www.twitch.tv')"><div class="t-icon">T</div><div class="t-label">Twitch</div></div>
      </div>
      <div style="font-size:0.8rem;color:var(--tesla-text-dim);margin-top:12px">Theater requires Park. Streaming services may block in-car embedding.</div>
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
      <div style="display:flex;gap:24px;">
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:3.2rem;font-weight:700;color:#fff" id="climateTemp">72°</div>
          <div style="font-size:0.95rem;color:var(--tesla-text-dim);margin-top:8px">Driver</div>
          <div style="margin-top:16px;display:flex;gap:10px;">
            <button class="ui-btn" style="height:44px;font-size:1.1rem" onclick="UI.adjustTemp(-1)">−</button>
            <button class="ui-btn" style="height:44px;font-size:1.1rem" onclick="UI.adjustTemp(1)">+</button>
          </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:3.2rem;font-weight:700;color:#fff" id="climateTemp2">72°</div>
          <div style="font-size:0.95rem;color:var(--tesla-text-dim);margin-top:8px">Passenger</div>
          <div style="margin-top:16px;display:flex;gap:10px;">
            <button class="ui-btn" style="height:44px;font-size:1.1rem" onclick="UI.adjustTemp2(-1)">−</button>
            <button class="ui-btn" style="height:44px;font-size:1.1rem" onclick="UI.adjustTemp2(1)">+</button>
          </div>
        </div>
      </div>
      <div class="tile-grid" style="margin-top:20px;">
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
        <div class="setting-row"><label>Autopilot</label><div class="toggle ${this.settings.autopilot?'on':''}" id="togAutopilot" onclick="UI.toggleSetting('autopilot')"></div></div>
        <div class="setting-row"><label>FSD Beta</label><div class="toggle ${this.settings.fsd?'on':''}" id="togFSD" onclick="UI.toggleSetting('fsd')"></div></div>
        <div class="setting-row"><label>Speed Limit Assist</label><div class="toggle ${this.settings.speedAssist?'on':''}" id="togSpeed" onclick="UI.toggleSetting('speed')"></div></div>
        <div class="setting-row"><label>Stopping Mode</label><span class="val" style="cursor:pointer" onclick="UI.cycleStopping()">${this.settings.stopping}</span></div>
        <div class="setting-row"><label>Steering Mode</label><span class="val" style="cursor:pointer" onclick="UI.cycleSteering()">${this.settings.steering}</span></div>
        <div class="setting-row"><label>Units</label><span class="val" style="cursor:pointer" onclick="UI.toggleUnits()">${this.settings.units}</span></div>
        <div class="setting-row"><label>Display Brightness</label><span class="val">90%</span></div>
        <div class="setting-row"><label>Language</label><span class="val">English</span></div>
        <div class="setting-row"><label>Software</label><span class="val" style="cursor:pointer" onclick="UI.checkUpdate()">${this.version}</span></div>
      </div>
    </div>
    `;
  }

  setRoute(dest) {
    this.navDestination = dest;
    document.getElementById('navRoute').textContent = `Navigating to ${dest}…`;
    this.alert('Navigation', `Setting route to <b>${dest}</b>. Estimated arrival in <b>12 min</b>.<br>FSD will follow the route, stop at signals and yield to traffic.`);
  }

  openService(service, name, station, art) {
    this.setMedia(service, station, name, art);
    this.alert(name, `Now playing <b>${station}</b> on <b>${name}</b>. Use the Media player controls or the mini-player at the bottom of the screen.`);
  }

  prevTrack() { this.setMedia(this.media.service, 'Previous Track', this.media.artist, this.media.art); }
  nextTrack() { this.setMedia(this.media.service, 'Next Track', this.media.artist, this.media.art); }

  dial(tab) { this.alert('Phone', `Opened <b>${tab}</b>. Contacts sync with your paired phone. Tap a number to call via the car speaker.`); }

  launchTheater(name, url) {
    this.alert(`${name} Theater`, `<b>${name}</b> would open full-screen here.<br><br>Most streaming services block embedding in third-party iframes for DRM/rights reasons. In a real Tesla they run in Tesla's own Chromium-based Theater app. Use the Web Browser app instead.`);
  }

  goBrowser() {
    const u = document.getElementById('browserUrl').value.trim();
    const frame = document.getElementById('browserFrame');
    if (!u) return;
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
    document.getElementById('browserUrl').value = u;
    frame.src = u;
  }

  adjustTemp(d) { const el = document.getElementById('climateTemp'); const v = Math.round(parseInt(el.textContent) + d); el.textContent = v + '°'; this.climate.driver = v; }
  adjustTemp2(d) { const el = document.getElementById('climateTemp2'); const v = Math.round(parseInt(el.textContent) + d); el.textContent = v + '°'; this.climate.passenger = v; }
  toggleAC() { this.climate.ac = !this.climate.ac; this._toast(`A/C ${this.climate.ac ? 'on' : 'off'}`); }
  toggleSeatHeat(s) { const key = s === 'driver' ? 'seatHeatD' : 'seatHeatP'; this.climate[key] = (this.climate[key] + 1) % 3; this._toast(`Seat heat ${s === 'driver' ? 'driver' : 'passenger'} level ${this.climate[key]}`); }
  toggleDefrost() { this.climate.defrost = !this.climate.defrost; this._toast('Defrost ' + (this.climate.defrost ? 'on' : 'off')); }
  toggleLock() { this._toast('Doors locked'); }
  toggleFrunk() { this._toast('Frunk opened'); }
  toggleTrunk() { this._toast('Trunk opened'); }
  chargePort() { this._toast('Charge port door opened'); }

  toggleSetting(key) {
    const els = { autopilot:'togAutopilot', fsd:'togFSD', speed:'togSpeed' };
    const el = document.getElementById(els[key]);
    const on = el.classList.toggle('on');
    this.settings[key] = on;
    this._toast(`${key.charAt(0).toUpperCase() + key.slice(1)} ${on ? 'on' : 'off'}`);
    if (window.GAME) {
      if (key === 'autopilot') window.GAME.setDriveMode(on ? 1 : 0);
      if (key === 'fsd') window.GAME.setDriveMode(on ? 2 : (window.GAME.autopilot.mode === 2 ? 0 : window.GAME.autopilot.mode));
    }
  }
  cycleStopping() { const m = ['Hold','Roll','Creep']; const i = m.indexOf(this.settings.stopping); this.settings.stopping = m[(i+1)%m.length]; this._toast(`Stopping Mode: ${this.settings.stopping}`); }
  cycleSteering() { const m = ['Comfort','Standard','Sport']; const i = m.indexOf(this.settings.steering); this.settings.steering = m[(i+1)%m.length]; this._toast(`Steering Mode: ${this.settings.steering}`); }
  toggleUnits() { this.settings.units = this.settings.units === 'mph' ? 'km/h' : 'mph'; this._toast(`Units: ${this.settings.units}`); }
  checkUpdate() { this.alert('Software', 'Your software is up to date. Version ' + this.version); }

  _toast(msg) { if (window.GAME) window.GAME.notify(msg); }

  _resizeBrowser() {}
}
