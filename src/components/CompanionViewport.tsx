import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Eye, Settings, X, Sparkles, Camera, Focus, RotateCcw } from 'lucide-react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createBlobCreature } from '../blobCreature.js';
import { FluffCreature } from '../three/FluffCreature';
import { createProceduralWings } from '../three/Wings';
import { createParticleTrail } from '../three/ParticleTrail';
import { createProceduralDuck } from '../three/Duck';
import { createGPUFurPhysics } from '../gpuPhysics.js';
import { createGPUFurSystem } from '../furSystem.js';
import { createEnvironmentManager } from '../environments.js';
import { createLightingRig, LIGHTING_PRESETS } from '../three/lightingEnvironments';
import { playCuteSound, cuteAudioSynth } from '../services/audioSynth';
import {
  CharacterProfile,
  getActiveCharacterProfile,
  getCharacterProfileById,
} from '../data/characterPresets';
import { getCachedOmniscienceSettings } from '../services/omniscienceSettings';
import { ViewportAudioWaveform, CompanionMoodState } from './ViewportAudioWaveform';

export interface FurParamsState {
  baseColor: string;
  tipColor: string;
  furLength: number;
  furDensity: number;
  roughness: number;
  specular: number;
  clumping: number;
  curliness: number;
  windStrength: number;
  lightIntensity: number;
  rimIntensity: number;
  exposure: number;
  bloomStrength: number;
  environment: string;
  gpuFurEnabled: boolean;
}

export interface CreatureHandle {
  creature: any;
  fluffCreature: FluffCreature;
  furSystem: any;
  setFurColor: (baseHex: string, tipHex: string) => void;
  setEnvironment: (presetId: string) => void;
  triggerBoop: (strength?: number) => void;
  setMouthScale: (scale: number) => void;
  connectAudioStream: (stream: MediaStream) => void;
  triggerFlight: (active?: boolean, durationSec?: number) => void;
  changeSize: (size: string | number) => void;
  catchDuck: () => void;
  triggerButtonPress: (coords?: { x?: number; y?: number; z?: number }) => void;
  setGhostMode?: (active: boolean, label?: string) => void;
  applyCharacterProfile: (profile: CharacterProfile) => void;
  updateFurParam: (key: keyof FurParamsState, value: any) => void;
  captureVisionJpeg?: (quality?: number) => string;
  setAutoFollowCamera?: (enabled: boolean) => void;
  isAutoFollowCamera?: () => boolean;
  resetCameraView?: () => void;
  getState: () => FurParamsState;
}

interface CompanionViewportProps {
  onCreatureReady?: (handle: CreatureHandle) => void;
  toneMappingExposure?: number;
  onRadialVoice?: () => void;
  onRadialVision?: () => void;
  onRadialSettings?: () => void;
  isDragOver?: boolean;
  companionState?: CompanionMoodState;
  isCinemaHidden?: boolean;
}

export const CompanionViewport: React.FC<CompanionViewportProps> = ({
  onCreatureReady,
  toneMappingExposure = 0.9, // Calibrated 0.9 ACESFilmic exposure to preserve crisp fur depth
  onRadialVoice,
  onRadialVision,
  onRadialSettings,
  isDragOver = false,
  companionState = 'idle',
  isCinemaHidden = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const fluffCreatureInstanceRef = useRef<FluffCreature | null>(null);
  const callbackRef = useRef(onCreatureReady);
  callbackRef.current = onCreatureReady;

  const [radialMenu, setRadialMenu] = useState<{ open: boolean; x: number; y: number }>({
    open: false,
    x: 0,
    y: 0,
  });
  const [ghostHud, setGhostHud] = useState<{ active: boolean; label: string }>({
    active: false,
    label: 'Ghost Co-Pilot Active · Working in Background',
  });
  const ghostModeRef = useRef<{ active: boolean; label: string; timer: any }>({
    active: false,
    label: '',
    timer: null,
  });
  const [isMeditating, setIsMeditating] = useState(false);
  const [meditateLabel, setMeditateLabel] = useState('Channeling Multi-Agent Intelligence...');
  const [processingBadge, setProcessingBadge] = useState<{
    type: 'local' | 'cloud';
    label: string;
  } | null>(null);
  const [floatingImage, setFloatingImage] = useState<{
    url: string;
    prompt: string;
    source?: string;
  } | null>(null);

  // Omniscient Mode UI Indicators (Live Vision & System Audio Waveform)
  const [isLiveVisionOn, setIsLiveVisionOn] = useState(false);
  const [isSystemAudioOn, setIsSystemAudioOn] = useState(false);
  const [audioWaveLevel, setAudioWaveLevel] = useState(0);
  const [liveVisionPulse, setLiveVisionPulse] = useState(false);

  // Auto-Follow Camera State (Centering creature during movement & 3D flight animations)
  const [isAutoFollow, setIsAutoFollow] = useState(true);
  const isAutoFollowRef = useRef(true);
  isAutoFollowRef.current = isAutoFollow;

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const resetCameraViewRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const getWidth = () =>
      Math.max(320, container.clientWidth || Math.floor(window.innerWidth * 0.7));
    const getHeight = () => Math.max(320, container.clientHeight || window.innerHeight);

    const initialW = getWidth();
    const initialH = getHeight();

    // Detect software WebGL fallback for optimal frame pacing
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 1. WebGL2 Renderer with preserveDrawingBuffer for Vision capture & calibrated ACESFilmic 0.9 exposure
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
      preserveDrawingBuffer: true,
    });
    const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(initialW, initialH);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className =
      'w-full h-full block outline-none cursor-grab active:cursor-grabbing';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Scene, Studio Reflection Environment & Camera centered on Mochi-Puff
    const scene = new THREE.Scene();
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // Proceed if PMREM fails
    }

    const camera = new THREE.PerspectiveCamera(42, initialW / initialH, 0.1, 80);
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 1, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.2;
    controls.maxDistance = 12.0;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.target.set(0, 1, 0);

    cameraRef.current = camera;
    controlsRef.current = controls;

    const resetCameraView = () => {
      controls.target.set(0, 1, 0);
      camera.position.set(0, 1.5, 4);
      controls.update();
      playCuteSound('boop');
    };
    resetCameraViewRef.current = resetCameraView;

    // 3. Post-Processing Pipeline: RenderPass -> SSAO -> DepthOfField (Bokeh) -> Bloom -> OutputPass
    const renderTarget = new THREE.WebGLRenderTarget(initialW, initialH, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      samples: isSoftwareGl ? 0 : 4,
    });
    const composer = new EffectComposer(renderer, renderTarget);
    const renderPass = new RenderPass(scene, camera);
    renderPass.clearAlpha = 0;
    composer.addPass(renderPass);

    let ssaoPass: SSAOPass | null = null;
    let depthOfFieldPass: BokehPass | null = null;
    if (!isSoftwareGl) {
      try {
        ssaoPass = new SSAOPass(scene, camera, initialW, initialH);
        ssaoPass.kernelRadius = 0.28;
        ssaoPass.minDistance = 0.002;
        ssaoPass.maxDistance = 0.08;
        composer.addPass(ssaoPass);
      } catch {
        ssaoPass = null;
      }

      try {
        depthOfFieldPass = new BokehPass(scene, camera, {
          focus: 4.0,
          aperture: 0.00004,
          maxblur: 0.002,
        });
        depthOfFieldPass.enabled = false;
        composer.addPass(depthOfFieldPass);
      } catch {
        depthOfFieldPass = null;
      }
    }

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(initialW, initialH),
      0.10,
      0.38,
      0.92
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // 4. Calibrated Studio Softbox Lighting Rig
    const lightingRig = createLightingRig(scene, 'studio');

    // 5. Simulation State (crisp furLength 0.22, furDensity 0.88, bloomStrength 0.10, exposure 0.9)
    const simState: FurParamsState = {
      baseColor: '#e0ecfa',
      tipColor: '#ffffff',
      furLength: 0.22,
      furDensity: 0.88,
      roughness: 0.68,
      specular: 0.24,
      clumping: 0.32,
      curliness: 0.22,
      windStrength: 0.85,
      lightIntensity: 0.48,
      rimIntensity: 0.38,
      exposure: 0.9,
      bloomStrength: 0.10,
      environment: 'studio',
      gpuFurEnabled: true,
    };

    // 6. Stylized Fluffy Creature, Procedural Angelic Wings, Magical Particle Trail & Duck NPC
    const creature = createBlobCreature();
    scene.add(creature.root);

    const wings = createProceduralWings();
    creature.root.add(wings.group);

    const particleTrail = createParticleTrail(340);
    scene.add(particleTrail.points);

    const duckNPC = createProceduralDuck();
    scene.add(duckNPC.group);

    const gpuPhysics = createGPUFurPhysics(renderer);
    if (simState.gpuFurEnabled && !gpuPhysics.isGPGPUActive) {
      simState.gpuFurEnabled = false;
    }

    const furSystem = createGPUFurSystem(creature.bodyGeometry, {
      ...simState,
      keyColor: '#fff7ed',
      lightAngle: -74,
    });

    creature.root.add(furSystem.shellMesh);
    creature.root.add(furSystem.strandMesh);

    // 6b. 3D Spatial Monochrome Audio Frequency Visualizer (In-World 3D Frequency Spectrum Ring)
    const audioVisualizerGroup = new THREE.Group();
    audioVisualizerGroup.position.set(0, 0.03, 0);
    scene.add(audioVisualizerGroup);

    const freqBarCount = 64;
    const freqBars: THREE.Mesh[] = [];
    const barGeo = new THREE.BoxGeometry(0.018, 1.0, 0.065);
    const barMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
    });

    const baseRingRadius = 1.28;
    for (let i = 0; i < freqBarCount; i++) {
      const angle = (i / freqBarCount) * Math.PI * 2;
      const bar = new THREE.Mesh(barGeo, barMat.clone());
      bar.position.set(
        Math.cos(angle) * baseRingRadius,
        0.02,
        Math.sin(angle) * baseRingRadius
      );
      bar.rotation.y = -angle + Math.PI / 2;
      bar.scale.set(1, 0.025, 1);
      audioVisualizerGroup.add(bar);
      freqBars.push(bar);
    }

    const innerWaveRingGeo = new THREE.RingGeometry(1.18, 1.205, 96);
    innerWaveRingGeo.rotateX(-Math.PI / 2);
    const innerWaveRingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const innerWaveRing = new THREE.Mesh(innerWaveRingGeo, innerWaveRingMat);
    innerWaveRing.position.y = 0.005;
    audioVisualizerGroup.add(innerWaveRing);

    const outerWaveRingGeo = new THREE.RingGeometry(1.38, 1.40, 96);
    outerWaveRingGeo.rotateX(-Math.PI / 2);
    const outerWaveRingMat = new THREE.MeshBasicMaterial({
      color: 0xd4d4d8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const outerWaveRing = new THREE.Mesh(outerWaveRingGeo, outerWaveRingMat);
    outerWaveRing.position.y = 0.004;
    audioVisualizerGroup.add(outerWaveRing);


    // 7. Full 3D Environment Manager (Studio Cyclorama, Cloud Sky, Cozy Desk, AR)
    const envManager = createEnvironmentManager({
      scene,
      renderer,
      container,
      keyLight: lightingRig.keyLight,
      rimLight: lightingRig.rimLight,
      hemiLight: lightingRig.hemiLight,
      furSystem,
      camera,
    });

    let jellyPhase = 0.0;
    let jellyAmplitude = 0.0;

    const syncLightingUniforms = (presetId: string) => {
      const preset = LIGHTING_PRESETS[presetId] || LIGHTING_PRESETS.studio;
      const rad = (preset.lightAngle * Math.PI) / 180.0;
      const lx = Math.sin(rad) * 2.8;
      const ly = 2.4;
      const lz = Math.cos(rad) * 2.8;

      lightingRig.keyLight.position.set(lx, ly, lz);
      lightingRig.keyLight.intensity = simState.lightIntensity;
      lightingRig.rimLight.intensity = simState.rimIntensity;
      lightingRig.keyLight.color.set(preset.keyColor);

      const u = furSystem.sharedUniforms;
      if (u) {
        u.uKeyLightColor.value.set(preset.keyColor);
        u.uKeyLightDir.value.set(lx, ly, lz).normalize();
        u.uKeyLightIntensity.value = simState.lightIntensity;
        u.uRimIntensity.value = simState.rimIntensity;
      }

      if (creature.skinMaterial) {
        creature.skinMaterial.color.set(simState.baseColor).multiplyScalar(0.55);
      }
    };

    const applyEnvironment = (presetId: string) => {
      const normalized = presetId === 'sunset' ? 'highrise' : presetId;
      simState.environment = presetId;

      const rigPreset = lightingRig.applyPreset(presetId);
      simState.lightIntensity = rigPreset.keyIntensity;
      simState.rimIntensity = rigPreset.rimIntensity;
      simState.windStrength = rigPreset.windStrength;

      const envIdForManager = ['studio', 'meadow', 'highrise', 'ar'].includes(normalized)
        ? normalized
        : 'studio';
      envManager.setEnvironment(envIdForManager);

      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = simState.exposure;

      // Keep Mochi-Puff centered at (0, 0.94, 0) standing on y = 0.0 across all scenes (including Cozy Desk)
      creature.setEnvironmentScale(1.0, 0.0, 0.0);

      camera.position.set(0, 1.5, 4);
      camera.lookAt(0, 1, 0);
      controls.target.set(0, 1, 0);
      controls.minDistance = 2.2;
      controls.maxDistance = 12.0;
      controls.update();

      // Keep BokehPass disabled so multisampled HalfFloatType renderTarget never blurs or blacks out Cozy Desk
      if (depthOfFieldPass) {
        depthOfFieldPass.enabled = false;
      }

      if (furSystem.sharedUniforms) {
        furSystem.sharedUniforms.uWindStrength.value = simState.windStrength;
      }
      syncLightingUniforms(presetId);
    };

    applyEnvironment('studio');

    const setFurColor = (baseHex: string, tipHex: string) => {
      simState.baseColor = baseHex;
      simState.tipColor = tipHex;
      if (furSystem.sharedUniforms) {
        furSystem.sharedUniforms.uBaseColor.value.set(baseHex);
        furSystem.sharedUniforms.uTipColor.value.set(tipHex);
      }
      if (creature.skinMaterial) {
        creature.skinMaterial.color.set(baseHex).multiplyScalar(0.55);
      }
      wings.setTint(tipHex);
    };

    const setEnvironment = (presetId: string) => {
      applyEnvironment(presetId);
    };

    const triggerBoop = (strength = 1.0) => {
      (creature as any).triggerBoop?.(strength);
      fluffCreature?.triggerBoop?.(strength);
      boopShockwave = strength;
      jellyAmplitude = Math.min(0.38, 0.26 * strength);
      jellyPhase = 0.0;
    };

    const updateFurParam = (key: keyof FurParamsState, value: any) => {
      (simState as any)[key] = value;
      const u = furSystem.sharedUniforms;
      if (!u) return;

      switch (key) {
        case 'baseColor':
          u.uBaseColor.value.set(value);
          creature.skinMaterial?.color.set(value).multiplyScalar(0.55);
          break;
        case 'tipColor':
          u.uTipColor.value.set(value);
          wings.setTint(String(value));
          break;
        case 'furLength':
          u.uFurLength.value = Number(value);
          break;
        case 'furDensity':
          furSystem.updateDensity(Number(value));
          break;
        case 'roughness':
          u.uRoughness.value = Number(value);
          break;
        case 'specular':
          u.uSpecular.value = Number(value);
          break;
        case 'clumping':
          u.uClumping.value = Number(value);
          break;
        case 'curliness':
          u.uCurliness.value = Number(value);
          break;
        case 'windStrength':
          u.uWindStrength.value = Number(value);
          break;
        case 'lightIntensity':
          simState.lightIntensity = Number(value);
          lightingRig.keyLight.intensity = Number(value);
          u.uKeyLightIntensity.value = Number(value);
          break;
        case 'rimIntensity':
          simState.rimIntensity = Number(value);
          lightingRig.rimLight.intensity = Number(value);
          u.uRimIntensity.value = Number(value);
          break;
        case 'exposure':
          simState.exposure = Number(value);
          renderer.toneMappingExposure = Number(value);
          break;
        case 'bloomStrength':
          simState.bloomStrength = Number(value);
          bloomPass.strength = Number(value);
          break;
        case 'environment':
          applyEnvironment(String(value));
          break;
        case 'gpuFurEnabled':
          simState.gpuFurEnabled = Boolean(value);
          furSystem.setGPUFurEnabled(Boolean(value));
          break;
        default:
          break;
      }
    };

    const fluffCreature = new FluffCreature(creature);
    fluffCreature.setFurSystem(furSystem);
    fluffCreatureInstanceRef.current = fluffCreature;
    if (typeof window !== 'undefined') {
      (window as any).__fluffCreatureRef = fluffCreature;
      (window as any).__furSystemRef = furSystem;
    }

    const applyCharacterProfile = (profile: CharacterProfile) => {
      if (!profile) return;
      fluffCreature.applyCharacterProfile(profile, setFurColor);
      cuteAudioSynth.setAmbientAudio(profile.ambientAudio || 'none');
      triggerBoop(1.1);
    };

    // Apply initial saved character profile on mount
    const initialProfile = getActiveCharacterProfile();
    if (initialProfile) {
      fluffCreature.applyCharacterProfile(initialProfile, setFurColor);
    }

    const setMouthScale = (scale: number) => {
      fluffCreature.setMouthScale(scale);
    };

    const connectAudioStream = (stream: MediaStream) => {
      fluffCreature.connectAudioStream(stream);
    };

    const triggerFlight = (active = true, durationSec = 9.5) => {
      fluffCreature.triggerFlight(active, durationSec);
      playCuteSound(active ? 'yiii' : 'boop');
    };

    const changeSize = (size: string | number) => {
      fluffCreature.changeSize(size);
      triggerBoop(1.1);
      playCuteSound('aaaa');
    };

    const catchDuck = () => {
      duckNPC.startCatchChase();
      fluffCreature.triggerFlight(true, 10.0);
      playCuteSound('yiii');
    };

    const triggerButtonPress = (coords?: { x?: number; y?: number; z?: number }) => {
      fluffCreature.triggerButtonPressFlight(coords);
      playCuteSound('squeak');
    };

    const setGhostMode = (active: boolean, label = 'Ghost Co-Pilot Working in Background...') => {
      if (ghostModeRef.current.timer) {
        clearTimeout(ghostModeRef.current.timer);
        ghostModeRef.current.timer = null;
      }
      ghostModeRef.current.active = active;
      ghostModeRef.current.label = label;
      setGhostHud({ active, label });
      if (active) {
        (creature as any).setCompanionState?.('thinking');
        ghostModeRef.current.timer = setTimeout(() => {
          ghostModeRef.current.active = false;
          setGhostHud((prev) => ({ ...prev, active: false }));
          (creature as any).setCompanionState?.('idle');
        }, 12000);
      } else {
        (creature as any).setCompanionState?.('idle');
      }
    };

    // Listen to global AI / UI 3D Action dispatches
    const handle3DActionEvent = (evt: Event) => {
      const detail = (evt as CustomEvent).detail || {};
      const action = String(detail.action || '');
      if (action === 'trigger_flight') {
        triggerFlight(detail.active !== false, detail.duration || 9.5);
      } else if (action === 'change_size') {
        changeSize(detail.size ?? 1.5);
      } else if (action === 'catch_duck') {
        catchDuck();
      } else if (action === 'button_press') {
        triggerButtonPress(detail.coords);
      } else if (action === 'ghost_mode') {
        setGhostMode(detail.active !== false, detail.label || 'Ghost Co-Pilot Working Invisibly...');
      } else if (action === 'meditate' || action === 'magic') {
        const active = detail.active !== false;
        setIsMeditating(active);
        setMeditateLabel(detail.label || 'Channeling Multi-Agent Intelligence (Meditating)...');
        fluffCreature.triggerFlight(active, 8.5);
        if (active) {
          (creature as any).setCompanionState?.('thinking');
          playCuteSound('yiii');
        } else {
          (creature as any).setCompanionState?.('idle');
        }
      } else if (action === 'select_character') {
        const targetProfile =
          detail.profile || getCharacterProfileById(String(detail.characterId || ''));
        applyCharacterProfile(targetProfile);
      }
    };
    window.addEventListener('nevea:3d-action', handle3DActionEvent);

    const handleImageGeneratedEvent = (evt: Event) => {
      const detail = (evt as CustomEvent).detail || {};
      if (detail.imageUrl) {
        setFloatingImage({
          url: detail.imageUrl,
          prompt: detail.prompt || 'Generated Artwork',
          source: detail.source || 'Stable Diffusion XL',
        });
        setIsMeditating(false);
      }
    };
    window.addEventListener('nevea:image-generated', handleImageGeneratedEvent);

    const handleProcessingBadgeEvent = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      if (!detail) {
        setProcessingBadge(null);
      } else {
        setProcessingBadge({
          type: detail.type || 'local',
          label: detail.label || (detail.type === 'local' ? 'Local Processing' : 'Cloud Processing'),
        });
        setTimeout(() => {
          setProcessingBadge(null);
        }, 5500);
      }
    };
    window.addEventListener('nevea:processing-badge', handleProcessingBadgeEvent);

    // Omniscience Protocol Sync & 3D Spatial Audio Frequency State
    const initialOmni = getCachedOmniscienceSettings();
    setIsLiveVisionOn(initialOmni.liveVisionEnabled);
    setIsSystemAudioOn(initialOmni.systemAudioEnabled);
    let currentSystemAudioOn = Boolean(initialOmni.systemAudioEnabled);
    let currentAudioRms = 0;

    const handleOmniChange = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      if (detail?.settings) {
        setIsLiveVisionOn(detail.settings.liveVisionEnabled);
        setIsSystemAudioOn(detail.settings.systemAudioEnabled);
        currentSystemAudioOn = Boolean(detail.settings.systemAudioEnabled);
      }
    };
    window.addEventListener('nevea:omniscience-change', handleOmniChange);

    const handleVisionPulse = () => {
      setLiveVisionPulse(true);
      setTimeout(() => setLiveVisionPulse(false), 850);
    };
    window.addEventListener('nevea:live-vision-pulse', handleVisionPulse);

    const handleAudioLevel = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      if (typeof detail?.rms === 'number') {
        currentAudioRms = detail.rms;
        setAudioWaveLevel(detail.rms);
      }
    };
    window.addEventListener('nevea:system-audio-level', handleAudioLevel);

    const handleToggleCameraFollow = (evt: Event) => {
      const detail = (evt as CustomEvent).detail || {};
      const enabled = typeof detail.enabled === 'boolean' ? detail.enabled : !isAutoFollowRef.current;
      setIsAutoFollow(enabled);
      isAutoFollowRef.current = enabled;
      if (detail.notify !== false) {
        playCuteSound(enabled ? 'yiii' : 'boop');
      }
    };
    window.addEventListener('nevea:toggle-camera-follow', handleToggleCameraFollow);

    const captureVisionJpeg = (quality = 0.7): string => {
      try {
        return renderer.domElement.toDataURL('image/jpeg', quality);
      } catch {
        return '';
      }
    };

    const handle: CreatureHandle = {
      creature,
      fluffCreature,
      furSystem,
      setFurColor,
      setEnvironment,
      triggerBoop,
      setMouthScale,
      connectAudioStream,
      triggerFlight,
      changeSize,
      catchDuck,
      triggerButtonPress,
      setGhostMode,
      applyCharacterProfile,
      updateFurParam,
      captureVisionJpeg,
      setAutoFollowCamera: (enabled: boolean) => {
        setIsAutoFollow(enabled);
        isAutoFollowRef.current = enabled;
      },
      isAutoFollowCamera: () => isAutoFollowRef.current,
      resetCameraView,
      getState: () => ({ ...simState }),
    };

    if (callbackRef.current) {
      callbackRef.current(handle);
    }

    // 8. Interactive Pointer Raycasting + Jelly Squash-and-Stretch on Click
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2(0, 0);
    const pointerLocalPos = new THREE.Vector3(0, 0, 2);
    const prevPointerLocalPos = new THREE.Vector3(0, 0, 2);
    const pointerVelocity = new THREE.Vector3(0, 0, 0);
    let isPointerOverCreature = false;
    let pointerDownPos = { x: 0, y: 0 };
    let boopShockwave = 0.0;
    let clickToggle = false;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2.0 - 1.0;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2.0 + 1.0;

      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObject(creature.bodyMesh, false);
      if (hits.length > 0) {
        prevPointerLocalPos.copy(pointerLocalPos);
        pointerLocalPos.copy(hits[0].point);
        creature.root.worldToLocal(pointerLocalPos);

        if (isPointerOverCreature) {
          pointerVelocity.subVectors(pointerLocalPos, prevPointerLocalPos).multiplyScalar(32.0);
        }
        isPointerOverCreature = true;
        renderer.domElement.style.cursor = 'pointer';
      } else {
        isPointerOverCreature = false;
        pointerVelocity.multiplyScalar(0.5);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        setRadialMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
      }
      pointerDownPos = { x: e.clientX, y: e.clientY };
      if (isPointerOverCreature) {
        controls.enabled = false;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      controls.enabled = true;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist < 8 && isPointerOverCreature && e.button === 0) {
        triggerBoop(1.15);
        clickToggle = !clickToggle;
        playCuteSound(clickToggle ? 'boop' : 'squeak');
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    // 9. ResizeObserver for 70/30 Split-Screen & Collapsible Sidebar Resizing
    const handleResize = () => {
      if (!container) return;
      const w = getWidth();
      const h = getHeight();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
      if (ssaoPass) {
        ssaoPass.setSize(w, h);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // 10. Real-Time Render, Lip-Sync, Angelic Flight, Particle Trail, Duck NPC, 3D Audio Frequencies & GPGPU Fur Loop
    let animId = 0;
    const clock = new THREE.Clock();
    let elapsedTime = 0.0;
    const webglInertiaDisp = new THREE.Vector3(0, 0, 0);
    const webglInertiaVel = new THREE.Vector3(0, 0, 0);
    const webglForceTmp = new THREE.Vector3(0, 0, 0);
    const creatureWorldPosTmp = new THREE.Vector3();
    const cameraTargetDesired = new THREE.Vector3();
    const cameraTargetDelta = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.033);
      elapsedTime += dt;

      if (boopShockwave > 0.001) {
        boopShockwave *= Math.exp(-dt * 2.8);
      } else {
        boopShockwave = 0.0;
      }

      pointerVelocity.multiplyScalar(Math.exp(-dt * 12.0));

      // Real-Time Audio Amplitude -> Lip-Sync `mouthScale` Squash & Stretch
      const liveAmplitude = fluffCreature.sampleLiveAmplitude();
      const mouthScale = fluffCreature.updateFromAudioAmplitude(liveAmplitude, dt);
      (creature as any).setMouthScale?.(mouthScale);

      // Update 3D Spatial Audio Frequency Ring in the 3D World (Monochrome White/Silver)
      const compStateStr = String((creature as any).animState?.companionState || 'idle').toLowerCase();
      const isHearingOrSpeaking =
        currentSystemAudioOn ||
        compStateStr === 'listening' ||
        compStateStr === 'speaking' ||
        liveAmplitude > 0.015 ||
        currentAudioRms > 0.01;

      audioVisualizerGroup.position.x = creature.root.position.x;
      audioVisualizerGroup.position.z = creature.root.position.z;
      audioVisualizerGroup.rotation.y = elapsedTime * 0.18;

      const combinedEnergy = Math.max(
        liveAmplitude * 1.4,
        currentAudioRms * 1.8,
        compStateStr === 'listening' || compStateStr === 'speaking'
          ? 0.28 + 0.18 * Math.sin(elapsedTime * 6.0)
          : currentSystemAudioOn
          ? 0.08 + 0.05 * Math.sin(elapsedTime * 3.2)
          : 0.02
      );

      for (let i = 0; i < freqBarCount; i++) {
        const bar = freqBars[i];
        const normIdx = i / freqBarCount;
        const harmonic1 = Math.sin(elapsedTime * 8.5 + normIdx * Math.PI * 8) * 0.5 + 0.5;
        const harmonic2 = Math.cos(elapsedTime * 13.0 - normIdx * Math.PI * 12) * 0.5 + 0.5;
        const waveFactor = 0.25 + 0.75 * (harmonic1 * 0.6 + harmonic2 * 0.4);
        const targetHeight = isHearingOrSpeaking
          ? Math.max(0.025, Math.min(0.42, combinedEnergy * waveFactor * 0.52 + 0.025))
          : 0.018;

        bar.scale.y += (targetHeight - bar.scale.y) * Math.min(1, dt * 16.0);
        bar.position.y = bar.scale.y * 0.5;
        const mat = bar.material as THREE.MeshBasicMaterial;
        const targetOpacity = isHearingOrSpeaking
          ? Math.min(0.92, 0.28 + combinedEnergy * waveFactor * 0.85)
          : 0.12;
        mat.opacity += (targetOpacity - mat.opacity) * Math.min(1, dt * 12.0);
      }

      const ringPulse = 1.0 + combinedEnergy * 0.14 * Math.sin(elapsedTime * 7.0);
      innerWaveRing.scale.set(ringPulse, ringPulse, 1);
      innerWaveRingMat.opacity = isHearingOrSpeaking
        ? Math.min(0.65, 0.22 + combinedEnergy * 0.5)
        : 0.12;

      const outerPulse = 1.0 + combinedEnergy * 0.22 * Math.cos(elapsedTime * 5.0);
      outerWaveRing.scale.set(outerPulse, outerPulse, 1);
      outerWaveRingMat.opacity = isHearingOrSpeaking
        ? Math.min(0.45, 0.12 + combinedEnergy * 0.35)
        : 0.06;

      // Base idle, eye tracking, and breathing (suppress erratic mouse tracking during Ghost Mode)
      const effectivePointerNDC = ghostModeRef.current.active
        ? new THREE.Vector2(Math.sin(elapsedTime * 0.7) * 0.12, Math.cos(elapsedTime * 0.5) * 0.08)
        : pointerNDC;
      (creature as any).update(dt, effectivePointerNDC, camera.position, simState.environment === 'ar');

      // Update Dynamic 3D Flight, Scaling, and Button-Press Interaction
      const chaseTarget =
        duckNPC.getPhase() === 'being_chased' ? duckNPC.getPosition() : null;
      const flightStatus = fluffCreature.updateFlightAndPhysics(dt, elapsedTime, chaseTarget);

      // AUTO-FOLLOW CAMERA BEHAVIOR:
      // Dynamically keeps the creature centered in the view even during movement and flight animations
      if (isAutoFollowRef.current && creature?.root) {
        creature.root.getWorldPosition(creatureWorldPosTmp);
        const visualCenterY = creatureWorldPosTmp.y + 0.18 * (fluffCreature.scaleMultiplier || 1.0);
        cameraTargetDesired.set(creatureWorldPosTmp.x, visualCenterY, creatureWorldPosTmp.z);

        // Smooth exponential damping: snappier tracking during fast flight, gentle during breathing
        const isFlying = fluffCreature.isFlying || ghostModeRef.current.active;
        const trackingRate = isFlying ? 7.5 : 4.0;
        const lerpFactor = 1.0 - Math.exp(-dt * trackingRate);

        cameraTargetDelta.copy(cameraTargetDesired).sub(controls.target);

        // Interpolate controls target toward creature center
        controls.target.addScaledVector(cameraTargetDelta, lerpFactor);

        // Displace camera by the same delta vector to preserve user's customized viewing angle and zoom distance
        camera.position.addScaledVector(cameraTargetDelta, lerpFactor);

        // Flight-aware cinematic framing: slightly expand distance when flying fast so wings & trails stay in view
        if (fluffCreature.isFlying) {
          const currentCamDist = camera.position.distanceTo(controls.target);
          const flightSpeedBonus = Math.min(1.8, (flightStatus?.flightSpeed || 0) * 0.32);
          const idealFlightDist = 4.0 + flightSpeedBonus;
          if (currentCamDist < idealFlightDist) {
            const zoomAlpha = 1.0 - Math.exp(-dt * 2.2);
            const camDir = camera.position.clone().sub(controls.target).normalize();
            const newDist = THREE.MathUtils.lerp(currentCamDist, idealFlightDist, zoomAlpha);
            camera.position.copy(controls.target).addScaledVector(camDir, newDist);
          }
        }
      }

      controls.update();

      // GHOST MODE: Calm meditative levitation ("thinking" posture) + subtle ethereal rim/bloom glow
      if (ghostModeRef.current.active && !fluffCreature.isFlying) {
        const calmHoverY = 0.18 + Math.sin(elapsedTime * 1.65) * 0.09;
        const calmSwayX = Math.sin(elapsedTime * 0.85) * 0.04;
        creature.root.position.y += (calmHoverY - creature.root.position.y) * Math.min(1, dt * 4.5);
        creature.root.position.x += (calmSwayX - creature.root.position.x) * Math.min(1, dt * 4.5);
        creature.root.rotation.z = Math.sin(elapsedTime * 1.15) * 0.065;
        creature.root.rotation.x = Math.cos(elapsedTime * 0.9) * 0.04;
        const etherealPulse = 0.5 + 0.5 * Math.sin(elapsedTime * 2.4);
        lightingRig.rimLight.intensity = simState.rimIntensity + 0.24 + etherealPulse * 0.14;
        bloomPass.strength = simState.bloomStrength + 0.09 + etherealPulse * 0.06;
      } else {
        lightingRig.rimLight.intensity = simState.rimIntensity;
        bloomPass.strength = simState.bloomStrength;
      }

      // Update Procedural Angelic/Pegasus Wings
      wings.update(dt, elapsedTime, fluffCreature.isFlying, flightStatus.flightSpeed);

      // Update Magical Particle Trail & Landing Dust Explosion Burst
      particleTrail.update(
        dt,
        elapsedTime,
        creature.root.position,
        fluffCreature.isFlying,
        fluffCreature.scaleMultiplier
      );

      if (flightStatus.justLanded || flightStatus.justPressedButton) {
        particleTrail.triggerDustBurst(
          creature.root.position,
          flightStatus.justLanded ? 64 : 38,
          flightStatus.justLanded ? 1.7 : 1.15
        );
        triggerBoop(flightStatus.justLanded ? 1.2 : 0.95);
        playCuteSound(flightStatus.justLanded ? 'boop' : 'squeak');
      }

      // Update Procedural 3D Duck NPC & Catching Mini-Game
      duckNPC.update(
        dt,
        elapsedTime,
        creature.root.position,
        () => {
          // On Duck Caught
          triggerBoop(1.25);
          particleTrail.triggerDustBurst(duckNPC.getPosition(), 42, 1.25);
          playCuteSound('giggle');
        },
        () => {
          // On Duck Gently Released
          playCuteSound('yiii');
        }
      );

      // Apply extra elastic jelly squash-and-stretch harmonic oscillation on click
      if (jellyAmplitude > 0.001) {
        jellyPhase += dt * 18.0;
        jellyAmplitude *= Math.exp(-dt * 4.2);
        const wave = Math.sin(jellyPhase) * jellyAmplitude;
        const sx = creature.root.scale.x * (1.0 + wave * 0.65);
        const sy = creature.root.scale.y * Math.max(0.55, 1.0 - wave * 0.85);
        const sz = creature.root.scale.z * (1.0 + wave * 0.65);
        creature.root.scale.set(sx, sy, sz);
      } else {
        jellyAmplitude = 0.0;
      }

      envManager.update(elapsedTime, simState.windStrength, creature.root);

      let physicsTexture: any = gpuPhysics.fallbackTexture;
      if (simState.gpuFurEnabled) {
        physicsTexture = gpuPhysics.step({
          time: elapsedTime,
          dt,
          windStrength: simState.windStrength + (fluffCreature.isFlying ? 0.65 : 0.0),
          creatureVelocity: creature.animState.velocity,
          creatureAngularVel: creature.animState.angularVelocity,
          pointerLocalPos,
          pointerVelocity,
          pointerActive: isPointerOverCreature,
          boopShockwave,
        });
      } else {
        webglForceTmp.set(0, -0.32, 0);
        webglForceTmp.addScaledVector(creature.animState.velocity, -1.65);
        if (isPointerOverCreature) {
          webglForceTmp.addScaledVector(pointerVelocity, 0.85);
        }
        webglForceTmp.addScaledVector(webglInertiaDisp, -24.0);
        webglInertiaVel.addScaledVector(webglForceTmp, dt);
        webglInertiaVel.multiplyScalar(Math.exp(-5.5 * dt));
        webglInertiaDisp.addScaledVector(webglInertiaVel, dt);
        if (webglInertiaDisp.lengthSq() > 0.64) {
          webglInertiaDisp.normalize().multiplyScalar(0.8);
        }
      }

      const u: any = furSystem.sharedUniforms;
      if (u) {
        u.uPhysicsTex.value = physicsTexture;
        u.uTime.value = elapsedTime;
        u.uPointerLocalPos.value.copy(pointerLocalPos);
        u.uPointerActive.value = isPointerOverCreature ? 1.0 : 0.0;
        u.uWebGLInertia.value.copy(webglInertiaDisp);
        u.uBoopShockwave.value = boopShockwave;
      }

      if (isSoftwareGl) {
        renderer.render(scene, camera);
      } else {
        composer.render();
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('nevea:3d-action', handle3DActionEvent);
      window.removeEventListener('nevea:image-generated', handleImageGeneratedEvent);
      window.removeEventListener('nevea:processing-badge', handleProcessingBadgeEvent);
      window.removeEventListener('nevea:omniscience-change', handleOmniChange);
      window.removeEventListener('nevea:live-vision-pulse', handleVisionPulse);
      window.removeEventListener('nevea:system-audio-level', handleAudioLevel);
      window.removeEventListener('nevea:toggle-camera-follow', handleToggleCameraFollow);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      fluffCreature.dispose();
      wings.dispose();
      particleTrail.dispose();
      duckNPC.dispose();
      barGeo.dispose();
      innerWaveRingGeo.dispose();
      outerWaveRingGeo.dispose();
      (envManager as any).dispose?.();
      renderer.dispose();
      composer.dispose();
      if (container.contains(domElem)) {
        container.removeChild(domElem);
      }
    };
  }, [toneMappingExposure]);

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(Math.max(96, e.clientX - rect.left), rect.width - 96);
    const y = Math.min(Math.max(96, e.clientY - rect.top), rect.height - 96);
    playCuteSound('boop');
    setRadialMenu({ open: true, x, y });
  };

  // 3 Orbiting Radial Menu Items (Voice, Vision, Settings)
  const radialItems = [
    {
      id: 'voice',
      label: 'Voice',
      icon: Mic,
      angleDeg: -90,
      onClick: () => {
        setRadialMenu((prev) => ({ ...prev, open: false }));
        onRadialVoice?.();
      },
    },
    {
      id: 'vision',
      label: 'Vision',
      icon: Eye,
      angleDeg: 30,
      onClick: () => {
        setRadialMenu((prev) => ({ ...prev, open: false }));
        onRadialVision?.();
      },
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      angleDeg: 150,
      onClick: () => {
        setRadialMenu((prev) => ({ ...prev, open: false }));
        onRadialSettings?.();
      },
    },
  ];

  const orbitRadius = 72;

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      className="w-full h-full relative bg-[#050505] overflow-hidden select-none"
      aria-label="Mochi-Puff 3D GPU Fur Simulation Viewport"
    >
      {/* Dedicated WebGL2 Canvas Mount */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Glowing Character Halo Outline when Dragging a File Over NEVEA */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <div className="w-72 h-72 sm:w-88 sm:h-88 rounded-full border-2 border-white/80 shadow-[0_0_65px_rgba(255,255,255,0.65),inset_0_0_45px_rgba(255,255,255,0.35)] animate-pulse flex items-end justify-center pb-6">
              <span className="px-3.5 py-1.5 rounded-full bg-white text-[#050505] font-display font-bold text-xs tracking-wider uppercase shadow-[0_0_24px_rgba(255,255,255,0.8)]">
                Drop File for NEVEA to Read & Summarize
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle Ethereal Ghost Mode Aura & Calm Thinking Indicator */}
      <AnimatePresence>
        {ghostHud.active && !isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none absolute inset-0 z-15 flex flex-col items-center justify-between py-6"
          >
            <div />
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-white/25 shadow-[0_0_55px_rgba(255,255,255,0.22),inset_0_0_35px_rgba(255,255,255,0.12)] animate-pulse" />
            <div className="px-3.5 py-1.5 rounded-xl bg-[#0a0a0a]/85 border border-white/25 backdrop-blur-md shadow-[0_0_24px_rgba(255,255,255,0.18)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="text-[11px] font-mono text-white/90 tracking-wide">
                GHOST CO-PILOT · {ghostHud.label}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ultra-Minimal Monochrome Camera Reset & Auto-Follow Micro-Control (Top Right, Zero Clutter) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 pointer-events-auto opacity-45 hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => {
            const nextVal = !isAutoFollow;
            setIsAutoFollow(nextVal);
            isAutoFollowRef.current = nextVal;
            playCuteSound(nextVal ? 'yiii' : 'boop');
          }}
          className={`h-7 px-2.5 rounded-lg border text-[10px] font-mono inline-flex items-center gap-1.5 transition-all cursor-pointer ${
            isAutoFollow
              ? 'bg-white/10 text-white border-white/25'
              : 'bg-[#0a0a0a]/80 text-white/50 border-white/10 hover:text-white'
          }`}
          title="Toggle Camera Auto-Follow"
        >
          <Focus size={11} />
          <span className="hidden sm:inline">{isAutoFollow ? 'Follow' : 'Free'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            resetCameraViewRef.current?.();
          }}
          className="h-7 w-7 rounded-lg bg-[#0a0a0a]/80 border border-white/10 text-white/60 hover:text-white hover:border-white/30 inline-flex items-center justify-center transition-colors cursor-pointer"
          title="Reset 3D Camera Center"
        >
          <RotateCcw size={11} />
        </button>
      </div>

      {/* Meditating / Magic Aura (Floating with glowing aura while delegating to external models) */}
      <AnimatePresence>
        {isMeditating && !isDragOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute inset-0 z-16 flex flex-col items-center justify-between py-10"
          >
            <div />
            <div className="relative flex items-center justify-center">
              <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-white/40 shadow-[0_0_80px_rgba(255,255,255,0.4),inset_0_0_50px_rgba(255,255,255,0.2)] animate-pulse" />
              <div className="absolute w-80 h-80 sm:w-[26rem] sm:h-[26rem] rounded-full border border-white/20 border-dashed animate-spin" style={{ animationDuration: '24s' }} />
              <div className="absolute text-[10px] font-mono font-bold tracking-widest text-white/85 drop-shadow-[0_0_10px_#fff] uppercase">
                ✦ MULTI-AGENT SYNTHESIS ✦
              </div>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-[#080808]/90 border border-white/30 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.25)] flex items-center gap-2">
              <Sparkles size={14} className="text-white animate-spin" style={{ animationDuration: '4s' }} />
              <span className="text-xs font-mono text-white tracking-wide">
                {meditateLabel}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Generated Image in 3D Viewport */}
      <AnimatePresence>
        {floatingImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -10 }}
            className="absolute top-16 right-6 z-25 max-w-xs p-3 rounded-2xl glass-card-monochrome border border-white/30 shadow-[0_0_35px_rgba(255,255,255,0.25)] flex flex-col gap-2 pointer-events-auto"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase text-white/80 flex items-center gap-1.5">
                <Sparkles size={11} className="text-white" />
                <span>{floatingImage.source || 'Stable Diffusion XL'}</span>
              </span>
              <button
                type="button"
                onClick={() => setFloatingImage(null)}
                className="text-white/60 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
                title="Dismiss image"
              >
                <X size={13} />
              </button>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-white/20 shadow-md group">
              <img
                src={floatingImage.url}
                alt={floatingImage.prompt}
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <a
                href={floatingImage.url}
                download="nevea_artwork.jpg"
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-[#0a0a0a]/80 border border-white/20 text-[9px] font-mono text-white hover:bg-white hover:text-[#050505] transition-colors"
              >
                Download
              </a>
            </div>
            <p className="text-[10px] font-mono text-white/75 line-clamp-2">
              "{floatingImage.prompt}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right-Click Orbiting Radial Menu (Voice, Vision, Settings) */}
      <AnimatePresence>
        {radialMenu.open && (
          <div
            className="absolute inset-0 z-30 pointer-events-auto"
            onClick={() => setRadialMenu((prev) => ({ ...prev, open: false }))}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              style={{ left: radialMenu.x, top: radialMenu.y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-40 h-40 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Orbit Ring Guide */}
              <div className="absolute inset-2 rounded-full border border-white/15 bg-black/35 backdrop-blur-md shadow-[0_0_36px_rgba(255,255,255,0.12)] pointer-events-none" />

              {/* Center Close Hub */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRadialMenu((prev) => ({ ...prev, open: false }))}
                className="relative z-10 w-9 h-9 rounded-full bg-[#1A1A1A] border border-white/25 text-white/80 hover:text-white flex items-center justify-center cursor-pointer shadow-lg"
                title="Close Radial Menu"
              >
                <X size={14} />
              </motion.button>

              {/* 3 Orbiting Action Nodes */}
              {radialItems.map((item, idx) => {
                const rad = (item.angleDeg * Math.PI) / 180;
                const tx = Math.cos(rad) * orbitRadius;
                const ty = Math.sin(rad) * orbitRadius;
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                    animate={{ x: tx, y: ty, opacity: 1, scale: 1 }}
                    exit={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 22,
                      delay: idx * 0.04,
                    }}
                    whileHover={{ scale: 1.14 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={item.onClick}
                    className="absolute w-12 h-12 rounded-full bg-white text-[#050505] hover:bg-white/95 border border-white shadow-[0_0_22px_rgba(255,255,255,0.45)] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    title={item.label}
                  >
                    <Icon size={15} strokeWidth={2} />
                    <span className="text-[8px] font-bold uppercase tracking-tighter leading-none">
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
