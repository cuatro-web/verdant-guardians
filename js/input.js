import { CONFIG, GRID, TOWERS } from './config.js';

// Converts screen pointer position to logical battlefield cells, so scaling never breaks aiming.
// Mouse: click builds at once. Touch: first tap previews a spot, second tap on the same spot builds
// (so a fat finger or a scroll attempt never wastes coins).
export function bindInput(canvas, game) {
  const cell = e => {
    const r = canvas.getBoundingClientRect();
    return { col: Math.floor((e.clientX - r.left) * CONFIG.width / r.width / GRID),
             row: Math.floor((e.clientY - r.top) * CONFIG.height / r.height / GRID) };
  };
  const hasTower = c => game.towers.some(t => t.col === c.col && t.row === c.row);
  canvas.addEventListener('pointermove', e => {
    const c = cell(e);
    if (e.pointerType === 'mouse') game.hover = c;
    else if (e.buttons) { game.hover = c; if (game.selected) game.pending = c; } // drag a finger to adjust the preview
  });
  canvas.addEventListener('pointerdown', e => {
    const c = cell(e); game.hover = c; game.touch = e.pointerType !== 'mouse';
    if (!game.touch || !game.selected || hasTower(c)) return game.pointerDown();
    const p = game.pending;
    if (p && p.col === c.col && p.row === c.row) game.pointerDown(); else game.pending = c;
  });
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') game.hover = null; });
  window.addEventListener('keydown', e => {
    if (!game.running || game.over || game.confirming || document.querySelector('.modal:not([hidden])')) return;
    const keys = Object.keys(TOWERS), k = e.key.toLowerCase();
    if (k >= '1' && k <= String(keys.length)) game.select(keys[k - 1]);
    else if (k === 'escape') { game.selected = null; game.selectTower(null); }
    else if (k === 'p') game.setPaused(!game.paused);
    else if (k === 'n') game.startWave();
  });
}