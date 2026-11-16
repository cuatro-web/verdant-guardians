export class Projectile {
  // o: { dmg, speed, kind, splash, slow, slowT }
  constructor(x, y, target, o) {
    Object.assign(this, { x, y, target, tx: target.x, ty: target.y, angle: 0, done: false, ...o });
  }
  update(dt, game) {
    if (this.target.alive) { this.tx = this.target.x; this.ty = this.target.y; } // homing; keeps last point if target dies
    const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy), step = this.speed * dt;
    this.angle = Math.atan2(dy, dx);
    if (d <= step + 6) { game.impact(this); this.done = true; return; }
    this.x += dx / d * step; this.y += dy / d * step;
  }
}