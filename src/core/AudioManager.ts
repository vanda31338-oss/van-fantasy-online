import Phaser from 'phaser';
import { AUDIO, type AudioAsset } from '../data/assetManifest';
import { SaveManager } from './SaveManager';

/**
 * Plays music/SFX from the asset manifest. Entries with a `url` play the loaded file;
 * entries without one use a tiny WebAudio synth placeholder (no files needed).
 */
type Note = [number, number]; // [midi (0 = rest), beats]

const BGM: Record<string, { bpm: number; wave: OscillatorType; lead: Note[]; bass: Note[] }> = {
  bgm_title: {
    bpm: 96, wave: 'triangle',
    lead: [[72, 1], [76, 1], [79, 1], [84, 1], [83, 1.5], [79, 0.5], [76, 2], [74, 1], [77, 1], [81, 1], [79, 1], [76, 2], [72, 2],
      [72, 1], [76, 1], [79, 1], [81, 1], [79, 1], [77, 1], [76, 1], [74, 1], [72, 4]],
    bass: [[48, 4], [53, 4], [55, 4], [48, 4], [45, 4], [41, 4], [43, 4], [48, 4]],
  },
  bgm_town: {
    bpm: 112, wave: 'square',
    lead: [[67, 1], [72, 1], [74, 1], [76, 1], [74, 0.5], [72, 0.5], [74, 1], [67, 2], [69, 1], [72, 1], [71, 1], [72, 1], [74, 3], [0, 1],
      [76, 1], [77, 1], [79, 1], [76, 1], [74, 1], [72, 1], [69, 2], [71, 1], [72, 1], [74, 1], [71, 1], [72, 4]],
    bass: [[48, 2], [55, 2], [53, 2], [55, 2], [45, 2], [52, 2], [43, 2], [50, 2], [48, 2], [55, 2], [53, 2], [50, 2], [43, 2], [47, 2], [48, 4]],
  },
  bgm_dungeon: {
    bpm: 128, wave: 'square',
    lead: [[69, 0.5], [72, 0.5], [76, 1], [74, 0.5], [72, 0.5], [71, 1], [72, 0.5], [74, 0.5], [76, 2], [0, 1],
      [77, 0.5], [76, 0.5], [74, 1], [72, 0.5], [71, 0.5], [69, 1], [71, 0.5], [72, 0.5], [69, 2], [0, 1]],
    bass: [[45, 1], [45, 1], [52, 1], [45, 1], [41, 1], [41, 1], [48, 1], [41, 1], [43, 1], [43, 1], [50, 1], [43, 1], [45, 1], [45, 1], [52, 1], [45, 1]],
  },
  bgm_boss: {
    bpm: 150, wave: 'sawtooth',
    lead: [[64, 0.5], [64, 0.5], [67, 0.5], [64, 0.5], [70, 1], [69, 0.5], [67, 0.5], [64, 0.5], [64, 0.5], [62, 0.5], [64, 0.5], [67, 2],
      [64, 0.5], [64, 0.5], [67, 0.5], [64, 0.5], [71, 1], [70, 0.5], [67, 0.5], [69, 1], [67, 1], [64, 2]],
    bass: [[40, 0.5], [40, 0.5], [52, 0.5], [40, 0.5], [40, 0.5], [40, 0.5], [50, 0.5], [40, 0.5], [36, 0.5], [36, 0.5], [48, 0.5], [36, 0.5], [38, 0.5], [38, 0.5], [50, 0.5], [38, 0.5]],
  },
};

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private game: Phaser.Game | null = null;
  private currentBgm: string | null = null;
  private fileMusic: Phaser.Sound.BaseSound | null = null;
  private seqTimer: number | null = null;
  private seqState: { lead: number; bass: number; leadT: number; bassT: number } | null = null;
  private lastPlayed: Record<string, number> = {};

  init(game: Phaser.Game) {
    this.game = game;
  }

  /** Must be called from a user gesture on mobile. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    const s = SaveManager.settings;
    if (this.ctx) {
      this.musicGain.gain.value = s.musicVolume * 0.18;
      this.sfxGain.gain.value = s.sfxVolume * 0.35;
    }
    if (this.fileMusic) (this.fileMusic as any).setVolume?.(s.musicVolume);
  }

  private asset(key: string): AudioAsset | undefined {
    return AUDIO.find((a) => a.key === key);
  }

  playMusic(key: string) {
    if (this.currentBgm === key) return;
    this.stopMusic();
    this.currentBgm = key;
    const a = this.asset(key);
    if (!a) return;
    if (a.url && this.game?.cache.audio.exists(key)) {
      this.fileMusic = this.game.sound.add(key, { loop: true, volume: SaveManager.settings.musicVolume * (a.volume ?? 1) });
      this.fileMusic.play();
      return;
    }
    this.startSequencer(a.synth);
  }

  stopMusic() {
    this.currentBgm = null;
    this.fileMusic?.stop();
    this.fileMusic?.destroy();
    this.fileMusic = null;
    if (this.seqTimer !== null) clearInterval(this.seqTimer);
    this.seqTimer = null;
    this.seqState = null;
  }

  private startSequencer(id: string) {
    const song = BGM[id];
    if (!song || !this.ctx) return;
    const beat = 60 / song.bpm;
    const t0 = this.ctx.currentTime + 0.1;
    this.seqState = { lead: 0, bass: 0, leadT: t0, bassT: t0 };
    const schedule = () => {
      if (!this.ctx || !this.seqState) return;
      const horizon = this.ctx.currentTime + 0.4;
      const st = this.seqState;
      while (st.leadT < horizon) {
        const [m, b] = song.lead[st.lead % song.lead.length];
        if (m) this.tone(midiHz(m), st.leadT, b * beat * 0.9, song.wave, 0.5, this.musicGain);
        st.leadT += b * beat;
        st.lead++;
      }
      while (st.bassT < horizon) {
        const [m, b] = song.bass[st.bass % song.bass.length];
        if (m) this.tone(midiHz(m), st.bassT, b * beat * 0.8, 'triangle', 0.8, this.musicGain);
        st.bassT += b * beat;
        st.bass++;
      }
    };
    schedule();
    this.seqTimer = window.setInterval(schedule, 150);
  }

  private tone(freq: number, start: number, dur: number, wave: OscillatorType, vol: number, out: AudioNode, slideTo?: number) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(out);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, vol: number, filterFreq: number, out: AudioNode, filterEnd?: number) {
    if (!this.ctx) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filterFreq, start);
    if (filterEnd) f.frequency.exponentialRampToValueAtTime(filterEnd, start + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(start);
  }

  sfx(key: string) {
    const now = performance.now();
    if (now - (this.lastPlayed[key] ?? 0) < 40) return; // de-dupe bursts
    this.lastPlayed[key] = now;
    const a = this.asset(key);
    if (a?.url && this.game?.cache.audio.exists(key)) {
      this.game.sound.play(key, { volume: SaveManager.settings.sfxVolume * (a.volume ?? 1) });
      return;
    }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this.sfxGain;
    switch (a?.synth ?? key) {
      case 'click': this.tone(880, t, 0.06, 'square', 0.3, out); break;
      case 'swing': this.noise(t, 0.12, 0.5, 3000, out, 600); break;
      case 'hit': this.noise(t, 0.08, 0.7, 1800, out); this.tone(160, t, 0.08, 'square', 0.4, out, 80); break;
      case 'crit': this.noise(t, 0.12, 0.8, 4000, out); this.tone(300, t, 0.12, 'square', 0.5, out, 120); break;
      case 'hurt': this.tone(220, t, 0.15, 'sawtooth', 0.4, out, 110); break;
      case 'monster_die': this.tone(600, t, 0.2, 'square', 0.35, out, 150); break;
      case 'skill_heavy': this.noise(t, 0.2, 0.9, 2500, out, 300); this.tone(110, t, 0.2, 'square', 0.6, out, 55); break;
      case 'buff': [60, 64, 67, 72].forEach((m, i) => this.tone(midiHz(m + 12), t + i * 0.06, 0.15, 'triangle', 0.4, out)); break;
      case 'heal': [72, 76, 79].forEach((m, i) => this.tone(midiHz(m), t + i * 0.08, 0.2, 'sine', 0.4, out)); break;
      case 'fire': this.noise(t, 0.3, 0.6, 1200, out, 300); break;
      case 'level_up': [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => this.tone(midiHz(m), t + i * 0.07, 0.25, 'square', 0.35, out)); break;
      case 'potion': this.tone(500, t, 0.12, 'sine', 0.4, out, 900); this.tone(700, t + 0.08, 0.1, 'sine', 0.3, out, 1200); break;
      case 'coin': this.tone(988, t, 0.06, 'square', 0.25, out); this.tone(1319, t + 0.06, 0.15, 'square', 0.25, out); break;
      case 'boss_roar': this.tone(90, t, 0.6, 'sawtooth', 0.6, out, 50); this.noise(t, 0.6, 0.4, 600, out, 100); break;
      case 'slam': this.noise(t, 0.35, 1, 900, out, 80); this.tone(70, t, 0.3, 'sine', 0.8, out, 35); break;
      case 'refine_success': [72, 76, 79, 84].forEach((m, i) => this.tone(midiHz(m), t + i * 0.08, 0.3, 'triangle', 0.4, out)); break;
      case 'refine_fail': this.tone(300, t, 0.4, 'sawtooth', 0.4, out, 80); break;
      case 'victory': [67, 72, 76, 79, 76, 79, 84].forEach((m, i) => this.tone(midiHz(m), t + i * 0.12, 0.3, 'square', 0.35, out)); break;
      case 'defeat': [64, 60, 57, 52].forEach((m, i) => this.tone(midiHz(m), t + i * 0.2, 0.35, 'triangle', 0.4, out)); break;
    }
  }
}

export const AudioManager = new AudioManagerImpl();
