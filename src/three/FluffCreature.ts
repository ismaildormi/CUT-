import * as THREE from 'three';
import { createBlobCreature } from '../blobCreature.js';
import {
  CharacterProfile,
  CHARACTER_PRESETS,
  getActiveCharacterProfile,
  setActiveCharacterProfile,
} from '../data/characterPresets';
import {
  createCharacterAccessories,
  CharacterAccessoriesController,
} from './CharacterAccessories';
import { createElementalVFX, ElementalVFXController } from './ElementalVFX';
import { createElementalFire, ElementalController } from './ElementalFire';
import { createElementalIce } from './ElementalIce';
import { createElementalRock } from './ElementalRock';

export interface LipSyncController {
  mouthScale: number;
  isFlying: boolean;
  scaleMultiplier: number;
  targetPosition: THREE.Vector3;
  activeProfile: CharacterProfile;
  setMouthScale: (scale: number) => void;
  updateFromAudioAmplitude: (amplitude: number, dt?: number) => number;
  connectAudioStream: (stream: MediaStream) => void;
  sampleLiveAmplitude: () => number;
  triggerFlight: (active?: boolean, durationSec?: number) => void;
  changeSize: (sizePresetOrScale: string | number) => void;
  flyToTarget: (x: number, y: number, z?: number) => void;
  triggerButtonPressFlight: (targetCoords?: { x?: number; y?: number; z?: number }) => void;
  applyCharacterProfile: (
    profile: CharacterProfile,
    setFurColorFn?: (baseHex: string, tipHex: string) => void
  ) => void;
  setAccessoryBounds?: (bounds: THREE.Vector4 | [number, number, number, number]) => void;
  updateFlightAndPhysics: (dt: number, elapsedTime: number, chaseTarget?: THREE.Vector3 | null) => {
    justLanded: boolean;
    justPressedButton: boolean;
    flightSpeed: number;
  };
  dispose: () => void;
}

/**
 * FluffCreature TS Controller:
 * - Real-time Audio-Reactive Lip-Sync (`mouthScale`)
 * - Dynamic 3D Flight (`isFlying`, `targetPosition`) with second-order spring kinematics
 * - Dynamic Scaling (`scaleMultiplier`: shrink to mouse-sized 0.32 or grow to screen-filling 1.95)
 * - "Button Press" Interaction: flies toward UI button coordinates, performs a tactile squash press, and bounces back
 * - Character Universe Skins, Procedural 3D Accessories (`CharacterAccessories`) & Elemental VFX (`ElementalVFX`)
 */
export class FluffCreature implements LipSyncController {
  public readonly raw: any;
  public mouthScale = 0.0;
  public furLength = 0.22;
  public furDensity = 0.88;
  public activeProfile: CharacterProfile = CHARACTER_PRESETS[0];
  public readonly accessoriesController: CharacterAccessoriesController;
  public readonly elementalVFX: ElementalVFXController;

  // High-End Elemental Titan Models
  public activeElementalController: ElementalController | null = null;
  public activeElementalType: 'fire' | 'ice' | 'rock' | 'none' = 'none';
  private fireElemental: ElementalController | null = null;
  private iceElemental: ElementalController | null = null;
  private rockElemental: ElementalController | null = null;
  private furSystemRef: any = null;

  // Dynamic Flight & Scaling State Variables
  public isFlying = false;
  public scaleMultiplier = 1.0;
  public targetScaleMultiplier = 1.0;
  public targetPosition = new THREE.Vector3(0, 0, 0);
  public currentPositionOffset = new THREE.Vector3(0, 0, 0);

  private positionVelocity = new THREE.Vector3(0, 0, 0);
  private scaleVelocity = 0.0;
  private flightTimer = 0.0;
  private waypointTimer = 0.0;
  private autonomousFlightCooldown = 19.0;

  // Button Press Interaction State
  private buttonPressPhase: 'none' | 'pressing' | 'outbound' | 'returning' = 'none';
  private buttonPressTimer = 0.0;
  private buttonTargetPos = new THREE.Vector3(1.55, 0.25, 0.85);
  private buttonSquashFactor = 0.0;

  private smoothedAmplitude = 0.0;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  constructor(existingCreature?: any) {
    this.raw = existingCreature || createBlobCreature();
    this.accessoriesController = createCharacterAccessories();
    this.elementalVFX = createElementalVFX();

    if (this.raw?.root) {
      this.raw.root.add(this.accessoriesController.group);
      this.raw.root.add(this.elementalVFX.group);
    }

    const savedProfile = getActiveCharacterProfile();
    this.activeProfile = savedProfile;
  }

  public setFurSystem(furSystem: any): void {
    this.furSystemRef = furSystem;
    this.syncAccessoryBounds();
    if (this.activeElementalController) {
      this.setStandardBodyVisible(false);
    }
  }

  public syncAccessoryBounds(): void {
    if (!this.furSystemRef || !this.accessoriesController?.getAccessoryBounds) return;
    const bounds = this.accessoriesController.getAccessoryBounds();
    this.setAccessoryBounds(bounds);
  }

  public setAccessoryBounds(bounds: THREE.Vector4 | [number, number, number, number]): void {
    if (this.furSystemRef?.setAccessoryBounds) {
      this.furSystemRef.setAccessoryBounds(bounds);
    } else if (this.furSystemRef?.sharedUniforms?.uAccessoryBounds) {
      if (Array.isArray(bounds)) {
        this.furSystemRef.sharedUniforms.uAccessoryBounds.value.set(bounds[0], bounds[1], bounds[2], bounds[3]);
      } else {
        this.furSystemRef.sharedUniforms.uAccessoryBounds.value.copy(bounds);
      }
    }
  }

  /**
   * Dynamically apply a CharacterProfile:
   * - High-End Elemental 3D Models (Fire, Ice, Rock) with custom shaders, refraction & particles
   * - Preserves existing 29 Procedural Fur Characters without breakage
   * - Updates fur baseColor & tipColor
   * - Updates 3D iris & cornea eyeColor
   * - Builds & attaches procedural 3D accessories
   * - Activates Elemental VFX
   */
  public applyCharacterProfile(
    profile: CharacterProfile,
    setFurColorFn?: (baseHex: string, tipHex: string) => void
  ): void {
    if (!profile) return;
    this.activeProfile = profile;
    setActiveCharacterProfile(profile.id);

    // 1. High-End Elemental Titan Model Switcher
    if (profile.id === 'fire_elemental') {
      if (!this.fireElemental) {
        this.fireElemental = createElementalFire();
      }
      this.attachElementalModel(this.fireElemental);
      this.activeElementalController = this.fireElemental;
      this.activeElementalType = 'fire';
      this.setStandardBodyVisible(false);
    } else if (profile.id === 'ice_elemental') {
      if (!this.iceElemental) {
        this.iceElemental = createElementalIce();
      }
      this.attachElementalModel(this.iceElemental);
      this.activeElementalController = this.iceElemental;
      this.activeElementalType = 'ice';
      this.setStandardBodyVisible(false);
    } else if (profile.id === 'rock_elemental') {
      if (!this.rockElemental) {
        this.rockElemental = createElementalRock();
      }
      this.attachElementalModel(this.rockElemental);
      this.activeElementalController = this.rockElemental;
      this.activeElementalType = 'rock';
      this.setStandardBodyVisible(false);
    } else {
      // Standard 29 Procedural Fur Characters - Preserved 100% without breakage
      this.detachElementalModels();
      this.activeElementalController = null;
      this.activeElementalType = 'none';
      this.setStandardBodyVisible(true);

      if (setFurColorFn) {
        setFurColorFn(profile.furColor, profile.tipColor || '#ffffff');
      } else if (this.raw?.skinMaterial) {
        this.raw.skinMaterial.color.set(profile.furColor).multiplyScalar(0.55);
      }

      if (this.raw?.setEyeColor) {
        this.raw.setEyeColor(profile.eyeColor);
      }
    }

    this.accessoriesController.setAccessories(profile.accessories || [], profile);
    this.syncAccessoryBounds();
    this.elementalVFX.setVFXType(profile.vfxType || 'none');
    this.triggerBoop(1.1);
  }

  private attachElementalModel(elemental: ElementalController): void {
    this.detachElementalModels();
    if (this.raw?.root && !this.raw.root.children.includes(elemental.group)) {
      this.raw.root.add(elemental.group);
    }
    elemental.group.visible = true;
  }

  private detachElementalModels(): void {
    if (this.fireElemental) this.fireElemental.group.visible = false;
    if (this.iceElemental) this.iceElemental.group.visible = false;
    if (this.rockElemental) this.rockElemental.group.visible = false;
  }

  private setStandardBodyVisible(visible: boolean): void {
    if (this.raw?.bodyMesh) {
      this.raw.bodyMesh.visible = visible;
    }
    if (this.raw?.root) {
      for (const child of this.raw.root.children) {
        if (
          child !== this.accessoriesController?.group &&
          child !== this.elementalVFX?.group &&
          child !== this.raw?.bodyMesh &&
          child !== this.fireElemental?.group &&
          child !== this.iceElemental?.group &&
          child !== this.rockElemental?.group
        ) {
          if (
            child.isGroup &&
            (child.children.includes(this.raw?.mouthGroup) || child.name === 'faceGroup')
          ) {
            child.visible = visible;
          }
        }
      }
    }
    if (this.furSystemRef) {
      if (this.furSystemRef.shellMesh) this.furSystemRef.shellMesh.visible = visible;
      if (this.furSystemRef.strandMesh) this.furSystemRef.strandMesh.visible = visible;
    }
  }

  public triggerBoop(strength = 1.1): void {
    this.raw?.triggerBoop?.(strength);
    if (this.activeElementalController) {
      this.activeElementalController.boop(strength);
    }
  }


  /**
   * Toggle or trigger dynamic aerial flight mode
   */
  public triggerFlight(active = true, durationSec = 9.5): void {
    this.isFlying = active;
    if (active) {
      this.flightTimer = Math.max(this.flightTimer, durationSec);
      this.waypointTimer = 0.0;
      this.pickNextAerialWaypoint();
    } else {
      this.flightTimer = 0.0;
      this.targetPosition.set(0, 0, 0);
    }
  }

  /**
   * Smoothly scale NEVEA between mouse-sized ('tiny'/'mouse'/0.32), normal ('normal'/1.0),
   * or giant screen-filling ('giant'/'big'/'screen'/1.9)
   */
  public changeSize(sizePresetOrScale: string | number): void {
    if (typeof sizePresetOrScale === 'number' && Number.isFinite(sizePresetOrScale)) {
      this.targetScaleMultiplier = Math.max(0.25, Math.min(2.25, sizePresetOrScale));
      return;
    }
    const key = String(sizePresetOrScale || 'normal').toLowerCase().trim();
    if (key.includes('mouse') || key.includes('tiny') || key.includes('small') || key.includes('shrink')) {
      this.targetScaleMultiplier = 0.32;
    } else if (
      key.includes('big') ||
      key.includes('giant') ||
      key.includes('huge') ||
      key.includes('large') ||
      key.includes('grow') ||
      key.includes('fill')
    ) {
      this.targetScaleMultiplier = 1.92;
    } else {
      this.targetScaleMultiplier = 1.0;
    }
  }

  public flyToTarget(x: number, y: number, z = 0.35): void {
    this.isFlying = true;
    this.flightTimer = Math.max(this.flightTimer, 6.0);
    this.targetPosition.set(x, y, z);
  }

  /**
   * When the AI triggers a UI/OS action (e.g. "Open Chrome"), NEVEA flies towards
   * the UI button coordinates, performs a tactile squash animation to press the button,
   * and bounces back to center!
   */
  public triggerButtonPressFlight(targetCoords?: { x?: number; y?: number; z?: number }): void {
    const tx = targetCoords?.x ?? 1.55;
    const ty = targetCoords?.y ?? (Math.random() * 0.7 - 0.15);
    const tz = targetCoords?.z ?? 0.95;

    this.buttonTargetPos.set(tx, ty, tz);
    this.buttonPressPhase = 'outbound';
    this.buttonPressTimer = 0.0;
    this.isFlying = true;
    this.flightTimer = Math.max(this.flightTimer, 3.2);
    this.targetPosition.copy(this.buttonTargetPos);
  }

  private pickNextAerialWaypoint(): void {
    const angle = Math.random() * Math.PI * 2.0;
    const rx = Math.cos(angle) * (0.95 + Math.random() * 0.85);
    const ry = 0.55 + Math.random() * 0.85;
    const rz = Math.sin(angle) * 0.55;
    this.targetPosition.set(rx, ry, rz);
  }

  /**
   * Advances spring-based flight kinematics, dynamic scaling, button-press squash,
   * and applies transformations onto the underlying 3D creature root.
   */
  public updateFlightAndPhysics(
    dt: number,
    elapsedTime: number,
    chaseTarget: THREE.Vector3 | null = null
  ): {
    justLanded: boolean;
    justPressedButton: boolean;
    flightSpeed: number;
  } {
    const safeDt = Math.min(Math.max(dt, 0.001), 0.04);
    const wasFlying = this.isFlying;
    let justPressedButton = false;

    // 1. Button-Press Flight State Machine
    if (this.buttonPressPhase !== 'none') {
      this.buttonPressTimer += safeDt;

      if (this.buttonPressPhase === 'outbound') {
        this.targetPosition.copy(this.buttonTargetPos);
        const dist = this.currentPositionOffset.distanceTo(this.buttonTargetPos);
        if (dist < 0.28 || this.buttonPressTimer > 0.85) {
          this.buttonPressPhase = 'pressing';
          this.buttonPressTimer = 0.0;
          this.buttonSquashFactor = 1.0;
          justPressedButton = true;
          // Bounce impulse back
          this.positionVelocity.set(-2.6, 1.35, -1.8);
          this.raw?.triggerBoop?.(1.3);
        }
      } else if (this.buttonPressPhase === 'pressing') {
        this.buttonSquashFactor = THREE.MathUtils.damp(this.buttonSquashFactor, 0.0, 12.0, safeDt);
        if (this.buttonPressTimer > 0.26) {
          this.buttonPressPhase = 'returning';
          this.buttonPressTimer = 0.0;
          this.targetPosition.set(0, 0.25, 0);
        }
      } else if (this.buttonPressPhase === 'returning') {
        this.targetPosition.set(0, 0, 0);
        if (this.currentPositionOffset.length() < 0.18 || this.buttonPressTimer > 1.2) {
          this.buttonPressPhase = 'none';
          this.isFlying = false;
        }
      }
    } else if (chaseTarget) {
      // 2. Chasing a Duck NPC in 3D space
      this.isFlying = true;
      this.flightTimer = Math.max(this.flightTimer, 2.5);
      this.targetPosition.set(chaseTarget.x * 0.85, chaseTarget.y - 0.15, chaseTarget.z * 0.85);
    } else if (this.isFlying) {
      // 3. Free Hover & Waypoint Flight
      this.flightTimer -= safeDt;
      this.waypointTimer += safeDt;
      if (this.waypointTimer > 2.2) {
        this.waypointTimer = 0.0;
        this.pickNextAerialWaypoint();
      }
      if (this.flightTimer <= 0) {
        this.isFlying = false;
        this.targetPosition.set(0, 0, 0);
      }
    } else {
      // 4. Subtle Autonomous Flight / Size Playfulness Timer
      this.autonomousFlightCooldown -= safeDt;
      if (this.autonomousFlightCooldown <= 0) {
        this.autonomousFlightCooldown = 26.0 + Math.random() * 20.0;
        this.triggerFlight(true, 6.5);
      }
      this.targetPosition.set(0, 0, 0);
    }

    // 5. Second-Order Spring Physics for Position Offset (`@react-spring/three` style stiffness/damping)
    const stiffness = this.buttonPressPhase !== 'none' ? 38.0 : this.isFlying ? 16.0 : 22.0;
    const damping = this.buttonPressPhase !== 'none' ? 7.5 : 5.8;

    const hoverBobY = this.isFlying ? Math.sin(elapsedTime * 4.6) * 0.16 : 0.0;
    const hoverSwayX = this.isFlying ? Math.cos(elapsedTime * 2.7) * 0.12 : 0.0;

    const tx = this.targetPosition.x + hoverSwayX;
    const ty = this.targetPosition.y + hoverBobY;
    const tz = this.targetPosition.z;

    const ax = (tx - this.currentPositionOffset.x) * stiffness - this.positionVelocity.x * damping;
    const ay = (ty - this.currentPositionOffset.y) * stiffness - this.positionVelocity.y * damping;
    const az = (tz - this.currentPositionOffset.z) * stiffness - this.positionVelocity.z * damping;

    this.positionVelocity.x += ax * safeDt;
    this.positionVelocity.y += ay * safeDt;
    this.positionVelocity.z += az * safeDt;

    this.currentPositionOffset.x += this.positionVelocity.x * safeDt;
    this.currentPositionOffset.y += this.positionVelocity.y * safeDt;
    this.currentPositionOffset.z += this.positionVelocity.z * safeDt;

    // 6. Second-Order Spring Physics for Scale Multiplier (Shrink to Mouse / Grow to Giant)
    const scaleForce =
      (this.targetScaleMultiplier - this.scaleMultiplier) * 28.0 - this.scaleVelocity * 7.2;
    this.scaleVelocity += scaleForce * safeDt;
    this.scaleMultiplier = Math.max(
      0.22,
      Math.min(2.4, this.scaleMultiplier + this.scaleVelocity * safeDt)
    );

    // 7. Apply Aerial Offset, Banking Roll, and Scale Multiplier to Creature Root
    const root: THREE.Group | undefined = this.raw?.root;
    const flightSpeed = this.positionVelocity.length();
    if (root) {
      root.position.add(this.currentPositionOffset);

      // Apply scale multiplier + button-press squash deformation
      const pressSquashZ = 1.0 - this.buttonSquashFactor * 0.42;
      const pressStretchXY = 1.0 + this.buttonSquashFactor * 0.28;
      root.scale.x *= this.scaleMultiplier * pressStretchXY;
      root.scale.y *= this.scaleMultiplier * pressStretchXY;
      root.scale.z *= this.scaleMultiplier * pressSquashZ;

      // Dynamic aerodynamic banking roll & pitch into velocity vector
      if (this.isFlying || this.currentPositionOffset.lengthSq() > 0.01) {
        root.rotation.z -= THREE.MathUtils.clamp(this.positionVelocity.x * 0.16, -0.42, 0.42);
        root.rotation.x += THREE.MathUtils.clamp(this.positionVelocity.z * 0.14, -0.35, 0.35);
      }
    }

    // 8. Animate 3D Procedural Accessories (Cape cloth waves, Wand star, RGB headset, Flame/Ice crowns) & Elemental VFX / High-End Models
    this.accessoriesController.update(safeDt, elapsedTime, this.isFlying, flightSpeed);
    this.elementalVFX.update(safeDt, elapsedTime);
    if (this.activeElementalController) {
      this.activeElementalController.update(safeDt, elapsedTime);
    }

    const justLanded = wasFlying && !this.isFlying;
    return {
      justLanded,
      justPressedButton,
      flightSpeed,
    };
  }

  public connectAudioStream(stream: MediaStream): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.sourceNode) {
        try {
          this.sourceNode.disconnect();
        } catch {}
      }
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.65;
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);
    } catch (err) {
      console.warn('FluffCreature audio stream hook warning:', err);
    }
  }

  public sampleLiveAmplitude(): number {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      let sum = 0;
      const count = Math.min(48, this.dataArray.length);
      for (let i = 2; i < count; i++) {
        const v = this.dataArray[i] / 255.0;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / Math.max(1, count - 2));
      if (rms > 0.02) {
        return Math.min(1.0, rms * 2.1);
      }
    }
    return this.raw?.getMouthScale ? this.raw.getMouthScale() : 0.0;
  }

  public updateFromAudioAmplitude(amplitude: number, dt = 0.016): number {
    const clamped = Math.max(0, Math.min(1.2, Number(amplitude) || 0));
    const lerpRate = clamped > this.smoothedAmplitude ? 22.0 : 14.0;
    this.smoothedAmplitude += (clamped - this.smoothedAmplitude) * Math.min(1.0, dt * lerpRate);
    this.mouthScale = this.smoothedAmplitude;

    if (this.raw?.setMouthScale) {
      this.raw.setMouthScale(this.mouthScale);
    } else if (this.raw?.setSpeechLevel) {
      this.raw.setSpeechLevel(this.mouthScale);
    }

    const mouthGroup: THREE.Group | undefined = this.raw?.mouthGroup;
    const mouthCavity: THREE.Mesh | undefined = this.raw?.mouthCavity;
    if (mouthGroup) {
      const stretchY = 1.0 + this.mouthScale * 1.65;
      const squashX =
        1.0 -
        this.mouthScale * 0.22 +
        Math.sin(performance.now() * 0.025) * this.mouthScale * 0.12;
      const stretchZ = 1.0 + this.mouthScale * 0.35;
      mouthGroup.scale.set(squashX, stretchY, stretchZ);
    }
    if (mouthCavity) {
      const openFactor = Math.max(0.01, this.mouthScale * 1.15);
      mouthCavity.scale.set(
        0.75 + this.mouthScale * 0.45,
        openFactor,
        0.8 + this.mouthScale * 0.3
      );
    }

    return this.mouthScale;
  }

  public setMouthScale(scale: number): void {
    this.updateFromAudioAmplitude(scale, 0.05);
  }

  public dispose(): void {
    this.accessoriesController.dispose();
    this.elementalVFX.dispose();
    this.fireElemental?.dispose();
    this.iceElemental?.dispose();
    this.rockElemental?.dispose();
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
  }
}

