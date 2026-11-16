import { CONFIG, GRID, TOWERS, REASONS, STARS, ENEMIES, towerCost } from './config.js';
import { LEVELS, buildMap } from './maps.js';
import { Enemy } from './enemies.js';
import { Tower } from './towers.js';
import { WAVES, TOTAL, buildQueue } from './waves.js';
import * as R from './renderer.js';

export class Game {
  constructor(canvas, hud) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.hud = hud;
    this.rafId = null; this.running = false; this.speed = 1;
    this.onEnd = null; this.onPause = null; this.sfx = () => {}; this.onWaveStart = null; this.progress = { highScore: 0, bestWave: 0 };
    this.opts = { particles: 'high', shake: true, animations: true, hints: true, rings: true }; // replaced by saved settings
     this._frame = this._frame.bind(this);
  }
  // Pure game-state reset (no DOM), so it can be unit-tested.
  reset(levelId = 1) {
    this.map = buildMap(LEVELS[levelId]);
    Object.assign(this, { enemies: [], towers: [], projectiles: [], effects: [], queue: [],
      health: CONFIG.kingdomHealth, coins: CONFIG.startCoins, score: 0, kills: 0, built: 0, wave: 0,
      waveTime: 0, state: 'prep', time: 0, shake: 0, over: false, paused: false,
      selected: null, selectedTower: null, hover: null, pending: null, levelId, _spotKey: null, _pathPts: null, _wk: null, touch: this.touch || false, _hud: {}, _pk: null });
  }
  start(levelId = 1) {
    this.stop();                                   // guarantees a single loop
    this.reset(levelId);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = CONFIG.width * this.dpr; this.canvas.height = CONFIG.height * this.dpr;
    this.terrain = R.bakeTerrain(this.map, this.dpr);
    this.last = performance.now(); this.running = true;
    this.rafId = requestAnimationFrame(this._frame);
  }
  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null; this.enemies = [];
  }
  setPaused(p) { if (!this.running || this.over || p === this.paused) return; this.paused = p; this.onPause?.(p); }
  select(type) { if (!this.running) return; this.pending = null; this.selectTower(null); this.selected = this.selected === type ? null : type; }
  selectTower(t) { this.selectedTower = t; this._pk = null; if (t) this.selected = null; }

  // Returns null if the cell is buildable, otherwise a reason code.
  canPlace(col, row, free = false) { // free = ignore coins (used for build-spot hints)
    const x = (col + .5) * GRID, y = (row + .5) * GRID, m = this.map;
    if (col < 0 || row < 0 || col >= CONFIG.width / GRID || row >= CONFIG.height / GRID) return 'outside';
    if (m.distToPath(x, y) < m.pathWidth / 2 + GRID * .4) return 'path';
    if (Math.hypot(x - m.end.x, y - m.end.y) < 64) return 'path';
    if (this.towers.some(t => t.col === col && t.row === row)) return 'occupied';
    if (m.decor.some(d => d.kind !== 'flower' && Math.hypot(d.x - x, d.y - y) < (d.kind === 'tree' ? 24 : 18))) return 'blocked';
    if (!free && this.selected && this.coins < towerCost(this.selected)) return 'coins';
    return null;
  }
  // Where can the selected tower go, and which spots cover the most road? Cached per tower type / tower count.
  computeSpots(type) {
    const key = type + '|' + this.towers.length; if (this._spotKey === key) return this._spots;
    const m = this.map, range = TOWERS[type].levels[0].range * .9;
    const pts = this._pathPts || (this._pathPts = Array.from({ length: Math.floor(m.total / 16) }, (_, i) => m.pointAt(i * 16)));
    const valid = [];
    for (let c = 0; c < CONFIG.width / GRID; c++) for (let r = 0; r < CONFIG.height / GRID; r++) {
      if (this.canPlace(c, r, true)) continue;
      const x = (c + .5) * GRID, y = (r + .5) * GRID;
      valid.push({ x, y, cov: pts.reduce((n, p) => n + (Math.hypot(p.x - x, p.y - y) < range), 0) });
    }
    const best = []; // greedy: strongest first, at least 3 cells apart, so the hints are spread out
    for (const c of [...valid].sort((a, b) => b.cov - a.cov)) { if (best.length >= 6) break; if (best.every(b => Math.hypot(b.x - c.x, b.y - c.y) >= GRID * 3)) best.push(c); }
    this._spotKey = key; return (this._spots = { valid, best });
  }
  pointerDown() {
    if (!this.running || this.over || this.paused || !this.hover) return;
    const { col, row } = this.hover, t = this.towers.find(t => t.col === col && t.row === row);
    if (t) return this.selectTower(t);
    if (this.selected) return this.tryPlace();
    this.selectTower(null);
  }
  tryPlace() {
    const { col, row } = this.hover, why = this.canPlace(col, row);
    if (why) { this.sfx('error'); return this.fx('text', (col + .5) * GRID, row * GRID, { text: REASONS[why], color: '#ff8a80' }); }
    const t = new Tower(this.selected, col, row);
    this.coins -= t.invested; this.towers.push(t); this.towers.sort((a, b) => a.y - b.y); this.built++; this.pending = null; // towers stay depth-sorted, so render needs no per-frame copy
    this.fx('puff', t.x, t.y); this.sfx('place');
  }
  upgrade(t = this.selectedTower) {
    if (!t || !t.next || this.over || this.paused) return;
    if (this.coins < t.next.cost) { this.sfx('error'); return this.fx('text', t.x, t.y - 30, { text: 'Not enough coins', color: '#ff8a80' }); }
    this.coins -= t.next.cost; t.invested += t.next.cost; t.level++; t.flash = .5; this._pk = null;
    this.sfx('upgrade'); this.fx('ring', t.x, t.y, { life: .5 }); this.fx('text', t.x, t.y - 50, { text: 'Level ' + (t.level + 1) });
  }
  sell(t = this.selectedTower) {
    if (!t || this.over || this.paused) return;
    this.sfx('sell'); this.coins += t.sellValue; this.fx('text', t.x, t.y - 20, { text: '+' + t.sellValue });
    this.towers = this.towers.filter(x => x !== t); this.selectTower(null);
  }
  startWave() {
    if (!this.running || this.over || this.paused || this.state !== 'prep') return;
    this.sfx('wave'); this.wave++; this.queue = buildQueue(this.wave); this.waveTime = 0; this.state = 'wave'; this.onWaveStart?.(this.wave);
    this.fx('banner', CONFIG.width / 2, 90, { text: 'Wave ' + this.wave, size: 36, life: 1.8 });
  }
  kick(v) { if (this.opts.shake && this.opts.animations) this.shake = Math.max(this.shake, v); }
  fx(type, x, y, o = {}) {
    if (this.opts.particles === 'low' && (type === 'spark' || type === 'puff')) return; // quality setting
    if (this.effects.length > 120) this.effects.shift();
    this.effects.push({ type, x, y, t: 0, text: o.text || '', color: o.color || '#f2d675', r: o.r || 0, size: o.size || 15,
      life: o.life || (type === 'text' ? .9 : .35) });
  }
  spawn(type) {
    this.enemies.push(new Enemy(type, 1 + CONFIG.hpPerWave * (this.wave - 1)));
    if (ENEMIES[type].boss) { this.kick(.7); this.sfx('boss'); this.fx('banner', CONFIG.width / 2, 140, { text: 'The Ogre Warlord approaches!', color: '#ff8a80', size: 30, life: 2.6 }); }
  }
  damage(e, dmg) {
    e.hp -= Math.max(dmg * .35, dmg - e.armor);
    if (e.hp <= 0 && e.alive) {
      e.alive = false; this.sfx('kill'); this.kills++; this.coins += e.reward; this.score += e.reward * 10;
      this.fx('puff', e.x, e.y, { r: e.radius }); this.fx('text', e.x, e.y - 22, { text: '+' + e.reward });
    }
  }
  impact(p) {
    const hits = p.splash > 0 ? this.enemies.filter(e => e.alive && Math.hypot(e.x - p.tx, e.y - p.ty) <= p.splash)
                              : (p.target.alive ? [p.target] : []);
    if (p.kind === 'cannon') this.fx('boom', p.tx, p.ty, { r: p.splash });
    else if (p.kind === 'frost') this.fx('frost', p.tx, p.ty, { r: p.splash, life: .45 });
    else if (hits.length) this.fx('spark', p.tx, p.ty);
    for (const e of hits) { this.damage(e, p.dmg); if (p.slow && e.alive) e.applySlow(p.slow, p.slowT); }
  }
  finish(win) {
    this.over = true; this.state = win ? 'won' : 'lost'; this.sfx(win ? 'victory' : 'defeat');
    if (win) this.score += this.health * 50;
    const stars = !win ? 0 : this.health >= STARS.three ? 3 : this.health >= STARS.two ? 2 : 1;
    this.onEnd?.({ win, level: this.levelId, stars, wave: this.wave, total: TOTAL, kills: this.kills, built: this.built, health: this.health, score: this.score });
  }
  _frame(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, 0.1) * this.speed; // clamp: tab-switch safe
    this.last = now;
    if (!this.over && !this.paused) this.update(dt);
    this.render(); this.updateHud();
    this.rafId = requestAnimationFrame(this._frame);
  }
  update(dt) {
    this.time += dt; this.shake = Math.max(0, this.shake - dt);
    if (this.state === 'wave') {
      this.waveTime += dt;
      while (this.queue.length && this.queue[0].t <= this.waveTime) this.spawn(this.queue.shift().type);
    }
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.update(dt, this.map);
      if (e.reachedEnd) { this.health = Math.max(0, this.health - e.damage); this.kick(.25); this.sfx('leak');
        this.fx('text', this.map.end.x, this.map.end.y - 44, { text: '-' + e.damage, color: '#ff6b6b' }); }
    }
    for (const t of this.towers) t.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    for (const f of this.effects) f.t += dt;
    this.enemies = this.enemies.filter(e => e.alive);
    this.projectiles = this.projectiles.filter(p => !p.done);
    this.effects = this.effects.filter(f => f.t < f.life);
    if (this.health <= 0) return this.finish(false);
    if (this.state === 'wave' && !this.queue.length && !this.enemies.length) {
      const bonus = CONFIG.waveBonusBase + CONFIG.waveBonusStep * this.wave;
      this.coins += bonus; this.score += 100 * this.wave;
      if (this.wave >= TOTAL) return this.finish(true);
      this.state = 'prep';
      this.fx('banner', CONFIG.width / 2, 90, { text: `Wave ${this.wave} cleared! +${bonus} coins`, size: 28, life: 2.2 });
    }
  }
  render() {
    const c = this.ctx, d = this.dpr, s = this.shake;
    c.setTransform(d, 0, 0, d, (Math.random() - .5) * 10 * s * d, (Math.random() - .5) * 10 * s * d);
    c.clearRect(-20, -20, CONFIG.width + 40, CONFIG.height + 40);
    c.drawImage(this.terrain, 0, 0, CONFIG.width, CONFIG.height);
    R.drawHeart(c, this.map, this.time);
    if (this.selected && !this.over) R.drawSpots(c, this.computeSpots(this.selected), this.time, this.opts.rings);
    if (this.selectedTower) R.drawRange(c, this.selectedTower);
    this.towers.forEach(t => R.drawTower(c, t));
    this.enemies.sort((a, b) => a.y - b.y); this.enemies.forEach(e => R.drawEnemy(c, e)); // in-place: no per-frame allocation
    this.projectiles.forEach(p => R.drawProjectile(c, p));
    this.effects.forEach(f => R.drawEffect(c, f));
    if (this.selected && this.hover && !this.over) R.drawPreview(c, this);
  }
  updateHud() { // touch the DOM only when a value changes
    const h = this.hud, P = this.progress, fmt = n => n.toLocaleString();
    const hint = !this.opts.hints || this.over ? ''
      : this.selected ? (this.touch ? (this.opts.rings ? 'Tap a spot (gold rings are strongest), then tap again to build.' : 'Tap a spot to preview it, then tap again to build.')
                      : (this.opts.rings ? 'White dots are open spots. Gold rings cover the most road.' : 'White dots are open spots.'))
      : this.wave > 0 ? '' : this.towers.length ? 'Nice! Press Start Wave when you are ready.'
      : this.touch ? 'Pick a tower, tap a spot to preview it, tap again to build.' : 'Pick a tower below, then click the grass to build it.';
    const v = { health: this.health, enemies: this.queue.length + this.enemies.length, coins: this.coins, wave: `${this.wave}/${TOTAL}`, speed: this.speed + 'x',
      runScore: fmt(this.score), runKills: this.kills, runTowers: this.towers.length,
      bestScore: fmt(Math.max(P.highScore, this.score)), bestWave: `${Math.max(P.bestWave, this.wave)}/${TOTAL}`,
      bestNote: this.score > P.highScore ? 'New personal best pace!' : '', hint };
    for (const k in v) if (this._hud[k] !== v[k]) { this._hud[k] = v[k]; h[k].textContent = v[k]; }
    const ready = this.state === 'prep' && !this.over;
    const wb = (ready ? 'Start Wave ' + (this.wave + 1) : this.state === 'wave' ? 'Wave in progress' : 'Finished') + '|' + ready;
    if (this._hud.wb !== wb) { this._hud.wb = wb; h.waveBtn.textContent = wb.split('|')[0]; h.waveBtn.disabled = !ready; h.waveBtn.classList.toggle('ready', ready); }
    for (const [type, btn] of Object.entries(h.towers)) {
      btn.classList.toggle('selected', this.selected === type);
      btn.classList.toggle('poor', this.coins < towerCost(type));
    }
    const wk = this.state + '|' + this.wave + '|' + this.over;
    if (wk !== this._wk) { this._wk = wk; this.renderPreview(); }
    this.renderPanel();
  }
  // Left panel: which enemies are in the next (or current) wave.
  renderPreview() {
    const h = this.hud, n = this.state === 'wave' ? this.wave : this.wave + 1, rows = [], el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls || '', textContent: text || '' });
    h.waveTitle.textContent = this.over ? 'Battle over' : n > TOTAL ? 'All waves launched' : this.state === 'wave' ? `Wave ${n} (in progress)` : `Next: Wave ${n}`;
    if (n <= TOTAL && !this.over) {
      const counts = {}; for (const [type, count] of WAVES[n - 1]) counts[type] = (counts[type] || 0) + count;
      for (const [type, count] of Object.entries(counts)) {
        const row = el('div', 'pv-row'), cv = Object.assign(document.createElement('canvas'), { width: 44, height: 44 }), info = el('div');
        R.drawEnemyIcon(cv.getContext('2d'), type);
        info.append(el('b', '', ENEMIES[type].name), el('small', '', ENEMIES[type].note));
        row.append(cv, info, el('span', 'pv-n', '\u00d7' + count)); rows.push(row);
      }
    }
    h.preview.replaceChildren(...rows);
  }
  // Right panel: stats of the selected tower (with upgrade preview) or of the tower you are about to build.
  renderPanel() {
    const h = this.hud, t = this.selectedTower, p = h.panel, mode = t ? 'tower' : this.selected ? 'build' : 'none', type = t ? t.type : this.selected;
    if (p.root.dataset.mode !== mode) p.root.dataset.mode = mode;
    const afford = mode === 'tower' ? this.coins >= (t.next ? t.next.cost : 0) : mode === 'build' ? this.coins >= towerCost(type) : 0;
    const key = [mode, type, t && t.level, afford, t && t.sellValue].join();
    if (key === this._pk) return;
    this._pk = key; p.empty.hidden = mode !== 'none'; p.body.hidden = mode === 'none';
    if (mode === 'none') { p.title.textContent = 'Tower Info'; return; }
    const def = TOWERS[type], cur = t ? t.stats : def.levels[0], nxt = t ? t.next : null;
    p.title.textContent = mode === 'build' ? 'Ready to build' : 'Selected tower'; p.name.textContent = def.name;
    p.sub.textContent = mode === 'build' ? `Cost ${cur.cost} coins. ${def.desc}` : `Level ${t.level + 1} of ${def.levels.length}`;
    const ic = p.icon.getContext('2d'); ic.clearRect(0, 0, 56, 64);
    R.drawTower(ic, { type, x: 28, y: 36, angle: -Math.PI / 2, recoil: 0, age: 1, level: t ? t.level : 0, flash: 0 });
    const rows = [], num = (x, m) => Math.round(x * m * 100) / 100;
    for (const [label, k, m, unit = ''] of [['Damage', 'damage', 1], ['Speed', 'rate', 1, '/s'], ['Range', 'range', 1], ['Splash', 'splash', 1], ['Slow', 'slow', 100, '%']]) {
      if (cur[k] == null) continue;
      const row = Object.assign(document.createElement('div'), { className: 'kv-row' }), val = Object.assign(document.createElement('b'), { textContent: num(cur[k], m) + unit });
      if (nxt && nxt[k] != null && nxt[k] !== cur[k]) val.append(Object.assign(document.createElement('span'), { className: 'up', textContent: ` \u2192 ${num(nxt[k], m)}${unit}` }));
      row.append(Object.assign(document.createElement('span'), { textContent: label }), val); rows.push(row);
    }
    p.rows.replaceChildren(...rows); p.actions.hidden = mode === 'build';
    if (t) { p.upgrade.textContent = nxt ? `Upgrade (${nxt.cost})` : 'Max level'; p.upgrade.disabled = !nxt || this.coins < nxt.cost; p.sell.textContent = `Sell (+${t.sellValue})`; }
  }
}