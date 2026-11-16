// Central tuning values. Balance the game here, not in game logic.
export const CONFIG = {
  width: 960, height: 640,
  kingdomHealth: 20,
  startCoins: 100,
  waveBonusBase: 15, waveBonusStep: 3,   // coins after each wave = base + step * waveNumber
  hpPerWave: 0.30,                       // enemy health grows 10% per wave (boss excluded)
};
export const STARS = { three: 15, two: 8 }; // kingdom health left on victory for 3 / 2 stars
export const GRID = 40;
export const REASONS = { outside: 'Out of bounds', path: 'On the path', occupied: 'Occupied',
                         blocked: 'Obstacle', coins: 'Not enough coins' };

// armor = flat damage reduction (a hit still does at least 35%). slowResist reduces slow effects.
export const ENEMIES = {
  goblin: { name: 'Goblin',         hp: 40,   speed: 70,  reward: 8,   damage: 1,  radius: 13, armor: 0, color: '#6fae3b', note: 'Basic raider' },
  wolf:   { name: 'Wolf Rider',     hp: 32,   speed: 125, reward: 10,  damage: 1,  radius: 14, armor: 0, color: '#8a7766', note: 'Fast' },
  brute:  { name: 'Armored Brute',  hp: 260,  speed: 42,  reward: 26,  damage: 3,  radius: 20, armor: 4, color: '#7a6a5a', note: 'Slow, armored' },
  shadow: { name: 'Shadow Beast',   hp: 135,  speed: 135, reward: 20,  damage: 2,  radius: 15, armor: 1, color: '#43306b', note: 'Very fast' },
  boss:   { name: 'Ogre Warlord',   hp: 4800, speed: 34,  reward: 200, damage: 10, radius: 28, armor: 5, color: '#5b3f73', boss: true, slowResist: 0.5, note: 'Final boss' },
};

// levels[0] is the build price; later levels are upgrade prices. Add towers/levels here.
export const TOWERS = {
  archer: { name: 'Archer Tower', kind: 'arrow', sellRate: 0.7, projSpeed: 460, desc: 'Fast single-target arrows.',
    levels: [{ cost: 50, damage: 10, rate: 1.6, range: 150 },
             { cost: 60, damage: 16, rate: 1.9, range: 165 },
             { cost: 110, damage: 26, rate: 2.3, range: 180 }] },
  cannon: { name: 'Cannon Tower', kind: 'cannon', sellRate: 0.7, projSpeed: 300, desc: 'Slow, heavy splash damage.',
    levels: [{ cost: 90, damage: 40, rate: 0.6, range: 140, splash: 55 },
             { cost: 90, damage: 65, rate: 0.65, range: 150, splash: 62 },
             { cost: 150, damage: 105, rate: 0.75, range: 160, splash: 70 }] },
  frost:  { name: 'Frost Tower', kind: 'frost', sellRate: 0.7, projSpeed: 380, desc: 'Slows enemies in an area.',
    levels: [{ cost: 70, damage: 4, rate: 1.1, range: 130, splash: 45, slow: 0.4, slowT: 2 },
             { cost: 70, damage: 7, rate: 1.2, range: 145, splash: 50, slow: 0.5, slowT: 2.5 },
             { cost: 110, damage: 12, rate: 1.4, range: 160, splash: 58, slow: 0.6, slowT: 3 }] },
};
export const towerCost = type => TOWERS[type].levels[0].cost;

// Background music. Put your own audio file (mp3, ogg, wav or m4a) in assets/audio/ and list it here, e.g.
//   tracks: ['assets/audio/my-song.mp3']
// With one track it loops; with several they play in order and repeat. Leave the list empty (or if a file
// is missing) and the game plays its built-in synthesized music instead. Only use music you have the rights to.
export const MUSIC = { tracks: [], credit: '' }; // credit: e.g. 'My Song by Your Name' (shown in Credits)