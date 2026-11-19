import * as THREE from 'three';
import {
  FIRE_VERTEX_SHADER,
  FIRE_FRAGMENT_SHADER,
  FIRE_PARTICLE_VERTEX_SHADER,
  FIRE_PARTICLE_FRAGMENT_SHADER,
} from './elementalShaders';
import { computeFireLightFlicker, computeOrbitingTransform } from './elementalLogic';

export interface ElementalController {
  group: THREE.Group;
  update: (dt: number, elapsedTime: number) => void;
  boop: (strength?: number) => void;
  dispose: () => void;
}

export function createElementalFire(): ElementalController {
  const group = new THREE.Group();
  group.name = 'ElementalFireRoot';

  // 1. Dynamic PointLight emitting real flickering light
  const fireLight = new THREE.PointLight(0xff6a00, 2.8, 9.0, 1.2);
  fireLight.position.set(0, 0.2, 0.4);
  group.add(fireLight);

  // 2. Fiery Flame Body with Vertex Displacement Shader
  const bodyGeo = new THREE.IcosahedronGeometry(0.85, 5);
  const bodyMat = new THREE.ShaderMaterial({
    vertexShader: FIRE_VERTEX_SHADER,
    fragmentShader: FIRE_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uDisplacement: { value: 0.28 },
      uColorCore: { value: new THREE.Color('#ffe259') },
      uColorMid: { value: new THREE.Color('#ff6a00') },
      uColorRim: { value: new THREE.Color('#ee0979') },
    },
    transparent: true,
    side: THREE.DoubleSide,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Flame Spikes (Crown / Shoulder plumes)
  const spikeGroup = new THREE.Group();
  const spikeGeo = new THREE.ConeGeometry(0.18, 0.75, 5);
  const spikeMat = new THREE.MeshStandardMaterial({
    color: 0xff4500,
    emissive: 0xff2200,
    emissiveIntensity: 0.9,
    roughness: 0.35,
    metalness: 0.1,
  });

  const spikeCount = 7;
  const spikes: THREE.Mesh[] = [];
  for (let i = 0; i < spikeCount; i++) {
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    const angle = (i / spikeCount) * Math.PI * 2;
    const radius = 0.55;
    spike.position.set(Math.cos(angle) * radius, 0.45 + (i % 2) * 0.15, Math.sin(angle) * radius);
    spike.rotation.x = Math.sin(angle) * 0.35;
    spike.rotation.z = -Math.cos(angle) * 0.35;
    spikeGroup.add(spike);
    spikes.push(spike);
  }
  group.add(spikeGroup);

  // 3. Expressive Glowing Eyes
  const eyesGroup = new THREE.Group();
  eyesGroup.position.set(0, 0.12, 0.78);

  const eyeGeo = new THREE.SphereGeometry(0.14, 16, 16);
  eyeGeo.scale(1.0, 1.25, 0.55);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffea00,
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.28, 0, 0);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.28, 0, 0);

  // Pupils (Deep volcanic obsidian)
  const pupilGeo = new THREE.SphereGeometry(0.065, 12, 12);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a0200 });
  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(0, 0, 0.1);
  leftEye.add(leftPupil);
  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(0, 0, 0.1);
  rightEye.add(rightPupil);

  eyesGroup.add(leftEye, rightEye);
  group.add(eyesGroup);

  // 4. Fire Particle System (Rising embers and flames)
  const PARTICLE_COUNT = 160;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  const scales = new Float32Array(PARTICLE_COUNT);
  const phases = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r = 0.2 + Math.random() * 0.65;
    const theta = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = -0.3 + Math.random() * 0.4;
    positions[i * 3 + 2] = Math.sin(theta) * r;

    velocities[i * 3] = (Math.random() - 0.5) * 0.4;
    velocities[i * 3 + 1] = 0.6 + Math.random() * 0.9;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

    scales[i] = 0.6 + Math.random() * 0.9;
    phases[i] = Math.random();
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
  particleGeo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  particleGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const particleMat = new THREE.ShaderMaterial({
    vertexShader: FIRE_PARTICLE_VERTEX_SHADER,
    fragmentShader: FIRE_PARTICLE_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uColorInner: { value: new THREE.Color('#ffffff') },
      uColorOuter: { value: new THREE.Color('#ff3d00') },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  group.add(particles);

  // 5. Orbiting Fire Motes
  const moteCount = 4;
  const motes: THREE.Mesh[] = [];
  const moteGeo = new THREE.DodecahedronGeometry(0.08, 0);
  const moteMat = new THREE.MeshBasicMaterial({ color: 0xffbb00 });
  for (let i = 0; i < moteCount; i++) {
    const mote = new THREE.Mesh(moteGeo, moteMat);
    group.add(mote);
    motes.push(mote);
  }

  // Animation state
  let boopScale = 1.0;
  let boopVel = 0.0;

  return {
    group,
    update: (dt: number, elapsedTime: number) => {
      // 1. Dynamic Light Flicker (VFX Upgrade: Actual dynamic PointLight with flickering intensity)
      fireLight.intensity = computeFireLightFlicker(elapsedTime, 2.6);

      // 2. Update shader uniforms
      bodyMat.uniforms.uTime.value = elapsedTime;
      particleMat.uniforms.uTime.value = elapsedTime;

      // 3. Flame Spikes waving
      spikes.forEach((spike, idx) => {
        const offset = idx * 0.8;
        spike.scale.y = 0.85 + Math.sin(elapsedTime * 6.0 + offset) * 0.35;
        spike.rotation.y = elapsedTime * 1.5 + offset;
      });

      // 4. Orbiting motes
      motes.forEach((mote, i) => {
        const tr = computeOrbitingTransform(1.15, 1.8, elapsedTime, (i / moteCount) * Math.PI * 2, 0.35, 3.2, 0.18);
        mote.position.copy(tr.position);
        mote.rotation.copy(tr.rotation);
      });

      // 5. Eyes blinking
      const blinkCycle = elapsedTime % 4.5;
      if (blinkCycle > 4.35) {
        eyesGroup.scale.y = 0.08;
      } else {
        eyesGroup.scale.y = 1.0;
      }

      // 6. Boop squish spring physics
      const springK = 35.0;
      const damp = 6.0;
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
      boopVel = -strength * 3.5;
      fireLight.intensity = 5.0;
    },
    dispose: () => {
      bodyGeo.dispose();
      bodyMat.dispose();
      spikeGeo.dispose();
      spikeMat.dispose();
      eyeGeo.dispose();
      eyeMat.dispose();
      pupilGeo.dispose();
      pupilMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      moteGeo.dispose();
      moteMat.dispose();
      group.clear();
    },
  };
}
