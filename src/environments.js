import * as THREE from 'three';

// Note: Mochi-Puff is treated as a 2-inch × 2-inch miniature creature (1 Three.js unit ≈ 1 inch).
export const ENVIRONMENT_PRESETS = [
  {
    id: 'studio',
    name: 'Studio',
    subtitle: 'Black Cyclorama',
    lightAngle: -74,
    lightIntensity: 0.48,
    rimIntensity: 0.38,
    windStrength: 0.85,
    keyColor: '#fff7ed',
    rimColor: '#c4b5fd',
    hemiSkyColor: '#f5d0fe',
    hemiGroundColor: '#1e1b4b',
    hemiIntensity: 0.34,
    envSkyColor: '#f5d0fe',
    envGroundColor: '#1e1b4b',
    envTintStrength: 0.0,
    ambientIntensity: 0.25,
    exposure: 0.90,
    rimLightPos: [-2.4, 2.6, -3.2]
  },
  {
    id: 'meadow',
    name: 'Cloud Sky',
    subtitle: 'Blue Sky & Clouds',
    lightAngle: 137,
    lightIntensity: 0.52,
    rimIntensity: 0.38,
    windStrength: 0.70,
    keyColor: '#fffbeb',
    rimColor: '#e0f2fe',
    hemiSkyColor: '#60a5fa',
    hemiGroundColor: '#dbeafe',
    hemiIntensity: 0.38,
    envSkyColor: '#7dd3fc',
    envGroundColor: '#dbeafe',
    envTintStrength: 0.22,
    ambientIntensity: 0.28,
    exposure: 0.90,
    rimLightPos: [-2.4, 1.8, -2.6]
  },
  {
    id: 'highrise',
    name: 'Cozy Desk',
    subtitle: 'Warm Study & Lamp',
    lightAngle: 42,
    lightIntensity: 0.62,
    rimIntensity: 0.44,
    windStrength: 0.25,
    keyColor: '#ffedd5',
    rimColor: '#fdba74',
    hemiSkyColor: '#fed7aa',
    hemiGroundColor: '#7c2d12',
    hemiIntensity: 0.52,
    envSkyColor: '#fed7aa',
    envGroundColor: '#9a3412',
    envTintStrength: 0.28,
    ambientIntensity: 0.42,
    exposure: 0.90,
    rimLightPos: [-2.2, 2.4, -2.8]
  },
  {
    id: 'ar',
    name: 'AR View',
    subtitle: 'Live Camera',
    lightAngle: -32,
    lightIntensity: 0.54,
    rimIntensity: 0.42,
    windStrength: 0.80,
    keyColor: '#fffdf7',
    rimColor: '#67e8f9',
    hemiSkyColor: '#e0f2fe',
    hemiGroundColor: '#475569',
    hemiIntensity: 0.40,
    envSkyColor: '#e0f2fe',
    envGroundColor: '#64748b',
    envTintStrength: 0.22,
    ambientIntensity: 0.28,
    exposure: 0.90,
    rimLightPos: [-2.2, 2.4, -3.0]
  }
];

const ALLOWED_ENV_IDS = new Set(ENVIRONMENT_PRESETS.map((e) => e.id));

export function sanitizeEnvId(val, fallback = 'studio') {
  if (typeof val === 'string' && ALLOWED_ENV_IDS.has(val)) {
    return val;
  }
  return fallback;
}

// ============================================================================
// 1. CLOUD SKY SHADERS (360° Blue Sky & Fluffy Cloud Sea — Zero Grass)
// ============================================================================

const MEADOW_SKY_VERTEX_SHADER = /* glsl */ `
  uniform vec3 uSunDir;
  varying vec3 vWorldDir;
  varying vec4 vClipPos;
  varying vec2 vSunNDC;
  varying float vSunForward;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldDir = position;
    vClipPos = projectionMatrix * viewMatrix * wp;
    vec3 sunWorldPos = normalize(uSunDir) * 48.0;
    vec4 sunViewPos = viewMatrix * modelMatrix * vec4(sunWorldPos, 1.0);
    vSunForward = -sunViewPos.z / max(1.0, length(sunViewPos.xyz));
    vec4 sunClip = projectionMatrix * sunViewPos;
    vSunNDC = sunClip.xy / max(0.001, abs(sunClip.w));
    gl_Position = vClipPos;
  }
`;

const MEADOW_SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uWindStrength;
  uniform vec3 uSunDir;
  varying vec3 vWorldDir;
  varying vec4 vClipPos;
  varying vec2 vSunNDC;
  varying float vSunForward;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm5(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += amp * valueNoise(p);
      p = rot * p * 2.02 + vec2(17.3, 9.1);
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float y = dir.y;
    vec3 sunDir = normalize(uSunDir);
    float sunDot = max(0.0, dot(dir, sunDir));

    vec3 deepZenith = vec3(0.10, 0.32, 0.85);
    vec3 midCerulean = vec3(0.24, 0.62, 0.96);
    vec3 softAzure = vec3(0.58, 0.85, 0.99);
    vec3 horizonGlow = vec3(0.88, 0.96, 1.0);

    float skyElev = clamp(abs(y), 0.0, 1.0);
    vec3 sky = mix(horizonGlow, softAzure, smoothstep(0.0, 0.18, skyElev));
    sky = mix(sky, midCerulean, smoothstep(0.14, 0.52, skyElev));
    sky = mix(sky, deepZenith, pow(skyElev, 1.15));

    if (y < 0.0) {
      vec3 lowerSky = mix(horizonGlow, vec3(0.42, 0.73, 0.96), smoothstep(0.0, 0.85, -y));
      sky = lowerSky;
    }

    // 3D orthonormal tangent frame around sunDir for volumetric 3D solar rays
    vec3 sunRight = normalize(cross(vec3(0.0, 1.0, 0.0), sunDir) + vec3(1e-4, 0.0, 0.0));
    vec3 sunUp = cross(sunDir, sunRight);
    float rayAngle = atan(dot(dir, sunUp), dot(dir, sunRight));
    float camTwist = (vSunNDC.x * 0.65 - vSunNDC.y * 0.45);
    float godRays = 0.5 + 0.5 * sin(rayAngle * 10.0 + camTwist + uTime * 0.18) * cos(rayAngle * 6.0 - camTwist * 0.8 - uTime * 0.12);
    float starNeedles = pow(max(0.0, cos(rayAngle * 4.0 + camTwist * 0.7)), 18.0) * pow(sunDot, 22.0);
    sky += vec3(1.0, 0.94, 0.76) * pow(sunDot, 5.5) * (0.28 + 0.14 * godRays);
    sky += vec3(1.0, 0.97, 0.86) * (pow(sunDot, 36.0) * 0.65 + starNeedles * 0.55);
    sky += vec3(1.0, 0.99, 0.95) * smoothstep(0.9965, 0.9994, sunDot) * 1.45;

    float driftSpeed = 0.012 * (0.5 + 0.5 * uWindStrength);

    if (y > -0.05) {
      float projY = max(0.04, y + 0.20);
      vec2 skyUV = dir.xz / projY;

      float cirrus = fbm5(skyUV * vec2(0.8, 2.1) + vec2(uTime * driftSpeed * 0.5, 4.2));
      float cirrusMask = smoothstep(0.58, 0.82, cirrus) * smoothstep(0.02, 0.35, y) * 0.38;
      sky = mix(sky, vec3(0.99, 0.995, 1.0), cirrusMask);

      vec2 cumUV = skyUV * 1.12 + vec2(uTime * driftSpeed, -uTime * driftSpeed * 0.45);
      float warp = fbm5(cumUV * 0.85 + vec2(3.1, 7.4));
      float cBase = fbm5(cumUV + warp * 0.35);
      float cDetail = fbm5(cumUV * 2.3 - vec2(uTime * driftSpeed * 0.7, 0.0));
      float cloudDensity = smoothstep(0.44, 0.72, cBase * 0.74 + cDetail * 0.26);
      cloudDensity *= smoothstep(-0.04, 0.14, y);

      float topGrad = clamp(0.54 + 0.46 * (cBase - cDetail * 0.52) + 0.35 * sunDot, 0.0, 1.0);
      float silverLining = pow(sunDot, 6.0) * smoothstep(0.44, 0.62, cBase) * (1.0 - smoothstep(0.62, 0.78, cBase));
      vec3 cloudBright = vec3(1.0, 0.99, 0.97) + vec3(1.0, 0.93, 0.78) * silverLining * 0.85;
      vec3 cloudMid = vec3(0.87, 0.93, 0.99);
      vec3 cloudUnder = vec3(0.68, 0.80, 0.94);
      vec3 cloudColor = mix(cloudUnder, cloudMid, smoothstep(0.2, 0.55, topGrad));
      cloudColor = mix(cloudColor, cloudBright, smoothstep(0.5, 0.92, topGrad));

      sky = mix(sky, cloudColor, cloudDensity * 0.93);
    }

    // Lower Hemisphere Billowing Cloud Sea (Floating Above the Clouds — Zero Grass!)
    if (y < 0.08) {
      float seaMask = smoothstep(0.08, -0.06, y);
      vec2 seaUV = dir.xz / max(0.16, -y + 0.22) * 1.35 + vec2(uTime * driftSpeed * 0.85, -uTime * driftSpeed * 0.35);

      float puff1 = fbm5(seaUV);
      float puff2 = fbm5(seaUV * 2.15 + vec2(5.2, -3.7));
      float puffs = puff1 * 0.72 + puff2 * 0.28;

      float cloudCover = smoothstep(0.32, 0.68, puffs);
      float sunCrest = smoothstep(0.52, 0.84, puff1) * (0.65 + 0.35 * sunDot);

      vec3 valleyBlue = vec3(0.52, 0.78, 0.97);
      vec3 cloudShadowCol = vec3(0.74, 0.85, 0.97);
      vec3 cloudTopWhite = vec3(0.99, 0.99, 1.0);
      vec3 cloudWarmGold = vec3(1.0, 0.96, 0.90);

      vec3 seaCol = mix(valleyBlue, cloudShadowCol, cloudCover);
      seaCol = mix(seaCol, cloudTopWhite, smoothstep(0.42, 0.72, puffs));
      seaCol = mix(seaCol, cloudWarmGold, sunCrest * 0.75);

      float horizonMistBand = exp(-abs(y) * 12.0);
      seaCol = mix(seaCol, vec3(0.94, 0.98, 1.0), horizonMistBand * 0.55);

      sky = mix(sky, seaCol, seaMask);
    }

    gl_FragColor = vec4(sky * 0.94, 1.0);
  }
`;

// 3D Camera-Projected Optical Lens Flare Shader (visible when looking towards the light, with 3D parallax bokeh ghosts)
const MEADOW_LENS_FLARE_VERTEX_SHADER = /* glsl */ `
  uniform vec3 uSunDir;
  varying vec2 vNdc;
  varying vec2 vSunNDC;
  varying float vSunForward;
  void main() {
    vNdc = position.xy;
    vec3 sunWorldPos = normalize(uSunDir) * 48.0;
    vec4 sunViewPos = viewMatrix * vec4(sunWorldPos, 1.0);
    vSunForward = -sunViewPos.z / max(1.0, length(sunViewPos.xyz));
    vec4 sunClip = projectionMatrix * sunViewPos;
    vSunNDC = sunClip.xy / max(0.001, abs(sunClip.w));
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const MEADOW_LENS_FLARE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec2 vNdc;
  varying vec2 vSunNDC;
  varying float vSunForward;

  // Soft 6-blade hexagonal camera aperture bokeh disc (filled & dreamy, zero harsh rings)
  float softBokehGhost(vec2 p, vec2 center, float radius, float rot) {
    vec2 dVec = (p - center) / max(0.001, radius);
    float r = length(dVec);
    float ang = atan(dVec.y, dVec.x) + rot;
    float hexR = r * (0.94 + 0.06 * cos(ang * 6.0));
    float core = pow(max(0.0, 1.0 - hexR), 1.6) * 0.72;
    float feather = smoothstep(0.60, 0.92, hexR) * (1.0 - smoothstep(0.92, 1.04, hexR)) * 0.22;
    return core + feather;
  }

  void main() {
    // Only visible when the camera is looking towards the 3D light source
    if (vSunForward <= 0.12) {
      discard;
    }
    vec2 aspect = vec2(1.55, 1.0);
    vec2 p = vNdc * aspect;
    vec2 sunP = vSunNDC * aspect;

    float offAxis = length(vSunNDC);
    // Smooth angular fade as the 3D sun enters/exits the camera frustum
    float frustumVis = smoothstep(0.12, 0.55, vSunForward) * (1.0 - smoothstep(0.75, 1.55, offAxis));
    // Partial occlusion when the sun passes directly behind Mochi-Puff's body at center of frame, blooming as it peeks past his ears
    float mochiOcclusion = 0.22 + 0.78 * smoothstep(0.10, 0.34, offAxis);
    float flareVis = frustumVis * mochiOcclusion;

    if (flareVis <= 0.002) {
      discard;
    }

    vec2 toSun = p - sunP;
    float dSun = length(toSun);
    float sAng = atan(toSun.y, toSun.x);
    float camRoll = vSunNDC.x * 1.15 - vSunNDC.y * 0.75;

    // 1. 3D Solar Core Bloom, Rotating Diffraction Starburst Needles & Subtle Anamorphic Glint
    float sunBloom = exp(-dSun * 3.0) * 0.28 + exp(-dSun * 10.5) * 0.38;
    float needles8 = pow(max(0.0, cos(sAng * 4.0 + camRoll)), 20.0) * exp(-dSun * 4.2) * 0.30;
    float needles12 = pow(max(0.0, cos(sAng * 6.0 - camRoll * 0.6 + uTime * 0.15)), 28.0) * exp(-dSun * 5.5) * 0.18;
    float anamorphic = exp(-abs(toSun.y) * 32.0) * exp(-abs(toSun.x) * 2.6) * 0.18;

    // 2. 3D Counter-Parallax Bokeh Ghost Chain pivoting through the optical center (0, 0)
    float g1 = softBokehGhost(p, sunP *  0.52, 0.095, camRoll * 0.5);
    float g2 = softBokehGhost(p, sunP *  0.16, 0.055, -camRoll * 0.4);
    float g3 = softBokehGhost(p, sunP * -0.24, 0.125, camRoll * 0.6);
    float g4 = softBokehGhost(p, sunP * -0.58, 0.080, -camRoll * 0.5);
    float g5 = softBokehGhost(p, sunP * -0.94, 0.175, camRoll * 0.7);
    float g6 = softBokehGhost(p, sunP * -1.28, 0.110, -camRoll * 0.3);

    vec3 flareCol = vec3(1.0, 0.94, 0.80) * (sunBloom + needles8 + needles12)
                  + vec3(0.90, 0.96, 1.0) * anamorphic
                  + vec3(1.0, 0.90, 0.72) * g1 * 0.24
                  + vec3(0.76, 0.96, 0.92) * g2 * 0.26
                  + vec3(1.0, 0.80, 0.88) * g3 * 0.22
                  + vec3(0.78, 0.88, 1.0) * g4 * 0.24
                  + vec3(1.0, 0.93, 0.78) * g5 * 0.19
                  + vec3(0.88, 0.82, 1.0) * g6 * 0.16;

    gl_FragColor = vec4(flareCol * flareVis, 1.0);
  }
`;

// ============================================================================
// 2. LOOP 13–17: COZY HOME DESK & TILT-SHIFT TWILIGHT MOUNTAIN VALLEY SHADERS
// ============================================================================

const CITY_SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vWorldDir = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// Loop 13: High-Elevation Twilight Sunset Clouds, Misty Mountain Ridges &
// 4-Layer Tilt-Shift Bokeh Hillside City Lights
const CITY_SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldDir;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm4(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += amp * valueNoise(p);
      p = rot * p * 2.03 + vec2(11.7, 5.3);
      amp *= 0.5;
    }
    return v;
  }

  // Creamy Tilt-Shift Bokeh Circle-of-Confusion Layer with Slow Meditative Pulse
  vec3 bokehLayer(vec2 uv, float scale, float density, float radius, float seedOffset, float time) {
    vec2 g = uv * scale;
    vec2 cell = floor(g);
    vec2 f = fract(g) - 0.5;
    vec3 accum = vec3(0.0);

    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 neighbor = vec2(float(i), float(j));
        vec2 cId = cell + neighbor;
        float h = hash21(cId + seedOffset);
        if (h > density) {
          vec2 jitter = (vec2(fract(h * 17.3), fract(h * 31.7)) - 0.5) * 0.72;
          vec2 delta = f - neighbor - jitter;
          // Slight optical cat-eye / oval bokeh stretch
          float d = length(delta * vec2(1.0, 1.12));

          // Slow breathing pulse per bokeh orb (period ~9–12 seconds)
          float slowPulse = 0.5 + 0.5 * sin(time * 0.62 + h * 62.83 + sin(time * 0.27 + h * 19.1) * 0.65);
          float r = radius * (0.54 + 0.74 * fract(h * 11.1)) * (0.85 + 0.25 * slowPulse);

          // Authentic lens aperture disc with subtle bright outer bokeh ring
          float inner = 1.0 - smoothstep(r * 0.68, r, d);
          float outerRim = 0.72 + 0.42 * smoothstep(r * 0.25, r * 0.82, d);
          float disc = inner * outerRim;
          float twinkle = 0.28 + 1.02 * slowPulse;

          vec3 warmGold   = vec3(1.0, 0.79, 0.40);
          vec3 honeyAmber = vec3(0.99, 0.54, 0.22);
          vec3 rosePeach  = vec3(1.0, 0.68, 0.64);
          vec3 iceBlue    = vec3(0.76, 0.90, 1.0);

          float cPick = fract(h * 23.7);
          vec3 bCol = warmGold;
          if (cPick < 0.46) bCol = warmGold;
          else if (cPick < 0.78) bCol = honeyAmber;
          else if (cPick < 0.91) bCol = rosePeach;
          else bCol = iceBlue;

          accum += bCol * disc * twinkle * (0.65 + 0.65 * fract(h * 43.1));
        }
      }
    }
    return accum;
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float y = dir.y;
    float az = atan(dir.x, -dir.z); // 0 directly out the window (-Z)

    // 1. Dusk Blue-Hour & Rose-Coral Sunset Sky (High in the Window)
    vec3 nightZenith   = vec3(0.06, 0.09, 0.18);
    vec3 twilightSlate = vec3(0.16, 0.23, 0.37);
    vec3 lavenderDusk  = vec3(0.45, 0.36, 0.54);
    vec3 roseSunset    = vec3(0.86, 0.48, 0.58);
    vec3 warmApricot   = vec3(0.95, 0.64, 0.54);

    float skyT = clamp((y - 0.16) / 0.58, 0.0, 1.0);
    vec3 col = mix(warmApricot, roseSunset, smoothstep(0.0, 0.22, skyT));
    col = mix(col, lavenderDusk, smoothstep(0.18, 0.46, skyT));
    col = mix(col, twilightSlate, smoothstep(0.40, 0.74, skyT));
    col = mix(col, nightZenith, smoothstep(0.68, 1.0, skyT));

    // Dramatic layered dusk cloud bands sweeping across the sunset sky
    if (y > 0.10) {
      vec2 duskUV = vec2(az * 2.4, (y - 0.10) * 7.2);
      float c1 = fbm4(duskUV + vec2(uTime * 0.005, 0.0));
      float c2 = fbm4(duskUV * 1.85 - vec2(uTime * 0.003, 1.4));

      // Glowing pink-salmon sunset undersides
      float pinkBand = exp(-pow((y - 0.31) * 6.2, 2.0));
      vec3 litCloud = mix(vec3(0.96, 0.58, 0.62), vec3(1.0, 0.74, 0.64), c1);
      col = mix(col, litCloud, smoothstep(0.32, 0.68, c1) * pinkBand * 0.82);

      // Dark blue-slate silhouette cloud billows floating in front of the pink glow
      vec3 darkBillow = mix(vec3(0.15, 0.20, 0.33), vec3(0.24, 0.26, 0.40), c1);
      float darkMask = smoothstep(0.47, 0.76, c2) * smoothstep(0.14, 0.58, y);
      col = mix(col, darkBillow, darkMask * 0.68);
    }

    // 2. High-Elevation Misty Mountain Valley Silhouettes (Positioned prominently in window view)
    // Far mountain range peaking around y = 0.28..0.36
    float farRidge =
      0.27 +
      0.065 * sin(az * 2.1 - 0.55) +
      0.042 * cos(az * 3.6 + 1.2) +
      0.014 * fbm4(vec2(az * 7.5, 1.0));

    // Near/Mid mountain slopes framing left & right, dipping into a deep valley saddle at center-left
    float valleySaddle = 1.0 - 0.48 * exp(-pow((az + 0.12) * 2.3, 2.0));
    float midRidge =
      (0.28 * valleySaddle) +
      0.075 * sin(az * 2.5 + 0.85) +
      0.032 * cos(az * 4.8 - 0.5) +
      0.011 * fbm4(vec2(az * 9.5, 2.5));

    // Distant hazy blue mountain layer
    if (y < farRidge) {
      float farMask = smoothstep(farRidge, farRidge - 0.015, y);
      float farDepth = clamp((farRidge - y) * 5.0, 0.0, 1.0);
      vec3 farMtnCol = mix(vec3(0.20, 0.27, 0.43), vec3(0.13, 0.19, 0.33), farDepth);
      col = mix(col, farMtnCol, farMask);
    }

    // Main mountain valley bowl & cascading hillside city lights
    if (y < midRidge) {
      float midMask = smoothstep(midRidge, midRidge - 0.014, y);
      float slopeDepth = clamp((midRidge - y) * 2.6, 0.0, 1.0);
      vec3 valleyBase = mix(vec3(0.11, 0.16, 0.29), vec3(0.045, 0.068, 0.14), slopeDepth);

      // Perspective mapping across the valley hillsides (stretching from y = midRidge down to y = -0.25)
      float vDrop = max(0.005, midRidge - y);
      vec2 valleyUV = vec2(az / (0.32 + vDrop * 0.85) * 1.45, log(1.0 + vDrop * 6.5) * 1.35);

      // Organic town & hillside neighborhood density map
      float townDensity = fbm4(valleyUV * 1.5 + vec2(1.7, 0.9));
      float bowlMask = smoothstep(0.006, 0.045, vDrop) *
                       smoothstep(0.16, 0.62, townDensity + 0.32 * (1.0 - abs(az * 0.85)));

      // Slow valley-wide breathing pulse wave for the background environment lights
      float valleyPulseWave = 0.74 + 0.26 * sin(uTime * 0.52 - valleyUV.x * 1.2 + valleyUV.y * 0.8);

      // Warm golden-amber & misty blue atmospheric town glow on the mountain slopes
      valleyBase += vec3(0.36, 0.21, 0.16) * bowlMask * 0.46 * valleyPulseWave;
      valleyBase += vec3(0.12, 0.20, 0.35) * exp(-abs(vDrop - 0.11) * 12.0) * 0.38;

      // Loop 22: Drifting Blue-Violet Valley Twilight Mist Bands & Terraced Hillside Contours
      float mistBand1 = exp(-pow((vDrop - 0.065 + 0.015 * sin(az * 4.0 + uTime * 0.02)) * 22.0, 2.0));
      float mistBand2 = exp(-pow((vDrop - 0.155 - 0.018 * cos(az * 3.2 - uTime * 0.015)) * 18.0, 2.0));
      valleyBase = mix(valleyBase, vec3(0.18, 0.25, 0.42), (mistBand1 * 0.36 + mistBand2 * 0.28) * bowlMask);

      // Loop 22: Micro-Scale Lit Hillside Chalet Window Grids & Terraced Retaining Walls (slowly pulsing circular motes)
      vec2 chaletGrid = valleyUV * vec2(68.0, 42.0);
      vec2 chaletCell = floor(chaletGrid);
      vec2 chaletF = fract(chaletGrid);
      float chaletHash = hash21(chaletCell);
      vec2 chaletCenter = vec2(0.5) + (vec2(fract(chaletHash * 13.7), fract(chaletHash * 29.3)) - 0.5) * 0.36;
      float chaletDist = length(chaletF - chaletCenter);
      float chaletWindow =
        step(0.68, chaletHash) *
        smoothstep(0.28, 0.04, chaletDist);
      vec3 chaletCol = mix(vec3(1.0, 0.76, 0.38), vec3(1.0, 0.90, 0.68), fract(chaletHash * 19.3));
      float chaletPulse = 0.30 + 0.70 * (0.5 + 0.5 * sin(uTime * 0.58 + chaletHash * 40.0));
      valleyBase += chaletCol * chaletWindow * bowlMask * chaletPulse * 0.85;

      // Winding illuminated hillside roads / arterial switchback avenues with slowly pulsing streetlamp beads
      float roadWave1 = abs(sin(valleyUV.x * 3.2 + sin(valleyUV.y * 2.6) * 0.8) * 0.25 + valleyUV.y * 0.35 - 0.42);
      float roadWave2 = abs(cos(valleyUV.x * 2.4 - valleyUV.y * 1.9) * 0.22 - 0.18);
      float roadGlow = (exp(-roadWave1 * 28.0) + exp(-roadWave2 * 24.0)) * bowlMask;
      float streetLampBeads = 0.75 + 0.25 * sin(valleyUV.x * 95.0 + valleyUV.y * 65.0);
      valleyBase += vec3(1.0, 0.68, 0.32) * roadGlow * streetLampBeads * 0.48 * valleyPulseWave;

      // 4-Tier Multi-Scale Tilt-Shift Bokeh Orbs (fine distant pinpoints -> large creamy foreground bokeh discs)
      vec3 bokehMicro = bokehLayer(valleyUV, 36.0, 0.34, 0.33, 1.3, uTime);
      vec3 bokehSmall = bokehLayer(valleyUV, 20.0, 0.44, 0.38, 5.7, uTime);
      vec3 bokehMed   = bokehLayer(valleyUV, 10.5, 0.56, 0.43, 13.9, uTime);
      vec3 bokehLarge = bokehLayer(valleyUV, 5.2,  0.68, 0.47, 27.4, uTime) * smoothstep(0.04, 0.24, vDrop);

      vec3 totalBokeh = (
        bokehMicro * 0.42 +
        bokehSmall * 0.62 +
        bokehMed   * 0.85 +
        bokehLarge * 1.15
      ) * bowlMask * valleyPulseWave;

      valleyBase += totalBokeh;
      col = mix(col, valleyBase, midMask);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const HIGHRISE_FLOOR_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec2 vLocalXZ;
  void main() {
    vLocalXZ = position.xz;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// Loop 14: Macro Satin-Walnut Desktop Shader with Multi-Candle Caustics, Prop AO & Sky Fresnel
const HIGHRISE_FLOOR_FRAGMENT_SHADER = /* glsl */ `
  uniform vec2 uCreatureXZ;
  uniform float uShadowScale;
  uniform float uCreatureLift;
  uniform vec2 uCreatureSquash;
  uniform vec2 uCreatureRot;
  uniform vec3 uKeyLightDir;
  uniform float uKeyLightIntensity;
  uniform vec3 uKeyLightColor;
  uniform float uFurLength;
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec2 vLocalXZ;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // Closest normalized distance from a 3D ray (ro, rd) to an ellipsoid (center, radii)
  float rayEllipsoidDist(vec3 ro, vec3 rd, vec3 center, vec3 radii, out float hitT) {
    vec3 o = (ro - center) / radii;
    vec3 d = rd / radii;
    float dLen = max(1e-5, length(d));
    vec3 dn = d / dLen;
    float tProj = max(0.0, -dot(o, dn));
    hitT = tProj / dLen;
    return length(o + dn * tProj);
  }

  // Evaluates Mochi-Puff's 3D anatomical silhouette shadow (pear body, cheeks, perky ears, arms & fur coat)
  // cast onto world desk point P_desk along light direction L_dir
  float traceMochiCastShadow(vec3 P_desk, vec3 L_dir, float basePenumbra) {
    vec3 C_mochi = vec3(uCreatureXZ.x, -0.705 + uCreatureLift, uCreatureXZ.y);
    vec3 sq = max(vec3(0.08), 0.25 * vec3(uCreatureSquash.x, uCreatureSquash.y, uCreatureSquash.x));
    vec3 ro = (P_desk - C_mochi) / sq;
    vec3 rd = normalize(L_dir / sq);

    // Transform light ray into Mochi's live tilted & rotated local coordinate frame
    float cz = cos(-uCreatureRot.y);
    float sz = sin(-uCreatureRot.y);
    ro.xy = mat2(cz, -sz, sz, cz) * ro.xy;
    rd.xy = mat2(cz, -sz, sz, cz) * rd.xy;

    float cy = cos(-uCreatureRot.x);
    float sy = sin(-uCreatureRot.x);
    ro.xz = mat2(cy, -sy, sy, cy) * ro.xz;
    rd.xz = mat2(cy, -sy, sy, cy) * rd.xz;

    float furPad = clamp(uFurLength, 0.05, 0.65) * 0.72;

    // 1. Chubby pear lower belly & cheeks + rounded crown
    float tBelly, tHead;
    float dBelly = rayEllipsoidDist(
      ro, rd,
      vec3(0.0, -0.18, 0.04),
      vec3(1.20 + furPad, 0.78 + furPad * 0.85, 1.04 + furPad),
      tBelly
    );
    float dHead = rayEllipsoidDist(
      ro, rd,
      vec3(0.0, 0.24, 0.0),
      vec3(1.00 + furPad, 0.82 + furPad, 0.94 + furPad),
      tHead
    );
    float dBody = smin(dBelly, dHead, 0.22);
    float hitT = mix(tBelly, tHead, 0.5);

    // 2. Perky sculpted top-left and top-right ears (tilted outward)
    vec3 roEL = ro - vec3(-0.50, 0.90, 0.05);
    vec3 rdEL = rd;
    roEL.xy = mat2(0.90, -0.43, 0.43, 0.90) * roEL.xy;
    rdEL.xy = mat2(0.90, -0.43, 0.43, 0.90) * rdEL.xy;
    float tEL;
    float dEarL = rayEllipsoidDist(
      roEL, rdEL,
      vec3(0.0),
      vec3(0.28 + furPad * 0.50, 0.48 + furPad * 0.60, 0.25 + furPad * 0.50),
      tEL
    );

    vec3 roER = ro - vec3(0.50, 0.90, 0.05);
    vec3 rdER = rd;
    roER.xy = mat2(0.90, 0.43, -0.43, 0.90) * roER.xy;
    rdER.xy = mat2(0.90, 0.43, -0.43, 0.90) * rdER.xy;
    float tER;
    float dEarR = rayEllipsoidDist(
      roER, rdER,
      vec3(0.0),
      vec3(0.28 + furPad * 0.50, 0.48 + furPad * 0.60, 0.25 + furPad * 0.50),
      tER
    );

    // 3. Cute stubby side arms
    float tAL, tAR;
    float dArmL = rayEllipsoidDist(
      ro, rd,
      vec3(-1.12, -0.08, 0.22),
      vec3(0.32 + furPad * 0.45, 0.24 + furPad * 0.45, 0.26 + furPad * 0.45),
      tAL
    );
    float dArmR = rayEllipsoidDist(
      ro, rd,
      vec3(1.12, -0.08, 0.22),
      vec3(0.32 + furPad * 0.45, 0.24 + furPad * 0.45, 0.26 + furPad * 0.45),
      tAR
    );

    float dEars = min(dEarL, dEarR);
    float dArms = min(dArmL, dArmR);
    if (dEars < dBody) hitT = min(tEL, tER);

    float dMochi = smin(dBody, dEars, 0.16);
    dMochi = smin(dMochi, dArms, 0.14);

    // Soft optical penumbra increasing smoothly along the cast ray
    vec3 hitPos = ro + rd * hitT;
    float tuftAngle = atan(hitPos.y + 0.15, hitPos.x);
    float furFringe = 0.022 * sin(tuftAngle * 32.0) + 0.012 * cos(tuftAngle * 54.0 + 1.2);
    float penumbra = basePenumbra + 0.11 * clamp(hitT, 0.0, 3.2) + furPad * 0.26;

    float coreUmbra = 1.0 - smoothstep(0.55, 0.98 + penumbra * 0.55, dMochi);
    float coatPenumbra = 1.0 - smoothstep(0.75 - penumbra * 0.35, 1.12 + penumbra * 0.75, dMochi + furFringe);
    float distAtten = 1.0 / (1.0 + 0.14 * hitT * hitT + uCreatureLift * 2.4);

    return (coreUmbra * 0.58 + coatPenumbra * 0.42) * distAtten;
  }

  // Soft elliptical ambient occlusion helper for desk props
  float propAO(vec2 xz, vec2 center, vec2 radii, float strength) {
    vec2 d = (xz - center) / radii;
    return 1.0 - strength * exp(-dot(d, d) * 1.8);
  }

  void main() {
    vec2 xz = vWorldPos.xz;

    // 1. Macro-Scale Satin Walnut / Warm Oak Desktop Wood Grain
    float plankY = xz.y * 0.95;
    float boardId = floor(plankY);
    float seam = smoothstep(0.0, 0.012, fract(plankY)) * smoothstep(1.0, 0.988, fract(plankY));

    float cathedral = sin(xz.y * 14.0 + sin(xz.x * 1.8 + boardId * 2.1) * 2.4) * 0.5 + 0.5;
    float finePore  = sin(xz.y * 75.0 + sin(xz.x * 9.5) * 0.9) * 0.5 + 0.5;
    float rayFleck  = sin(xz.x * 28.0 + xz.y * 6.0) * 0.5 + 0.5;

    vec3 walnutDark = vec3(0.22, 0.13, 0.085);
    vec3 walnutMid  = vec3(0.36, 0.22, 0.145);
    vec3 walnutGold = vec3(0.48, 0.30, 0.195);

    vec3 deskCol = mix(walnutDark, walnutMid, cathedral * 0.72 + finePore * 0.18 + rayFleck * 0.10);
    deskCol = mix(deskCol, walnutGold, hash21(vec2(boardId, 3.0)) * 0.25);
    deskCol *= (0.88 + 0.12 * seam);

    // 2. Evaluate Mochi-Puff's Subtle Contact Shadow & Single Key-Light Cast Shadow (~50% softer)
    vec3 P_desk = vec3(xz.x, -0.942, xz.y);
    float furScale = 1.0 + clamp(uFurLength, 0.05, 0.65) * 0.45;
    vec2 relXZ = xz - uCreatureXZ;
    vec2 baseEll = relXZ / vec2(0.31 * uCreatureSquash.x * furScale, 0.25 * uCreatureSquash.x * furScale);
    float baseR2 = dot(baseEll, baseEll);
    float liftAtten = 1.0 / (1.0 + uCreatureLift * 5.0);

    // Gentle, non-aggressive contact shadow tucked right under Mochi's base
    float mochiContactAO = 0.26 * exp(-baseR2 * 2.10) * liftAtten;

    // Single directional cast shadow from the Key Light (~50% less strong for a natural soft shadow)
    vec3 keyRayDir = normalize(vec3(uKeyLightDir.x, max(0.28, uKeyLightDir.y * 0.62), uKeyLightDir.z));
    float keyLightFactor = clamp(uKeyLightIntensity * 0.28, 0.10, 0.44);
    float keyCastShadow = traceMochiCastShadow(P_desk, keyRayDir, 0.16) * keyLightFactor;

    float totalMochiShadow = clamp(max(mochiContactAO, keyCastShadow), 0.0, 0.46);

    // 3. Warm Flickering Candlelight Pools & Cut-Glass Votive Caustic Shimmer
    float flk1 = 0.95 + 0.05 * sin(uTime * 6.4 + 0.8);
    float flk2 = 0.95 + 0.05 * cos(uTime * 5.2 + 2.3);

    vec2 rightCluster = vec2(0.80, -0.64);
    vec2 leftCluster  = vec2(-1.28, -0.88);
    float dRight = length(xz - rightCluster);
    float dLeft  = length(xz - leftCluster);

    // Subtle radial cut-glass caustic rays around the votive candle holders
    float angR = atan(xz.y - rightCluster.y, xz.x - rightCluster.x);
    float causticR = (0.82 + 0.18 * sin(angR * 18.0 + uTime * 1.2)) * exp(-dRight * 0.65) * flk1;
    causticR *= (1.0 - totalMochiShadow * 0.55);

    float angL = atan(xz.y - leftCluster.y, xz.x - leftCluster.x);
    float causticL = (0.84 + 0.16 * cos(angL * 16.0 - uTime * 1.1)) * exp(-dLeft * 0.68) * flk2;
    float sillWarmth = exp(-pow(xz.y + 2.65, 2.0) * 0.42) * (1.0 - smoothstep(0.0, 5.5, abs(xz.x)));

    float warmPool = causticR * 1.25 + causticL * 1.05 + sillWarmth * 0.92;
    deskCol *= (0.46 + 0.82 * clamp(warmPool, 0.0, 1.45));
    deskCol += vec3(0.62, 0.30, 0.09) * pow(clamp(warmPool, 0.0, 1.25), 1.35) * 0.68 * (1.0 - totalMochiShadow * 0.50);

    // 4. Soft Dusk Pink-Blue Window Sky Reflection on Satin Wood Varnish
    float skyFresnel = exp(-pow(xz.y + 1.65, 2.0) * 0.22) * (1.0 - smoothstep(0.0, 5.2, abs(xz.x)));
    deskCol += mix(vec3(0.14, 0.18, 0.32), vec3(0.28, 0.16, 0.24), smoothstep(-3.0, 2.0, xz.x)) * skyFresnel * 0.42 * (1.0 - totalMochiShadow * 0.45);

    // 5. Soft Contact Ambient Occlusion Under Desk Props (Monitor, Keyboard, Single Mug, Magazine, Caddy, Book Stack)
    float ao = 1.0;
    ao *= propAO(xz, vec2(1.18, -1.52), vec2(0.58, 0.45), 0.52); // Monitor stand foot
    ao *= propAO(xz, vec2(0.76, -0.58), vec2(0.78, 0.32), 0.48); // Wireless keyboard
    ao *= propAO(xz, vec2(1.32, -0.18), vec2(0.22, 0.28), 0.42); // Wireless mouse
    ao *= propAO(xz, vec2(-1.14, -0.44), vec2(0.40, 0.40), 0.55); // Single coffee mug & saucer
    ao *= propAO(xz, vec2(-0.52, -1.24), vec2(0.62, 0.44), 0.45); // Open book
    ao *= propAO(xz, vec2(-0.55, -2.15), vec2(0.72, 0.44), 0.50); // Wooden desk caddy
    ao *= propAO(xz, vec2(1.85, -1.48),  vec2(0.55, 0.42), 0.46); // Hardcover book stack
    ao *= propAO(xz, vec2(-1.85, -1.45), vec2(0.45, 0.45), 0.50); // Left planter pot
    deskCol *= ao;

    // 6. Apply Mochi-Puff's Soft Cast & Contact Shadow + Key Light Color Tint
    float cDist = length(xz - uCreatureXZ) / max(0.08, uShadowScale);
    float contactShadow = 1.0 - totalMochiShadow;
    deskCol *= mix(vec3(1.0), uKeyLightColor * 1.08, clamp(uKeyLightIntensity * 0.25, 0.0, 0.45) * contactShadow);
    vec3 shadowedWalnut = deskCol * vec3(0.24, 0.20, 0.25);
    deskCol = mix(shadowedWalnut, deskCol, contactShadow);

    // 7. Subtle Front Desk Edge Highlight & Tilt-Shift Macro Vignette
    float frontEdge = exp(-pow(xz.y - 2.35, 2.0) * 18.0);
    deskCol += vec3(0.24, 0.14, 0.08) * frontEdge * 0.35;

    float edgeDist = length((xz - vec2(0.0, -0.5)) * vec2(0.11, 0.18));
    deskCol *= (1.0 - 0.38 * smoothstep(0.55, 1.25, edgeDist));

    gl_FragColor = vec4(deskCol, 1.0);
  }
`;

const HIGHRISE_GLASS_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const HIGHRISE_GLASS_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    // Warm double-pane interior candle reflection ghosting in the window glass (matching right pane in photo)
    float ghostFlame1 = exp(-length((vUv - vec2(0.76, 0.36)) * vec2(14.0, 18.0)));
    float ghostFlame2 = exp(-length((vUv - vec2(0.79, 0.36)) * vec2(16.0, 20.0)));
    float warmSillGlow = exp(-pow(vUv.y - 0.18, 2.0) * 12.0) * (0.4 + 0.6 * smoothstep(0.2, 0.8, vUv.x));
    float diagSheen = smoothstep(0.38, 0.62, sin((vUv.x * 1.4 + vUv.y) * 6.28));

    vec3 glassCol =
      vec3(0.38, 0.55, 0.85) * (0.20 + 0.20 * diagSheen) +
      vec3(1.0, 0.72, 0.35) * warmSillGlow * 0.75 +
      vec3(1.0, 0.88, 0.55) * (ghostFlame1 + ghostFlame2 * 0.85) * 2.2;

    float alpha = 0.018 + diagSheen * 0.012 + warmSillGlow * 0.035 + (ghostFlame1 + ghostFlame2) * 0.35;
    gl_FragColor = vec4(glassCol, alpha);
  }
`;

// Loop 16: Translucent Subsurface Wax Pillar Candle Shader
const CANDLE_WAX_VERTEX_SHADER = /* glsl */ `
  varying float vLocalY;
  varying vec3 vNormal;
  void main() {
    vLocalY = position.y; // [0..1]
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CANDLE_WAX_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying float vLocalY;
  varying vec3 vNormal;

  void main() {
    float flicker = 0.93 + 0.07 * sin(uTime * 6.5 + vLocalY * 4.0);
    vec3 baseCol = vec3(0.48, 0.22, 0.09);
    vec3 midCol  = vec3(0.95, 0.56, 0.20);
    vec3 topGlow = vec3(1.0, 0.93, 0.65);

    vec3 col = mix(baseCol, midCol, smoothstep(0.0, 0.65, vLocalY));
    col = mix(col, topGlow * flicker, smoothstep(0.50, 1.0, vLocalY));
    gl_FragColor = vec4(col, 0.96);
  }
`;

// Loop 16: Filigree / Ribbed Cut-Glass Votive Holder Shader (sparkles like the glass jars in the photo)
const GLASS_VOTIVE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying float vLocalY;
  varying vec3 vNormal;

  void main() {
    float angle = atan(vNormal.x, vNormal.z);
    float facet = sin(angle * 24.0) * cos(vLocalY * 28.0) * 0.5 + 0.5;
    float sparkle = pow(facet, 3.0) * (0.85 + 0.15 * sin(uTime * 7.2 + angle * 5.0));
    float coreFlame = exp(-pow((vLocalY - 0.38) * 2.6, 2.0));

    vec3 amberGlass = vec3(0.78, 0.34, 0.08);
    vec3 goldSparkle = vec3(1.0, 0.88, 0.48);
    vec3 hotCore = vec3(1.0, 0.96, 0.78);

    vec3 col = mix(amberGlass, goldSparkle, sparkle * 0.75 + coreFlame * 0.45);
    col = mix(col, hotCore, coreFlame * sparkle * 0.85);

    float rim = pow(1.0 - abs(vNormal.z), 1.8);
    col += vec3(1.0, 0.72, 0.32) * rim * 0.45;

    gl_FragColor = vec4(col, 0.92);
  }
`;

// Loop 20: Frosted Pleated Table Lamp Shade Shader (warm glowing cylinder lamp on windowsill)
const PLEATED_LAMP_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying float vLocalY;
  varying vec3 vNormal;

  void main() {
    float angle = atan(vNormal.x, vNormal.z);
    float pleat = sin(angle * 36.0) * 0.5 + 0.5;
    float verticalSeam = smoothstep(0.02, 0.06, abs(sin(angle * 2.0)));
    float bulbCore = exp(-pow((vLocalY - 0.46) * 2.2, 2.0));

    vec3 warmCream = vec3(0.96, 0.78, 0.52);
    vec3 hotAmber  = vec3(1.0, 0.94, 0.76);
    vec3 col = mix(warmCream * (0.84 + 0.16 * pleat), hotAmber, bulbCore * 0.75);
    col *= (0.88 + 0.12 * verticalSeam);

    gl_FragColor = vec4(col, 0.96);
  }
`;

// Loop 20: Animated Teardrop Candle Flame Shader (swaying tip + blue-white base + golden core)
const CANDLE_FLAME_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  varying float vFlameY;
  void main() {
    vFlameY = clamp(position.y * 8.0 + 0.5, 0.0, 1.0);
    vec3 pos = position;
    float sway = sin(uTime * 7.8 + modelMatrix[3].x * 4.5 + modelMatrix[3].z * 3.2) * 0.018 * vFlameY;
    pos.x += sway;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const CANDLE_FLAME_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying float vFlameY;
  void main() {
    vec3 blueBase = vec3(0.45, 0.68, 1.0);
    vec3 hotWhite = vec3(1.0, 0.98, 0.88);
    vec3 goldTip  = vec3(1.0, 0.62, 0.16);

    vec3 col = mix(blueBase, hotWhite, smoothstep(0.0, 0.35, vFlameY));
    col = mix(col, goldTip, smoothstep(0.55, 1.0, vFlameY));
    gl_FragColor = vec4(col, 0.95);
  }
`;

// Loop 18: Curling Translucent Espresso Steam Plume Shader
const COFFEE_STEAM_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    float y = vUv.y;
    float wave1 = sin(y * 9.0 - uTime * 2.1) * 0.14 * y;
    float wave2 = cos(y * 14.0 - uTime * 1.6 + 1.4) * 0.09 * y;

    float d1 = abs(vUv.x - 0.46 - wave1);
    float d2 = abs(vUv.x - 0.54 - wave2);

    float wisp1 = exp(-d1 * d1 * 55.0);
    float wisp2 = exp(-d2 * d2 * 65.0) * 0.75;
    float fade = smoothstep(0.0, 0.22, y) * (1.0 - smoothstep(0.55, 1.0, y));

    float alpha = (wisp1 + wisp2) * fade * 0.28;
    if (alpha < 0.01) discard;

    vec3 steamCol = mix(vec3(0.96, 0.84, 0.72), vec3(0.76, 0.82, 0.94), y);
    gl_FragColor = vec4(steamCol, alpha);
  }
`;

// Loop 23: Artisanal Speckled Stoneware & Hand-Dipped Caramel Glaze Shader (highlights 3D Lathe wheel ribs)
const STONEWARE_CERAMIC_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  void main() {
    vLocalPos = position;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const STONEWARE_CERAMIC_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vec3(0.0, -0.59, 1.60) - vWorldPos);

    // Artisanal speckled stoneware clay & hand-dipped caramel top rim glaze
    // Seamless 3D Cartesian coordinates for speckle noise to eliminate any branch-cut seam
    float speckle = step(0.84, hash21(floor(vec2(vLocalPos.x * 24.0 + vLocalPos.z * 16.0, vLocalPos.y * 85.0))));
    float wheelGroove = sin(vLocalPos.y * 72.0) * 0.5 + 0.5;

    vec3 darkStone  = vec3(0.18, 0.14, 0.13);
    vec3 warmUmber  = vec3(0.32, 0.24, 0.21);
    vec3 caramelLip = vec3(0.68, 0.42, 0.24);

    // Hand-dipped organic wavy glaze line: 2*pi-periodic even harmonics so value and slope are identical across seams
    float angle = atan(vLocalPos.z, vLocalPos.x);
    float glazeLine = 0.54 + 0.022 * sin(angle * 2.0) + 0.012 * cos(angle * 4.0);
    float saucerOuter = smoothstep(0.42, 0.49, length(vLocalPos.xz));
    float dipMask = max(smoothstep(glazeLine - 0.04, glazeLine + 0.04, vLocalPos.y), saucerOuter * 0.75);

    vec3 baseCol = mix(darkStone, warmUmber, 0.35 + 0.45 * wheelGroove + 0.20 * N.y);
    baseCol = mix(baseCol, caramelLip, dipMask * 0.82);
    baseCol -= vec3(0.06) * speckle;

    // Multi-directional warm candle lighting + dusk window rim + front specular sheen on every 3D Lathe rib
    vec3 L_leftCandle  = normalize(vec3(-1.35, -0.35, -0.85) - vWorldPos);
    vec3 L_rightCandle = normalize(vec3(1.15, -0.25, -0.42) - vWorldPos);
    vec3 L_frontWarm   = normalize(vec3(-0.35, 0.45, 1.45));

    float diffL = max(0.0, dot(N, L_leftCandle));
    float diffR = max(0.0, dot(N, L_rightCandle));
    float diffF = max(0.0, dot(N, L_frontWarm));

    vec3 H_front = normalize(L_frontWarm + V);
    vec3 H_left  = normalize(L_leftCandle + V);
    float specF = pow(max(0.0, dot(N, H_front)), 38.0);
    float specL = pow(max(0.0, dot(N, H_left)), 28.0);
    float fresnel = pow(1.0 - max(0.0, dot(N, V)), 2.6);

    vec3 col = baseCol * (0.42 + 0.55 * diffF + 0.65 * diffL + 0.45 * diffR);
    col += vec3(1.0, 0.74, 0.38) * (diffL * 0.28 + specL * 0.65);
    col += vec3(0.98, 0.84, 0.68) * specF * 0.58;
    col += vec3(0.55, 0.64, 0.88) * fresnel * 0.34;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Loop 18: Painted Sunset Mountain & Candle Artwork Inside Leaning Framed Prints
const FRAMED_PRINT_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    // Cream matboard border around the artwork
    float matBorder =
      smoothstep(0.08, 0.10, vUv.x) * (1.0 - smoothstep(0.90, 0.92, vUv.x)) *
      smoothstep(0.08, 0.10, vUv.y) * (1.0 - smoothstep(0.90, 0.92, vUv.y));

    vec3 matCol = vec3(0.94, 0.86, 0.74);
    vec2 artUV = clamp((vUv - 0.10) / 0.80, 0.0, 1.0);

    vec3 skyGrad = mix(vec3(0.88, 0.54, 0.46), vec3(0.22, 0.28, 0.44), artUV.y);
    float ridge1 = 0.46 + 0.12 * sin(artUV.x * 5.0 + 0.5);
    float ridge2 = 0.30 + 0.08 * cos(artUV.x * 7.2 - 0.8);

    vec3 artCol = skyGrad;
    artCol = mix(artCol, vec3(0.18, 0.20, 0.32), smoothstep(ridge1 + 0.02, ridge1 - 0.02, artUV.y));
    artCol = mix(artCol, vec3(0.10, 0.08, 0.14), smoothstep(ridge2 + 0.02, ridge2 - 0.02, artUV.y));

    // Warm sun / botanical motif in the center of the print
    float sunOrb = 1.0 - smoothstep(0.10, 0.13, length(artUV - vec2(0.52, 0.66)));
    artCol = mix(artCol, vec3(1.0, 0.86, 0.62), sunOrb * 0.85);

    vec3 finalCol = mix(matCol, artCol, matBorder);
    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

// Loop 19: Chunky Waffle-Knit Cream Throw Blanket Shader (draped on the lounge armchair)
const KNIT_THROW_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    // Macro waffle / cable knit stitch pattern
    vec2 stitchUV = vUv * vec2(42.0, 36.0);
    float cableWave = sin(stitchUV.x * 3.14159 + sin(stitchUV.y * 3.14159) * 0.65) * 0.5 + 0.5;
    float purlBump  = cos(stitchUV.y * 6.28318) * 0.5 + 0.5;
    float softFold  = sin(vUv.x * 14.0 + vUv.y * 9.0) * 0.5 + 0.5;

    vec3 creamShadow = vec3(0.38, 0.31, 0.28);
    vec3 creamMid    = vec3(0.64, 0.55, 0.50);
    vec3 warmRim     = vec3(0.88, 0.72, 0.58);

    float knitRelief = cableWave * 0.55 + purlBump * 0.25 + softFold * 0.20;
    vec3 col = mix(creamShadow, creamMid, knitRelief);

    // Warm candlelight grazing across the right edge of the blanket facing the desk
    float deskGlow = smoothstep(0.25, 0.95, vUv.x) * (0.7 + 0.3 * softFold);
    col = mix(col, warmRim, deskGlow * 0.48);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Loop 21: Botanical Leaf Venation & Subsurface Candlelight Rim Shader
const FOLIAGE_LEAF_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FOLIAGE_LEAF_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    // Central midrib and diagonal lateral veins
    float midrib = exp(-abs(vUv.y - 0.5) * 32.0);
    float latVein = exp(-abs(sin((vUv.x * 10.0 - abs(vUv.y - 0.5) * 14.0) * 3.14159)) * 14.0) *
                    smoothstep(0.05, 0.45, abs(vUv.y - 0.5));

    vec3 deepForest = vec3(0.06, 0.12, 0.09);
    vec3 lushJade   = vec3(0.14, 0.24, 0.16);
    vec3 veinTint   = vec3(0.24, 0.36, 0.20);

    vec3 leafCol = mix(deepForest, lushJade, 0.5 + 0.5 * vNormal.y);
    leafCol = mix(leafCol, veinTint, (midrib * 0.65 + latVein * 0.35));

    // Warm subsurface scattering when backlit by nearby desk candles
    float warmBacklight = exp(-length(vWorldPos.xz - vec2(-2.6, -1.5)) * 0.55) +
                          exp(-length(vWorldPos.xz - vec2(2.8, 0.2)) * 0.55);
    float rim = pow(1.0 - abs(vNormal.z), 1.6);
    leafCol += vec3(0.65, 0.42, 0.14) * (rim * 0.42 + warmBacklight * 0.28);

    gl_FragColor = vec4(leafCol, 1.0);
  }
`;

// Loop 15: Glossy Monitor Screen Reflection Shader (reflects dusk clouds, mountain ridge, tree leaves & candle bokeh)
const MONITOR_SCREEN_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  void main() {
    // Reflected twilight sky & mountain silhouette
    vec3 skyTop  = vec3(0.12, 0.18, 0.32);
    vec3 skyRose = vec3(0.64, 0.40, 0.50);
    vec3 mtnSil  = vec3(0.05, 0.08, 0.15);

    float mtnLine = 0.34 + 0.08 * sin(vUv.x * 4.5 + 0.6);
    vec3 col = mix(skyRose, skyTop, smoothstep(0.32, 0.95, vUv.y));
    col = mix(col, mtnSil, smoothstep(mtnLine + 0.02, mtnLine - 0.02, vUv.y));

    // Tiny reflected valley city lights on the mountain silhouette inside the monitor (slowly pulsing)
    if (vUv.y < mtnLine) {
      vec2 g = floor(vUv * vec2(36.0, 22.0));
      float h = hash21(g);
      if (h > 0.78) {
        float mPulse = 0.30 + 0.70 * (0.5 + 0.5 * sin(uTime * 0.62 + h * 40.0));
        col += vec3(1.0, 0.74, 0.36) * (0.4 + 0.4 * fract(h * 13.0)) * mPulse;
      }
    }

    // Intricate dark tree branch & leaf cluster silhouette reflected across left/center of screen (exact photo match!)
    vec2 leafUV = vUv * vec2(1.4, 1.1);
    float branchReach = (1.0 - vUv.x) * 0.75 + vUv.y * 0.45;
    float leafCluster =
      sin(leafUV.x * 26.0 + sin(leafUV.y * 18.0) * 1.5) *
      cos(leafUV.y * 24.0 + cos(leafUV.x * 14.0) * 1.5);
    float foliageMask = smoothstep(0.42, 0.72, branchReach + leafCluster * 0.24);
    col = mix(col, vec3(0.02, 0.03, 0.06), foliageMask * 0.88);

    // Warm golden candlelight reflection along the right & bottom edge of the glossy display
    float candleGlint = exp(-pow(vUv.x - 0.82, 2.0) * 10.0) * exp(-pow(vUv.y - 0.25, 2.0) * 8.0);
    col += vec3(1.0, 0.68, 0.30) * candleGlint * 0.55;

    // Crisp diagonal glass specular highlight
    float sheen = smoothstep(0.46, 0.54, vUv.x * 0.65 + vUv.y * 0.55);
    col += vec3(0.10, 0.14, 0.22) * sheen * 0.38;

    // Dark bezel border around the screen
    float bezel =
      smoothstep(0.0, 0.028, vUv.x) * (1.0 - smoothstep(0.972, 1.0, vUv.x)) *
      smoothstep(0.0, 0.042, vUv.y) * (1.0 - smoothstep(0.958, 1.0, vUv.y));
    col = mix(vec3(0.03, 0.04, 0.06), col, bezel);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Loop 15: Procedural Individual-Keycap Wireless Keyboard Shader
const KEYBOARD_TOP_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    // Brushed warm-lit aluminum keyboard deck
    vec3 aluDeck = mix(vec3(0.55, 0.46, 0.42), vec3(0.78, 0.66, 0.58), vUv.x * 0.6 + vUv.y * 0.4);

    // 15 columns x 6 rows of dark chiclet keycaps
    vec2 padUV = (vUv - vec2(0.04, 0.08)) / vec2(0.92, 0.84);
    if (padUV.x > 0.0 && padUV.x < 1.0 && padUV.y > 0.0 && padUV.y < 1.0) {
      vec2 grid = padUV * vec2(15.0, 6.0);
      vec2 cellId = floor(grid);
      vec2 f = fract(grid);

      // Spacebar on bottom row (row 0, columns 4..9)
      if (cellId.y < 0.5 && cellId.x >= 4.0 && cellId.x <= 9.0) {
        f.x = (padUV.x * 15.0 - 4.0) / 6.0;
      }

      float keyMask =
        smoothstep(0.08, 0.15, f.x) * (1.0 - smoothstep(0.85, 0.92, f.x)) *
        smoothstep(0.10, 0.18, f.y) * (1.0 - smoothstep(0.82, 0.90, f.y));

      // Warm candlelight rim reflection on top/right edge of each keycap
      float keyRim = smoothstep(0.65, 0.88, f.x) + smoothstep(0.68, 0.88, f.y);
      vec3 keyCol = vec3(0.09, 0.10, 0.14) + vec3(0.32, 0.22, 0.16) * keyRim * 0.45;

      aluDeck = mix(aluDeck, keyCol, keyMask);
    }

    gl_FragColor = vec4(aluDeck, 1.0);
  }
`;

// Loop 15: Open Illustrated Magazine / Sketchbook Page Shader
const BOOK_PAGE_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    // Center spine crease at vUv.x = 0.5
    float spineDist = abs(vUv.x - 0.5);
    float spineShadow = 0.62 + 0.38 * smoothstep(0.0, 0.08, spineDist);
    float pageArch = 0.92 + 0.08 * sin(spineDist * 6.28);

    vec3 paperWarm = vec3(0.92, 0.84, 0.76) * spineShadow * pageArch;

    // Printed editorial layout (photo blocks & text lines on left and right pages)
    vec2 pageUV = vec2(fract(vUv.x * 2.0), vUv.y);
    float margin = smoothstep(0.10, 0.12, pageUV.x) * (1.0 - smoothstep(0.88, 0.90, pageUV.x)) *
                   smoothstep(0.10, 0.12, pageUV.y) * (1.0 - smoothstep(0.88, 0.90, pageUV.y));

    // Editorial illustration block on upper half of left page
    if (vUv.x < 0.5 && pageUV.y > 0.45 && pageUV.y < 0.84 && pageUV.x > 0.14 && pageUV.x < 0.86) {
      vec3 artCol = mix(vec3(0.24, 0.28, 0.38), vec3(0.72, 0.48, 0.42), pageUV.y);
      paperWarm = mix(paperWarm, artCol, 0.75);
    } else if (margin > 0.5) {
      // Faux typography lines
      float lineMask = step(0.45, sin(pageUV.y * 95.0)) * step(0.15, fract(pageUV.x * 2.0));
      paperWarm = mix(paperWarm, vec3(0.28, 0.24, 0.22), lineMask * 0.28);
    }

    gl_FragColor = vec4(paperWarm, 1.0);
  }
`;

// ============================================================================
// 3. AR MODE SPATIAL RETICLE & SHADOW CATCHER SHADER
// ============================================================================

const AR_RETICLE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vLocalXY;
  void main() {
    vLocalXY = position.xz;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const AR_RETICLE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uShadowScale;
  uniform vec3 uKeyLightDir;
  uniform float uKeyLightIntensity;
  varying vec2 vLocalXY;

  void main() {
    float r = length(vLocalXY);
    if (r > 1.34) discard;

    float sScale = clamp(uShadowScale, 0.45, 0.88);
    float scaledR = r / sScale;
    float circularMask = 1.0 - smoothstep(0.62, 1.14, r);

    // Round contact shadow right under Mochi + soft elliptical cast shadow from AR Key Light
    float contactShadow = 0.34 * exp(-scaledR * scaledR * 4.80) * circularMask;
    vec2 castShift = -uKeyLightDir.xz * 0.18;
    vec2 castCoord = (vLocalXY - castShift) / (sScale * 1.05);
    float castCircularMask = 1.0 - smoothstep(0.62, 1.15, length(vLocalXY - castShift * 0.5));
    float castShadow = clamp(uKeyLightIntensity * 0.22, 0.06, 0.32) * exp(-dot(castCoord, castCoord) * 4.20) * castCircularMask;
    float shadowAlpha = max(contactShadow, castShadow);

    float angle = atan(vLocalXY.y, vLocalXY.x);
    float ringInner = smoothstep(0.91, 0.93, r) * (1.0 - smoothstep(0.94, 0.96, r));
    float dash = smoothstep(-0.15, 0.15, sin(angle * 24.0 - uTime * 1.6));
    float ringOuter = smoothstep(1.16, 1.175, r) * (1.0 - smoothstep(1.185, 1.20, r)) * dash;

    float cardinal = smoothstep(0.985, 0.998, abs(cos(angle * 2.0))) *
                     smoothstep(0.84, 0.86, r) * (1.0 - smoothstep(1.02, 1.04, r));

    vec2 dotGrid = fract(vLocalXY * 7.0) - 0.5;
    float lidarDots = (1.0 - smoothstep(0.06, 0.11, length(dotGrid))) *
                      smoothstep(0.35, 0.85, r) * (1.0 - smoothstep(0.85, 0.92, r)) * 0.22;

    vec3 ringColor = mix(
      vec3(0.38, 0.92, 0.99),
      vec3(1.0, 0.60, 0.82),
      0.4 + 0.4 * sin(uTime * 1.8 + angle * 2.0)
    );
    float ringAlpha = ringInner * 0.46 + ringOuter * 0.34 + cardinal * 0.55 + lidarDots;

    vec3 finalRGB = ringColor * (ringAlpha / max(0.001, shadowAlpha + ringAlpha));
    float finalAlpha = clamp(shadowAlpha + ringAlpha, 0.0, 0.86);
    if (finalAlpha < 0.005) discard;

    gl_FragColor = vec4(finalRGB, finalAlpha);
  }
`;

const AR_CURSOR_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const AR_CURSOR_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float angle = atan(p.y, p.x);

    // Rotating dashed target circle
    float dash = smoothstep(-0.2, 0.2, sin(angle * 12.0 - uTime * 2.5));
    float ring1 = smoothstep(0.76, 0.79, r) * (1.0 - smoothstep(0.83, 0.86, r)) * dash;
    float ring2 = smoothstep(0.92, 0.94, r) * (1.0 - smoothstep(0.97, 0.99, r));

    // Circular cardinal arc ticks (zero square corners)
    float arcTicks = smoothstep(0.88, 0.96, abs(cos(angle * 2.0))) *
                     smoothstep(0.86, 0.88, r) * (1.0 - smoothstep(0.98, 1.0, r));

    // Central pulsing target dot
    float dot = (1.0 - smoothstep(0.04, 0.08, r)) * (0.7 + 0.3 * sin(uTime * 5.0));

    // Expanding placement pulse ripple
    float ripple = (1.0 - smoothstep(uPulse * 0.9, uPulse, r)) * smoothstep(max(0.0, uPulse - 0.15), uPulse, r) * (1.0 - uPulse);

    float alpha = ring1 * 0.75 + ring2 * 0.9 + arcTicks * 0.75 + dot + ripple * 1.2;
    if (alpha < 0.02) discard;

    vec3 col = mix(vec3(0.2, 0.85, 1.0), vec3(1.0, 0.45, 0.75), 0.5 + 0.5 * sin(uTime * 2.0 + angle));
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.95));
  }
`;

const AR_POINTS_VERTEX_SHADER = /* glsl */ `
  attribute float aConfidence;
  varying float vConf;
  void main() {
    vConf = aConfidence;
    vec4 mvp = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (7.0 + 5.0 * aConfidence) * (3.0 / max(0.2, -mvp.z));
    gl_Position = projectionMatrix * mvp;
  }
`;

const AR_POINTS_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying float vConf;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float glow = 1.0 - smoothstep(0.2, 1.0, r);
    float ring = smoothstep(0.65, 0.8, r) * (1.0 - smoothstep(0.85, 1.0, r));
    vec3 col = mix(vec3(0.22, 0.9, 0.95), vec3(1.0, 0.65, 0.85), vConf);
    gl_FragColor = vec4(col, (glow * 0.6 + ring * 0.8) * vConf * 0.85);
  }
`;

// ============================================================================
// ENVIRONMENT MANAGER FACTORY
// ============================================================================

export function createEnvironmentManager({ scene, renderer, container, keyLight, rimLight, hemiLight, furSystem, camera }) {
  let currentEnvId = 'studio';

  // Optical Tilt-Shift Lens Blur Overlay (active in Cozy Desk / Highrise mode)
  const tiltShiftOverlay = document.createElement('div');
  tiltShiftOverlay.id = 'tiltshift-overlay';
  tiltShiftOverlay.style.display = 'none';
  tiltShiftOverlay.style.pointerEvents = 'none';
  if (container) {
    container.appendChild(tiltShiftOverlay);
  } else {
    document.body.appendChild(tiltShiftOverlay);
  }

  // --------------------------------------------------------------------------
  // A. STUDIO GROUP (Deep Black Cyclorama + Soft Contact Shadow + Bokeh Motes)
  // --------------------------------------------------------------------------
  const studioGroup = new THREE.Group();
  studioGroup.name = 'EnvStudio';
  scene.add(studioGroup);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d');
  const grad = sCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0.78)');
  grad.addColorStop(0.45, 'rgba(2, 2, 6, 0.38)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 256, 256);

  const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);
  const studioShadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 2.7),
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false
    })
  );
  studioShadowMesh.rotation.x = -Math.PI / 2;
  studioShadowMesh.position.y = 0.0;
  studioGroup.add(studioShadowMesh);

  // Soft circular radial-gradient sprite texture so floating dust motes are round bokeh orbs, not squares
  const moteCanvas = document.createElement('canvas');
  moteCanvas.width = 64;
  moteCanvas.height = 64;
  const moteCtx = moteCanvas.getContext('2d');
  const moteGrad = moteCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  moteGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  moteGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
  moteGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.25)');
  moteGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  moteCtx.fillStyle = moteGrad;
  moteCtx.fillRect(0, 0, 64, 64);
  const moteCircleTex = new THREE.CanvasTexture(moteCanvas);

  const moteCount = 90;
  const moteGeo = new THREE.BufferGeometry();
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = (Math.random() - 0.5) * 5.8;
    motePositions[i * 3 + 1] = (Math.random() - 0.3) * 3.6;
    motePositions[i * 3 + 2] = (Math.random() - 0.5) * 4.2 - 0.8;
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const studioMotes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      color: '#fbcfe8',
      map: moteCircleTex,
      size: 0.036,
      transparent: true,
      opacity: 0.42,
      alphaTest: 0.01,
      depthWrite: false
    })
  );
  studioGroup.add(studioMotes);

  // --------------------------------------------------------------------------
  // B. CLOUD SKY GROUP (Floating in 360° Blue Sky & Clouds — Zero Grass)
  // --------------------------------------------------------------------------
  const meadowGroup = new THREE.Group();
  meadowGroup.name = 'EnvMeadow';
  meadowGroup.visible = false;
  scene.add(meadowGroup);

  const meadowUniforms = {
    uTime: { value: 0.0 },
    uWindStrength: { value: 0.70 },
    uSunDir: { value: new THREE.Vector3(0.55, 0.52, 0.65).normalize() }
  };

  const meadowSkyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(48, 64, 48),
    new THREE.ShaderMaterial({
      vertexShader: MEADOW_SKY_VERTEX_SHADER,
      fragmentShader: MEADOW_SKY_FRAGMENT_SHADER,
      uniforms: meadowUniforms,
      side: THREE.BackSide,
      depthWrite: false
    })
  );
  meadowSkyMesh.renderOrder = -2;
  meadowGroup.add(meadowSkyMesh);

  // 3D Camera-Projected Optical Lens Flare (renders across lens when looking towards the 3D light)
  const meadowLensFlareMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: MEADOW_LENS_FLARE_VERTEX_SHADER,
      fragmentShader: MEADOW_LENS_FLARE_FRAGMENT_SHADER,
      uniforms: meadowUniforms,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending
    })
  );
  meadowLensFlareMesh.frustumCulled = false;
  meadowLensFlareMesh.renderOrder = 25;
  meadowGroup.add(meadowLensFlareMesh);

  let seedVal = 928371;
  const rand = () => {
    seedVal = (seedVal * 1664525 + 1013904223) >>> 0;
    return seedVal / 4294967296;
  };

  const cloudMoteCount = 110;
  const cloudMoteGeo = new THREE.BufferGeometry();
  const cloudMotePos = new Float32Array(cloudMoteCount * 3);
  for (let i = 0; i < cloudMoteCount; i++) {
    cloudMotePos[i * 3] = (rand() - 0.5) * 8.5;
    cloudMotePos[i * 3 + 1] = (rand() - 0.5) * 5.2;
    cloudMotePos[i * 3 + 2] = (rand() - 0.5) * 7.5;
  }
  cloudMoteGeo.setAttribute('position', new THREE.BufferAttribute(cloudMotePos, 3));
  const meadowPollen = new THREE.Points(
    cloudMoteGeo,
    new THREE.PointsMaterial({
      color: '#ffffff',
      map: moteCircleTex,
      size: 0.048,
      transparent: true,
      opacity: 0.62,
      alphaTest: 0.01,
      depthWrite: false
    })
  );
  meadowGroup.add(meadowPollen);

  // --------------------------------------------------------------------------
  // C. COZY DESK GROUP (Rebuilt Warm Wooden Desk, Ceramic Mug, Small Potted
  //    Plant, Warm Desk Lamp with PointLight & Cozy Studio Backdrop)
  // --------------------------------------------------------------------------
  const highriseGroup = new THREE.Group();
  highriseGroup.name = 'EnvHighrise';
  highriseGroup.visible = false;
  scene.add(highriseGroup);

  const highriseUniforms = {
    uTime: { value: 0.0 },
    uCreatureXZ: { value: new THREE.Vector2(0, 0) },
    uShadowScale: { value: 1.0 },
    uCreatureLift: { value: 0.0 },
    uCreatureSquash: { value: new THREE.Vector2(1.0, 1.0) },
    uCreatureRot: { value: new THREE.Vector2(0.0, 0.0) },
    uKeyLightDir: furSystem.sharedUniforms.uKeyLightDir,
    uKeyLightIntensity: furSystem.sharedUniforms.uKeyLightIntensity,
    uKeyLightColor: furSystem.sharedUniforms.uKeyLightColor,
    uFurLength: furSystem.sharedUniforms.uFurLength
  };

  // 1. Warm Cozy Twilight Study Sky & Bokeh Backdrop Dome (Never a black void)
  const citySkyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(52, 64, 48),
    new THREE.ShaderMaterial({
      vertexShader: CITY_SKY_VERTEX_SHADER,
      fragmentShader: CITY_SKY_FRAGMENT_SHADER,
      uniforms: highriseUniforms,
      side: THREE.BackSide,
      depthWrite: false
    })
  );
  citySkyMesh.renderOrder = -2;
  highriseGroup.add(citySkyMesh);

  // 2. Proper Warm Satin-Walnut Wooden Desk Plane & Beveled Slab (y = 0.0)
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 1024;
  woodCanvas.height = 1024;
  const wCtx = woodCanvas.getContext('2d');
  if (wCtx) {
    const baseGrad = wCtx.createLinearGradient(0, 0, 1024, 1024);
    baseGrad.addColorStop(0.0, '#6b3e26');
    baseGrad.addColorStop(0.5, '#7c4a2d');
    baseGrad.addColorStop(1.0, '#5a321d');
    wCtx.fillStyle = baseGrad;
    wCtx.fillRect(0, 0, 1024, 1024);

    // Subtle horizontal walnut plank seams and warm cathedral wood grain lines
    for (let p = 0; p < 8; p++) {
      const py = p * 128;
      wCtx.fillStyle = p % 2 === 0 ? 'rgba(255, 210, 160, 0.04)' : 'rgba(30, 12, 4, 0.06)';
      wCtx.fillRect(0, py, 1024, 128);
      wCtx.fillStyle = 'rgba(25, 10, 3, 0.28)';
      wCtx.fillRect(0, py, 1024, 2);
    }

    wCtx.strokeStyle = 'rgba(42, 20, 8, 0.16)';
    wCtx.lineWidth = 2;
    for (let i = 0; i < 140; i++) {
      const yBase = (i / 140) * 1024;
      wCtx.beginPath();
      for (let x = 0; x <= 1024; x += 32) {
        const wave = Math.sin(x * 0.012 + i * 0.45) * 8 + Math.cos(x * 0.005 - i) * 5;
        if (x === 0) wCtx.moveTo(x, yBase + wave);
        else wCtx.lineTo(x, yBase + wave);
      }
      wCtx.stroke();
    }
  }
  const walnutWoodTex = new THREE.CanvasTexture(woodCanvas);
  walnutWoodTex.wrapS = THREE.RepeatWrapping;
  walnutWoodTex.wrapT = THREE.RepeatWrapping;
  walnutWoodTex.repeat.set(2.5, 1.5);
  walnutWoodTex.colorSpace = THREE.SRGBColorSpace;

  const deskSurfaceMat = new THREE.MeshStandardMaterial({
    map: walnutWoodTex,
    color: '#a46b43',
    roughness: 0.42,
    metalness: 0.06,
    emissive: '#2a160b',
    emissiveIntensity: 0.18
  });

  // Top wooden desk plane at y = 0.0 right beneath Mochi-Puff's paws
  const deskPlaneGeo = new THREE.PlaneGeometry(14.0, 7.5);
  deskPlaneGeo.rotateX(-Math.PI / 2);
  const deskTopMesh = new THREE.Mesh(deskPlaneGeo, deskSurfaceMat);
  deskTopMesh.position.set(0, -0.002, -0.35);
  deskTopMesh.receiveShadow = true;
  highriseGroup.add(deskTopMesh);

  // Solid wooden desk slab thickness & front apron
  const deskEdgeMat = new THREE.MeshStandardMaterial({
    color: '#5c341d',
    roughness: 0.48,
    metalness: 0.05,
    emissive: '#1f1008',
    emissiveIntensity: 0.15
  });
  const deskSlab = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.28, 7.5), deskEdgeMat);
  deskSlab.position.set(0, -0.145, -0.35);
  deskSlab.receiveShadow = true;
  highriseGroup.add(deskSlab);

  // Soft contact shadow disc on the desk directly under Mochi-Puff
  const deskContactShadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    })
  );
  deskContactShadowMesh.rotation.x = -Math.PI / 2;
  deskContactShadowMesh.position.set(0, 0.002, 0);
  highriseGroup.add(deskContactShadowMesh);

  // Sleek stitched desk mat underneath Mochi-Puff
  const deskMatMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.016, 2.4),
    new THREE.MeshStandardMaterial({
      color: '#27272a',
      roughness: 0.82,
      metalness: 0.05
    })
  );
  deskMatMesh.position.set(0, 0.006, 0.05);
  deskMatMesh.receiveShadow = true;
  highriseGroup.add(deskMatMesh);

  // 3. Ceramic Mug (CylinderGeometry + Handle + Warm Coffee + Saucer) on Left of Desk
  const mugGroup = new THREE.Group();
  mugGroup.position.set(-1.68, 0.0, 0.28);
  mugGroup.rotation.y = 0.45;

  const ceramicMugMat = new THREE.MeshStandardMaterial({
    color: '#f5f0eb',
    roughness: 0.22,
    metalness: 0.08,
    emissive: '#2b2118',
    emissiveIntensity: 0.14
  });
  const coasterWoodMat = new THREE.MeshStandardMaterial({
    color: '#854d27',
    roughness: 0.55,
    metalness: 0.05
  });
  const coffeeMat = new THREE.MeshStandardMaterial({
    color: '#3b1d0e',
    roughness: 0.12,
    metalness: 0.15
  });

  // Wooden coaster under mug
  const mugCoaster = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.44, 0.03, 32),
    coasterWoodMat
  );
  mugCoaster.position.y = 0.015;
  mugCoaster.receiveShadow = true;
  mugGroup.add(mugCoaster);

  // Ceramic mug body (CylinderGeometry as requested)
  const mugBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.28, 0.68, 36),
    ceramicMugMat
  );
  mugBody.position.y = 0.37;
  mugBody.castShadow = true;
  mugBody.receiveShadow = true;
  mugGroup.add(mugBody);

  // Warm caramel rim band
  const mugRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.315, 0.022, 14, 36),
    new THREE.MeshStandardMaterial({
      color: '#d97706',
      roughness: 0.28,
      metalness: 0.15
    })
  );
  mugRim.rotation.x = Math.PI / 2;
  mugRim.position.y = 0.71;
  mugGroup.add(mugRim);

  // Espresso coffee surface inside top of mug
  const coffeeTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.285, 0.285, 0.02, 32),
    coffeeMat
  );
  coffeeTop.position.y = 0.68;
  mugGroup.add(coffeeTop);

  // Ceramic ear handle
  const mugHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.038, 14, 28, Math.PI),
    ceramicMugMat
  );
  mugHandle.rotation.z = -Math.PI / 2;
  mugHandle.position.set(-0.29, 0.38, 0);
  mugGroup.add(mugHandle);

  highriseGroup.add(mugGroup);

  // 4. Small Potted Plant (Terracotta CylinderGeometry Pot + Soil + Lush Botanical Leaves)
  const plantGroup = new THREE.Group();
  plantGroup.position.set(-1.95, 0.0, -0.95);

  const terracottaMat = new THREE.MeshStandardMaterial({
    color: '#c26d43',
    roughness: 0.58,
    metalness: 0.04,
    emissive: '#331509',
    emissiveIntensity: 0.15
  });
  const plantSoilMat = new THREE.MeshStandardMaterial({
    color: '#291a12',
    roughness: 0.9
  });
  const plantLeafMat = new THREE.MeshStandardMaterial({
    color: '#34d399',
    roughness: 0.38,
    metalness: 0.05,
    emissive: '#064e3b',
    emissiveIntensity: 0.22
  });

  // Ceramic/Terracotta planter pot (CylinderGeometry)
  const plantPot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.28, 0.62, 28),
    terracottaMat
  );
  plantPot.position.y = 0.31;
  plantPot.castShadow = true;
  plantPot.receiveShadow = true;
  plantGroup.add(plantPot);

  const plantPotRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.39, 0.08, 28),
    terracottaMat
  );
  plantPotRim.position.y = 0.59;
  plantGroup.add(plantPotRim);

  const plantSoil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.04, 24),
    plantSoilMat
  );
  plantSoil.position.y = 0.61;
  plantGroup.add(plantSoil);

  // Sculpted green botanical leaves radiating from the pot
  const leafGeometry = new THREE.SphereGeometry(0.22, 16, 12);
  leafGeometry.scale(1.45, 0.16, 0.72);
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2.0;
    const tier = i % 2;
    const leafPivot = new THREE.Group();
    leafPivot.position.set(0, 0.64 + tier * 0.12, 0);
    leafPivot.rotation.y = angle;
    leafPivot.rotation.z = -0.35 - tier * 0.18;

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.28, 8),
      plantLeafMat
    );
    stem.position.set(0.12, 0.10, 0);
    stem.rotation.z = -0.55;
    leafPivot.add(stem);

    const leafBlade = new THREE.Mesh(leafGeometry, plantLeafMat);
    leafBlade.position.set(0.28, 0.18, 0);
    leafBlade.castShadow = true;
    leafPivot.add(leafBlade);

    plantGroup.add(leafPivot);
  }

  highriseGroup.add(plantGroup);

  // 5. Warm Desk Lamp (Brass Base + Articulated Arm + Conical Shade + Warm PointLight)
  const deskLampGroup = new THREE.Group();
  deskLampGroup.position.set(1.75, 0.0, -0.65);
  deskLampGroup.rotation.y = -0.52;

  const brassLampMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    roughness: 0.24,
    metalness: 0.78,
    emissive: '#451a03',
    emissiveIntensity: 0.22
  });
  const warmShadeMat = new THREE.MeshStandardMaterial({
    color: '#fffbeb',
    roughness: 0.35,
    metalness: 0.05,
    emissive: '#fb923c',
    emissiveIntensity: 0.75,
    side: THREE.DoubleSide
  });

  // Weighted cylindrical lamp base
  const lampBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.42, 0.08, 32),
    brassLampMat
  );
  lampBase.position.y = 0.04;
  lampBase.castShadow = true;
  lampBase.receiveShadow = true;
  deskLampGroup.add(lampBase);

  // Vertical brass stem
  const lampStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 1.65, 20),
    brassLampMat
  );
  lampStem.position.set(0, 0.85, 0);
  deskLampGroup.add(lampStem);

  // Overhanging gooseneck arm reaching toward desk center
  const lampArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.042, 0.72, 16),
    brassLampMat
  );
  lampArm.position.set(-0.28, 1.68, 0.12);
  lampArm.rotation.z = Math.PI * 0.34;
  deskLampGroup.add(lampArm);

  // Conical warm glowing lampshade
  const lampShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.44, 0.46, 32, 1, true),
    warmShadeMat
  );
  lampShade.position.set(-0.56, 1.62, 0.18);
  lampShade.rotation.z = 0.26;
  deskLampGroup.add(lampShade);

  // Glowing warm bulb inside the shade
  const lampBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#fef08a' })
  );
  lampBulb.position.set(-0.54, 1.52, 0.18);
  deskLampGroup.add(lampBulb);

  highriseGroup.add(deskLampGroup);

  // Warm Desk Lamp PointLight + Soft Fill PointLight so the desk & Mochi-Puff are brightly & evenly lit
  const cozyLampLight = new THREE.PointLight('#ffb366', 3.2, 18.0, 1.2);
  cozyLampLight.position.set(1.25, 1.55, -0.35);
  highriseGroup.add(cozyLampLight);

  const leftCandleLight = new THREE.PointLight('#fde68a', 1.85, 15.0, 1.2);
  leftCandleLight.position.set(-1.65, 1.35, 0.85);
  highriseGroup.add(leftCandleLight);

  // Floating Golden Dust Motes in the Cozy Desk Warm Lamp Glow
  const deskMoteCount = 120;
  const deskMoteGeo = new THREE.BufferGeometry();
  const deskMotePos = new Float32Array(deskMoteCount * 3);
  for (let i = 0; i < deskMoteCount; i++) {
    deskMotePos[i * 3] = (rand() - 0.5) * 6.5;
    deskMotePos[i * 3 + 1] = 0.25 + rand() * 3.2;
    deskMotePos[i * 3 + 2] = (rand() - 0.5) * 4.2;
  }
  deskMoteGeo.setAttribute('position', new THREE.BufferAttribute(deskMotePos, 3));
  const deskWarmMotes = new THREE.Points(
    deskMoteGeo,
    new THREE.PointsMaterial({
      color: '#fde68a',
      map: moteCircleTex,
      size: 0.042,
      transparent: true,
      opacity: 0.58,
      alphaTest: 0.01,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  highriseGroup.add(deskWarmMotes);

  // --------------------------------------------------------------------------
  // D. AR CAMERA GROUP (Live Webcam Pass-Through + 3D AR Spatial Anchor Ring)
  // --------------------------------------------------------------------------
  const arGroup = new THREE.Group();
  arGroup.name = 'EnvAR';
  arGroup.visible = false;
  scene.add(arGroup);

  const arUniforms = {
    uTime: { value: 0.0 },
    uShadowScale: { value: 1.0 },
    uKeyLightDir: furSystem.sharedUniforms.uKeyLightDir,
    uKeyLightIntensity: furSystem.sharedUniforms.uKeyLightIntensity
  };

  const arReticleGeo = new THREE.PlaneGeometry(2.8, 2.8);
  arReticleGeo.rotateX(-Math.PI / 2);
  const arReticleMesh = new THREE.Mesh(
    arReticleGeo,
    new THREE.ShaderMaterial({
      vertexShader: AR_RETICLE_VERTEX_SHADER,
      fragmentShader: AR_RETICLE_FRAGMENT_SHADER,
      uniforms: arUniforms,
      transparent: true,
      depthWrite: false
    })
  );
  arReticleMesh.position.y = -0.94;
  arGroup.add(arReticleMesh);

  // 1. AR Interactive Placement Cursor (glides along detected surface plane)
  const arCursorUniforms = {
    uTime: arUniforms.uTime,
    uPulse: { value: 0.0 }
  };
  const arCursorGeo = new THREE.PlaneGeometry(1.6, 1.6);
  arCursorGeo.rotateX(-Math.PI / 2);
  const arCursorMesh = new THREE.Mesh(
    arCursorGeo,
    new THREE.ShaderMaterial({
      vertexShader: AR_CURSOR_VERTEX_SHADER,
      fragmentShader: AR_CURSOR_FRAGMENT_SHADER,
      uniforms: arCursorUniforms,
      transparent: true,
      depthWrite: false
    })
  );
  arCursorMesh.position.y = -0.94;
  arCursorMesh.visible = false;
  arGroup.add(arCursorMesh);

  // 2. AR Video-Tracked Feature Points (LiDAR / Point Cloud)
  const MAX_AR_FEATURES = 48;
  const featurePositions = new Float32Array(MAX_AR_FEATURES * 3);
  const featureConfidences = new Float32Array(MAX_AR_FEATURES);
  for (let i = 0; i < MAX_AR_FEATURES; i++) {
    featurePositions[i * 3 + 1] = -50.0; // parked out of view
    featureConfidences[i] = 0.0;
  }
  const featureGeo = new THREE.BufferGeometry();
  featureGeo.setAttribute('position', new THREE.BufferAttribute(featurePositions, 3));
  featureGeo.setAttribute('aConfidence', new THREE.BufferAttribute(featureConfidences, 1));

  const arPointsMat = new THREE.ShaderMaterial({
    vertexShader: AR_POINTS_VERTEX_SHADER,
    fragmentShader: AR_POINTS_FRAGMENT_SHADER,
    uniforms: { uTime: arUniforms.uTime },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const arFeaturePointsMesh = new THREE.Points(featureGeo, arPointsMat);
  arGroup.add(arFeaturePointsMesh);

  const arVideo = document.createElement('video');
  arVideo.id = 'ar-camera-video';
  arVideo.setAttribute('autoplay', '');
  arVideo.setAttribute('playsinline', '');
  arVideo.setAttribute('muted', '');
  arVideo.muted = true;
  arVideo.style.display = 'none';
  if (container) {
    container.insertBefore(arVideo, container.firstChild || null);
  } else {
    document.body.appendChild(arVideo);
  }

  const arFallbackCanvas = document.createElement('canvas');
  arFallbackCanvas.id = 'ar-fallback-canvas';
  arFallbackCanvas.width = 640;
  arFallbackCanvas.height = 360;
  arFallbackCanvas.style.display = 'none';
  if (container) {
    container.insertBefore(arFallbackCanvas, container.firstChild || null);
  } else {
    document.body.appendChild(arFallbackCanvas);
  }
  const arFallbackCtx = arFallbackCanvas.getContext('2d');

  let activeStream = null;
  let isCameraLive = false;
  let isMirrored = true;
  let facingMode = 'user';
  let statusCallback = null;
  let planeDetectedCallback = null;

  let estimatedPlaneHeight = -0.94;
  let estimatedSurfaceType = 'Floor / Ground';
  let estimatedPlaneConfidence = 0.94;
  let detectedFeatureCount = 0;
  let currentAnchorPlaneY = -0.94;
  let cursorPulse = 0.0;
  let lastAnalysisTime = 0.0;

  // Real-Time AR Light Estimation state (active by default in AR scene)
  let lightEstimationEnabled = true;
  let lightEstimatedCallback = null;
  let lastLightEstTime = 0.0;
  let estLightAngle = -32;
  let estKeyIntensity = 1.42;
  let estRimIntensity = 1.25;
  let estAmbientIntensity = 0.68;
  let estExposure = 1.08;
  let estKeyR = 255;
  let estKeyG = 253;
  let estKeyB = 247;
  let estSkyR = 224;
  let estSkyG = 242;
  let estSkyB = 254;
  let estGndR = 71;
  let estGndG = 85;
  let estGndB = 105;
  let estKelvin = 5200;
  let estLuminancePct = 100;

  function rgbToHex(r, g, b) {
    const cr = Math.max(0, Math.min(255, Math.round(r))).toString(16).padStart(2, '0');
    const cg = Math.max(0, Math.min(255, Math.round(g))).toString(16).padStart(2, '0');
    const cb = Math.max(0, Math.min(255, Math.round(b))).toString(16).padStart(2, '0');
    return `#${cr}${cg}${cb}`;
  }

  // Offscreen canvas for lightweight computer vision plane & light estimation from video
  const cvCanvas = document.createElement('canvas');
  cvCanvas.width = 160;
  cvCanvas.height = 90;
  const cvCtx = cvCanvas.getContext('2d', { willReadFrequently: true });

  const tempRaycastPoint = new THREE.Vector3();
  const tempNormal = new THREE.Vector3(0, 1, 0);
  const cvRay = new THREE.Ray();
  const cvNdc = new THREE.Vector2();
  const arRaycaster = new THREE.Raycaster();

  function runARLightEstimation(time, forceImmediate = false) {
    if (!lightEstimationEnabled) return;
    if (!forceImmediate && time - lastLightEstTime < 0.10) return;
    lastLightEstTime = time;

    const source = isCameraLive && arVideo.readyState >= 2 ? arVideo : arFallbackCanvas;
    if (!source) return;

    try {
      cvCtx.drawImage(source, 0, 0, 160, 90);
      const imgData = cvCtx.getImageData(0, 0, 160, 90);
      const data = imgData.data;

      let totalLum = 0;
      let sampleCount = 0;
      let leftLum = 0;
      let rightLum = 0;
      let leftCount = 0;
      let rightCount = 0;
      let sumWX = 0;
      let sumWY = 0;
      let sumDirW = 0;
      let sumWR = 0;
      let sumWG = 0;
      let sumWB = 0;
      let sumColorW = 0;

      let skyR = 0;
      let skyG = 0;
      let skyB = 0;
      let skyW = 0;

      let gndR = 0;
      let gndG = 0;
      let gndB = 0;
      let gndW = 0;

      for (let y = 4; y < 86; y += 2) {
        for (let x = 4; x < 156; x += 3) {
          const idx = (y * 160 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = (r * 299 + g * 587 + b * 114) / 1000;

          totalLum += lum;
          sampleCount++;

          const screenX = isMirrored ? (160 - x) : x;
          if (screenX < 80) {
            leftLum += lum;
            leftCount++;
          } else {
            rightLum += lum;
            rightCount++;
          }

          // Exclude central portrait skin/hair tones from biasing room illuminant color toward red/orange
          const inPortraitZone = x > 38 && x < 122 && y > 12 && y < 84;
          const isSkinOrHairTone = r > g * 1.07 && g >= b * 0.96 && lum < 218;
          const nonSkinWeight = (inPortraitZone && isSkinOrHairTone) ? 0.03 : (isSkinOrHairTone ? 0.15 : 1.0);

          if (y < 45) {
            const sw = nonSkinWeight * (0.3 + 0.7 * Math.max(0.0, (lum - 80) / 175));
            skyR += r * sw;
            skyG += g * sw;
            skyB += b * sw;
            skyW += sw;
          } else {
            const gw = nonSkinWeight * 0.5;
            gndR += r * gw;
            gndG += g * gw;
            gndB += b * gw;
            gndW += gw;
          }

          if (y < 76) {
            const highL = Math.max(0.01, (lum - 45.0) / 210.0);
            const dirW = highL * highL * highL * highL;
            sumWX += ((screenX / 160.0) * 2.0 - 1.0) * dirW;
            sumWY += (1.0 - y / 90.0) * dirW;
            sumDirW += dirW;

            const colW = dirW * nonSkinWeight;
            sumWR += r * colW;
            sumWG += g * colW;
            sumWB += b * colW;
            sumColorW += colW;
          }
        }
      }

      const avgLum = sampleCount > 0 ? totalLum / sampleCount : 128;
      const normLum = Math.max(0.12, Math.min(1.30, avgLum / 155.0));

      const avgLeft = leftCount > 0 ? leftLum / leftCount : avgLum;
      const avgRight = rightCount > 0 ? rightLum / rightCount : avgLum;
      const sideBias = (avgRight - avgLeft) / Math.max(18.0, avgLum);
      const centX = sumDirW > 0 ? sumWX / sumDirW : 0.0;
      const combinedDirX = Math.max(-1.0, Math.min(1.0, centX * 1.45 + sideBias * 1.65));
      const targetAngle = Math.max(-165, Math.min(165, combinedDirX * 155.0));

      const targetKeyInt = Math.max(0.35, Math.min(2.35, 0.28 + Math.pow(normLum, 1.3) * 1.55));
      const targetRimInt = Math.max(0.22, Math.min(1.85, 0.20 + normLum * 1.15));
      const targetAmbInt = Math.max(0.32, Math.min(0.95, 0.30 + normLum * 0.48));
      const targetExposure = Math.max(0.75, Math.min(1.26, 0.75 + normLum * 0.38));

      const rawR = sumColorW > 0.001 ? sumWR / sumColorW : 254;
      const rawG = sumColorW > 0.001 ? sumWG / sumColorW : 251;
      const rawB = sumColorW > 0.001 ? sumWB / sumColorW : 246;

      // Natural white-balanced illuminant curve (keeps RGB in realistic 212..255 daylight/indoor range)
      const cMean = (rawR + rawG + rawB) / 3.0;
      const balR = cMean + (rawR - cMean) * 1.15;
      const balG = cMean + (rawG - cMean) * 1.15;
      const balB = cMean + (rawB - cMean) * 1.15;
      const maxC = Math.max(1, balR, balG, balB);
      const normR = (balR / maxC) * 255;
      const normG = (balG / maxC) * 255;
      const normB = (balB / maxC) * 255;

      // Blend with clean daylight reference so indoor wall paint never forces a red/orange key light
      const targetKeyR = Math.max(212, Math.min(255, normR * 0.48 + 255 * 0.52));
      const targetKeyG = Math.max(212, Math.min(255, normG * 0.48 + 252 * 0.52));
      const targetKeyB = Math.max(208, Math.min(255, normB * 0.48 + 248 * 0.52));

      const bRatio = (normB + 40) / (normR + 40);
      const targetKelvin = Math.round(Math.max(2700, Math.min(8500, 2600 + bRatio * 2900)) / 50) * 50;

      const alpha = forceImmediate ? 1.0 : 0.38;
      estLightAngle += (targetAngle - estLightAngle) * alpha;
      estKeyIntensity += (targetKeyInt - estKeyIntensity) * alpha;
      estRimIntensity += (targetRimInt - estRimIntensity) * alpha;
      estAmbientIntensity += (targetAmbInt - estAmbientIntensity) * alpha;
      estExposure += (targetExposure - estExposure) * alpha;
      estKeyR += (targetKeyR - estKeyR) * alpha;
      estKeyG += (targetKeyG - estKeyG) * alpha;
      estKeyB += (targetKeyB - estKeyB) * alpha;
      estKelvin = Math.round((estKelvin * (1.0 - alpha) + targetKelvin * alpha) / 50) * 50;
      estLuminancePct = Math.round(normLum * 100);

      if (skyW > 0.001) {
        const sR = skyR / skyW;
        const sG = skyG / skyW;
        const sB = skyB / skyW;
        estSkyR += (Math.max(195, Math.min(255, sR * 0.45 + 235 * 0.55)) - estSkyR) * alpha;
        estSkyG += (Math.max(195, Math.min(255, sG * 0.45 + 242 * 0.55)) - estSkyG) * alpha;
        estSkyB += (Math.max(195, Math.min(255, sB * 0.45 + 250 * 0.55)) - estSkyB) * alpha;
      }
      if (gndW > 0.001) {
        const gR = gndR / gndW;
        const gG = gndG / gndW;
        const gB = gndB / gndW;
        estGndR += (Math.max(95, Math.min(210, gR * 0.45 + 115 * 0.55)) - estGndR) * alpha;
        estGndG += (Math.max(95, Math.min(210, gG * 0.45 + 120 * 0.55)) - estGndG) * alpha;
        estGndB += (Math.max(95, Math.min(210, gB * 0.45 + 135 * 0.55)) - estGndB) * alpha;
      }

      const keyColorHex = rgbToHex(estKeyR, estKeyG, estKeyB);
      const skyColorHex = rgbToHex(estSkyR, estSkyG, estSkyB);
      const gndColorHex = rgbToHex(estGndR, estGndG, estGndB);

      hemiLight.color.set(skyColorHex);
      hemiLight.groundColor.set(gndColorHex);
      hemiLight.intensity = estAmbientIntensity * 1.35;
      rimLight.color.set(skyColorHex);
      renderer.toneMappingExposure = estExposure;

      const u = furSystem.sharedUniforms;
      u.uAmbientIntensity.value = estAmbientIntensity;
      u.uRimLightColor.value.set(skyColorHex);
      u.uEnvSkyColor.value.set(skyColorHex);
      u.uEnvGroundColor.value.set(gndColorHex);
      u.uEnvTintStrength.value = 0.20;

      if (typeof lightEstimatedCallback === 'function') {
        lightEstimatedCallback({
          isManualReset: false,
          keyColor: keyColorHex,
          lightAngle: Math.round(estLightAngle),
          lightIntensity: Number(estKeyIntensity.toFixed(2)),
          rimIntensity: Number(estRimIntensity.toFixed(2)),
          ambientIntensity: Number(estAmbientIntensity.toFixed(2)),
          exposure: Number(estExposure.toFixed(2)),
          kelvin: estKelvin,
          luminancePct: estLuminancePct
        });
      }
    } catch (_e) {
      // Ignore video read exception during startup
    }
  }

  function runVideoPlaneEstimation(time) {
    if (time - lastAnalysisTime < 1.5) return; // 1.5s interval: zero lag, maximum 60fps performance
    lastAnalysisTime = time;

    const source = isCameraLive && arVideo.readyState >= 2 ? arVideo : arFallbackCanvas;
    if (!source) return;

    try {
      cvCtx.drawImage(source, 0, 0, 160, 90);
      const imgData = cvCtx.getImageData(0, 0, 160, 90);
      const data = imgData.data;

      // 1. Luminance & Edge Horizon Analysis across lower 2/3 of camera feed
      let maxGrad = 0;
      let dominantY = 55;
      let lowerTextureSum = 0;
      let lowerCount = 0;

      for (let y = 25; y < 80; y++) {
        let rowGrad = 0;
        for (let x = 15; x < 145; x += 3) {
          const idx = (y * 160 + x) * 4;
          const idxUp = ((y - 2) * 160 + x) * 4;
          const idxDown = ((y + 2) * 160 + x) * 4;

          const lum = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
          const lumUp = (data[idxUp] * 299 + data[idxUp + 1] * 587 + data[idxUp + 2] * 114) / 1000;
          const lumDown = (data[idxDown] * 299 + data[idxDown + 1] * 587 + data[idxDown + 2] * 114) / 1000;

          const dy = Math.abs(lumDown - lumUp);
          rowGrad += dy;

          if (y > 45) {
            lowerTextureSum += dy;
            lowerCount++;
          }
        }
        if (rowGrad > maxGrad) {
          maxGrad = rowGrad;
          dominantY = y;
        }
      }

      const avgLowerTexture = lowerCount > 0 ? lowerTextureSum / lowerCount : 0;
      if (dominantY >= 32 && dominantY <= 65 && avgLowerTexture > 8.0) {
        estimatedPlaneHeight = -0.52; // elevated desk / tabletop
        estimatedSurfaceType = 'Tabletop / Desk';
        estimatedPlaneConfidence = Math.min(0.97, 0.84 + avgLowerTexture * 0.005);
      } else {
        estimatedPlaneHeight = -0.94; // floor / ground plane
        estimatedSurfaceType = 'Floor / Ground';
        estimatedPlaneConfidence = Math.min(0.96, 0.86 + avgLowerTexture * 0.003);
      }

      // 2. Feature Keypoint Extraction (Harris/FAST gradient corners on input video)
      const candFeatures = [];
      for (let y = 26; y < 85; y += 4) {
        for (let x = 12; x < 148; x += 5) {
          const idx = (y * 160 + x) * 4;
          const idxL = (y * 160 + (x - 2)) * 4;
          const idxR = (y * 160 + (x + 2)) * 4;
          const idxU = ((y - 2) * 160 + x) * 4;
          const idxD = ((y + 2) * 160 + x) * 4;

          const lum = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
          const lumL = (data[idxL] * 299 + data[idxL + 1] * 587 + data[idxL + 2] * 114) / 1000;
          const lumR = (data[idxR] * 299 + data[idxR + 1] * 587 + data[idxR + 2] * 114) / 1000;
          const lumU = (data[idxU] * 299 + data[idxU + 1] * 587 + data[idxU + 2] * 114) / 1000;
          const lumD = (data[idxD] * 299 + data[idxD + 1] * 587 + data[idxD + 2] * 114) / 1000;

          const gx = Math.abs(lumR - lumL);
          const gy = Math.abs(lumD - lumU);
          const score = gx + gy;

          if (score > 16.0) {
            candFeatures.push({ x, y, score, lum });
          }
        }
      }

      candFeatures.sort((a, b) => b.score - a.score);
      const chosen = candFeatures.slice(0, MAX_AR_FEATURES);
      detectedFeatureCount = chosen.length;

      // 3. Project 2D Video Features into 3D World Space on Estimated Surface Plane
      if (camera) {
        const posAttr = featureGeo.attributes.position;
        const confAttr = featureGeo.attributes.aConfidence;

        for (let i = 0; i < MAX_AR_FEATURES; i++) {
          if (i < chosen.length) {
            const f = chosen[i];
            const px = isMirrored ? (160 - f.x) : f.x;
            cvNdc.x = (px / 160) * 2.0 - 1.0;
            cvNdc.y = -(f.y / 90) * 2.0 + 1.0;

            arRaycaster.setFromCamera(cvNdc, camera);
            cvRay.copy(arRaycaster.ray);

            if (cvRay.direction.y < -0.01) {
              const t = (estimatedPlaneHeight - cvRay.origin.y) / cvRay.direction.y;
              const wx = cvRay.origin.x + cvRay.direction.x * t;
              const wy = estimatedPlaneHeight + (f.lum / 255.0 - 0.5) * 0.04;
              const wz = cvRay.origin.z + cvRay.direction.z * t;
              posAttr.setXYZ(i, wx, wy, wz);
              confAttr.setX(i, Math.min(1.0, f.score / 75.0));
            } else {
              posAttr.setXYZ(i, 0, -50, 0);
              confAttr.setX(i, 0);
            }
          } else {
            posAttr.setXYZ(i, 0, -50, 0);
            confAttr.setX(i, 0);
          }
        }
        posAttr.needsUpdate = true;
        confAttr.needsUpdate = true;
      }

      if (typeof planeDetectedCallback === 'function') {
        planeDetectedCallback({
          surfaceType: estimatedSurfaceType,
          planeY: estimatedPlaneHeight,
          confidence: estimatedPlaneConfidence,
          featureCount: detectedFeatureCount
        });
      }
    } catch (_e) {
      // Ignore video read exception during startup
    }
  }

  function estimatePlaneAt(ndcX, ndcY) {
    if (!camera) return null;
    cvNdc.set(ndcX, ndcY);
    arRaycaster.setFromCamera(cvNdc, camera);
    const ray = arRaycaster.ray;

    // Responsive plane estimation based on tap horizon:
    // Upper region (ndcY > -0.15) targets table/desk surface (-0.52)
    // Lower region (ndcY <= -0.15) targets floor/ground surface (-0.94)
    const isTable = ndcY > -0.15;
    const planeY = isTable ? -0.52 : -0.94;
    const surfaceType = isTable ? 'Tabletop / Desk' : 'Floor / Ground';
    const confidence = isTable ? 0.94 : 0.96;

    let t = 4.0;
    if (ray.direction.y < -0.01) {
      t = (planeY - ray.origin.y) / ray.direction.y;
      t = Math.max(0.2, t);
    }

    tempRaycastPoint.copy(ray.origin).addScaledVector(ray.direction, t);
    const dist = ray.origin.distanceTo(tempRaycastPoint);
    const depthMeters = dist * 0.42;

    estimatedPlaneHeight = planeY;
    estimatedSurfaceType = surfaceType;
    estimatedPlaneConfidence = confidence;

    if (typeof planeDetectedCallback === 'function') {
      planeDetectedCallback({
        surfaceType,
        planeY,
        confidence,
        featureCount: detectedFeatureCount
      });
    }

    return {
      point: tempRaycastPoint.clone(),
      normal: tempNormal,
      depth: depthMeters,
      planeY: planeY,
      surfaceType: surfaceType,
      confidence: confidence
    };
  }

  function triggerPlacementPulse(point) {
    cursorPulse = 1.0;
    arCursorUniforms.uPulse.value = 1.0;
    if (point) {
      currentAnchorPlaneY = point.y;
      arReticleMesh.position.set(point.x, point.y, point.z);
    }
  }

  function setARAnchor(point) {
    if (point) {
      currentAnchorPlaneY = point.y;
      arReticleMesh.position.set(point.x, point.y, point.z);
    }
  }

  function resetARAnchor() {
    currentAnchorPlaneY = -0.94;
    arReticleMesh.position.set(0, -0.94, 0);
    isSurfaceLocked = false;
  }

  function updateARCursor(ndcX, ndcY, isVisible) {
    if (!isVisible || currentEnvId !== 'ar') {
      arCursorMesh.visible = false;
      return;
    }
    const hit = estimatePlaneAt(ndcX, ndcY);
    if (hit) {
      arCursorMesh.position.set(hit.point.x, hit.planeY + 0.005, hit.point.z);
      arCursorMesh.visible = true;
    } else {
      arCursorMesh.visible = false;
    }
  }

  function onPlaneDetected(cb) {
    planeDetectedCallback = cb;
  }

  function notifyARStatus(text, isLive) {
    if (typeof statusCallback === 'function') {
      statusCallback(text, isLive);
    }
  }

  function applyMirrorStyle() {
    const transform = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    arVideo.style.transform = transform;
  }
  applyMirrorStyle();

  async function startARCamera() {
    stopARCamera();
    arFallbackCanvas.style.display = 'block';

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      isCameraLive = false;
      arVideo.style.display = 'none';
      arFallbackCanvas.style.display = 'block';
      notifyARStatus('Simulated AR Room Feed (Camera API unavailable)', false);
      return;
    }

    notifyARStatus('Requesting camera access...', false);
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Camera request timed out')), 1200);
      });

      let stream = null;
      try {
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false
          }),
          timeoutPromise
        ]);
      } catch (_innerErr) {
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          }),
          timeoutPromise
        ]);
      }

      if (currentEnvId !== 'ar') {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      activeStream = stream;
      arVideo.srcObject = stream;
      await arVideo.play();
      isCameraLive = true;
      arFallbackCanvas.style.display = 'none';
      arVideo.style.display = 'block';
      notifyARStatus('Live Camera Active', true);
    } catch (_err) {
      if (currentEnvId !== 'ar') return;
      isCameraLive = false;
      arVideo.style.display = 'none';
      arFallbackCanvas.style.display = 'block';
      notifyARStatus('Simulated AR Room Feed (Camera permission declined)', false);
    }
  }

  function stopARCamera() {
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      activeStream = null;
    }
    arVideo.srcObject = null;
    arVideo.style.display = 'none';
    arFallbackCanvas.style.display = 'none';
    isCameraLive = false;
  }

  function renderSimulatedARFeed(elapsedTime) {
    if (!arFallbackCtx) return;
    const w = arFallbackCanvas.width;
    const h = arFallbackCanvas.height;

    const g = arFallbackCtx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, '#cbd5e1');
    g.addColorStop(0.48, '#94a3b8');
    g.addColorStop(0.52, '#64748b');
    g.addColorStop(1.0, '#334155');
    arFallbackCtx.fillStyle = g;
    arFallbackCtx.fillRect(0, 0, w, h);

    const panX = Math.sin(elapsedTime * 0.4) * 28;
    const panY = Math.cos(elapsedTime * 0.3) * 14;
    const sunGrad = arFallbackCtx.createRadialGradient(
      w * 0.65 + panX,
      h * 0.32 + panY,
      20,
      w * 0.65 + panX,
      h * 0.32 + panY,
      240
    );
    sunGrad.addColorStop(0.0, 'rgba(254, 249, 195, 0.45)');
    sunGrad.addColorStop(1.0, 'rgba(254, 249, 195, 0.0)');
    arFallbackCtx.fillStyle = sunGrad;
    arFallbackCtx.fillRect(0, 0, w, h);

    arFallbackCtx.strokeStyle = 'rgba(103, 232, 249, 0.45)';
    arFallbackCtx.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) {
      const fx = ((i * 97 + 50) % (w - 80)) + 40 + panX * (0.4 + (i % 3) * 0.25);
      const fy = ((i * 67 + 120) % (h - 90)) + 60 + panY * 0.5;
      arFallbackCtx.beginPath();
      arFallbackCtx.moveTo(fx - 5, fy);
      arFallbackCtx.lineTo(fx + 5, fy);
      arFallbackCtx.moveTo(fx, fy - 5);
      arFallbackCtx.lineTo(fx, fy + 5);
      arFallbackCtx.stroke();
    }
  }

  // --------------------------------------------------------------------------
  // APPLY ENVIRONMENT PRESET & SYNCHRONIZE 3D LIGHTING
  // --------------------------------------------------------------------------
  function setEnvironment(envId) {
    const safeId = sanitizeEnvId(envId, 'studio');
    currentEnvId = safeId;

    document.body.setAttribute('data-env', safeId);

    studioGroup.visible = safeId === 'studio';
    meadowGroup.visible = safeId === 'meadow';
    highriseGroup.visible = safeId === 'highrise';
    arGroup.visible = safeId === 'ar';

    tiltShiftOverlay.style.display = 'none';

    if (camera) {
      camera.position.set(0, 1.5, 4);
      camera.lookAt(0, 1, 0);
    }

    if (safeId === 'ar') {
      arReticleMesh.scale.set(0.35, 0.35, 0.35);
      arCursorMesh.scale.set(0.35, 0.35, 0.35);
      if (!isCameraLive) {
        renderSimulatedARFeed(0);
      }
      startARCamera();
    } else {
      arReticleMesh.scale.set(1.0, 1.0, 1.0);
      arCursorMesh.scale.set(1.0, 1.0, 1.0);
      stopARCamera();
    }

    const preset = ENVIRONMENT_PRESETS.find((p) => p.id === safeId) || ENVIRONMENT_PRESETS[0];

    keyLight.color.set(preset.keyColor);
    rimLight.color.set(preset.rimColor);
    if (preset.rimLightPos) {
      rimLight.position.set(preset.rimLightPos[0], preset.rimLightPos[1], preset.rimLightPos[2]);
    }
    hemiLight.color.set(preset.hemiSkyColor);
    hemiLight.groundColor.set(preset.hemiGroundColor);
    hemiLight.intensity = preset.hemiIntensity;
    renderer.toneMappingExposure = preset.exposure;

    const u = furSystem.sharedUniforms;
    u.uKeyLightColor.value.set(preset.keyColor);
    u.uRimLightColor.value.set(preset.rimColor);
    if (preset.rimLightPos) {
      u.uRimLightDir.value.set(preset.rimLightPos[0], preset.rimLightPos[1], preset.rimLightPos[2]).normalize();
    }
    u.uAmbientIntensity.value = preset.ambientIntensity;
    u.uEnvSkyColor.value.set(preset.envSkyColor);
    u.uEnvGroundColor.value.set(preset.envGroundColor);
    u.uEnvTintStrength.value = preset.envTintStrength;

    if (safeId === 'ar' && lightEstimationEnabled) {
      runARLightEstimation(performance.now() * 0.001, true);
    }

    return preset;
  }

  function applyNeutralARLighting() {
    const arPreset = ENVIRONMENT_PRESETS.find((p) => p.id === 'ar') || ENVIRONMENT_PRESETS[3];
    keyLight.color.set(arPreset.keyColor);
    rimLight.color.set(arPreset.rimColor);
    if (arPreset.rimLightPos) {
      rimLight.position.set(arPreset.rimLightPos[0], arPreset.rimLightPos[1], arPreset.rimLightPos[2]);
    }
    hemiLight.color.set(arPreset.hemiSkyColor);
    hemiLight.groundColor.set(arPreset.hemiGroundColor);
    hemiLight.intensity = arPreset.hemiIntensity;
    renderer.toneMappingExposure = arPreset.exposure;

    const u = furSystem.sharedUniforms;
    u.uKeyLightColor.value.set(arPreset.keyColor);
    u.uRimLightColor.value.set(arPreset.rimColor);
    if (arPreset.rimLightPos) {
      u.uRimLightDir.value.set(arPreset.rimLightPos[0], arPreset.rimLightPos[1], arPreset.rimLightPos[2]).normalize();
    }
    u.uAmbientIntensity.value = arPreset.ambientIntensity;
    u.uEnvSkyColor.value.set(arPreset.envSkyColor);
    u.uEnvGroundColor.value.set(arPreset.envGroundColor);
    u.uEnvTintStrength.value = arPreset.envTintStrength;

    if (typeof lightEstimatedCallback === 'function') {
      lightEstimatedCallback({
        isManualReset: true,
        keyColor: arPreset.keyColor,
        lightAngle: arPreset.lightAngle,
        lightIntensity: arPreset.lightIntensity,
        rimIntensity: arPreset.rimIntensity,
        ambientIntensity: arPreset.ambientIntensity,
        exposure: arPreset.exposure,
        kelvin: 5500,
        luminancePct: 100
      });
    }
  }

  function toggleMirror() {
    isMirrored = !isMirrored;
    applyMirrorStyle();
    return isMirrored;
  }

  function flipCamera() {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    if (currentEnvId === 'ar') {
      startARCamera();
    }
    return facingMode;
  }

  function onARStatusChange(cb) {
    statusCallback = cb;
  }

  // --------------------------------------------------------------------------
  // ZERO-GC PER-FRAME UPDATE
  // --------------------------------------------------------------------------
  function update(elapsedTime, windStrength, creatureRoot) {
    const liftFromGround = Math.max(0.0, creatureRoot.position.y - 0.94);
    const shadowScale = Math.max(0.45, 1.0 - liftFromGround * 0.35);
    const cx = creatureRoot.position.x * 0.7;

    if (currentEnvId === 'studio') {
      studioShadowMesh.scale.set(shadowScale, shadowScale, 1.0);
      studioShadowMesh.position.x = cx;
      studioMotes.rotation.y = elapsedTime * 0.04;
    } else if (currentEnvId === 'meadow') {
      meadowUniforms.uTime.value = elapsedTime;
      meadowUniforms.uWindStrength.value = windStrength;
      const kd = furSystem.sharedUniforms.uKeyLightDir.value;
      meadowUniforms.uSunDir.value.set(kd.x, 0.24, kd.z).normalize();
      meadowPollen.rotation.y = elapsedTime * 0.045;
      meadowPollen.position.y = Math.sin(elapsedTime * 0.85) * 0.10;
    } else if (currentEnvId === 'highrise') {
      highriseUniforms.uTime.value = elapsedTime;
      highriseUniforms.uCreatureXZ.value.set(creatureRoot.position.x, creatureRoot.position.z);
      highriseUniforms.uCreatureLift.value = liftFromGround;
      deskContactShadowMesh.scale.set(shadowScale, shadowScale, 1.0);
      deskContactShadowMesh.position.x = creatureRoot.position.x;
      deskContactShadowMesh.position.z = creatureRoot.position.z;
      cozyLampLight.intensity = 3.2 + Math.sin(elapsedTime * 3.5) * 0.08;
      leftCandleLight.intensity = 1.85 + Math.cos(elapsedTime * 2.8) * 0.06;
      deskWarmMotes.rotation.y = elapsedTime * 0.03;
      deskWarmMotes.position.y = Math.sin(elapsedTime * 0.9) * 0.06;
    } else if (currentEnvId === 'ar') {
      arUniforms.uTime.value = elapsedTime;
      arUniforms.uShadowScale.value = shadowScale;
      arReticleMesh.position.x = creatureRoot.position.x;
      arReticleMesh.position.z = creatureRoot.position.z;
      arReticleMesh.position.y = currentAnchorPlaneY;

      // Placement pulse animation decay
      if (cursorPulse > 0.001) {
        cursorPulse *= 0.92;
        arCursorUniforms.uPulse.value = 1.0 - cursorPulse;
      } else {
        cursorPulse = 0.0;
        arCursorUniforms.uPulse.value = 0.0;
      }

      if (!isCameraLive) {
        renderSimulatedARFeed(elapsedTime);
      }

      runVideoPlaneEstimation(elapsedTime);
      runARLightEstimation(elapsedTime);
    }
  }

  return {
    setEnvironment,
    getEnvironment: () => currentEnvId,
    toggleMirror,
    flipCamera,
    retryCamera: startARCamera,
    onARStatusChange,
    onPlaneDetected,
    onLightEstimated: (cb) => {
      lightEstimatedCallback = cb;
    },
    setLightEstimationEnabled: (enabled) => {
      lightEstimationEnabled = Boolean(enabled);
      if (currentEnvId === 'ar') {
        if (lightEstimationEnabled) {
          runARLightEstimation(performance.now() * 0.001, true);
        } else {
          applyNeutralARLighting();
        }
      }
    },
    isLightEstimationEnabled: () => lightEstimationEnabled,
    onSurfaceTracked: () => {},
    setSurfaceTrackingEnabled: () => {},
    isSurfaceLocked: () => false,
    estimatePlaneAt,
    triggerPlacementPulse,
    setARAnchor,
    resetARAnchor,
    updateARCursor,
    getPlaneInfo: () => ({
      surfaceType: estimatedSurfaceType,
      planeY: estimatedPlaneHeight,
      confidence: estimatedPlaneConfidence,
      featureCount: detectedFeatureCount
    }),
    update,
    dispose: () => {
      stopARCamera();
      arVideo.remove();
      arFallbackCanvas.remove();
      tiltShiftOverlay.remove();
    }
  };
}
