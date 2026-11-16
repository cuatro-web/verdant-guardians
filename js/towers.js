import { GRID, TOWERS } from './config.js';
import { Projectile } from './projectiles.js';

export class Tower {
  constructor(type, col, row) {
    Object.assign(this, { type, col, row, x: (col + .5) * GRID, y: (row + .5) * GRID, level: 0,
                          cooldown: 0, angle: -Math.PI / 2, recoil: 0, age: 0, flash: 0 });
    this.invested = this.stats.cost;
  }
  get def() { return TOWERS[this.type]; }
  get stats() { return this.def.levels[this.level]; }
  get next() { return this.def.levels[this.level + 1] || null; }
  get sellValue() { return Math.round(this.invested * this.def.sellRate); }
  // Targeting rule: "First" = enemy furthest along the path within range.
  pickTarget(enemies) {
    let best = null;
    for (const e of enemies) {
      if (!e.alive || Math.hypot(e.x - this.x, e.y - this.y) > this.stats.range) continue;
      if (!best || e.dist > best.dist) best = e;
    }
    return best;
  }
  update(dt, game) {
    this.age += dt; this.cooldown -= dt; this.flash = Math.max(0, this.flash - dt);
    this.recoil = Math.max(0, this.recoil - dt * 6);
    const t = this.pickTarget(game.enemies);
    if (!t) return;
    this.angle = Math.atan2(t.y - this.y, t.x - this.x);
    if (this.cooldown > 0) return;
    const s = this.stats;
    game.projectiles.push(new Projectile(this.x, this.y - 18, t, { dmg: s.damage, speed: this.def.projSpeed,
      kind: this.def.kind, splash: s.splash || 0, slow: s.slow || 0, slowT: s.slowT || 0 }));
    this.cooldown = 1 / s.rate; this.recoil = 1; game.sfx(this.def.kind);
  }
}