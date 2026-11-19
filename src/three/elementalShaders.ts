import * as THREE from 'three';

/**
 * Procedural GLSL Shaders for Fire, Ice, and Rock Elementals
 */

export const FIRE_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uDisplacement;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vNoise;

  // Simple pseudo 3D noise in GLSL
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857; // 1.0/7.0
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z); // mod(p, 49)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_); // mod(j, 7)

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;

    // Upward flame wave displacement
    vec3 noiseCoord = position * 2.2 + vec3(0.0, -uTime * 3.2, 0.0);
    float n = snoise(noiseCoord);
    vNoise = n;

    // Upward bias for rising fire spikes
    float upwardTaper = clamp((position.y + 0.6) * 0.9, 0.1, 1.8);
    vec3 displaced = position + normal * (n * uDisplacement * upwardTaper);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const FIRE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorCore;
  uniform vec3 uColorMid;
  uniform vec3 uColorRim;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vNoise;

  void main() {
    // Fresnel rim effect
    vec3 viewDir = normalize(-vPosition);
    float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
    fresnel = pow(fresnel, 2.2);

    // Color gradient from fiery core yellow -> intense orange -> blazing crimson rim
    float heat = clamp(vNoise * 0.6 + 0.5 + (vPosition.y * 0.3), 0.0, 1.0);
    vec3 fireColor = mix(uColorCore, uColorMid, heat);
    fireColor = mix(fireColor, uColorRim, fresnel * 0.85);

    // Emissive flame pulse
    float pulse = 0.95 + sin(uTime * 8.0 + vPosition.y * 6.0) * 0.12;

    gl_FragColor = vec4(fireColor * pulse * 1.35, 0.96);
  }
`;

export const FIRE_PARTICLE_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  attribute float aScale;
  attribute float aPhase;
  attribute vec3 aVelocity;
  varying float vPhase;
  varying float vLife;

  void main() {
    vPhase = aPhase;
    
    // Cycle particle life 0 to 1
    float age = mod(uTime * 1.8 + aPhase, 1.0);
    vLife = 1.0 - age;

    // Particle motion rising and swirling outward
    vec3 pos = position + aVelocity * age * 2.2;
    pos.x += sin(uTime * 4.0 + aPhase * 6.28) * 0.15 * age;
    pos.z += cos(uTime * 4.0 + aPhase * 6.28) * 0.15 * age;
    pos.y += age * 1.8;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (aScale * vLife * 35.0) / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const FIRE_PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorInner;
  uniform vec3 uColorOuter;
  varying float vPhase;
  varying float vLife;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float soft = smoothstep(0.5, 0.05, dist);
    vec3 col = mix(uColorInner, uColorOuter, dist * 2.0);
    gl_FragColor = vec4(col * 1.4, soft * vLife);
  }
`;

export const ICE_MIST_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  attribute float aScale;
  attribute float aPhase;
  varying float vAlpha;

  void main() {
    float age = mod(uTime * 0.75 + aPhase, 1.0);
    vAlpha = sin(age * 3.14159);

    vec3 pos = position;
    // Gentle floating vortex
    float angle = uTime * 0.9 + aPhase * 6.28;
    pos.x += cos(angle) * 0.22;
    pos.z += sin(angle) * 0.22;
    pos.y += sin(uTime * 1.5 + aPhase * 3.14) * 0.12;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (aScale * 38.0) / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const ICE_MIST_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    // Diamond spark shape
    vec2 p = abs(gl_PointCoord - vec2(0.5));
    float diamond = p.x + p.y;
    if (diamond > 0.5) discard;

    float alpha = (0.5 - diamond) * 2.0 * vAlpha;
    gl_FragColor = vec4(uColor * 1.3, alpha * 0.75);
  }
`;

/**
 * Dynamic Moss Growth Shaders on Rock Elemental
 * Displaces rock crevices and blends lively green moss onto top/normal surfaces based on uMossGrowth
 */
export const ROCK_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const ROCK_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uMossGrowth; // 0.0 to 1.0 dynamic growth
  uniform vec3 uStoneColor;
  uniform vec3 uStoneDark;
  uniform vec3 uMossColor;
  uniform vec3 uMossHighlight;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  // Simple procedural hash for rock texture
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  void main() {
    // Rough granite / basalt grain
    float grain = hash(floor(vWorldPosition * 24.0)) * 0.18;
    vec3 baseStone = mix(uStoneDark, uStoneColor, vUv.y + grain);

    // Moss grows primarily on upward-facing surfaces (vWorldNormal.y > 0.1)
    // with organic patches derived from position noise
    float patchNoise = sin(vWorldPosition.x * 6.5) * cos(vWorldPosition.z * 6.5) * 0.25;
    float upFactor = clamp(vWorldNormal.y + patchNoise + (uMossGrowth * 0.5 - 0.2), 0.0, 1.0);
    float mossMask = smoothstep(0.45 - (uMossGrowth * 0.35), 0.85, upFactor);

    // Dynamic moss color with velvety tone
    vec3 lushMoss = mix(uMossColor, uMossHighlight, sin(vWorldPosition.y * 12.0 + uTime * 0.5) * 0.5 + 0.5);

    vec3 finalColor = mix(baseStone, lushMoss, mossMask);

    // Simple diffuse directional light
    vec3 lightDir = normalize(vec3(0.6, 1.0, 0.8));
    float diff = max(dot(vWorldNormal, lightDir), 0.25);

    gl_FragColor = vec4(finalColor * diff, 1.0);
  }
`;

export const ROCK_DUST_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  attribute float aScale;
  attribute float aPhase;
  varying float vLife;

  void main() {
    float age = mod(uTime * 0.5 + aPhase, 1.0);
    vLife = 1.0 - age;

    vec3 pos = position;
    // Slow settling earthen dust
    pos.y -= age * 0.45;
    pos.x += sin(age * 6.28 + aPhase) * 0.15;
    pos.z += cos(age * 6.28 + aPhase) * 0.15;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (aScale * vLife * 28.0) / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const ROCK_DUST_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  varying float vLife;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, dist);
    gl_FragColor = vec4(uColor, soft * vLife * 0.55);
  }
`;
