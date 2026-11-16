import { TOTAL } from './waves.js';
// Menus, modals, tutorial, level select and settings. No game logic here.
const $ = id => document.getElementById(id);

export const modal = {
  open(id, onClose) { const el = $(id); el._onClose = onClose; el.hidden = false; (el.querySelector('[data-focus]') || el.querySelector('button'))?.focus(); },
  close(el) { el.hidden = true; const cb = el._onClose; el._onClose = null; cb?.(); },
  anyOpen: () => !!document.querySelector('.modal:not([hidden])'),
};
export function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
export const applyMotion = on => { document.body.dataset.motion = on ? 'on' : 'off'; };

export function initModals() {
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) modal.close(m); });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = [...document.querySelectorAll('.modal:not([hidden])')].pop();
    if (open) modal.close(open);
  });
  const box = $('flies'); // drifting fireflies for the menu (pure CSS animation)
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span'); s.className = 'fly';
    s.style.cssText = `left:${Math.random() * 100}%;top:${30 + Math.random() * 65}%;--d:${6 + Math.random() * 8}s;--s:${-Math.random() * 10}s;--dx:${(Math.random() - .5) * 80}px`;
    box.appendChild(s);
  }
}

const IMG = 'assets/images/tutorial-';
const STEPS = [
  ['What is tower defense?', 'Enemies march along a path toward something you protect. You cannot fight them directly. Instead you build towers beside the path, and the towers do the fighting.',
    IMG + '1-goal.jpg', 'Towers shooting at goblins walking along a dirt road'],
  ['How enemies move', 'Every enemy follows the same winding dirt road from the forest entrance to the Emerald Heart. They never leave the path, so the best towers sit near its bends, where enemies stay in range longer.',
    IMG + '2-path.jpg', 'The full path from the entrance to the Emerald Heart with arrows'],
  ['Building towers', 'Pick a tower from the bar at the bottom (or press 1, 2, 3), then click or tap the grass. White dots mark open spots. Red means you cannot build there: the path, an obstacle, another tower, or not enough coins. Turn on gold rings in Settings to see the strongest spots.',
    IMG + '3-build.jpg', 'Placing an archer tower: white dots mark open spots and a gold ring marks a strong spot'],
  ['Upgrades and selling', 'Click a tower you built to see its stats and range. Upgrade it up to level 3 for more damage and range, or sell it to get 70% of your coins back.',
    IMG + '4-upgrade.jpg', 'A selected tower with the upgrade and sell buttons in the side panel'],
  ['Earning coins', 'Defeated enemies drop coins, and you get a bonus after every wave. Spend them on new towers and upgrades. Tougher enemies pay more.',
    IMG + '5-coins.jpg', 'A defeated goblin showing +8 coins and the coin counter in the top bar'],
  ['Surviving waves', 'There are 10 waves. The wave panel shows which enemies are coming next. Press Start Wave when you are ready; nothing attacks until you do. Archers are fast, cannons hit groups, and frost slows enemies. A boss waits at the end.',
    IMG + '6-waves.jpg', 'The next wave panel listing goblins and wolf riders'],
  ['Protecting the Heart', 'Each enemy that reaches the Emerald Heart costs you kingdom health. At zero the Heart falls and you lose. Survive all 10 waves to win, and keep your health high for more stars.',
    IMG + '7-heart.jpg', 'Enemies reaching the Emerald Heart and the kingdom health counter'],
];
export function initTutorial() {
  let i = 0; const back = $('tut-back'), next = $('tut-next');
  $('tut-img').onerror = () => { $('tut-img').hidden = true; }; // if a picture is missing, the text still works
  const render = () => {
    $('tut-title').textContent = STEPS[i][0]; $('tut-text').textContent = STEPS[i][1];
    const im = $('tut-img'); im.hidden = false; im.src = STEPS[i][2]; im.alt = STEPS[i][3];
    $('tut-dots').replaceChildren(...STEPS.map((_, k) => Object.assign(document.createElement('i'), { className: k === i ? 'on' : '' })));
    $('tut-count').textContent = `${i + 1} / ${STEPS.length}`;
    back.disabled = i === 0; next.textContent = i === STEPS.length - 1 ? 'Got it' : 'Next';
  };
  back.onclick = () => { if (i > 0) { i--; render(); } };
  next.onclick = () => { if (i < STEPS.length - 1) { i++; render(); } else modal.close($('howto')); };
  $('btn-how').onclick = () => { i = 0; render(); modal.open('howto'); };
}

const LEVEL_CARDS = [
  { id: 1, name: 'Whispering Vale', info: '10 waves. A winding forest road.', available: true },
  { id: 2, name: 'Moonlit Marsh', info: 'Map coming soon.' },
  { id: 3, name: 'Cinder Pass', info: 'Map coming soon.' },
];
const starText = n => '\u2605'.repeat(n) + '\u2606'.repeat(3 - n);
export function initLevelSelect(progress, startLevel) {
  const render = () => $('levels-grid').replaceChildren(...LEVEL_CARDS.map(l => {
    const unlocked = progress.unlocked.includes(l.id), done = progress.completed[l.id], playable = unlocked && l.available;
    const card = document.createElement('div'); card.className = 'level-card' + (playable ? '' : ' locked');
    const note = !unlocked ? `Locked: complete level ${l.id - 1} first` : !l.available ? 'Unlocked. Map coming soon.'
      : done ? `${starText(done.stars)}  Best score ${done.score.toLocaleString()}` : l.info;
    const b = Object.assign(document.createElement('button'), { className: 'btn small' + (playable ? ' primary' : ''), textContent: playable ? 'Play' : 'Locked', disabled: !playable });
    b.onclick = () => { modal.close($('levels')); startLevel(l.id); };
    card.append(Object.assign(document.createElement('b'), { textContent: l.name }), Object.assign(document.createElement('span'), { textContent: note }), b);
    return card;
  }));
  $('btn-levels').onclick = () => modal.open('levels');
  render(); return render;
}
export function renderMenuStats(p) {
  const cleared = Object.keys(p.completed).length, stars = Object.values(p.completed).reduce((n, c) => n + c.stars, 0);
  $('menu-stats').textContent = p.highScore
    ? `Best score ${p.highScore.toLocaleString()}  |  Highest wave ${p.bestWave}/${TOTAL}  |  Levels cleared ${cleared}` : '';
  $('rec-score').textContent = p.highScore.toLocaleString(); $('rec-wave').textContent = `${p.bestWave} / ${TOTAL}`;
  $('rec-levels').textContent = `${cleared} / ${LEVEL_CARDS.length}`; $('rec-stars').textContent = `${stars} / ${LEVEL_CARDS.length * 3}`;
  $('rec-empty').hidden = p.highScore > 0;
  $('rec-list').replaceChildren(...LEVEL_CARDS.filter(l => l.available).map(l => {
    const done = p.completed[l.id], row = Object.assign(document.createElement('div'), { className: 'kv-row' });
    row.append(Object.assign(document.createElement('span'), { textContent: l.name }),
               Object.assign(document.createElement('b'), { textContent: done ? starText(done.stars) : '\u2606\u2606\u2606' }));
    return row;
  }));
}

export function initSettings(s, audio, save, onReset) {
  const bools = ['sfx', 'muted', 'music', 'rings', 'shake', 'animations', 'hints'];
  const el = { volume: $('set-volume'), musicVol: $('set-musicvol'), particles: $('set-particles'),
    sfx: $('set-sfx'), muted: $('set-mute'), music: $('set-music'), rings: $('set-rings'), shake: $('set-shake'), animations: $('set-anim'), hints: $('set-hints') };
  const label = () => { $('set-volume-val').textContent = Math.round(s.volume * 100) + '%'; $('set-musicvol-val').textContent = Math.round(s.musicVol * 100) + '%'; };
  el.volume.value = Math.round(s.volume * 100); el.musicVol.value = Math.round(s.musicVol * 100); el.particles.value = s.particles;
  for (const k of bools) el[k].checked = s[k];
  label();
  const change = () => {
    s.volume = el.volume.value / 100; s.musicVol = el.musicVol.value / 100; s.particles = el.particles.value;
    for (const k of bools) s[k] = el[k].checked;
    label(); audio.apply(); applyMotion(s.animations); save(s);
  };
  Object.values(el).forEach(e => e.addEventListener('input', change));
  el.volume.addEventListener('change', () => audio.play('upgrade'));
  $('btn-settings').onclick = () => modal.open('settings');
  $('btn-credits').onclick = () => modal.open('credits');
  $('btn-reset').onclick = () => modal.open('confirm');
  $('confirm-yes').onclick = () => {
    modal.close($('confirm')); onReset();
    const b = $('btn-reset'); b.textContent = 'Progress reset'; setTimeout(() => { b.textContent = 'Reset progress'; }, 2500);
  };
  applyMotion(s.animations);
}