import { CONFIG } from './config.js';

export const LEVELS = {
  1: {
    id: 1, name: 'Whispering Vale', seed: 7, pathWidth: 52, decorCount: 150,
    // Logical coordinates. Enemies enter off-screen left and end at the Emerald Heart.
    waypoints: [
      {x:-40,y:110},{x:230,y:110},{x:230,y:320},{x:100,y:320},{x:100,y:540},
      {x:470,y:540},{x:470,y:220},{x:710,y:220},{x:710,y:440},{x:850,y:440},
    ],
  },
};

function rng(seed) { // deterministic PRNG so decorations are stable per level
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

export function buildMap(def) {
  const pts = def.waypoints, segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i-1], b = pts[i], len = Math.hypot(b.x-a.x, b.y-a.y);
    segs.push({a, b, len, start: total});
    total += len;
  }
  const pointAt = d => {
    d = Math.max(0, Math.min(total, d));
    const s = segs.find(s => d <= s.start + s.len) || segs[segs.length-1];
    const t = (d - s.start) / s.len;
    return { x: s.a.x + (s.b.x-s.a.x)*t, y: s.a.y + (s.b.y-s.a.y)*t,
             angle: Math.atan2(s.b.y-s.a.y, s.b.x-s.a.x) };
  };
  const distToPath = (x, y) => {
    let m = Infinity;
    for (const s of segs) {
      const dx = s.b.x-s.a.x, dy = s.b.y-s.a.y;
      const t = Math.max(0, Math.min(1, ((x-s.a.x)*dx + (y-s.a.y)*dy) / (s.len*s.len)));
      m = Math.min(m, Math.hypot(x-(s.a.x+dx*t), y-(s.a.y+dy*t)));
    }
    return m;
  };
  const r = rng(def.seed), kinds = ['tree','tree','bush','rock','flower','flower'];
  const end = pts[pts.length-1], decor = [];
  for (let i = 0; i < def.decorCount; i++) {
    const kind = kinds[Math.floor(r()*kinds.length)];
    const x = r()*CONFIG.width, y = r()*CONFIG.height, v = r(), s = 0.8 + r()*0.5;
    const clear = def.pathWidth/2 + (kind === 'tree' ? 28 : 14);
    if (distToPath(x, y) < clear || Math.hypot(x-end.x, y-end.y) < 70) continue;
    decor.push({kind, x, y, v, s});
  }
  decor.sort((a, b) => a.y - b.y);
  return { ...def, pts, total, pointAt, distToPath, decor, end };
}
