import * as THREE from 'three';

export interface LightingRig {
  ambientLight: THREE.AmbientLight;
  keyLight: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  deskLampLight: THREE.PointLight;
  group: THREE.Group;
  applyPreset: (presetId: string) => EnvironmentPreset;
}

export interface EnvironmentPreset {
  id: string;
  name: string;
  subtitle: string;
  keyColor: string;
  keyIntensity: number;
  rimColor: string;
  rimIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  keyPos: [number, number, number];
  rimPos: [number, number, number];
  background: string;
  lightAngle: number;
  windStrength: number;
  deskLampIntensity?: number;
}

/**
 * Calibrated light intensities across all presets for ACESFilmicToneMapping (exposure 0.9)
 * so volumetric fur displays crisp strand definition, natural self-shadowing, and zero blowout,
 * while the Cozy Desk environment is warmly and evenly illuminated.
 */
export const LIGHTING_PRESETS: Record<string, EnvironmentPreset> = {
  studio: {
    id: 'studio',
    name: 'Studio Softbox',
    subtitle: 'Dark Cyclorama',
    keyColor: '#fff7ed',
    keyIntensity: 0.48,
    rimColor: '#c4b5fd',
    rimIntensity: 0.38,
    hemiSky: '#e0f2fe',
    hemiGround: '#1e293b',
    hemiIntensity: 0.32,
    ambientColor: '#cbd5e1',
    ambientIntensity: 0.24,
    keyPos: [2.4, 3.1, 2.6],
    rimPos: [-2.4, 2.6, -3.2],
    background: '#090d16',
    lightAngle: -74,
    windStrength: 0.85,
    deskLampIntensity: 0.0,
  },
  meadow: {
    id: 'meadow',
    name: 'Cloud Sky',
    subtitle: 'Blue Sky & Clouds',
    keyColor: '#fffbeb',
    keyIntensity: 0.52,
    rimColor: '#e0f2fe',
    rimIntensity: 0.38,
    hemiSky: '#60a5fa',
    hemiGround: '#1e293b',
    hemiIntensity: 0.36,
    ambientColor: '#e2e8f0',
    ambientIntensity: 0.26,
    keyPos: [3.0, 4.2, 2.2],
    rimPos: [-2.5, 2.0, -2.5],
    background: '#0c1626',
    lightAngle: 137,
    windStrength: 0.70,
    deskLampIntensity: 0.0,
  },
  highrise: {
    id: 'highrise',
    name: 'Cozy Desk',
    subtitle: 'Warm Study & Lamp',
    keyColor: '#ffedd5',
    keyIntensity: 0.62,
    rimColor: '#fdba74',
    rimIntensity: 0.44,
    hemiSky: '#fed7aa',
    hemiGround: '#7c2d12',
    hemiIntensity: 0.52,
    ambientColor: '#ffedd5',
    ambientIntensity: 0.42,
    keyPos: [2.2, 3.4, 2.8],
    rimPos: [-2.4, 2.4, -2.6],
    background: '#18121e',
    lightAngle: 42,
    windStrength: 0.25,
    deskLampIntensity: 2.6,
  },
  sunset: {
    id: 'sunset',
    name: 'Warm Sunset',
    subtitle: 'Twilight Horizon',
    keyColor: '#ffedd5',
    keyIntensity: 0.62,
    rimColor: '#fdba74',
    rimIntensity: 0.44,
    hemiSky: '#fed7aa',
    hemiGround: '#7c2d12',
    hemiIntensity: 0.52,
    ambientColor: '#ffedd5',
    ambientIntensity: 0.42,
    keyPos: [2.2, 3.4, 2.8],
    rimPos: [-2.4, 2.4, -2.6],
    background: '#18121e',
    lightAngle: 42,
    windStrength: 0.25,
    deskLampIntensity: 2.6,
  },
  midnight: {
    id: 'midnight',
    name: 'Cyber Midnight',
    subtitle: 'Neon Rim Studio',
    keyColor: '#38bdf8',
    keyIntensity: 0.44,
    rimColor: '#ec4899',
    rimIntensity: 0.46,
    hemiSky: '#818cf8',
    hemiGround: '#0f172a',
    hemiIntensity: 0.28,
    ambientColor: '#6366f1',
    ambientIntensity: 0.22,
    keyPos: [2.0, 3.0, 2.5],
    rimPos: [-2.5, 2.5, -2.5],
    background: '#050811',
    lightAngle: -45,
    windStrength: 0.65,
    deskLampIntensity: 0.0,
  },
};

/**
 * Creates and mounts a calibrated 3-point + hemisphere + warm desk PointLight lighting rig
 * with soft shadow casting and clean illumination across all environments.
 */
export function createLightingRig(scene: THREE.Scene, initialPreset = 'studio'): LightingRig {
  const group = new THREE.Group();
  group.name = 'LightingRig';

  const preset = LIGHTING_PRESETS[initialPreset] || LIGHTING_PRESETS.studio;

  // Key light with soft shadow mapping centered around (0, 1, 0)
  const keyLight = new THREE.DirectionalLight(preset.keyColor, preset.keyIntensity);
  keyLight.position.set(...preset.keyPos);
  keyLight.target.position.set(0, 0.8, 0);
  group.add(keyLight.target);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  keyLight.shadow.radius = 3.0;
  keyLight.shadow.camera.left = -4.5;
  keyLight.shadow.camera.right = 4.5;
  keyLight.shadow.camera.top = 4.5;
  keyLight.shadow.camera.bottom = -4.5;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 16;
  keyLight.shadow.camera.updateProjectionMatrix();
  group.add(keyLight);

  // Soft rim light for fur silhouette separation
  const rimLight = new THREE.DirectionalLight(preset.rimColor, preset.rimIntensity);
  rimLight.position.set(...preset.rimPos);
  group.add(rimLight);

  // Subtle hemisphere fill
  const hemiLight = new THREE.HemisphereLight(
    preset.hemiSky,
    preset.hemiGround,
    preset.hemiIntensity
  );
  hemiLight.position.set(0, 8, 0);
  group.add(hemiLight);

  // Ambient light with controlled floor so scenes are never pitch black
  const ambientLight = new THREE.AmbientLight(preset.ambientColor, preset.ambientIntensity);
  group.add(ambientLight);

  // Dedicated Warm Desk Lamp PointLight for the Cozy Desk scene
  const deskLampLight = new THREE.PointLight(
    '#ffb366',
    preset.deskLampIntensity ?? 0.0,
    16.0,
    1.25
  );
  deskLampLight.position.set(1.65, 1.85, -0.45);
  deskLampLight.castShadow = false; // Avoid harsh double-shadow artifacts on fur shells
  group.add(deskLampLight);

  scene.add(group);

  const applyPreset = (presetId: string): EnvironmentPreset => {
    const normalized = presetId === 'sunset' ? 'highrise' : presetId;
    const target = LIGHTING_PRESETS[normalized] || LIGHTING_PRESETS.studio;
    keyLight.color.set(target.keyColor);
    keyLight.intensity = target.keyIntensity;
    keyLight.position.set(...target.keyPos);

    rimLight.color.set(target.rimColor);
    rimLight.intensity = target.rimIntensity;
    rimLight.position.set(...target.rimPos);

    hemiLight.color.set(target.hemiSky);
    hemiLight.groundColor.set(target.hemiGround);
    hemiLight.intensity = target.hemiIntensity;

    ambientLight.color.set(target.ambientColor);
    ambientLight.intensity = target.ambientIntensity;

    deskLampLight.intensity = target.deskLampIntensity ?? 0.0;
    return target;
  };

  return {
    ambientLight,
    keyLight,
    rimLight,
    hemiLight,
    deskLampLight,
    group,
    applyPreset,
  };
}
