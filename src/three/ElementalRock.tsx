import * as THREE from 'three';
import {
  ROCK_VERTEX_SHADER,
  ROCK_FRAGMENT_SHADER,
  ROCK_DUST_VERTEX_SHADER,
  ROCK_DUST_FRAGMENT_SHADER,
} from './elementalShaders';
import { computeMossGrowth, computeOrbitingTransform } from './elementalLogic';
import { ElementalController } from './ElementalFire';

export function createElementalRock(): ElementalController {
  const group = new THREE.Group();
  group.name = 'ElementalRockRoot';

  // 1. Earthy PointLight
  const rockLight = new THREE.PointLight(0xa7c957, 1.8, 8.0, 1.3);
  rockLight.position.set(0, 0.4, 0.5);
  group.add(rockLight);

  // 2. Displaced Boulder Core with Dynamic Moss Growth Shader
  const bodyGeo = new THREE.DodecahedronGeometry(0.85, 2);
  // Add some jitter to vertices for realistic craggy stone feel
  const posAttr = bodyGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const noise = Math.sin(x * 5.0) * Math.cos(y * 5.0) * 0.06;
    posAttr.setXYZ(i, x + noise, y + noise, z + noise);
  }
  bodyGeo.computeVertexNormals();

  const rockMat = new THREE.ShaderMaterial({
    vertexShader: ROCK_VERTEX_SHADER,
    fragmentShader: ROCK_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uMossGrowth: { value: 0.75 }, // Dynamic moss growth logic
      uStoneColor: { value: new THREE.Color('#5c554e') },
      uStoneDark: { value: new THREE.Color('#282522') },
      uMossColor: { value: new THREE.Color('#4f772d') },
      uMossHighlight: { value: new THREE.Color('#90a955') },
    },
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, rockMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // 3. Boulder Plates & Shoulder Crags
  const plateGroup = new THREE.Group();
  const plateGeo = new THREE.DodecahedronGeometry(0.24, 0);
  const plateCount = 6;
  const plates: THREE.Mesh[] = [];

  const platePositions = [
    { pos: new THREE.Vector3(-0.62, 0.45, 0.1), rot: new THREE.Euler(0.4, 0.2, 0.5) },
    { pos: new THREE.Vector3(0.62, 0.45, 0.1), rot: new THREE.Euler(0.4, -0.2, -0.5) },
    { pos: new THREE.Vector3(0.0, 0.78, -0.15), rot: new THREE.Euler(-0.3, 0.0, 0.2) },
    { pos: new THREE.Vector3(-0.48, -0.42, 0.3), rot: new THREE.Euler(0.1, 0.4, 0.3) },
    { pos: new THREE.Vector3(0.48, -0.42, 0.3), rot: new THREE.Euler(0.1, -0.4, -0.3) },
    { pos: new THREE.Vector3(0.0, 0.85, 0.2), rot: new THREE.Euler(0.5, 0.0, 0.0) },
  ];

  platePositions.forEach((spec) => {
    const plate = new THREE.Mesh(plateGeo, rockMat);
    plate.position.copy(spec.pos);
    plate.rotation.copy(spec.rot);
    plateGroup.add(plate);
    plates.push(plate);
  });
  group.add(plateGroup);

  // 4. Expressive Luminous Gem Eyes (Emerald / Topaz)
  const eyesGroup = new THREE.Group();
  eyesGroup.position.set(0, 0.1, 0.82);

  const eyeGeo = new THREE.DodecahedronGeometry(0.12, 0);
  eyeGeo.scale(1.0, 1.2, 0.5);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x90be6d,
    emissive: 0x43aa8b,
    emissiveIntensity: 1.1,
    roughness: 0.2,
    metalness: 0.4,
  });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.28, 0, 0);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.28, 0, 0);

  eyesGroup.add(leftEye, rightEye);
  group.add(eyesGroup);

  // 5. Settling Earthen Dust Particles
  const DUST_COUNT = 110;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST_COUNT * 3);
  const dustScales = new Float32Array(DUST_COUNT);
  const dustPhases = new Float32Array(DUST_COUNT);

  for (let i = 0; i < DUST_COUNT; i++) {
    const r = 0.3 + Math.random() * 0.8;
    const theta = Math.random() * Math.PI * 2;
    dustPos[i * 3] = Math.cos(theta) * r;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 1.0;
    dustPos[i * 3 + 2] = Math.sin(theta) * r;
    dustScales[i] = 0.5 + Math.random() * 0.7;
    dustPhases[i] = Math.random();
  }

  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('aScale', new THREE.BufferAttribute(dustScales, 1));
  dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(dustPhases, 1));

  const dustMat = new THREE.ShaderMaterial({
    vertexShader: ROCK_DUST_VERTEX_SHADER,
    fragmentShader: ROCK_DUST_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#d4a373') },
    },
    transparent: true,
    depthWrite: false,
  });

  const dustParticles = new THREE.Points(dustGeo, dustMat);
  group.add(dustParticles);

  // 6. Orbiting Rock Chunks
  const chunkCount = 4;
  const chunks: THREE.Mesh[] = [];
  const chunkGeo = new THREE.DodecahedronGeometry(0.14, 0);
  for (let i = 0; i < chunkCount; i++) {
    const chunk = new THREE.Mesh(chunkGeo, rockMat);
    group.add(chunk);
    chunks.push(chunk);
  }

  // Animation spring state
  let boopScale = 1.0;
  let boopVel = 0.0;

  return {
    group,
    update: (dt: number, elapsedTime: number) => {
      // 1. Dynamic Moss Growth Calculation & Shader Uniform Update
      const mossLevel = computeMossGrowth(elapsedTime);
      rockMat.uniforms.uMossGrowth.value = mossLevel;
      rockMat.uniforms.uTime.value = elapsedTime;
      dustMat.uniforms.uTime.value = elapsedTime;

      // 2. Subtle organic breathing of stone plates
      plates.forEach((plate, i) => {
        const breath = Math.sin(elapsedTime * 2.0 + i) * 0.03;
        plate.position.y = platePositions[i].pos.y + breath;
      });

      // 3. Orbiting heavy stone chunks
      chunks.forEach((chunk, i) => {
        const tr = computeOrbitingTransform(1.22, 0.85, elapsedTime, (i / chunkCount) * Math.PI * 2, 0.22, 1.6, 0.12);
        chunk.position.copy(tr.position);
        chunk.rotation.copy(tr.rotation);
      });

      // 4. Eyes blinking
      const blinkCycle = elapsedTime % 6.0;
      if (blinkCycle > 5.85) {
        eyesGroup.scale.y = 0.08;
      } else {
        eyesGroup.scale.y = 1.0;
      }

      // 5. Heavy stone boop spring physics
      const springK = 28.0;
      const damp = 8.0;
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
      boopVel = -strength * 2.6;
      rockLight.intensity = 3.6;
    },
    dispose: () => {
      bodyGeo.dispose();
      rockMat.dispose();
      plateGeo.dispose();
      eyeGeo.dispose();
      eyeMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      chunkGeo.dispose();
      group.clear();
    },
  };
}
