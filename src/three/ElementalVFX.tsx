import * as THREE from 'three';
import { ElementalVFXType } from '../data/characterPresets';

export interface ElementalVFXController {
  group: THREE.Group;
  setVFXType: (vfxType: ElementalVFXType) => void;
  getVFXType: () => ElementalVFXType;
  update: (dt: number, elapsedTime: number) => void;
  dispose: () => void;
}

/**
 * Procedural 3D Elemental & Magical VFX System (`src/three/ElementalVFX.tsx`)
 * - Fire (`fire`): Rising flame & ember particle system with orange/red/gold vertex colors and emissive glow
 * - Ice (`ice`): Floating crystal shards (`IcosahedronGeometry`) rotating around the character with light-blue glow + frost mist
 * - Rock (`rock`): Orbiting faceted boulders (`DodecahedronGeometry`) with a dusty earthen particle trail
 * - Magic (`sparkles`): Floating glowing 3D stars (`OctahedronGeometry`) + soft purple/golden aura
 */
export function createElementalVFX(): ElementalVFXController {
  const group = new THREE.Group();
  group.name = 'ElementalVFXRoot';

  let currentType: ElementalVFXType = 'none';

  // Particle system state
  const PARTICLE_COUNT = 240;
  let pointsMesh: THREE.Points | null = null;
  let particleVelocities = new Float32Array(PARTICLE_COUNT * 3);
  let particlePhases = new Float32Array(PARTICLE_COUNT);

  // Orbiting 3D meshes (Ice Icosahedron shards, Rock Dodecahedron chunks, Magic Octahedron stars)
  interface OrbitingShard {
    mesh: THREE.Mesh;
    radius: number;
    angle: number;
    speed: number;
    heightOffset: number;
    bobSpeed: number;
    tilt: number;
    rotSpeed: THREE.Vector3;
  }
  let orbitingShards: OrbitingShard[] = [];
  let auraLight: THREE.PointLight | null = null;
  let auraSphere: THREE.Mesh | null = null;

  const createSoftParticleTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.2)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  };

  const particleSpriteTex = createSoftParticleTexture();

  const clearVFX = () => {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    pointsMesh = null;
    orbitingShards = [];
    auraLight = null;
    auraSphere = null;
  };

  const buildFireVFX = () => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const palette = [
      new THREE.Color('#ff2a00'),
      new THREE.Color('#ff5e00'),
      new THREE.Color('#ff9500'),
      new THREE.Color('#ffd000'),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.55 + Math.random() * 0.72;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = -0.85 + Math.random() * 2.3;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      particleVelocities[i * 3] = (Math.random() - 0.5) * 0.35;
      particleVelocities[i * 3 + 1] = 0.95 + Math.random() * 1.45;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
      particlePhases[i] = Math.random() * Math.PI * 2;

      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      map: particleSpriteTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    pointsMesh = new THREE.Points(geom, mat);
    group.add(pointsMesh);

    auraLight = new THREE.PointLight(0xff5500, 1.8, 5.5);
    auraLight.position.set(0, 0.35, 0.8);
    group.add(auraLight);
  };

  const buildIceVFX = () => {
    // 1. Floating Crystal Shards (`IcosahedronGeometry`) rotating around the character with light-blue glow
    const shardMat = new THREE.MeshPhysicalMaterial({
      color: 0x90e0ef,
      emissive: 0x00b4d8,
      emissiveIntensity: 0.75,
      roughness: 0.08,
      metalness: 0.12,
      transmission: 0.65,
      transparent: true,
      opacity: 0.86,
      flatShading: true,
    });

    const shardCount = 12;
    for (let i = 0; i < shardCount; i++) {
      const radius = 0.09 + (i % 3) * 0.035;
      const shardGeo = new THREE.IcosahedronGeometry(radius, 0);
      shardGeo.scale(0.68, 1.85, 0.68);
      const mesh = new THREE.Mesh(shardGeo, shardMat);
      group.add(mesh);

      orbitingShards.push({
        mesh,
        radius: 1.25 + (i % 3) * 0.22,
        angle: (i / shardCount) * Math.PI * 2,
        speed: 0.75 + (i % 4) * 0.18,
        heightOffset: -0.45 + (i / shardCount) * 1.35,
        bobSpeed: 1.8 + (i % 3) * 0.6,
        tilt: (i % 2 === 0 ? 1 : -1) * 0.22,
        rotSpeed: new THREE.Vector3(0.8, 1.6, 0.6),
      });
    }

    // 2. Frost & Snowflake Mist Particles
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const iceColors = [new THREE.Color('#caf0f8'), new THREE.Color('#48cae4'), new THREE.Color('#ffffff')];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.8 + Math.random() * 0.95;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = -0.9 + Math.random() * 2.1;
      positions[i * 3 + 2] = Math.sin(a) * r;
      particlePhases[i] = Math.random() * Math.PI * 2;

      const c = iceColors[i % iceColors.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    pointsMesh = new THREE.Points(
      geom,
      new THREE.PointsMaterial({
        size: 0.14,
        map: particleSpriteTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(pointsMesh);

    auraLight = new THREE.PointLight(0x00b4d8, 1.4, 5.0);
    auraLight.position.set(0, 0.25, 0.85);
    group.add(auraLight);
  };

  const buildRockVFX = () => {
    // 1. Floating Rock Chunks (`DodecahedronGeometry`) orbiting the character
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x6e6456,
      roughness: 0.9,
      metalness: 0.06,
      flatShading: true,
    });

    const chunkCount = 10;
    for (let i = 0; i < chunkCount; i++) {
      const size = 0.11 + (i % 3) * 0.055;
      const chunkGeo = new THREE.DodecahedronGeometry(size, 0);
      chunkGeo.scale(1.15, 0.85, 0.95);
      const mesh = new THREE.Mesh(chunkGeo, rockMat);
      mesh.castShadow = true;
      group.add(mesh);

      orbitingShards.push({
        mesh,
        radius: 1.32 + (i % 3) * 0.24,
        angle: (i / chunkCount) * Math.PI * 2,
        speed: 0.55 + (i % 3) * 0.15,
        heightOffset: -0.4 + (i / chunkCount) * 1.25,
        bobSpeed: 1.4 + (i % 3) * 0.4,
        tilt: (i % 2 === 0 ? 1 : -1) * 0.18,
        rotSpeed: new THREE.Vector3(1.1, 0.9, 1.3),
      });
    }

    // 2. Dusty Earthen Orbit Trail Particles
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const dustColors = [
      new THREE.Color('#a68a64'),
      new THREE.Color('#7f5539'),
      new THREE.Color('#93a86c'),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.95 + Math.random() * 0.85;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = -0.8 + Math.random() * 1.85;
      positions[i * 3 + 2] = Math.sin(a) * r;
      particlePhases[i] = a;

      const c = dustColors[i % dustColors.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    pointsMesh = new THREE.Points(
      geom,
      new THREE.PointsMaterial({
        size: 0.15,
        map: particleSpriteTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
      })
    );
    group.add(pointsMesh);
  };

  const buildMagicSparklesVFX = () => {
    // 1. Floating Glowing Stars (`OctahedronGeometry`)
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xffe66d,
      emissive: 0xffb703,
      emissiveIntensity: 1.3,
      roughness: 0.2,
      metalness: 0.5,
    });

    const starCount = 10;
    for (let i = 0; i < starCount; i++) {
      const starGeo = new THREE.OctahedronGeometry(0.085, 0);
      const mesh = new THREE.Mesh(starGeo, starMat);
      group.add(mesh);

      orbitingShards.push({
        mesh,
        radius: 1.22 + (i % 3) * 0.2,
        angle: (i / starCount) * Math.PI * 2,
        speed: 0.68 + (i % 3) * 0.16,
        heightOffset: -0.35 + (i / starCount) * 1.25,
        bobSpeed: 2.2 + (i % 3) * 0.5,
        tilt: 0.25,
        rotSpeed: new THREE.Vector3(1.8, 2.4, 1.2),
      });
    }

    // 2. Soft Purple & Golden Magical Aura Particles
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const magicColors = [
      new THREE.Color('#c77dff'),
      new THREE.Color('#ffd166'),
      new THREE.Color('#9d4edd'),
      new THREE.Color('#ffffff'),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.78 + Math.random() * 0.92;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = -0.8 + Math.random() * 1.95;
      positions[i * 3 + 2] = Math.sin(a) * r;
      particlePhases[i] = Math.random() * Math.PI * 2;

      const c = magicColors[i % magicColors.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    pointsMesh = new THREE.Points(
      geom,
      new THREE.PointsMaterial({
        size: 0.15,
        map: particleSpriteTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(pointsMesh);

    // Soft Purple Aura Halo Sphere
    const auraGeo = new THREE.SphereGeometry(1.32, 24, 24);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x9d4edd,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    auraSphere = new THREE.Mesh(auraGeo, auraMat);
    group.add(auraSphere);

    auraLight = new THREE.PointLight(0xb5179e, 1.2, 4.8);
    auraLight.position.set(0, 0.3, 0.75);
    group.add(auraLight);
  };

  const setVFXType = (vfxType: ElementalVFXType) => {
    if (currentType === vfxType && group.children.length > 0) return;
    currentType = vfxType;
    clearVFX();

    if (vfxType === 'fire') {
      buildFireVFX();
    } else if (vfxType === 'ice') {
      buildIceVFX();
    } else if (vfxType === 'rock') {
      buildRockVFX();
    } else if (vfxType === 'sparkles') {
      buildMagicSparklesVFX();
    }
  };

  const update = (dt: number, elapsedTime: number) => {
    if (currentType === 'none') return;
    const safeDt = Math.min(Math.max(dt, 0.001), 0.05);

    // 1. Update Orbiting 3D Shards (Ice Crystals, Rock Boulders, Magic Stars)
    for (const shard of orbitingShards) {
      shard.angle += shard.speed * safeDt;
      const x = Math.cos(shard.angle) * shard.radius;
      const z = Math.sin(shard.angle) * shard.radius;
      const y =
        shard.heightOffset +
        Math.sin(elapsedTime * shard.bobSpeed + shard.angle) * 0.16 +
        Math.sin(shard.angle) * shard.tilt;

      shard.mesh.position.set(x, y, z);
      shard.mesh.rotation.x += shard.rotSpeed.x * safeDt;
      shard.mesh.rotation.y += shard.rotSpeed.y * safeDt;
      shard.mesh.rotation.z += shard.rotSpeed.z * safeDt;
    }

    // 2. Update Elemental Particle Systems
    if (pointsMesh) {
      const posAttr = pointsMesh.geometry.attributes.position as THREE.BufferAttribute;

      if (currentType === 'fire') {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          let x = posAttr.getX(i);
          let y = posAttr.getY(i);
          let z = posAttr.getZ(i);

          const vy = particleVelocities[i * 3 + 1];
          const phase = particlePhases[i];

          y += vy * safeDt;
          // Swirl inward toward flame apex as embers rise
          const heightNorm = Math.max(0, (y + 0.85) / 2.5);
          const swirlX = Math.sin(elapsedTime * 5.0 + phase + y * 2.5) * 0.65 * safeDt;
          const swirlZ = Math.cos(elapsedTime * 4.5 + phase + y * 2.5) * 0.65 * safeDt;
          x = (x + swirlX) * (1.0 - heightNorm * 0.35 * safeDt);
          z = (z + swirlZ) * (1.0 - heightNorm * 0.35 * safeDt);

          if (y > 1.65) {
            const angle = Math.random() * Math.PI * 2;
            const r = 0.65 + Math.random() * 0.55;
            x = Math.cos(angle) * r;
            y = -0.85 + Math.random() * 0.25;
            z = Math.sin(angle) * r;
          }

          posAttr.setXYZ(i, x, y, z);
        }
        posAttr.needsUpdate = true;

        if (auraLight) {
          auraLight.intensity = 1.6 + Math.sin(elapsedTime * 16.0) * 0.35;
        }
      } else if (currentType === 'ice' || currentType === 'sparkles') {
        pointsMesh.rotation.y = elapsedTime * 0.32;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const y = posAttr.getY(i);
          const phase = particlePhases[i];
          const newY = y + Math.sin(elapsedTime * 2.0 + phase) * 0.18 * safeDt;
          posAttr.setY(i, newY);
        }
        posAttr.needsUpdate = true;

        if (auraSphere) {
          const s = 1.0 + Math.sin(elapsedTime * 2.8) * 0.05;
          auraSphere.scale.setScalar(s);
        }
      } else if (currentType === 'rock') {
        pointsMesh.rotation.y = elapsedTime * 0.55;
      }
    }
  };

  const dispose = () => {
    clearVFX();
    particleSpriteTex.dispose();
  };

  return {
    group,
    setVFXType,
    getVFXType: () => currentType,
    update,
    dispose,
  };
}
