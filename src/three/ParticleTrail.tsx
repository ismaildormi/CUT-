import * as THREE from 'three';

export interface ParticleTrailHandle {
  points: THREE.Points;
  update: (
    dt: number,
    elapsedTime: number,
    emitterPos: THREE.Vector3,
    isEmitting: boolean,
    creatureScale?: number
  ) => void;
  triggerDustBurst: (origin: THREE.Vector3, count?: number, spread?: number) => void;
  dispose: () => void;
}

/**
 * Creates a GPU-friendly Three.js Points particle system for:
 * 1. Continuous glowing fairy-dust/cloud puffs while NEVEA flies (`isFlying = true`)
 * 2. Radial "dust explosion" landing burst when NEVEA touches down or presses a button
 */
export function createParticleTrail(maxParticles = 320): ParticleTrailHandle {
  const positions = new Float32Array(maxParticles * 3);
  const colors = new Float32Array(maxParticles * 3);
  const velocities = new Float32Array(maxParticles * 3);
  const ages = new Float32Array(maxParticles);
  const lifetimes = new Float32Array(maxParticles);

  for (let i = 0; i < maxParticles; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = -999;
    positions[i * 3 + 2] = 0;
    ages[i] = 999;
    lifetimes[i] = 1.0;
    colors[i * 3] = 1.0;
    colors[i * 3 + 1] = 1.0;
    colors[i * 3 + 2] = 1.0;
  }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  const colorAttr = new THREE.BufferAttribute(colors, 3);
  colorAttr.setUsage(THREE.DynamicDrawUsage);

  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('color', colorAttr);

  // Procedurally generated soft radial star/dust puff sprite texture (Zero external assets)
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.35, 'rgba(224, 242, 254, 0.85)');
    grad.addColorStop(0.7, 'rgba(186, 230, 253, 0.28)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const spriteTexture = new THREE.CanvasTexture(canvas);
  spriteTexture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.PointsMaterial({
    size: 0.24,
    map: spriteTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.name = 'NeveaMagicalDustTrail';

  let cursor = 0;
  let emitAccumulator = 0;

  const spawnParticle = (
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    r: number,
    g: number,
    b: number
  ) => {
    const idx = cursor % maxParticles;
    cursor = (cursor + 1) % maxParticles;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    velocities[idx * 3] = vx;
    velocities[idx * 3 + 1] = vy;
    velocities[idx * 3 + 2] = vz;

    ages[idx] = 0.0;
    lifetimes[idx] = Math.max(0.25, life);

    colors[idx * 3] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  };

  /**
   * Radial "dust explosion" burst when NEVEA lands or finishes a button press
   */
  const triggerDustBurst = (origin: THREE.Vector3, count = 56, spread = 1.65) => {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2.0 + (Math.random() - 0.5) * 0.35;
      const ringSpeed = (0.65 + Math.random() * 1.45) * spread;
      const vx = Math.cos(angle) * ringSpeed;
      const vy = 0.25 + Math.random() * 1.15 * spread;
      const vz = Math.sin(angle) * ringSpeed;
      const life = 0.55 + Math.random() * 0.55;

      // Soft pearlescent white-blue & warm gold sparkle mix
      const isGold = i % 4 === 0;
      const r = isGold ? 1.0 : 0.88;
      const g = isGold ? 0.95 : 0.95;
      const b = isGold ? 0.72 : 1.0;

      spawnParticle(
        origin.x + (Math.random() - 0.5) * 0.25,
        origin.y - 0.35 + (Math.random() - 0.5) * 0.15,
        origin.z + (Math.random() - 0.5) * 0.25,
        vx,
        vy,
        vz,
        life,
        r,
        g,
        b
      );
    }
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  };

  const update = (
    dt: number,
    elapsedTime: number,
    emitterPos: THREE.Vector3,
    isEmitting: boolean,
    creatureScale = 1.0
  ) => {
    material.size = 0.22 * Math.max(0.45, Math.min(1.6, creatureScale));

    // Spawn continuous flight dust trail while flying
    if (isEmitting) {
      emitAccumulator += dt * 75.0;
      while (emitAccumulator >= 1.0) {
        emitAccumulator -= 1.0;
        const spread = 0.42 * creatureScale;
        const ox = emitterPos.x + (Math.random() - 0.5) * spread;
        const oy = emitterPos.y - 0.12 * creatureScale + (Math.random() - 0.5) * spread * 0.7;
        const oz = emitterPos.z - 0.35 * creatureScale + (Math.random() - 0.5) * spread;

        const vx = (Math.random() - 0.5) * 0.45;
        const vy = -0.18 + Math.random() * 0.55;
        const vz = -0.35 - Math.random() * 0.55;
        const life = 0.65 + Math.random() * 0.55;

        const shimmer = 0.85 + Math.random() * 0.15;
        spawnParticle(ox, oy, oz, vx, vy, vz, life, shimmer, shimmer * 0.98, 1.0);
      }
    } else {
      emitAccumulator = 0;
    }

    // Advance active particles
    for (let i = 0; i < maxParticles; i++) {
      const age = ages[i];
      const life = lifetimes[i];
      if (age >= life) continue;

      const nextAge = age + dt;
      ages[i] = nextAge;

      if (nextAge >= life) {
        positions[i * 3 + 1] = -999;
        continue;
      }

      const progress = nextAge / life;
      const fade = Math.pow(1.0 - progress, 1.5);

      // Gentle curl turbulence + drag
      const drag = Math.exp(-dt * 2.4);
      velocities[i * 3] *= drag;
      velocities[i * 3 + 1] = velocities[i * 3 + 1] * drag + dt * 0.22;
      velocities[i * 3 + 2] *= drag;

      positions[i * 3] +=
        (velocities[i * 3] + Math.sin(elapsedTime * 5.0 + i) * 0.08) * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] +=
        (velocities[i * 3 + 2] + Math.cos(elapsedTime * 4.5 + i) * 0.08) * dt;

      colors[i * 3] = fade * 0.92;
      colors[i * 3 + 1] = fade * 0.96;
      colors[i * 3 + 2] = fade * 1.0;
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
    spriteTexture.dispose();
  };

  return {
    points,
    update,
    triggerDustBurst,
    dispose,
  };
}
