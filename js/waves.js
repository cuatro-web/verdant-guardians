// Each group: [enemyType, count, secondsBetween, startDelay]. Edit waves here.
export const WAVES = [
  [['goblin', 8, 1.2]],
  [['goblin', 12, 1.0]],
  [['goblin', 6, 1.1], ['wolf', 5, 0.9, 5]],
  [['goblin', 10, 1.0], ['wolf', 8, 1.2, 0.5]],
  [['goblin', 8, 1.0], ['brute', 3, 3.0, 4]],
  [['goblin', 12, 0.9], ['wolf', 8, 1.1, 3], ['brute', 4, 3.0, 8]],
  [['brute', 6, 2.5], ['wolf', 10, 1.0, 2], ['goblin', 10, 1.0, 6]],
  [['shadow', 6, 1.2], ['goblin', 10, 0.9, 3], ['brute', 4, 3.0, 8]],
  [['goblin', 16, 0.7], ['wolf', 12, 0.9, 2], ['shadow', 8, 1.2, 6], ['brute', 6, 2.5, 10]],
  [['boss', 1, 1, 2], ['goblin', 10, 1.2], ['brute', 4, 4.0, 8], ['shadow', 4, 3.0, 12]],
];
export const TOTAL = WAVES.length;
export function buildQueue(n) {
  const q = [];
  for (const [type, count, gap, delay = 0] of WAVES[n - 1])
    for (let i = 0; i < count; i++) q.push({ t: delay + i * gap, type });
  return q.sort((a, b) => a.t - b.t);
}