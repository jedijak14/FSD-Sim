import * as THREE from "three";

// Tesla-style center screen rendered to a canvas texture and mapped onto
// the 3D touchscreen mesh in the cockpit. Parked it shows the car-controls
// view from the reference (light theme, car in the middle, media + navigate
// cards, black dock); driving it shows the live visualization with speed,
// power, traffic, limit and navigation. Everything is drawn locally — no
// network, account or external assets.

const W = 1280;
const H = 800;

const INK = "#171a20";
const GREY = "#6b7077";
const FAINT = "#a3a6ab";
const BLUE = "#3e6ae1";
const SKY = "#2f9dff";
const GREEN = "#22c55e";
const RED = "#e82127";

function drawPrev(ctx, x, y) {
  ctx.fillStyle = INK;
  ctx.fillRect(x - 12, y - 10, 3.5, 20);
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 10);
  ctx.lineTo(x + 8, y + 10);
  ctx.lineTo(x - 6, y);
  ctx.closePath();
  ctx.fill();
}

function drawPlayPause(ctx, x, y, playing) {
  ctx.fillStyle = INK;
  if (playing) {
    ctx.fillRect(x - 9, y - 10, 6.5, 20);
    ctx.fillRect(x + 3, y - 10, 6.5, 20);
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 11);
    ctx.lineTo(x - 6, y + 11);
    ctx.lineTo(x + 12, y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawNext(ctx, x, y) {
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 10);
  ctx.lineTo(x - 8, y + 10);
  ctx.lineTo(x + 6, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x + 8.5, y - 10, 3.5, 20);
}

function drawSpeaker(ctx, x, y) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 13, y - 5, 6, 11);
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 6);
  ctx.lineTo(x + 3, y - 13);
  ctx.lineTo(x + 3, y + 13);
  ctx.lineTo(x - 7, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  for (const r of [8, 13]) {
    ctx.beginPath();
    ctx.arc(x + 4, y, r, -Math.PI / 3.2, Math.PI / 3.2);
    ctx.stroke();
  }
}

function drawBriefcase(ctx, x, y, color = INK) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  rr(ctx, x - 10, y - 6, 20, 14, 2.5);
  ctx.stroke();
  rr(ctx, x - 4.5, y - 10, 9, 5.5, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 0.5);
  ctx.lineTo(x + 10, y + 0.5);
  ctx.stroke();
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function txt(ctx, str, x, y, size, color = INK, weight = 500, align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Manrope", "DM Sans", system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}

function fmtTime(date = new Date()) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const suffix = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m}${suffix}`;
}

function drawBattery(ctx, x, y, pct) {
  const w = 34;
  const h = 16;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 3);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fillRect(x + w + 2, y + 5, 4, 6);
  ctx.fillStyle = pct > 20 ? INK : RED;
  rr(ctx, x + 3, y + 3, (w - 6) * (pct / 100), h - 6, 2);
  ctx.fill();
  txt(ctx, `${Math.round(pct)}%`, x + w + 12, y + h / 2 + 1, 17, INK, 600);
}

function drawLock(ctx, x, y, locked = false, color = INK, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  // shackle
  ctx.beginPath();
  if (locked) ctx.arc(0, -4, 7, Math.PI, 0);
  else {
    ctx.arc(-2, -4, 7, Math.PI, Math.PI * 1.55);
  }
  ctx.stroke();
  rr(ctx, -9, -3, 18, 15, 3);
  ctx.fill();
  ctx.restore();
}

function drawPerson(ctx, x, y, color = INK, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 8, 10, 7, 0, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

function drawTarget(ctx, x, y, color = INK, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(0, -7);
  ctx.moveTo(0, 7);
  ctx.lineTo(0, 13);
  ctx.moveTo(-13, 0);
  ctx.lineTo(-7, 0);
  ctx.moveTo(7, 0);
  ctx.lineTo(13, 0);
  ctx.stroke();
  ctx.restore();
}

// Side-profile Model Y (front to the left, like the reference photo).
function drawCarSide(ctx, cx, cy, w) {
  const h = w * 0.42;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  // ground shadow
  const grad = ctx.createRadialGradient(cx, cy + h * 0.62, 10, cx, cy + h * 0.62, w * 0.55);
  grad.addColorStop(0, "rgba(0,0,0,0.28)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.62, w * 0.52, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.beginPath();
  ctx.moveTo(x0 + w * 0.02, y0 + h * 0.78); // front bumper low
  ctx.quadraticCurveTo(x0 + w * 0.01, y0 + h * 0.62, x0 + w * 0.08, y0 + h * 0.58); // nose
  ctx.quadraticCurveTo(x0 + w * 0.2, y0 + h * 0.52, x0 + w * 0.34, y0 + h * 0.5); // hood
  ctx.quadraticCurveTo(x0 + w * 0.42, y0 + h * 0.18, x0 + w * 0.52, y0 + h * 0.1); // windshield
  ctx.quadraticCurveTo(x0 + w * 0.68, y0 + h * 0.02, x0 + w * 0.82, y0 + h * 0.12); // roof to rear
  ctx.quadraticCurveTo(x0 + w * 0.93, y0 + h * 0.22, x0 + w * 0.97, y0 + h * 0.42); // rear glass/trunk
  ctx.quadraticCurveTo(x0 + w * 0.99, y0 + h * 0.6, x0 + w * 0.98, y0 + h * 0.78); // rear bumper
  ctx.lineTo(x0 + w * 0.02, y0 + h * 0.78);
  ctx.closePath();
  const bodyGrad = ctx.createLinearGradient(x0, y0, x0, y0 + h);
  bodyGrad.addColorStop(0, "#ffffff");
  bodyGrad.addColorStop(0.55, "#eef0f2");
  bodyGrad.addColorStop(1, "#c9ced4");
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(23,26,32,0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // glasshouse
  ctx.beginPath();
  ctx.moveTo(x0 + w * 0.36, y0 + h * 0.5);
  ctx.quadraticCurveTo(x0 + w * 0.43, y0 + h * 0.2, x0 + w * 0.53, y0 + h * 0.13);
  ctx.quadraticCurveTo(x0 + w * 0.67, y0 + h * 0.06, x0 + w * 0.8, y0 + h * 0.15);
  ctx.quadraticCurveTo(x0 + w * 0.88, y0 + h * 0.24, x0 + w * 0.9, y0 + h * 0.48);
  ctx.lineTo(x0 + w * 0.36, y0 + h * 0.5);
  ctx.closePath();
  const glassGrad = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h * 0.5);
  glassGrad.addColorStop(0, "#3a4552");
  glassGrad.addColorStop(1, "#141a21");
  ctx.fillStyle = glassGrad;
  ctx.fill();
  // B-pillar
  ctx.fillStyle = "#e8eaed";
  ctx.fillRect(x0 + w * 0.6, y0 + h * 0.1, w * 0.015, h * 0.38);
  // seats hint
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  rr(ctx, x0 + w * 0.44, y0 + h * 0.2, w * 0.1, h * 0.28, 6);
  ctx.fill();
  rr(ctx, x0 + w * 0.66, y0 + h * 0.2, w * 0.1, h * 0.28, 6);
  ctx.fill();

  // headlight + taillight
  ctx.fillStyle = "#2b3138";
  ctx.beginPath();
  ctx.ellipse(x0 + w * 0.09, y0 + h * 0.6, w * 0.045, h * 0.045, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = RED;
  rr(ctx, x0 + w * 0.945, y0 + h * 0.5, w * 0.04, h * 0.05, 3);
  ctx.fill();
  // door handles
  ctx.strokeStyle = "rgba(23,26,32,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + w * 0.5, y0 + h * 0.56);
  ctx.lineTo(x0 + w * 0.56, y0 + h * 0.56);
  ctx.moveTo(x0 + w * 0.68, y0 + h * 0.56);
  ctx.lineTo(x0 + w * 0.74, y0 + h * 0.56);
  ctx.stroke();
  // charge bolt at rear
  ctx.fillStyle = INK;
  ctx.font = `700 ${Math.round(h * 0.14)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚡", x0 + w * 1.02, y0 + h * 0.52);

  // wheels
  for (const wx of [x0 + w * 0.2, x0 + w * 0.8]) {
    const wy = y0 + h * 0.78;
    const r = h * 0.17;
    ctx.fillStyle = "#14171b";
    ctx.beginPath();
    ctx.arc(wx, wy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3c424a";
    ctx.beginPath();
    ctx.arc(wx, wy, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9aa3ad";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(wx + Math.cos(a) * r * 0.38, wy + Math.sin(a) * r * 0.38, r * 0.12, r * 0.07, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#d4d9de";
    ctx.beginPath();
    ctx.arc(wx, wy, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  return { x0, y0, w, h };
}

function leaderLabel(ctx, text, sub, tx, ty, px, py, align = "left") {
  ctx.strokeStyle = "rgba(23,26,32,0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(px, py);
  ctx.stroke();
  txt(ctx, text, tx + (align === "left" ? 8 : -8), ty - 14, 20, GREY, 500, align);
  txt(ctx, sub, tx + (align === "left" ? 8 : -8), ty + 12, 24, INK, 700, align);
}

function drawHeadlightIcon(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, 11, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(0, 11);
  ctx.stroke();
  for (const dy of [-6, 0, 6]) {
    ctx.beginPath();
    ctx.moveTo(6, dy);
    ctx.lineTo(13, dy - 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAutopilotIcon(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.stroke();
  txt(ctx, "A", 0, 1, 15, color, 700, "center");
  ctx.restore();
}

function drawSeatbeltIcon(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(0, -7, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 7, 8, 6, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(5, -2);
  ctx.lineTo(11, 9);
  ctx.stroke();
  ctx.restore();
}

function drawCarFrontIcon(ctx, x, y, color = "#ffffff", s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  rr(ctx, -16, -4, 32, 12, 5);
  ctx.fill();
  rr(ctx, -11, -12, 22, 10, 5);
  ctx.fill();
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.arc(-10, 9, 4, 0, Math.PI * 2);
  ctx.arc(10, 9, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAppIcon(ctx, x, y, bg, glyph, fg = "#ffffff") {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x, y, 19, 0, Math.PI * 2);
  ctx.fill();
  txt(ctx, glyph, x, y + 1, 20, fg, 700, "center");
}

export class TeslaScreen {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d");
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.last = "";
    this.update({});
  }

  update(state = {}) {
    const ctx = this.ctx;
    const gear = state.gear || "P";
    const speedKmh = Math.round(state.speedKmh ?? 0);
    const power = Math.round(state.powerKw ?? 0);
    const regen = !!state.regen;
    const limit = Math.round(state.limitKmh ?? 50);
    const battery = state.batteryPct ?? 90;
    const tempF = state.tempF ?? 72;
    const fsd = !!state.fsdActive;
    const autopilot = !!state.autopilot;
    const paused = !!state.paused;
    const maneuver = state.maneuver || "Continue straight";
    const turnDist = Math.round(state.turnDistanceM ?? 0);
    const remaining = state.remainingM ?? 0;
    const eta = Math.max(1, Math.round(state.etaMin ?? 1));
    const turn = state.turn || "straight";
    const traffic = state.traffic || [];
    const driving = gear !== "P" || speedKmh >= 1;
    const timeStr = state.timeStr || fmtTime();

    // --- background ---
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#f4f4f4");
    bg.addColorStop(1, "#e6e6e6");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // --- top status bar ---
    ctx.fillStyle = "#f8f8f8";
    ctx.fillRect(0, 0, W, 58);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, 58, W, 1);
    // PRND
    const gears = ["P", "R", "N", "D"];
    gears.forEach((g, i) => {
      const active = g === gear;
      txt(ctx, g, 52 + i * 30, 30, active ? 22 : 18, active ? INK : FAINT, active ? 800 : 500, "center");
    });
    drawBattery(ctx, 190, 21, battery);
    // center: lock / Easy Entry / target
    drawLock(ctx, 545, 30, false, INK, 0.9);
    drawPerson(ctx, 600, 30, INK, 0.9);
    txt(ctx, "Easy Entry", 618, 31, 22, INK, 600);
    drawTarget(ctx, 785, 30, INK, 0.9);
    // right: time / temp / airbag pill
    txt(ctx, timeStr, 940, 30, 22, INK, 600, "right");
    txt(ctx, `${tempF}°F`, 1010, 30, 22, INK, 600, "right");
    ctx.fillStyle = "#3a3f45";
    rr(ctx, 1035, 13, 150, 34, 6);
    ctx.fill();
    txt(ctx, "⚠", 1055, 31, 18, "#f5c542", 700, "center");
    txt(ctx, "PASSENGER", 1072, 24, 11, "#ffffff", 700);
    txt(ctx, "AIRBAG OFF", 1072, 38, 11, "#ffffff", 700);

    // --- left rail icons ---
    const railX = 42;
    drawHeadlightIcon(ctx, railX, 105, GREEN);
    drawAutopilotIcon(ctx, railX, 155, fsd || autopilot ? GREEN : "#b9bec4");
    drawHeadlightIcon(ctx, railX, 205, GREEN);
    drawSeatbeltIcon(ctx, railX, 255);

    // --- center area ---
    const centerY = 70;
    const centerH = 470;
    if (!driving) {
      // Parked: car-controls view like the reference.
      const car = drawCarSide(ctx, W / 2 + 30, centerY + centerH / 2 + 10, 640);
      // lock above roof
      const lockX = car.x0 + car.w * 0.52;
      const lockY = car.y0 + car.h * 0.02;
      ctx.strokeStyle = "rgba(23,26,32,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lockX, lockY - 18);
      ctx.lineTo(lockX, car.y0 + car.h * 0.12);
      ctx.stroke();
      drawLock(ctx, lockX, lockY - 30, false, INK, 1);
      leaderLabel(ctx, "Open", "Frunk", car.x0 + car.w * 0.18, car.y0 + car.h * 0.28, car.x0 + car.w * 0.18, car.y0 + car.h * 0.52);
      ctx.strokeStyle = "rgba(23,26,32,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(car.x0 + car.w + 16, car.y0 + car.h * 0.28 + 6);
      ctx.lineTo(car.x0 + car.w * 0.95, car.y0 + car.h * 0.42);
      ctx.stroke();
      txt(ctx, "Trunk", car.x0 + car.w + 24, car.y0 + car.h * 0.28 - 8, 20, GREY, 500);
      txt(ctx, "Open", car.x0 + car.w + 24, car.y0 + car.h * 0.28 + 14, 24, INK, 700);
      // FSD pill under car when active (parked + FSD = ready)
      if (fsd) {
        ctx.fillStyle = "#0d6b52";
        rr(ctx, W / 2 - 90, centerY + centerH - 52, 180, 36, 18);
        ctx.fill();
        txt(ctx, "FSD READY · LOCAL", W / 2, centerY + centerH - 33, 16, "#ffffff", 700, "center");
      }
    } else {
      // Driving: visualization.
      const vx = 90;
      const vy = centerY;
      const vw = W - 180;
      const vh = centerH;
      ctx.fillStyle = "#f7f8f9";
      rr(ctx, vx, vy, vw, vh, 14);
      ctx.fill();
      ctx.save();
      rr(ctx, vx, vy, vw, vh, 14);
      ctx.clip();
      // road trapezoid
      const cx = vx + vw / 2;
      const bottom = vy + vh;
      const top = vy + 30;
      ctx.fillStyle = "#dfe3e7";
      ctx.beginPath();
      ctx.moveTo(cx - 46, bottom);
      ctx.lineTo(cx - 150, top);
      ctx.lineTo(cx + 150, top);
      ctx.lineTo(cx + 46, bottom);
      ctx.closePath();
      ctx.fill();
      // lane dashes converging
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.setLineDash([16, 14]);
      for (const off of [-22, 22]) {
        ctx.beginPath();
        ctx.moveTo(cx + off * 0.6, bottom);
        ctx.lineTo(cx + off * 2.2, top);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // route ribbon (skew by turn)
      const skew = turn === "left" ? -70 : turn === "right" ? 70 : turn === "uturn" ? -110 : 0;
      const routeGrad = ctx.createLinearGradient(0, top, 0, bottom);
      routeGrad.addColorStop(0, "rgba(47,157,255,0.15)");
      routeGrad.addColorStop(1, SKY);
      ctx.fillStyle = routeGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 20 + skew * 0.4, bottom);
      ctx.lineTo(cx - 34 + skew, top);
      ctx.lineTo(cx + 34 + skew, top);
      ctx.lineTo(cx + 20 + skew * 0.4, bottom);
      ctx.closePath();
      ctx.fill();
      // traffic (top-view blobs)
      for (const t of traffic.slice(0, 8)) {
        const ahead = t.ahead ?? 0;
        const right = t.right ?? 0;
        const frac = Math.min(1, Math.max(0, ahead / 55));
        const y = bottom - 40 - frac * (vh - 90);
        const spread = 0.5 + frac * 1.4;
        const x = cx + right * 9 * spread + skew * frac * 0.5;
        const s = 14 + frac * 16;
        ctx.fillStyle = "#ffbb5c";
        rr(ctx, x - s * 0.55, y - s, s * 1.1, s * 2, 6);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        rr(ctx, x - s * 0.55, y - s, s * 1.1, s * 0.5, 6);
        ctx.fill();
      }
      // own car (top view)
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(23,26,32,0.3)";
      ctx.lineWidth = 2;
      rr(ctx, cx - 26, bottom - 78, 52, 84, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2b3138";
      rr(ctx, cx - 18, bottom - 58, 36, 26, 8);
      ctx.fill();
      ctx.restore();

      // speed cluster (top-left of viz)
      const sx = vx + 28;
      const sy = vy + 22;
      txt(ctx, String(speedKmh), sx, sy + 30, 64, INK, 700);
      txt(ctx, "km/h", sx + 8, sy + 78, 18, GREY, 600);
      // power bar
      const pw = 150;
      ctx.fillStyle = "#e3e6ea";
      rr(ctx, sx + 4, sy + 96, pw, 8, 4);
      ctx.fill();
      ctx.fillStyle = regen ? SKY : "#34c759";
      const pfrac = Math.min(1, Math.abs(power) / 90);
      rr(ctx, sx + 4, sy + 96, Math.max(8, pw * pfrac), 8, 4);
      ctx.fill();
      txt(ctx, regen ? `REGEN ${Math.abs(power)} kW` : `${power} kW`, sx + 4, sy + 122, 17, GREY, 600);
      // limit sign
      const lx = vx + vw - 78;
      const ly = vy + 52;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = RED;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(lx, ly, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      txt(ctx, String(limit), lx, ly + 1, 26, INK, 800, "center");
      txt(ctx, "LIMIT", lx, ly - 46, 13, GREY, 700, "center");
      // driver mode pill (top-center)
      const modeLabel = fsd ? "FSD ACTIVE" : autopilot ? "AUTOPILOT" : "MANUAL";
      const modeColor = fsd ? "#0d6b52" : autopilot ? BLUE : "#6b7077";
      ctx.fillStyle = modeColor;
      rr(ctx, cx - 95, vy + 14, 190, 34, 17);
      ctx.fill();
      txt(ctx, modeLabel, cx, vy + 32, 17, "#ffffff", 800, "center");
      // turn arrow + distance (under pill)
      const arrow = turn === "left" ? "←" : turn === "right" ? "→" : turn === "uturn" ? "↓" : "↑";
      txt(ctx, `${arrow}  ${maneuver}`, cx, vy + 72, 20, INK, 700, "center");
      txt(ctx, `in ${turnDist} m · ${remaining >= 1000 ? `${(remaining / 1000).toFixed(1)} km` : `${Math.round(remaining)} m`} left · ~${eta} min`, cx, vy + 100, 16, GREY, 500, "center");
    }

    // --- bottom cards: media + navigate ---
    const cardY = 560;
    const cardH = 118;
    // media card
    const mx = 330;
    const mw = 360;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    rr(ctx, mx, cardY, mw, cardH, 12);
    ctx.fill();
    ctx.shadowColor = "transparent";
    // album art
    const artGrad = ctx.createLinearGradient(mx + 14, cardY + 14, mx + 86, cardY + 66);
    artGrad.addColorStop(0, "#7b5ea7");
    artGrad.addColorStop(1, "#2b1a4a");
    ctx.fillStyle = artGrad;
    rr(ctx, mx + 14, cardY + 14, 72, 52, 8);
    ctx.fill();
    txt(ctx, "♪", mx + 50, cardY + 41, 30, "#ffffff", 700, "center");
    txt(ctx, "Vampire", mx + 100, cardY + 32, 21, INK, 700);
    txt(ctx, "♫  Olivia Rodrigo", mx + 100, cardY + 56, 15, GREY, 500);
    // progress
    ctx.fillStyle = "#e3e6ea";
    rr(ctx, mx + 100, cardY + 72, mw - 130, 4, 2);
    ctx.fill();
    ctx.fillStyle = INK;
    rr(ctx, mx + 100, cardY + 72, (mw - 130) * 0.35, 4, 2);
    ctx.fill();
    // controls
    const cy2 = cardY + 96;
    drawPrev(ctx, mx + 60, cy2);
    drawPlayPause(ctx, mx + 130, cy2, !paused);
    drawNext(ctx, mx + 200, cy2);
    txt(ctx, "≣", mx + 270, cy2, 20, GREY, 600, "center");
    txt(ctx, "⌕", mx + 325, cy2, 20, GREY, 600, "center");

    // navigate card
    const nx = 710;
    const nw = 240;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    rr(ctx, nx, cardY, nw, cardH, 12);
    ctx.fill();
    ctx.shadowColor = "transparent";
    txt(ctx, "⌕", nx + 22, cardY + 26, 18, GREY, 600, "center");
    txt(ctx, "Navigate", nx + 42, cardY + 27, 18, GREY, 500);
    txt(ctx, maneuver, nx + 18, cardY + 58, 17, INK, 700);
    txt(ctx, `in ${turnDist} m`, nx + 18, cardY + 80, 14, GREY, 500);
    ctx.strokeStyle = "#e3e6ea";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(nx + 18, cardY + 92);
    ctx.lineTo(nx + nw - 18, cardY + 92);
    ctx.stroke();
    txt(ctx, "⌂  Home", nx + 52, cardY + 106, 15, INK, 600, "center");
    ctx.beginPath();
    ctx.moveTo(nx + nw / 2, cardY + 96);
    ctx.lineTo(nx + nw / 2, cardY + 114);
    ctx.stroke();
    drawBriefcase(ctx, nx + nw / 2 + 22, cardY + 106);
    txt(ctx, "Work", nx + nw / 2 + 42, cardY + 106, 15, INK, 600);

    // --- bottom black dock ---
    const dockY = 692;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, dockY, W, H - dockY);
    drawCarFrontIcon(ctx, 70, dockY + 54, "#ffffff", 1.1);
    // climate left/right
    txt(ctx, "‹", 185, dockY + 54, 26, "#ffffff", 600, "center");
    txt(ctx, String(tempF), 225, dockY + 54, 34, "#ffffff", 600, "center");
    txt(ctx, "›", 265, dockY + 54, 26, "#ffffff", 600, "center");
    txt(ctx, "‹", 1015, dockY + 54, 26, "#ffffff", 600, "center");
    txt(ctx, String(tempF), 1055, dockY + 54, 34, "#ffffff", 600, "center");
    txt(ctx, "›", 1095, dockY + 54, 26, "#ffffff", 600, "center");
    // app icons
    const apps = [
      ["#34c759", "☎"],
      ["#ff9500", "♫"],
      ["#0a84ff", "B"],
      ["#1db954", "♫"],
      ["#af52de", "◎"],
      ["#8e8e93", "▶"],
      ["#64d2ff", "T"],
    ];
    apps.forEach(([bgc, glyph], i) => {
      drawAppIcon(ctx, 360 + i * 62, dockY + 54, bgc, glyph);
    });
    // volume right
    txt(ctx, "‹", 1160, dockY + 54, 26, "#ffffff", 600, "center");
    drawSpeaker(ctx, 1195, dockY + 54);
    txt(ctx, "›", 1230, dockY + 54, 26, "#ffffff", 600, "center");

    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}
