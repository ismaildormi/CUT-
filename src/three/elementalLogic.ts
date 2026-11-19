import * as THREE from 'three';

/**
 * 3D Simplex & Fractional Brownian Motion (FBM) noise algorithms for procedural elemental VFX
 */

// Simple pseudo-random permutation hash
function permute(x: number): number {
  return ((x * 34.0 + 1.0) * x) % 289.0;
}

export function snoise3D(v: THREE.Vector3): number {
  const C = new THREE.Vector2(1.0 / 6.0, 1.0 / 3.0);
  const D = new THREE.Vector4(0.0, 0.5, 1.0, 2.0);

  // First corner
  const i = new THREE.Vector3(
    Math.floor(v.x + (v.x + v.y + v.z) * C.y),
    Math.floor(v.y + (v.x + v.y + v.z) * C.y),
    Math.floor(v.z + (v.x + v.y + v.z) * C.y)
  );
  const x0 = new THREE.Vector3(
    v.x - i.x + (i.x + i.y + i.z) * C.x,
    v.y - i.y + (i.x + i.y + i.z) * C.x,
    v.z - i.z + (i.x + i.y + i.z) * C.x
  );

  // Other corners
  const g = x0.x > x0.y ? (x0.y > x0.z ? 1 : 2) : (x0.x > x0.z ? 3 : 4);
  const i1 = new THREE.Vector3(
    g === 1 || g === 2 ? 1 : 0,
    g === 1 || g === 3 ? 1 : 0,
    g === 4 || g === 2 ? 1 : 0
  );
  const i2 = new THREE.Vector3(
    g === 1 || g === 2 || g === 3 ? 1 : 0,
    g === 1 || g === 3 || g === 4 ? 1 : 0,
    g === 2 || g === 4 ? 1 : 0
  );

  const x1 = new THREE.Vector3(x0.x - i1.x + C.x, x0.y - i1.y + C.x, x0.z - i1.z + C.x);
  const x2 = new THREE.Vector3(x0.x - i2.x + 2.0 * C.x, x0.y - i2.y + 2.0 * C.x, x0.z - i2.z + 2.0 * C.x);
  const x3 = new THREE.Vector3(x0.x - 1.0 + 3.0 * C.x, x0.y - 1.0 + 3.0 * C.x, x0.z - 1.0 + 3.0 * C.x);

  // Permutations
  const p0 = permute(permute(permute(i.z) + i.y) + i.x);
  const p1 = permute(permute(permute(i.z + i1.z) + i.y + i1.y) + i.x + i1.x);
  const p2 = permute(permute(permute(i.z + i2.z) + i.y + i2.y) + i.x + i2.x);
  const p3 = permute(permute(permute(i.z + 1.0) + i.y + 1.0) + i.x + 1.0);

  // Gradients
  const m0 = Math.max(0, 0.6 - x0.dot(x0));
  const m1 = Math.max(0, 0.6 - x1.dot(x1));
  const m2 = Math.max(0, 0.6 - x2.dot(x2));
  const m3 = Math.max(0, 0.6 - x3.dot(x3));

  const grad0 = (p0 % 16) - 8;
  const grad1 = (p1 % 16) - 8;
  const grad2 = (p2 % 16) - 8;
  const grad3 = (p3 % 16) - 8;

  return 42.0 * (
    m0 * m0 * m0 * m0 * (grad0 * x0.x + grad0 * x0.y + grad0 * x0.z) +
    m1 * m1 * m1 * m1 * (grad1 * x1.x + grad1 * x1.y + grad1 * x1.z) +
    m2 * m2 * m2 * m2 * (grad2 * x2.x + grad2 * x2.y + grad2 * x2.z) +
    m3 * m3 * m3 * m3 * (grad3 * x3.x + grad3 * x3.y + grad3 * x3.z)
  );
}

export function fbmNoise3D(p: THREE.Vector3, octaves = 4): number {
  let value = 0.0;
  let amplitude = 0.5;
  let frequency = 1.0;
  const pos = p.clone();

  for (let i = 0; i < octaves; i++) {
    value += amplitude * snoise3D(pos.clone().multiplyScalar(frequency));
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

/**
 * Dynamic Fire Light Flickering Intensity
 */
export function computeFireLightFlicker(time: number, baseIntensity = 2.4): number {
  const n1 = Math.sin(time * 12.0) * 0.15;
  const n2 = Math.sin(time * 26.5 + 1.4) * 0.12;
  const n3 = (Math.random() - 0.5) * 0.08;
  const n4 = Math.sin(time * 4.2) * 0.22;
  return Math.max(0.6, baseIntensity + (n1 + n2 + n3 + n4) * baseIntensity * 0.45);
}

/**
 * Orbital transforms for orbiting crystals, boulders, and flame sparks
 */
export function computeOrbitingTransform(
  radius: number,
  speed: number,
  time: number,
  angleOffset = 0,
  tilt = 0.25,
  bobSpeed = 2.0,
  bobHeight = 0.12
): { position: THREE.Vector3; rotation: THREE.Euler } {
  const angle = time * speed + angleOffset;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = Math.sin(time * bobSpeed + angleOffset * 2.0) * bobHeight + Math.sin(angle) * radius * tilt;

  return {
    position: new THREE.Vector3(x, y, z),
    rotation: new THREE.Euler(angle * 1.5, angle * 2.2, Math.cos(angle) * 0.8),
  };
}

/**
 * Dynamic Moss Growth Calculation (0.0 to 1.0 cycle with pulse)
 */
export function computeMossGrowth(time: number): number {
  // Gentle breathing cycle between 0.35 and 0.95
  return 0.65 + Math.sin(time * 0.45) * 0.3;
}
