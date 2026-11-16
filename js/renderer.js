import { CONFIG, GRID, TOWERS, REASONS, ENEMIES } from './config.js';

// Terrain is drawn once into an offscreen canvas, then blitted every frame.
export function bakeTerrain(map, dpr) {
  const c = document.createElement('canvas');
  c.width = CONFIG.width*dpr; c.height = CONFIG.height*dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const W = CONFIG.width, H = CONFIG.height;
  let s = map.seed*977; const r = () => { s = (s*16807) % 2147483647; return s/2147483647; };

  const gr = g.createLinearGradient(0,0,W,H);
  gr.addColorStop(0,'#58a244'); gr.addColorStop(.5,'#448f38'); gr.addColorStop(1,'#33803a');
  g.fillStyle = gr; g.fillRect(0,0,W,H);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(${r()<.5?'130,200,90':'20,80,40'},${.05+r()*.08})`;
    g.beginPath(); g.ellipse(r()*W, r()*H, 20+r()*50, 12+r()*28, r()*3, 0, 7); g.fill();
  }
  g.lineWidth = 1;
  for (let i = 0; i < 1300; i++) {
    const x = r()*W, y = r()*H;
    g.strokeStyle = r()<.5 ? 'rgba(170,225,120,.35)' : 'rgba(25,90,40,.35)';
    g.beginPath(); g.moveTo(x,y); g.lineTo(x+(r()-.5)*4, y-3-r()*4); g.stroke();
  }
  // dirt path: dark edge, mid tone, light centre, then pebbles
  const stroke = (w, col) => {
    g.lineWidth = w; g.strokeStyle = col; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); map.pts.forEach((q,i) => i ? g.lineTo(q.x,q.y) : g.moveTo(q.x,q.y)); g.stroke();
  };
  stroke(map.pathWidth+10,'#4f3820'); stroke(map.pathWidth+2,'#805932'); stroke(map.pathWidth-8,'#b08a56');
  for (let i = 0; i < 500; i++) {
    const x = r()*W, y = r()*H;
    if (map.distToPath(x,y) < map.pathWidth/2-6) {
      g.fillStyle = r()<.5 ? 'rgba(90,65,35,.5)' : 'rgba(220,190,140,.45)';
      g.beginPath(); g.arc(x,y,1+r()*2,0,7); g.fill();
    }
  }
  for (const d of map.decor) drawDecor(g, d);
  return c;
}

function shadow(g, x, y, rx) {
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x, y, rx, rx*.4, 0, 0, 7); g.fill();
}
function drawDecor(g, d) {
  const {x, y, s, v} = d;
  if (d.kind === 'tree') {
    shadow(g, x+4, y+6, 20*s);
    g.fillStyle = '#5b3d22'; g.fillRect(x-3*s, y-4*s, 6*s, 12*s);
    for (const [ox, oy, rad, col] of [[0,-14,17,'#1f6b34'],[-8,-8,13,'#26793c'],[8,-8,13,'#2c8444'],[0,-20,12,'#37964f']]) {
      g.fillStyle = col; g.beginPath(); g.arc(x+ox*s, y+oy*s, rad*s, 0, 7); g.fill();
    }
  } else if (d.kind === 'bush') {
    shadow(g, x+2, y+5, 12*s);
    g.fillStyle = '#2a7a3a'; g.beginPath(); g.arc(x, y, 9*s, 0, 7); g.arc(x+8*s, y+2, 7*s, 0, 7); g.arc(x-7*s, y+2, 7*s, 0, 7); g.fill();
  } else if (d.kind === 'rock') {
    shadow(g, x+2, y+5, 12*s);
    g.fillStyle = '#8a8d8a'; g.beginPath(); g.ellipse(x, y, 11*s, 8*s, 0, 0, 7); g.fill();
    g.fillStyle = '#b4b7b2'; g.beginPath(); g.ellipse(x-3*s, y-3*s, 5*s, 3*s, 0, 0, 7); g.fill();
  } else {
    g.fillStyle = v < .33 ? '#f2e66b' : v < .66 ? '#f4f1ea' : '#e58bb0';
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x+k*5-5, y+(k%2)*3, 2.2, 0, 7); g.fill(); }
  }
}

export function drawHeart(ctx, map, t) {
  const {x, y} = map.end, pulse = 1 + Math.sin(t*2.5)*0.06;
  const glow = ctx.createRadialGradient(x,y,4,x,y,70*pulse);
  glow.addColorStop(0,'rgba(80,255,170,.55)'); glow.addColorStop(1,'rgba(80,255,170,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x,y,70*pulse,0,7); ctx.fill();
  shadow(ctx, x, y+30, 30);
  ctx.fillStyle = '#7d8580'; ctx.fillRect(x-24, y+16, 48, 12);
  ctx.fillStyle = '#3ecf8e'; ctx.beginPath();
  ctx.moveTo(x, y-34*pulse); ctx.lineTo(x+20, y-4); ctx.lineTo(x+12, y+18); ctx.lineTo(x-12, y+18); ctx.lineTo(x-20, y-4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath();
  ctx.moveTo(x-2, y-26); ctx.lineTo(x+8, y-6); ctx.lineTo(x-2, y+10); ctx.lineTo(x-10, y-4); ctx.closePath(); ctx.fill();
}

export function drawEnemy(ctx, e, bar = true) {
  const r = e.radius, A = e.anim, face = Math.cos(e.angle) >= 0 ? 1 : -1, by = e.y - Math.abs(Math.sin(A)) * (e.boss ? 2 : 3);
  shadow(ctx, e.x, e.y + r * .9, r * 1.05);
  ctx.save(); ctx.translate(e.x, by); ctx.scale(face, 1);
  const B = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const C = (x, y, rad, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill(); };
  const T = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.fill(); };
  if (e.type === 'goblin') {
    B(-6 + Math.sin(A) * 3, r * .4, 4, 6, '#3f6a23'); B(2 - Math.sin(A) * 3, r * .4, 4, 6, '#3f6a23');
    C(0, 0, r, e.color); T([[-r * .8, -4], [-r * 1.5, -10], [-r * .4, -r * .8]], e.color); T([[r * .8, -4], [r * 1.5, -10], [r * .4, -r * .8]], e.color);
    C(4, -2, 3.2, '#fff'); C(-2, -2, 3.2, '#fff'); C(5, -2, 1.5, '#1a1a1a'); C(-1, -2, 1.5, '#1a1a1a');
  } else if (e.type === 'wolf') {
    for (const k of [-10, -3, 5, 11]) B(k + Math.sin(A + k) * 3, 6, 3, 8, '#4a3b30');
    ctx.fillStyle = e.color; ctx.beginPath(); ctx.ellipse(0, 0, 17, 9, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(17, -3, 8, 6, .2, 0, 7); ctx.fill();
    T([[15, -8], [17, -15], [20, -8]], '#6e5d4e'); C(20, -4, 1.5, '#111');
    B(-6, -4, 12, 4, '#5a3a1a'); C(-1, -10, 6, '#6fae3b'); C(1, -11, 1.6, '#fff'); T([[-6, -14], [0, -21], [5, -14]], '#a33');
  } else if (e.type === 'brute') {
    B(-9 + Math.sin(A) * 2, r * .5, 7, 8, '#3a3028'); B(3 - Math.sin(A) * 2, r * .5, 7, 8, '#3a3028');
    C(0, 0, r, e.color); C(0, 5, r * .6, '#9a8a76');
    ctx.fillStyle = '#9aa0a5'; ctx.beginPath(); ctx.arc(0, -5, r * .85, Math.PI, 0); ctx.fill(); B(-r * .85, -6, r * 1.7, 3, '#6d7378');
    C(5, -1, 2, '#e14'); C(-3, -1, 2, '#e14');
    const sw = Math.sin(A) * 3; ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(r * .7, 2); ctx.lineTo(r + 8, -12 - sw); ctx.stroke(); C(r + 9, -14 - sw, 6, '#4a3a2a');
  } else if (e.type === 'shadow') {
    ctx.globalAlpha = .8 + .15 * Math.sin(A * .7);
    C(0, 0, r, e.color); for (const k of [-1, 0, 1]) C(k * r * .6, r * .7 + Math.sin(A + k) * 2, r * .4, e.color);
    T([[-r * .6, -r * .6], [-r * .9, -r * 1.4], [-r * .1, -r * .8]], e.color); T([[r * .6, -r * .6], [r * .9, -r * 1.4], [r * .1, -r * .8]], e.color);
    C(5, -3, 5, 'rgba(200,150,255,.35)'); C(-3, -3, 5, 'rgba(200,150,255,.35)'); C(5, -3, 2.2, '#e8c8ff'); C(-3, -3, 2.2, '#e8c8ff');
  } else { // boss
    const p = 1 + Math.sin(A * .4) * .04; ctx.scale(p, p);
    B(-15 + Math.sin(A * .6) * 3, r * .6, 11, 11, '#3a2a48'); B(4 - Math.sin(A * .6) * 3, r * .6, 11, 11, '#3a2a48');
    C(0, 0, r, e.color); C(0, 8, r * .6, '#7a5a92');
    T([[-r * .7, -r * .5], [-r * 1.1, -r * 1.35], [-r * .2, -r * .85]], '#e8e0c8'); T([[r * .7, -r * .5], [r * 1.1, -r * 1.35], [r * .2, -r * .85]], '#e8e0c8');
    B(-r * .5, -r * .95, r, 6, '#d4b04a'); for (const k of [-1, 0, 1]) T([[k * r * .3 - 4, -r * .95], [k * r * .3, -r * 1.3], [k * r * .3 + 4, -r * .95]], '#d4b04a');
    C(9, -4, 4, '#ff3b3b'); C(-5, -4, 4, '#ff3b3b'); T([[2, 8], [5, 16], [8, 8]], '#fff'); T([[-8, 8], [-5, 16], [-2, 8]], '#fff');
    const sw = Math.sin(A * .6) * 4; ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(r * .8, 4); ctx.lineTo(r + 16, -20 - sw); ctx.stroke(); C(r + 18, -23 - sw, 10, '#3a2a1a');
  }
  if (e.slowT > 0) C(0, 0, r + 3, 'rgba(120,220,255,.35)');
  ctx.restore();
  if (!bar) return;
  const w = Math.max(30, r * 2.2), f = Math.max(0, e.hp / e.maxHp), top = e.y - r - (e.boss ? 24 : 16), h = e.boss ? 8 : 4;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - w / 2 - 1, top - 1, w + 2, h + 2);
  ctx.fillStyle = f > .5 ? '#5ed46a' : f > .25 ? '#e5c24a' : '#d9534f'; ctx.fillRect(e.x - w / 2, top, w * f, h);
}

export function drawTower(ctx, t, alpha = 1) {
  const p = Math.min(1, t.age / .3), s = p < 1 ? .4 + .6 * p + Math.sin(p * Math.PI) * .15 : 1, lv = t.level || 0;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(t.x, t.y + 14); ctx.scale(s, s);
  shadow(ctx, 3, 4, 20);
  const rb = (t.recoil || 0) * 3;
  if (t.type === 'archer') {
    ctx.fillStyle = '#7d8580'; ctx.beginPath(); ctx.ellipse(0, 0, 19, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-12, -30 - lv * 3, 24, 30 + lv * 3);
    ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = 1.5; for (const x of [-4, 4]) { ctx.beginPath(); ctx.moveTo(x, -30 - lv * 3); ctx.lineTo(x, 0); ctx.stroke(); }
    ctx.fillStyle = ['#a8743a', '#c9a75a', '#e6cf86'][lv]; ctx.fillRect(-16, -34 - lv * 3, 32, 7);
    ctx.save(); ctx.translate(0, -42 - lv * 3);
    ctx.fillStyle = ['#2f7a43', '#2a6aa0', '#8a3a9a'][lv]; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.arc(0, 1, 4, 0, 7); ctx.fill();
    ctx.rotate(t.angle); ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8 - rb, 0, 9, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8 - rb + Math.cos(1.2) * 9, Math.sin(1.2) * 9);
    ctx.lineTo(5 - 2 * rb, 0); ctx.lineTo(8 - rb + Math.cos(1.2) * 9, -Math.sin(1.2) * 9); ctx.stroke(); ctx.restore();
  } else if (t.type === 'cannon') {
    ctx.fillStyle = '#5f6560'; ctx.beginPath(); ctx.ellipse(0, 0, 21, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7d8580'; ctx.fillRect(-15, -22, 30, 22); ctx.fillStyle = '#9aa29c'; ctx.fillRect(-15, -22, 30, 4);
    ctx.fillStyle = ['#3a3f44', '#4a5560', '#6a5a2a'][lv]; ctx.beginPath(); ctx.arc(0, -24, 11 + lv, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(0, -24); ctx.rotate(t.angle);
    ctx.fillStyle = '#23272b'; ctx.fillRect(-4 - rb * 3, -5 - lv * .6, 22 + lv * 2, 10 + lv * 1.2); ctx.fillStyle = '#4b5258'; ctx.fillRect(15 + lv * 2 - rb * 3, -6.5 - lv * .6, 5, 13 + lv * 1.2);
    ctx.restore();
  } else {
    ctx.fillStyle = '#6c8794'; ctx.beginPath(); ctx.ellipse(0, 0, 19, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#a9dcec'; ctx.fillRect(-11, -14, 22, 14);
    const h = 24 + lv * 6, pulse = .6 + .4 * Math.sin((t.age || 0) * 3);
    ctx.fillStyle = `rgba(120,230,255,${.18 + .15 * pulse})`; ctx.beginPath(); ctx.arc(0, -14 - h / 2, 15 + lv * 2, 0, 7); ctx.fill();
    T2(ctx, [[-9, -14], [-4, -14 - h * .75], [0, -14 - h], [5, -14 - h * .7], [10, -14]], ['#5cc9e8', '#8be8ff', '#c8f6ff'][lv]);
    T2(ctx, [[-2, -16], [0, -14 - h * .9], [3, -16]], 'rgba(255,255,255,.55)');
    for (let i = 0; i <= lv; i++) { const a = (t.age || 0) * 1.5 + i * 2.1; ctx.fillStyle = '#d8faff'; ctx.beginPath(); ctx.arc(Math.cos(a) * 17, -14 - h / 2 + Math.sin(a * 1.3) * 6, 2, 0, 7); ctx.fill(); }
  }
  for (let i = 0; i <= lv; i++) { ctx.fillStyle = '#f2d675'; ctx.beginPath(); ctx.arc((i - lv / 2) * 8, 18, 2.6, 0, 7); ctx.fill(); }
  if (t.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${t.flash})`; ctx.beginPath(); ctx.arc(0, -22, 26, 0, 7); ctx.fill(); }
  ctx.restore();
}
function T2(ctx, pts, c) { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }

export function drawProjectile(ctx, p) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
  if (p.kind === 'cannon') { ctx.fillStyle = '#23272b'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#6a7279'; ctx.beginPath(); ctx.arc(-2, -2, 2, 0, 7); ctx.fill(); }
  else if (p.kind === 'frost') { ctx.fillStyle = 'rgba(120,230,255,.35)'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#d8faff'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, 7); ctx.fill(); }
  else { ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(4, 0); ctx.stroke(); T2(ctx, [[8, 0], [3, -3], [3, 3]], '#ddd'); }
  ctx.restore();
}
export function drawEffect(ctx, f) {
  const k = f.t / f.life; ctx.save();
  if (f.type === 'banner') {
    ctx.globalAlpha = k < .7 ? 1 : 1 - (k - .7) / .3; ctx.font = `bold ${f.size}px Georgia`; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  } else if (f.type === 'text') {
    ctx.globalAlpha = 1 - k; ctx.font = `bold ${f.size}px Georgia`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.strokeText(f.text, f.x, f.y - k * 26); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - k * 26);
  } else if (f.type === 'boom' || f.type === 'frost') {
    ctx.globalAlpha = 1 - k; const boom = f.type === 'boom', rad = f.r * (.35 + .65 * Math.min(1, k * 2));
    ctx.fillStyle = boom ? 'rgba(255,150,50,.5)' : 'rgba(150,230,255,.4)'; ctx.strokeStyle = boom ? '#ffd27a' : '#e6fbff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(f.x, f.y, rad, 0, 7); ctx.fill(); ctx.stroke();
  } else if (f.type === 'ring') {
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#f2d675'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, 14 + k * 34, 0, 7); ctx.stroke();
  } else {
    ctx.globalAlpha = 1 - k; ctx.fillStyle = f.type === 'spark' ? '#ffe9a8' : 'rgba(235,235,225,.8)';
    const base = f.type === 'spark' ? 4 : 8 + f.r * .3; ctx.beginPath(); ctx.arc(f.x, f.y, base + k * (f.type === 'spark' ? 8 : 16), 0, 7); ctx.fill();
  }
  ctx.restore();
}
export function drawRange(ctx, t) {
  ctx.fillStyle = 'rgba(255,255,255,.09)'; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(t.x, t.y, t.stats.range, 0, 7); ctx.fill(); ctx.stroke();
}
export function drawPreview(ctx, g) {
  const { col, row } = g.hover, why = g.canPlace(col, row), ok = !why, x = (col + .5) * GRID, y = (row + .5) * GRID;
  ctx.fillStyle = ok ? 'rgba(120,255,160,.10)' : 'rgba(255,90,90,.10)'; ctx.strokeStyle = ok ? 'rgba(160,255,190,.7)' : 'rgba(255,120,120,.7)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, TOWERS[g.selected].levels[0].range, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = ok ? 'rgba(80,220,120,.45)' : 'rgba(230,70,70,.5)'; ctx.fillRect(col * GRID + 2, row * GRID + 2, GRID - 4, GRID - 4);
  drawTower(ctx, { type: g.selected, x, y, angle: -Math.PI / 2, recoil: 0, age: 1, level: 0, flash: 0 }, ok ? .75 : .4);
  if (why) {
    ctx.font = 'bold 13px Georgia'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.strokeText(REASONS[why], x, row * GRID - 6); ctx.fillStyle = '#ffb4a8'; ctx.fillText(REASONS[why], x, row * GRID - 6);
  }
}

// Small enemy portrait for the wave preview panel.
export function drawEnemyIcon(ctx, type) {
  const d = ENEMIES[type], k = Math.min(1, 17 / d.radius);
  ctx.clearRect(0, 0, 44, 44); ctx.save(); ctx.scale(k, k);
  drawEnemy(ctx, { type, ...d, x: 22 / k, y: 26 / k, angle: 0, anim: .5, hp: 1, maxHp: 1, slowT: 0 }, false);
  ctx.restore();
}
// Build-spot helper: white dots = open cells, gold rings = spots that cover the most road.
export function drawSpots(ctx, s, t, rings = true) {
  ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.beginPath();
  for (const c of s.valid) { ctx.moveTo(c.x + 3, c.y); ctx.arc(c.x, c.y, 3, 0, 7); }
  ctx.fill();
  if (!rings) return;
  ctx.strokeStyle = `rgba(255,214,102,${.65 + .3 * Math.sin(t * 4)})`; ctx.fillStyle = 'rgba(255,214,102,.18)'; ctx.lineWidth = 3;
  for (const c of s.best) { ctx.beginPath(); ctx.arc(c.x, c.y, 15, 0, 7); ctx.fill(); ctx.stroke(); }
}