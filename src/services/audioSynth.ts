/**
 * Procedural Web Audio API Synthesizer for Cute Sounds & Elemental/Character Ambient Soundscapes
 * Generates audio on-the-fly without external audio files:
 * - Cute FX: "yiii", "aaaa", "giggle", "boop", "squeak"
 * - Character & Elemental Soundscapes:
 *   - "fire_crackle": Crackling ember bursts + warm sub-harmonic flame drone
 *   - "ice_wind": Crystalline swept frost wind + glacial bell chimes
 *   - "rock_rumble": Deep tectonic earthen rumble + stone resonant knocks
 *   - "magic_chime": Arcane pentatonic celesta sparkles
 *   - "space_hum": Orbital EVA binaural cabin hum + telemetry ping
 *   - "sea_breeze": Ocean surf wash + nautical bell
 *   - "arcade_synth": 8-bit chiptune arpeggio pulse
 *   - "hero_fanfare": Heroic brass-fifth chord motif
 *   - "kitchen_sizzle": Gentle culinary pan sizzle + timer ding
 */

export type AmbientSoundType =
  | 'fire_crackle'
  | 'ice_wind'
  | 'ice_chime'
  | 'rock_rumble'
  | 'magic_chime'
  | 'space_hum'
  | 'sea_breeze'
  | 'arcade_synth'
  | 'hero_fanfare'
  | 'kitchen_sizzle'
  | 'none';

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private ambientType: AmbientSoundType = 'none';
  private ambientMuted = false;
  private ambientTimer: any = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Play procedural one-shot sound by key
   */
  public play(type: 'yiii' | 'aaaa' | 'giggle' | 'boop' | 'squeak' | AmbientSoundType | string) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      switch (type.toLowerCase()) {
        case 'yiii':
          this.playYiii(ctx);
          break;
        case 'aaaa':
          this.playAaaa(ctx);
          break;
        case 'giggle':
          this.playGiggle(ctx);
          break;
        case 'boop':
          this.playBoop(ctx);
          break;
        case 'fire_crackle':
          this.playFireCrackleBurst(ctx);
          break;
        case 'ice_wind':
        case 'ice_chime':
          this.playIceWindBurst(ctx);
          break;
        case 'rock_rumble':
          this.playRockRumbleBurst(ctx);
          break;
        case 'magic_chime':
          this.playMagicChimeBurst(ctx);
          break;
        case 'space_hum':
          this.playSpaceHumBurst(ctx);
          break;
        case 'sea_breeze':
          this.playSeaBreezeBurst(ctx);
          break;
        case 'arcade_synth':
          this.playArcadeSynthBurst(ctx);
          break;
        case 'hero_fanfare':
          this.playHeroFanfareBurst(ctx);
          break;
        case 'kitchen_sizzle':
          this.playKitchenSizzleBurst(ctx);
          break;
        case 'squeak':
        default:
          this.playSqueak(ctx);
          break;
      }
    } catch (e) {
      console.warn('Audio synthesis notice:', e);
    }
  }

  /**
   * Start or switch procedural ambient loop for the active CharacterProfile
   */
  public setAmbientAudio(type: AmbientSoundType) {
    this.ambientType = type || 'none';
    if (this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.ambientType === 'none' || this.ambientMuted) return;

    // Play immediate character signature sound
    this.play(this.ambientType);

    // Schedule gentle periodic ambient texture pulses
    this.ambientTimer = setInterval(() => {
      if (this.ambientMuted || this.ambientType === 'none') return;
      this.play(this.ambientType);
    }, 3200);
  }

  public getAmbientAudio(): AmbientSoundType {
    return this.ambientType;
  }

  public setAmbientMuted(muted: boolean) {
    this.ambientMuted = muted;
    if (muted && this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    } else if (!muted && this.ambientType !== 'none') {
      this.setAmbientAudio(this.ambientType);
    }
  }

  public isAmbientMuted(): boolean {
    return this.ambientMuted;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private playFireCrackleBurst(ctx: AudioContext) {
    const now = ctx.currentTime;
    // Warm sub-flame swell
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(95, now);
    subOsc.frequency.exponentialRampToValueAtTime(68, now + 0.8);
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.07, now + 0.15);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.9);

    // 5 crisp ember crackle pops
    for (let i = 0; i < 5; i++) {
      const offset = now + i * 0.12 + Math.random() * 0.08;
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 0.05);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800 + Math.random() * 1600;
      filter.Q.value = 3.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, offset);
      gain.gain.linearRampToValueAtTime(0.11, offset + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, offset + 0.045);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(offset);
      noise.stop(offset + 0.05);
    }
  }

  private playIceWindBurst(ctx: AudioContext) {
    const now = ctx.currentTime;
    // Swept whistling frost wind
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.95);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 8.0;
    filter.frequency.setValueAtTime(620, now);
    filter.frequency.exponentialRampToValueAtTime(1450, now + 0.45);
    filter.frequency.exponentialRampToValueAtTime(780, now + 0.9);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.92);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.95);

    // Crystalline ice bell chime
    const freqs = [1567.98, 2093.0, 2637.02];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const cGain = ctx.createGain();
      const t = now + idx * 0.11;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      cGain.gain.setValueAtTime(0.001, t);
      cGain.gain.linearRampToValueAtTime(0.06, t + 0.015);
      cGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.45);
      osc.connect(cGain);
      cGain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }

  private playRockRumbleBurst(ctx: AudioContext) {
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.75);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, now);
    filter.frequency.exponentialRampToValueAtTime(75, now + 0.7);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.75);
  }

  private playMagicChimeBurst(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  private playSpaceHumBurst(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  private playSeaBreezeBurst(ctx: AudioContext) {
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.85);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.linearRampToValueAtTime(950, now + 0.4);
    filter.frequency.linearRampToValueAtTime(340, now + 0.82);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.82);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.85);
  }

  private playArcadeSynthBurst(ctx: AudioContext) {
    const now = ctx.currentTime;
    const arp = [523.25, 659.25, 783.99, 1046.5];
    arp.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.055;
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.055);
    });
  }

  private playHeroFanfareBurst(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [392.0, 523.25, 659.25];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.09;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.055, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  private playKitchenSizzleBurst(ctx: AudioContext) {
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.35);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.35);
  }

  private playBoop(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  private playSqueak(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.14);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  private playYiii(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.Q.value = 4.0;

    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(1950, now + 0.28);
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 0.28);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  private playAaaa(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);

    vibrato.frequency.value = 14;
    vibratoGain.gain.value = 90;

    vibrato.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    vibrato.start(now);
    osc.start(now);
    vibrato.stop(now + 0.4);
    osc.stop(now + 0.4);
  }

  private playGiggle(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [720, 880, 1020, 940];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = now + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);
      osc.frequency.exponentialRampToValueAtTime(freq + 120, noteStart + 0.05);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.065);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.08);
    });
  }
}

export const cuteAudioSynth = new AudioSynthesizer();
export const playCuteSound = (
  type: 'yiii' | 'aaaa' | 'giggle' | 'boop' | 'squeak' | AmbientSoundType | string
) => cuteAudioSynth.play(type);
