// All sounds are synthesized with the Web Audio API: no audio files, nothing to load or license.
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

// Music: a slow, original D-dorian loop (pad + bass + plucked arpeggio + sparse melody), generated live.
const CHORDS = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]; // Dm, Bb, F, C as MIDI notes
const SCALE = [62, 65, 67, 69, 72, 74, 77];
const ARP = [0, 1, 2, 1, 2, 1, 0, 2];
const mtof = m => 440 * 2 ** ((m - 69) / 12);

export class AudioManager {
  constructor(settings) { this.s = settings; this.ctx = null; this.master = null; this.last = {}; this.nb = null; this.el = null; this.fileFailed = false; this.mg = null; this.timer = null; this.wantMusic = false; this.duckOn = false; this.intense = false; this.step = 0; this.nextTime = 0; }
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
    if (this.mg) this.mg.gain.setTargetAtTime(this.musicLevel, this.ctx.currentTime, .25);
    if (this.el) this.el.volume = this.fileLevel;
  }
  get fileLevel() { return !this.wantMusic || !this.s.music || this.s.muted ? 0 : Math.min(1, this.s.volume * this.s.musicVol * (this.duckOn ? .3 : 1)); }
  get musicLevel() { return !this.wantMusic || !this.s.music ? 0 : this.s.musicVol * .35 * (this.duckOn ? .3 : 1); }
  musicNodes() {
    if (this.mg) return;
    const c = this.ctx; this.mg = c.createGain(); this.mg.gain.value = 0; this.mg.connect(this.master);
    const dly = c.createDelay(1), fb = c.createGain(), wet = c.createGain(), lp = c.createBiquadFilter(); // soft echo
    dly.delayTime.value = .42; fb.gain.value = .33; wet.gain.value = .35; lp.type = 'lowpass'; lp.frequency.value = 1600;
    this.mg.connect(dly); dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(wet); wet.connect(this.master);
  }
  startMusic() {
    this.unlock(); this.wantMusic = true;
    if (MUSIC.tracks.length && !this.fileFailed) this.playTrack(0); else this.startSynth();
  }
  playTrack(i) {
    this.stopFile();
    const el = this.el = new Audio(MUSIC.tracks[i % MUSIC.tracks.length]); el.loop = MUSIC.tracks.length === 1; el.volume = this.fileLevel;
    el.addEventListener('ended', () => { if (this.el === el && this.wantMusic) this.playTrack(i + 1); });
    el.addEventListener('error', () => { if (this.el !== el) return; this.fileFailed = true; this.el = null; if (this.wantMusic) this.startSynth(); }); // missing or unsupported file: use built-in music
    el.play().catch(() => {});
  }
  stopFile() { // short fade, then pause
    const el = this.el; this.el = null; if (!el) return;
    const iv = setInterval(() => { el.volume = Math.max(0, el.volume - .08); if (el.volume <= 0) { clearInterval(iv); el.pause(); } }, 40);
  }
  setHidden(h) { // called when the tab is hidden or shown
    if (this.el) { if (h) this.el.pause(); else if (this.wantMusic) this.el.play().catch(() => {}); }
    if (this.ctx) { if (h) this.ctx.suspend(); else this.ctx.resume(); }
  }
  startSynth() {
    if (!this.ctx) return;
    this.musicNodes(); this.step = 0; this.nextTime = this.ctx.currentTime + .15;
    this.apply(); if (!this.timer) this.timer = setInterval(() => this.scheduleUntil(this.ctx.currentTime + .5), 120);
  }
  stopMusic() {
    this.wantMusic = false; this.stopFile(); if (this.ctx) this.apply();
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  duck(on) { this.duckOn = on; if (this.ctx) this.apply(); }
  setIntensity(on) { this.intense = on; }
  get stepDur() { return 60 / (this.intense ? 100 : 76) / 2; }
  voice(f, t, dur, type, vol, att = .01) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.mg); o.start(t); o.stop(t + dur + .05);
  }
  scheduleUntil(limit) {
    if (this.nextTime < this.ctx.currentTime - .5) this.nextTime = this.ctx.currentTime + .1; // resync after a throttled tab
    while (this.nextTime < limit) { if (this.musicLevel > 0) this.musicStep(this.step, this.nextTime); this.nextTime += this.stepDur; this.step++; }
  }
  musicStep(step, t) {
    const bar = (step >> 3) & 3, pos = step & 7, ch = CHORDS[bar], d = this.stepDur;
    if (pos === 0) for (const n of ch) this.voice(mtof(n + 12), t, d * 8, 'triangle', .05, .7);   // pad
    if (pos === 0 || pos === 4 || (this.intense && pos % 2 === 0)) this.voice(mtof(ch[0] - 12), t, d * 2.5, 'sine', .16, .02); // bass
    if (this.intense || ([0, 2, 3, 5, 6, 7].includes(pos) && (pos === 0 || Math.random() > .25)))
      this.voice(mtof(ch[ARP[pos]] + (pos > 4 ? 24 : 12)), t, d * 3, 'triangle', .1, .005);   // arpeggio pluck
    if (pos === 0 && (bar === 1 || bar === 3)) this.voice(mtof(SCALE[Math.floor(Math.random() * SCALE.length)] + 12), t, d * 6, 'sine', .08, .08); // melody
  }
  // Offline check helper: fill the schedule for `seconds` of music without a running timer.
  renderMusic(seconds) { this.musicNodes(); this.wantMusic = true; this.nextTime = this.ctx.currentTime; this.step = 0; this.scheduleUntil(this.ctx.currentTime + seconds); }
  get on() { return this.ctx && this.s.sfx && !this.s.muted && this.s.volume > 0; }
  tone(f, to, dur, type = 'sine', vol = .15, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02);
  }
  noise(dur, freq, vol) {
    const c = this.ctx;
    if (!this.nb) { const n = c.sampleRate >> 1; this.nb = c.createBuffer(1, n, c.sampleRate); const d = this.nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    s.buffer = this.nb; f.type = 'lowpass'; f.frequency.value = freq;
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