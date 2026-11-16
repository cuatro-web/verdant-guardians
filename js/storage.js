// Everything lives in this browser's LocalStorage; it is not synced between devices.
const KEY = 'verdant-guardians:settings';
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
const defaults = () => ({ volume: 0.7, sfx: true, muted: false, particles: 'high', shake: true, animations: !reduced(), hints: true, music: true, musicVol: 0.5, rings: false });

export function loadSettings() {
  const d = defaults();
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (typeof o.volume === 'number' && o.volume >= 0 && o.volume <= 1) d.volume = o.volume;
    if (typeof o.musicVol === 'number' && o.musicVol >= 0 && o.musicVol <= 1) d.musicVol = o.musicVol;
    for (const k of ['sfx', 'muted', 'shake', 'animations', 'hints', 'music', 'rings']) if (typeof o[k] === 'boolean') d[k] = o[k];
    if (o.particles === 'high' || o.particles === 'low') d.particles = o.particles;
  } catch { /* missing or corrupted data: keep defaults */ }
  return d;
}
export function saveSettings(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ } }

// ---- Progress (Phase 5). Only results are saved, never a game in progress. ----
const PKEY = 'verdant-guardians:progress';
const blank = () => ({ highScore: 0, bestWave: 0, completed: {}, unlocked: [1] });
const num = v => Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

export function loadProgress() {
  const p = blank();
  try {
    const o = JSON.parse(localStorage.getItem(PKEY) || '{}');
    p.highScore = num(o.highScore); p.bestWave = Math.min(num(o.bestWave), 99);
    if (o.completed && typeof o.completed === 'object')
      for (const [k, v] of Object.entries(o.completed)) {
        const id = +k; if (Number.isInteger(id) && id > 0 && v) p.completed[id] = { stars: Math.min(3, Math.max(1, num(v.stars))), score: num(v.score) };
      }
    if (Array.isArray(o.unlocked)) for (const id of o.unlocked) if (Number.isInteger(id) && id > 0 && !p.unlocked.includes(id)) p.unlocked.push(id);
  } catch { /* missing or corrupted data: start fresh */ }
  for (const id of Object.keys(p.completed)) if (!p.unlocked.includes(+id + 1)) p.unlocked.push(+id + 1);
  return p;
}
export function saveProgress(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch { /* storage blocked */ } }

// r = { win, level, stars, wave, total, score }. Returns what was beaten, for the result screen.
export function recordResult(p, r) {
  const flags = { newHigh: r.score > p.highScore };
  p.highScore = Math.max(p.highScore, r.score);
  p.bestWave = Math.max(p.bestWave, r.win ? r.total : r.wave);
  if (r.win) {
    const old = p.completed[r.level];
    p.completed[r.level] = { stars: Math.max(old?.stars || 0, r.stars), score: Math.max(old?.score || 0, r.score) };
    if (!p.unlocked.includes(r.level + 1)) p.unlocked.push(r.level + 1);
  }
  saveProgress(p); return flags;
}
export function resetProgress(p) { Object.assign(p, blank()); try { localStorage.removeItem(PKEY); } catch { /* ignore */ } }