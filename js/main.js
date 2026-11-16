import { Game } from './game.js';
import { TOWERS, towerCost, MUSIC } from './config.js';
import { bindInput } from './input.js';
import { drawTower } from './renderer.js';
import { AudioManager } from './audio.js';
import { loadSettings, saveSettings, loadProgress, recordResult, resetProgress } from './storage.js';
import { TOTAL } from './waves.js';
import * as ui from './ui.js';

const $ = id => document.getElementById(id);
const settings = loadSettings();
const audio = new AudioManager(settings);
const progress = loadProgress();

const towers = {};
document.querySelectorAll('[data-tower]').forEach(btn => {
  const type = btn.dataset.tower; towers[type] = btn;
  btn.querySelector('b').textContent = TOWERS[type].name;
  btn.querySelector('.cost').textContent = towerCost(type) + ' coins';
  btn.querySelector('small').textContent = TOWERS[type].desc;
  btn.addEventListener('click', () => game.select(type));
  const c = btn.querySelector('canvas').getContext('2d'); // tower icon drawn with the same renderer as the battlefield
  drawTower(c, { type, x: 28, y: 36, angle: -Math.PI / 2, recoil: 0, age: 1, level: 0, flash: 0 });
});
const hud = { health: $('hud-health'), enemies: $('hud-enemies'), coins: $('hud-coins'), wave: $('hud-wave'), hint: $('hint'),
  runScore: $('run-score'), runKills: $('run-kills'), runTowers: $('run-towers'), bestScore: $('best-score'), bestWave: $('best-wave'), bestNote: $('best-note'),
  preview: $('wave-preview'), waveTitle: $('wave-title'),
  speed: $('btn-speed'), waveBtn: $('btn-wave'), towers,
  panel: { root: $('tower-panel'), title: $('tp-title'), empty: $('tp-empty'), body: $('tp-body'), icon: $('tp-icon'), name: $('tp-name'), sub: $('tp-sub'),
    rows: $('tp-rows'), actions: $('tp-actions'), upgrade: $('btn-upgrade'), sell: $('btn-sell') } };
const game = new Game($('canvas'), hud);
game.opts = settings; game.progress = progress; game.sfx = n => audio.play(n);
game.onWaveStart = n => audio.setIntensity(n >= TOTAL); // the boss wave gets a faster, denser music loop
bindInput($('canvas'), game);

const ov = { root: $('overlay'), dialog: $('ov-dialog'), title: $('ov-title'), body: $('ov-body'), btns: $('ov-btns'), stars: $('ov-stars') };
function overlay(title, lines, buttons, { stars = null, cls = '' } = {}) {
  ov.dialog.className = 'dialog ' + cls; ov.title.textContent = title;
  ov.stars.replaceChildren(...(stars === null ? [] : [0, 1, 2].map(i => Object.assign(document.createElement('span'),
    { textContent: '\u2605', className: i < stars ? 'lit' : '', style: `animation-delay:${.25 + i * .25}s` }))));
  ov.body.replaceChildren(...lines.map(l => Object.assign(document.createElement('div'), { textContent: l })));
  ov.btns.replaceChildren(...buttons.map(([label, fn, primary]) => {
    const b = Object.assign(document.createElement('button'), { className: 'btn' + (primary ? ' primary' : ''), textContent: label });
    b.onclick = () => { ov.root.hidden = true; fn(); };
    return b;
  }));
  ov.root.hidden = false; ov.btns.firstChild.focus();
}
function toMenu() { game.stop(); audio.stopMusic(); ov.root.hidden = true; ui.show('menu'); }
function begin(id) { game.start(id); audio.setIntensity(false); audio.duck(false); audio.startMusic(); }
function startLevel(id) { ui.show('game'); begin(id); }
function showPause() {
  if (!game.paused) return;
  overlay('Paused', [], [['Resume', () => game.setPaused(false), 1], ['Restart Level', () => begin(game.levelId)],
    ['Settings', () => ui.modal.open('settings', showPause)], ['Main Menu', confirmLeave]]);
}
// Leaving mid-battle asks first. The game stays paused while the question is open.
function confirmLeave() {
  if (!game.running || game.over || (game.wave === 0 && !game.towers.length)) return toMenu(); // nothing to lose yet
  const was = game.paused; game.paused = true; game.confirming = true; audio.duck(true);
  const back = () => { game.confirming = false; if (was) showPause(); else { game.paused = false; audio.duck(false); } };
  overlay('Leave the battle?', [game.wave ? `You are on wave ${game.wave} of ${TOTAL}.` : 'Your towers are placed but no wave has started.',
    'Your current battle will be lost. Your saved records are not affected.'],
    [['Keep playing', back, 1], ['Leave to menu', () => { game.confirming = false; toMenu(); }]]);
}
game.onPause = p => { audio.duck(p); p ? showPause() : (ov.root.hidden = true); };
game.onEnd = r => {
  audio.stopMusic(); const f = recordResult(progress, r); refreshLevels(); ui.renderMenuStats(progress);
  overlay(r.win ? 'Victory!' : 'The Heart Has Fallen',
    [`Waves completed: ${r.win ? r.total : r.wave - 1} / ${r.total}`, ...(r.win ? [] : [`Wave reached: ${r.wave}`]),
     `Enemies defeated: ${r.kills}`, `Towers constructed: ${r.built}`, `Kingdom health left: ${r.health}`, `Final score: ${r.score}`,
     ...(f.newHigh ? ['New high score!'] : [])],
    [[r.win ? 'Replay' : 'Retry', () => begin(game.levelId), 1], ['Main Menu', toMenu]],
    { stars: r.win ? r.stars : null, cls: r.win ? 'victory' : 'defeat' });
};

if (MUSIC.credit) $('credit-music').textContent = 'Music: ' + MUSIC.credit;
ui.initModals(); ui.initTutorial(); ui.renderMenuStats(progress);
const refreshLevels = ui.initLevelSelect(progress, startLevel);
ui.initSettings(settings, audio, saveSettings, () => { resetProgress(progress); refreshLevels(); ui.renderMenuStats(progress); });
$('btn-play').addEventListener('click', () => startLevel(1));
$('btn-menu').addEventListener('click', confirmLeave);
$('btn-pause').addEventListener('click', () => game.setPaused(true));
$('btn-speed').addEventListener('click', () => { game.speed = game.speed === 1 ? 2 : 1; });
$('btn-wave').addEventListener('click', () => game.startWave());
$('btn-upgrade').addEventListener('click', () => game.upgrade());
$('btn-sell').addEventListener('click', () => game.sell());
// Audio may only start after a user gesture (browser autoplay rules).
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => audio.unlock()));
document.addEventListener('click', e => { if (e.target.closest('button:not(:disabled)')) audio.play('click'); });
// Auto-pause when the tab or app is hidden, so waves never run unseen.
document.addEventListener('visibilitychange', () => {
  audio.setHidden(document.hidden);
  if (document.hidden && game.running && !game.over && $('game').classList.contains('active')) game.setPaused(true);
});
if (location.search.includes('debug')) { window.__vg = game; window.__audio = audio; } // handy for testing in the console