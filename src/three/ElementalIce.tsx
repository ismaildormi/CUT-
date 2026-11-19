import * as THREE from 'three';
import { ICE_MIST_VERTEX_SHADER, ICE_MIST_FRAGMENT_SHADER } from './elementalShaders';
import { computeOrbitingTransform } from './elementalLogic';
import { ElementalController } from './ElementalFire';

export function createElementalIce(): ElementalController {
  const group = new THREE.Group();
  group.name = 'ElementalIceRoot';

  // 1. PointLight for crystalline cyan glow
  const iceLight = new THREE.PointLight(0x72e5ff, 2.0, 8.0, 1.4);
  iceLight.position.set(0, 0.3, 0.5);
  group.add(iceLight);

  // 2. Crystalline Refractive Body (MeshPhysicalMaterial with real-time transmission & refraction)
  const bodyGeo = new THREE.IcosahedronGeometry(0.85, 2);
  const iceMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#99f2ff'),
    emissive: new THREE.Color('#003344'),
    roughness: 0.08,
    metalness: 0.05,
    transmission: 0.95, // Real-time refraction transmission
    ior: 1.31, // Crystalline ice index of refraction
    thickness: 1.5,
    specularIntensity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    attenuationColor: new THREE.Color('#0088cc'),
    attenuationDistance: 0.9,
    transparent: true,
    opacity: 0.95,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, iceMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // 3. Glacial Crystal Spikes (Crown & Horns)
  const crystalGroup = new THREE.Group();
  const spikeGeo = new THREE.ConeGeometry(0.14, 0.85, 4);
  const spikeMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#cbf3ff'),
    emissive: new THREE.Color('#002233'),
    roughness: 0.05,
    transmission: 0.92,
    ior: 1.31,
    thickness: 1.2,
    clearcoat: 1.0,
    transparent: true,
  });

  const crystalSpikes: THREE.Mesh[] = [];
  const spikeAngles = [
    { a: 0, r: 0.45, h: 0.65, tilt: 0.25 },
    { a: Math.PI * 0.35, r: 0.5, h: 0.6, tilt: 0.3 },
    { a: -Math.PI * 0.35, r: 0.5, h: 0.6, tilt: 0.3 },
    { a: Math.PI * 0.7, r: 0.52, h: 0.55, tilt: 0.35 },
    { a: -Math.PI * 0.7, r: 0.52, h: 0.55, tilt: 0.35 },
    { a: Math.PI, r: 0.48, h: 0.58, tilt: 0.2 },
  ];

  spikeAngles.forEach((spec) => {
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    spike.position.set(Math.cos(spec.a) * spec.r, spec.h, Math.sin(spec.a) * spec.r);
    spike.rotation.x = Math.sin(spec.a) * spec.tilt;
    spike.rotation.z = -Math.cos(spec.a) * spec.tilt;
    crystalGroup.add(spike);
    crystalSpikes.push(spike);
  });
  group.add(crystalGroup);

  // 4. Expressive Diamond Crystalline Eyes
  const eyesGroup = new THREE.Group();
  eyesGroup.position.set(0, 0.12, 0.8);

  const eyeGeo = new THREE.OctahedronGeometry(0.13, 0);
  eyeGeo.scale(1.0, 1.35, 0.6);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x0077b6,
    emissiveIntensity: 0.85,
    roughness: 0.1,
    metalness: 0.2,
  });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.27, 0, 0);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.27, 0, 0);

  // Glint highlights
  const glintGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftGlint = new THREE.Mesh(glintGeo, glintMat);
  leftGlint.position.set(0.04, 0.05, 0.1);
  leftEye.add(leftGlint);
  const rightGlint = new THREE.Mesh(glintGeo, glintMat);
  rightGlint.position.set(0.04, 0.05, 0.1);
  rightEye.add(rightGlint);

  eyesGroup.add(leftEye, rightEye);
  group.add(eyesGroup);

  // 5. Frost Mist Diamond Particle System
  const MIST_COUNT = 140;
  const mistGeo = new THREE.BufferGeometry();
  const mistPos = new Float32Array(MIST_COUNT * 3);
  const mistScales = new Float32Array(MIST_COUNT);
  const mistPhases = new Float32Array(MIST_COUNT);

  for (let i = 0; i < MIST_COUNT; i++) {
    const r = 0.35 + Math.random() * 0.9;
    const theta = Math.random() * Math.PI * 2;
    mistPos[i * 3] = Math.cos(theta) * r;
    mistPos[i * 3 + 1] = (Math.random() - 0.4) * 1.2;
    mistPos[i * 3 + 2] = Math.sin(theta) * r;
    mistScales[i] = 0.5 + Math.random() * 0.8;
    mistPhases[i] = Math.random();
  }

  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  mistGeo.setAttribute('aScale', new THREE.BufferAttribute(mistScales, 1));
  mistGeo.setAttribute('aPhase', new THREE.BufferAttribute(mistPhases, 1));

  const mistMat = new THREE.ShaderMaterial({
    vertexShader: ICE_MIST_VERTEX_SHADER,
    fragmentShader: ICE_MIST_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#90e0ef') },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mistParticles = new THREE.Points(mistGeo, mistMat);
  group.add(mistParticles);

  // 6. Orbiting Refractive Shards
  const shardCount = 5;
  const shards: THREE.Mesh[] = [];
  const shardGeo = new THREE.IcosahedronGeometry(0.12, 0);
  for (let i = 0; i < shardCount; i++) {
    const shard = new THREE.Mesh(shardGeo, spikeMat);
    group.add(shard);
    shards.push(shard);
  }

  // Animation spring state
  let boopScale = 1.0;
  let boopVel = 0.0;

  return {
    group,
    update: (dt: number, elapsedTime: number) => {
      // 1. Shimmering refraction pulse on ice material
      mistMat.uniforms.uTime.value = elapsedTime;
      iceLight.intensity = 2.0 + Math.sin(elapsedTime * 3.5) * 0.45;

      // 2. Slow majestic geometric facet rotation
      bodyMesh.rotation.y = elapsedTime * 0.15;
      crystalGroup.rotation.y = -elapsedTime * 0.1;

      // 3. Orbiting ice crystal shards
      shards.forEach((shard, i) => {
        const tr = computeOrbitingTransform(1.2, 1.2, elapsedTime, (i / shardCount) * Math.PI * 2, -0.28, 2.4, 0.15);
        shard.position.copy(tr.position);
        shard.rotation.copy(tr.rotation);
      });

      // 4. Eyes blinking
      const blinkCycle = elapsedTime % 5.0;
      if (blinkCycle > 4.85) {
        eyesGroup.scale.y = 0.08;
      } else {
        eyesGroup.scale.y = 1.0;
      }

      // 5. Boop spring physics
      const springK = 32.0;
      const damp = 6.5;
      const force = (1.0 - boopScale) * springK - boopVel * damp;
      boopVel += force * dt;
      boopScale += boopVel * dt;

      group.scale.set(
        (2.0 - boopScale) * 0.95,
        boopScale * 0.95,
        (2.0 - boopScale) * 0.95
      );
    },
    boop: (strength = 1.2) => {
      boopVel = -strength * 3.2;
      iceLight.intensity = 4.2;
    },
    dispose: () => {
      bodyGeo.dispose();
      iceMat.dispose();
      spikeGeo.dispose();
      spikeMat.dispose();
      eyeGeo.dispose();
      eyeMat.dispose();
      glintGeo.dispose();
      glintMat.dispose();
      mistGeo.dispose();
      mistMat.dispose();
      shardGeo.dispose();
      group.clear();
    },
  };
}
