/**
 * NEVEA — Companion 5-State Finite State Machine
 * States:
 *  - IDLE: Calm, rhythmic breathing, gentle float bobbing, gaze tracking cursor, random double-blinks.
 *  - LISTENING: Alert ears perk forward, head tilted toward user/mic, wide glistening eyes, attentive micro-nodding.
 *  - THINKING: Gaze drifts upward-left/right, head gently rolls, floating oscillation, internal processing pulse.
 *  - SPEAKING: Speech audio sync, mouth/jaw elastic oscillation, energetic head nodding, ear flaps.
 *  - SLEEPING: Settled snugly at rest, slow deep slumber breathing, closed eye crescents, curled posture.
 */

export const COMPANION_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  SLEEPING: 'sleeping'
};

export class CompanionStateMachine {
  constructor(initialState = COMPANION_STATES.IDLE) {
    this.currentState = initialState;
    this.stateTime = 0;
    this.transitionTime = 0;
    this.previousState = null;
    this.audioLevel = 0.0; // 0.0 to 1.0 from voice synthesizer / mic
    this.listeners = new Set();
  }

  setState(newState) {
    if (this.currentState === newState) return;
    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateTime = 0;
    this.transitionTime = 0;
    this.notify();
  }

  getState() {
    return this.currentState;
  }

  setAudioLevel(level) {
    this.audioLevel = Math.max(0, Math.min(1, level));
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      cb(this.currentState, this.previousState);
    }
  }

  update(dt) {
    this.stateTime += dt;
    this.transitionTime = Math.min(1.0, this.transitionTime + dt * 4.0);
  }
}
