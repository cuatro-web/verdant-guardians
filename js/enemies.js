import { ENEMIES } from './config.js';

export class Enemy {
  constructor(type, hpMul = 1) {
    const d = ENEMIES[type], hp = d.boss ? d.hp : Math.round(d.hp * hpMul);
    Object.assign(this, { type, ...d, hp, maxHp: hp, dist: 0, x: -999, y: -999, angle: 0,
                          alive: true, reachedEnd: false, anim: Math.random() * 6, slowT: 0, slowAmt: 0 });
  }
  applySlow(amount, time) {
    amount *= 1 - (this.slowResist || 0);
    if (this.slowT <= 0 || amount >= this.slowAmt) this.slowAmt = amount;
    this.slowT = Math.max(this.slowT, time);
  }
  update(dt, map) {
    if (this.slowT > 0) this.slowT -= dt;
    const k = this.slowT > 0 ? 1 - this.slowAmt : 1;
    this.dist += this.speed * k * dt; this.anim += dt * 10 * k;
    if (this.dist >= map.total) { this.reachedEnd = true; this.alive = false; }
    Object.assign(this, map.pointAt(this.dist));
  }
}