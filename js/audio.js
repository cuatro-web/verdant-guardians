// All sounds and the built-in music are synthesized with the Web Audio API: no audio files, nothing to load or license.
import { MUSIC } from './config.js';
const GAP = { arrow: .06, cannon: .1, frost: .07, kill: .05, click: .03 };
const arp = (a, notes, type = 'triangle', step = .09, dur = .16, vol = .12) =>
  notes.forEach((f, i) => a.tone(f, null, dur, type, vol, i * step));
const SOUNDS = {
  click:   a => a.tone(620, 420, .05, 'square', .06),
  place:   a => { a.tone(200, 330, .12, 'triangle', .16); a.tone(110, 90, .1, 'sine', .15); },
  arrow:   a => a.tone(900, 300, .07, 'sawtooth', .04),
  cannon:  a => { a.noise(.25, 500, .3); a.tone(95, 40, .22, 'sine', .25); },
  frost:   a => { a.tone(1200, 1900, .14, 'sine', .06); a.tone(1800, 2400, .1, 'sine', .03, .04); },
  kill:    a => a.tone(420, 760, .09, 'triangle', .08),
  upgrade: a => arp(a, [420, 530, 660, 840]),
  sell:    a => a.tone(520, 240, .15, 'triangle', .12),
  error:   a => a.tone(170, 150, .14, 'square', .08),
  wave:    a => { a.tone(220, 440, .35, 'sawtooth', .07); a.tone(330, 660, .35, 'sawtooth', .04); },
  boss:    a => { a.tone(70, 55, .9, 'sawtooth', .14); a.tone(105, 80, .9, 'square', .05); },
  leak:    a => a.tone(220, 70, .28, 'sawtooth', .12),
  victory: a => arp(a, [523, 659, 784, 1047, 1319], 'triangle', .13, .3, .14),
  defeat:  a => arp(a, [392, 330, 262, 175], 'triangle', .22, .4, .13),
};

// ---- Built-in music: a calm theme for the menu, a driving battle track, and a faster boss version. ----
const mtof = m => 440 * 2 ** ((m - 69) / 12);
const ch = (b, ...n) => ({ b, n }); // b = bass note, n = chord notes (MIDI)
const Dm = ch(38, 50, 53, 57), Bb = ch(34, 46, 50, 53), Gm = ch(43, 55, 58, 62), A = ch(45, 45, 49, 52), F = ch(41, 53, 57, 60), C = ch(36, 48, 52, 55);
const SONGS = { menu: { bpm: 76, chords: [Dm, Bb, F, C] }, game: { bpm: 132, chords: [Dm, Bb, Gm, A] }, boss: { bpm: 150, chords: [Dm, Bb, Gm, A] } };
// Melodies: [step in the bar (16 per bar), MIDI note, length in steps]
const THEME = [
  [[0, 69, 4], [4, 74, 4], [8, 77, 6], [14, 76, 2]], [[0, 74, 6], [6, 72, 2], [8, 70, 4], [12, 69, 4]],
  [[0, 65, 4], [4, 69, 4], [8, 72, 6], [14, 70, 2]], [[0, 72, 8], [8, 67, 4], [12, 69, 4]]];
const LEAD = [null, null, null, null,
  [[0, 74, 3], [4, 77, 3], [8, 76, 2], [10, 74, 2], [12, 72, 4]], [[0, 74, 3], [4, 70, 3], [8, 72, 2], [10, 74, 2], [12, 77, 4]],
  [[0, 79, 3], [4, 77, 3], [8, 74, 2], [10, 77, 2], [12, 76, 4]], [[0, 73, 3], [4, 76, 3], [8, 81, 2], [10, 79, 2], [12, 76, 4]]];

export class AudioManager {
  constructor(settings) {
    this.s = settings; this.ctx = null; this.master = null; this.last = {}; this.nb = null;
    this.el = null; this.failed = {}; this.mode = 'game'; this.bus = null; this.mg = null; this.dg = null; this.timer = null;
    this.wantMusic = false; this.duckOn = false; this.intense = false; this.step = 0; this.nextTime = 0;
  }
  // Browsers only allow audio after a user gesture, so this is called from input events.
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.apply();
    } catch { /* audio unavailable: the game stays fully playable */ }
  }
  apply() {
    if (this.master) this.master.gain.value = this.s.muted ? 0 : this.s.volume;
    if (this.mg) { const now = this.ctx.currentTime; this.mg.gain.setTargetAtTime(this.musicLevel, now, .25); this.dg.gain.setTargetAtTime(this.musicLevel, now, .25); }
    if (this.el) this.el.volume = this.fileLevel;
  }
  get musicLevel() { return !this.wantMusic || !this.s.music ? 0 : this.s.musicVol * .7 * (this.duckOn ? .3 : 1); }
  get fileLevel() { return !this.wantMusic || !this.s.music || this.s.muted ? 0 : Math.min(1, this.s.volume * this.s.musicVol * (this.duckOn ? .3 : 1)); }
  get songKey() { return this.mode === 'game' && this.intense ? 'boss' : this.mode; }
  get stepDur() { return 60 / SONGS[this.songKey].bpm / 4; } // one 16th note

  // mode: 'menu' (title theme) or 'game' (battle). Your own files in MUSIC.menuTracks / MUSIC.tracks replace the built-in songs.
  startMusic(mode = 'game') {
    this.unlock();
    if (this.wantMusic && this.mode === mode && (this.el || this.timer)) return; // already playing this one
    this.stopFile(); this.haltSynth();
    this.wantMusic = true; this.mode = mode; this.apply();
    const tracks = (mode === 'menu' ? MUSIC.menuTracks : MUSIC.tracks) || [];
    if (tracks.length && !this.failed[mode]) this.playTrack(tracks, 0, mode); else this.startSynth();
  }
  stopMusic() { this.wantMusic = false; this.stopFile(); this.haltSynth(); if (this.ctx) this.apply(); }
  duck(on) { this.duckOn = on; if (this.ctx) this.apply(); }
  setIntensity(on) { this.intense = on; }
  setHidden(h) { // called when the tab is hidden or shown
    if (this.el) { if (h) this.el.pause(); else if (this.wantMusic) this.el.play().catch(() => {}); }
    if (this.ctx) { if (h) this.ctx.suspend(); else this.ctx.resume(); }
  }
  playTrack(tracks, i, mode) {
    this.stopFile();
    const el = this.el = new Audio(tracks[i % tracks.length]); el.loop = tracks.length === 1; el.volume = this.fileLevel;
    el.addEventListener('ended', () => { if (this.el === el && this.wantMusic) this.playTrack(tracks, i + 1, mode); });
    el.addEventListener('error', () => { if (this.el !== el) return; this.failed[mode] = true; this.el = null; if (this.wantMusic && this.mode === mode) this.startSynth(); }); // missing or unsupported file: use built-in music
    el.play().catch(() => {});
  }
  stopFile() { // short fade, then pause
    const el = this.el; this.el = null; if (!el) return;
    const iv = setInterval(() => { el.volume = Math.max(0, el.volume - .08); if (el.volume <= 0) { clearInterval(iv); el.pause(); } }, 40);
  }
  musicNodes() {
    if (this.bus) return;
    const c = this.ctx, mg = c.createGain(), dg = c.createGain(), comp = c.createDynamicsCompressor(); // compressor keeps loud layers from clipping
    const dly = c.createDelay(1), fb = c.createGain(), wet = c.createGain(), lp = c.createBiquadFilter();    // soft echo on the melodic layer
    mg.gain.value = 0; dg.gain.value = 0; comp.threshold.value = -16; comp.ratio.value = 5; dly.delayTime.value = .3; fb.gain.value = .3; wet.gain.value = .3; lp.type = 'lowpass'; lp.frequency.value = 1800;
    mg.connect(comp); dg.connect(comp); comp.connect(this.master); mg.connect(dly); dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(wet); wet.connect(comp);
    this.mg = mg; this.dg = dg; this.bus = [mg, dg, comp, dly, fb, wet, lp];
  }
  startSynth() {
    if (!this.ctx) return;
    this.musicNodes(); this.step = 0; this.nextTime = this.ctx.currentTime + .15; this.apply();
    if (!this.timer) this.timer = setInterval(() => this.scheduleUntil(this.ctx.currentTime + .5), 120);
  }
  haltSynth() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.bus && this.ctx) { // fade the old song out quickly, then drop its nodes
      const old = this.bus, now = this.ctx.currentTime; this.mg.gain.setTargetAtTime(0, now, .06); this.dg.gain.setTargetAtTime(0, now, .06);
      setTimeout(() => old.forEach(n => { try { n.disconnect(); } catch { /* already gone */ } }), 900);
    }
    this.bus = this.mg = this.dg = null;
  }
  scheduleUntil(limit) {
    if (this.nextTime < this.ctx.currentTime - .5) this.nextTime = this.ctx.currentTime + .1; // resync after a throttled tab
    while (this.nextTime < limit) { if (this.musicLevel > 0) this.musicStep(this.step, this.nextTime); this.nextTime += this.stepDur; this.step++; }
  }
  voice(f, t, dur, type, vol, att = .01, cut = 0, dest = this.mg) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    if (cut) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; o.connect(lp); lp.connect(g); } else o.connect(g);
    g.connect(dest); o.start(t); o.stop(t + dur + .05);
  }
  hiss(t, dur, freq, vol) { // filtered noise burst for hats, snare and cymbals
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf(); f.type = 'highpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(this.dg); s.start(t); s.stop(t + dur);
  }
  drum(kind, t, v = .5) {
    if (kind === 'kick' || kind === 'tom') {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain(), dur = kind === 'kick' ? .2 : .5;
      o.frequency.setValueAtTime(kind === 'kick' ? 150 : 110, t); o.frequency.exponentialRampToValueAtTime(kind === 'kick' ? 42 : 55, t + dur * .6);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(this.dg); o.start(t); o.stop(t + dur + .02);
    } else if (kind === 'snare') { this.hiss(t, .16, 1800, .3); this.voice(190, t, .09, 'triangle', .14, .001, 0, this.dg); }
    else if (kind === 'ohat') this.hiss(t, .2, 7000, .05);
    else if (kind === 'crash') this.hiss(t, .9, 5000, .09);
    else this.hiss(t, .045, 7500, v);
  }
  musicStep(step, t) { if (this.songKey === 'menu') this.themeStep(step, t); else this.battleStep(step, t, this.songKey === 'boss'); }
  // Title theme: slow strings, harp arpeggio, a heroic melody and low drum hits.
  themeStep(step, t) {
    const d = this.stepDur, bar = (step >> 4) & 3, pos = step & 15, c = SONGS.menu.chords[bar], hi = (step >> 6) & 1;
    if (pos === 0) { for (const n of c.n) this.voice(mtof(n + 12), t, d * 16, 'triangle', .04, .9); this.voice(mtof(c.b), t, d * 10, 'sine', .16, .03); if (bar % 2 === 0) this.drum('tom', t, .3); }
    if (pos === 8) this.voice(mtof(c.b), t, d * 6, 'sine', .12, .03);
    if (pos % 2 === 0) this.voice(mtof(c.n[[0, 1, 2, 1, 2, 1, 0, 2][(pos >> 1) & 7]] + (hi ? 24 : 12)), t, d * 5, 'triangle', hi ? .07 : .05, .005);
    for (const [st, m, len] of THEME[bar]) if (st === pos) { const f = mtof(m + (hi ? 12 : 0)); this.voice(f, t, d * len * .95, 'triangle', .09, .02); this.voice(f, t, d * len * .95, 'sawtooth', .025, .03, 2200); }
  }
  // Battle track: four-on-the-floor kick, backbeat snare, hats, pumping bass, 16th-note arpeggio, a lead line in the second half. Boss = faster, extra kicks, power stabs.
  battleStep(step, t, boss) {
    const d = this.stepDur, bar = (step >> 4) & 7, pos = step & 15, c = SONGS.game.chords[bar & 3], pass = (step >> 7) & 1, lead = LEAD[boss && bar < 4 ? bar + 4 : bar];
    if (pos === 0) for (const n of c.n) this.voice(mtof(n + 12), t, d * 16, 'triangle', .03, .3);
    if (pos % 4 === 0 || (boss && (pos === 10 || pos === 14))) this.drum('kick', t, pos === 0 ? .6 : .5);
    if (pos === 4 || pos === 12) this.drum('snare', t);
    if (pos % 2 === 0) this.drum(pos === 14 ? 'ohat' : 'hat', t, pos % 4 === 2 ? .07 : .045); else if (boss || pass) this.drum('hat', t, .025);
    if (pos === 0 && bar % 4 === 0) this.drum('crash', t);
    if (pos % 2 === 0) this.voice(mtof(c.b + (pos % 8 === 6 ? 12 : 0)), t, d * 1.7, 'triangle', .15, .005);
    this.voice(mtof(c.n[[0, 1, 2, 1][pos & 3]] + 24), t, d * 1.8, 'triangle', .04, .003);
    if (boss && pos === 0) for (const n of c.n) this.voice(mtof(n + 12), t, d * 3, 'sawtooth', .03, .005, 1800);
    if (lead) for (const [st, m, len] of lead) if (st === pos) { const f = mtof(m + (pass ? 12 : 0)); this.voice(f, t, d * len * .9, 'sawtooth', .04, .01, 2600); this.voice(f, t, d * len * .9, 'triangle', .06, .01); }
  }
  // Offline check helper: fill the schedule for `seconds` of music without a running timer.
  renderMusic(seconds, mode = 'game') { this.mode = mode; this.musicNodes(); this.wantMusic = true; this.nextTime = this.ctx.currentTime; this.step = 0; this.scheduleUntil(this.ctx.currentTime + seconds); }
  noiseBuf() {
    if (!this.nb) { const c = this.ctx, n = c.sampleRate >> 1; this.nb = c.createBuffer(1, n, c.sampleRate); const d = this.nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    return this.nb;
  }
  get on() { return this.ctx && this.s.sfx && !this.s.muted && this.s.volume > 0; }
  tone(f, to, dur, type = 'sine', vol = .15, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02);
  }
  noise(dur, freq, vol) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    s.buffer = this.noiseBuf(); f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur);
  }
  play(name) {
    if (!this.on || !SOUNDS[name]) return;
    const now = this.ctx.currentTime;
    if (now - (this.last[name] ?? -1) < (GAP[name] ?? .04)) return; // throttle busy sounds
    this.last[name] = now;
    try { SOUNDS[name](this); } catch { /* ignore audio errors */ }
  }
}