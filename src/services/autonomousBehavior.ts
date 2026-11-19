import { playCuteSound } from './audioSynth.js';

export interface AutonomousCreatureController {
  creature: any;
  setFurColor?: (base: string, tip: string) => void;
  setEnvironment?: (envId: string) => void;
  onEvent?: (event: { action: string; description: string }) => void;
}

export const FUR_PALETTES = [
  { name: 'Sakura Pink', base: '#fbcfe8', tip: '#ffffff' },
  { name: 'Golden Glow', base: '#fef08a', tip: '#ffffff' },
  { name: 'Midnight Violet', base: '#a5b4fc', tip: '#e0e7ff' },
  { name: 'Mint Breeze', base: '#a7f3d0', tip: '#f0fdf4' },
  { name: 'Pure Cloud Fluff', base: '#e0ecfa', tip: '#ffffff' },
  { name: 'Peach Velvet', base: '#fed7aa', tip: '#fff7ed' },
];

export const ENVIRONMENTS = ['studio', 'meadow', 'sunset', 'midnight'];
export const CUTE_SOUNDS = ['yiii', 'aaaa', 'giggle', 'boop', 'squeak'];

export class AutonomousBehaviorEngine {
  private controller: AutonomousCreatureController | null = null;
  private timer: any = null;
  private isEnabled = true;

  constructor(controller?: AutonomousCreatureController) {
    if (controller) {
      this.attach(controller);
    }
  }

  public attach(controller: AutonomousCreatureController) {
    this.controller = controller;
    this.scheduleNextAction();
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      this.scheduleNextAction();
    } else if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  private scheduleNextAction() {
    if (!this.isEnabled) return;
    if (this.timer) clearTimeout(this.timer);

    // Random interval between 15 and 30 seconds
    const intervalMs = (15 + Math.random() * 15) * 1000;

    this.timer = setTimeout(() => {
      this.triggerRandomAction();
      this.scheduleNextAction();
    }, intervalMs);
  }

  /**
   * Execute an autonomous chaotic action
   */
  public triggerRandomAction() {
    if (!this.controller || !this.controller.creature) return;

    const actionTypes = ['jump_squash', 'color_shift', 'environment_shift', 'chaotic_chirp', 'happy_wiggle'];
    const selected = actionTypes[Math.floor(Math.random() * actionTypes.length)];

    switch (selected) {
      case 'jump_squash': {
        const sound = Math.random() > 0.5 ? 'boop' : 'squeak';
        playCuteSound(sound);
        if (typeof this.controller.creature.triggerBoop === 'function') {
          this.controller.creature.triggerBoop(1.2);
        }
        this.notify('Bouncy Hop', 'Nevea did an energetic autonomous hop & stretch!');
        break;
      }

      case 'color_shift': {
        const palette = FUR_PALETTES[Math.floor(Math.random() * FUR_PALETTES.length)];
        if (this.controller.setFurColor) {
          this.controller.setFurColor(palette.base, palette.tip);
        }
        playCuteSound('giggle');
        this.notify('Fur Shift', `Nevea shifted coat to ${palette.name}!`);
        break;
      }

      case 'environment_shift': {
        const env = ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)];
        if (this.controller.setEnvironment) {
          this.controller.setEnvironment(env);
        }
        playCuteSound('yiii');
        this.notify('Lighting Ambience', `Nevea changed the sky ambiance to ${env.toUpperCase()}!`);
        break;
      }

      case 'chaotic_chirp': {
        const sound = CUTE_SOUNDS[Math.floor(Math.random() * CUTE_SOUNDS.length)];
        playCuteSound(sound);
        if (typeof this.controller.creature.triggerBoop === 'function') {
          this.controller.creature.triggerBoop(0.7);
        }
        this.notify('Cute Sound', `Nevea let out a spontaneous "${sound.toUpperCase()}"!`);
        break;
      }

      case 'happy_wiggle':
      default: {
        playCuteSound('aaaa');
        if (typeof this.controller.creature.triggerBoop === 'function') {
          this.controller.creature.triggerBoop(0.9);
        }
        this.notify('Wiggle', 'Nevea happily wiggled her fluffy ears!');
        break;
      }
    }
  }

  private notify(action: string, description: string) {
    if (this.controller?.onEvent) {
      this.controller.onEvent({ action, description });
    }
  }

  public dispose() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export const globalAutonomousEngine = new AutonomousBehaviorEngine();
