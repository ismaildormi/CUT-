import * as THREE from 'three';
import { AccessoryType, CharacterProfile } from '../data/characterPresets';

export interface CharacterAccessoriesController {
  group: THREE.Group;
  setAccessories: (accessories: AccessoryType[], profile?: CharacterProfile) => void;
  getAccessoryBounds: () => THREE.Vector4;
  update: (dt: number, elapsedTime: number, isFlying?: boolean, flightSpeed?: number) => void;
  dispose: () => void;
}

export function calculateAccessoryBounds(accessories: AccessoryType[] = []): THREE.Vector4 {
  if (!accessories || accessories.length === 0) {
    return new THREE.Vector4(0, 0, 0, 0);
  }
  const set = new Set(accessories);
  if (set.has('astro_helmet')) {
    return new THREE.Vector4(0.0, 0.15, 0.04, 1.25);
  }
  if (set.has('wizard_hat') || set.has('celestial_wizard_hat')) {
    return new THREE.Vector4(0.0, 0.95, 0.02, 0.88);
  }
  if (set.has('pirate_hat')) {
    return new THREE.Vector4(0.0, 0.90, 0.02, 0.95);
  }
  if (set.has('chef_toque')) {
    return new THREE.Vector4(0.0, 0.92, 0.0, 0.78);
  }
  if (set.has('royal_crown') || set.has('mini_crown') || set.has('crown_snapback')) {
    return new THREE.Vector4(0.0, 0.90, 0.04, 0.68);
  }
  if (set.has('flame_crown') || set.has('ice_crystal_crown') || set.has('flower_crown')) {
    return new THREE.Vector4(0.0, 0.92, 0.0, 0.72);
  }
  if (set.has('safari_hat') || set.has('grad_cap')) {
    return new THREE.Vector4(0.0, 0.85, 0.02, 0.90);
  }
  if (set.has('backwards_cap') || set.has('console_cap') || set.has('rebel_cap')) {
    return new THREE.Vector4(0.0, 0.80, 0.0, 0.80);
  }
  if (set.has('winter_beanie') || set.has('hipster_beanie')) {
    return new THREE.Vector4(0.0, 0.76, 0.0, 0.84);
  }
  if (set.has('rgb_headset') || set.has('pink_headset') || set.has('studio_headset')) {
    return new THREE.Vector4(0.0, 0.74, 0.0, 0.74);
  }
  if (set.has('cat_hoodie') || set.has('ninja_hood')) {
    return new THREE.Vector4(0.0, 0.82, 0.0, 0.82);
  }
  return new THREE.Vector4(0, 0, 0, 0);
}

/**
 * Procedural 3D Character Accessories Builder (100% Three.js Primitive Geometries — Zero External Models)
 * Builds and animates composite 3D outfits & props attached to Mochi-Puff's root group:
 * - Wizard: Purple/Midnight cone hat + brim + stars, velvet cloak, wooden wand + orbiting glowing star
 * - Astronaut: Transparent glass bubble helmet (MeshPhysicalMaterial), metallic collar ring, EVA chest pack
 * - Superhero: Dynamic vertex-wave red cloth cape (PlaneGeometry), red domino eye mask, chest shield emblem
 * - Pirate: Black tricorn hat with skull & crossbones, eyepatch + strap, captain coat & red scarf
 * - Chef: White puffy toque (Cylinder + Spheres), red neckerchief, wooden spoon prop
 * - Gamer / Streamer / DJ: RGB neon headset (Torus + Cylinders + mic), Kawaii pink headset, studio cans
 * - Royalty, Scholar, Ninja, Safari, Streetwear & Elemental Crowns/Armor
 */
export function createCharacterAccessories(): CharacterAccessoriesController {
  const group = new THREE.Group();
  group.name = 'CharacterAccessoriesRoot';
  group.renderOrder = 10;
  group.position.y = 0.15;
  group.scale.set(1.12, 1.12, 1.12);

  let currentBounds = new THREE.Vector4(0, 0, 0, 0);

  let dynamicClothMeshes: {
    mesh: THREE.Mesh;
    basePositions: Float32Array;
  }[] = [];
  let animatedStars: THREE.Object3D[] = [];
  let rgbEmissiveMaterials: THREE.MeshStandardMaterial[] = [];
  let flameParts: THREE.Object3D[] = [];
  let iceParts: THREE.Object3D[] = [];

  const clearCurrentAccessories = () => {
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
    dynamicClothMeshes = [];
    animatedStars = [];
    rgbEmissiveMaterials = [];
    flameParts = [];
    iceParts = [];
  };

  // Helper: Register a PlaneGeometry cape for real-time cloth wave physics
  const createAnimatedCape = (colorHex: number, trimHex?: number): THREE.Group => {
    const capeGroup = new THREE.Group();
    const capeGeo = new THREE.PlaneGeometry(1.36, 1.44, 18, 20);
    const posAttr = capeGeo.attributes.position;
    const basePositions = new Float32Array(posAttr.array.length);
    basePositions.set(posAttr.array as Float32Array);

    const capeMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.52,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const capeMesh = new THREE.Mesh(capeGeo, capeMat);
    capeMesh.position.set(0, -0.18, -0.82);
    capeMesh.rotation.x = 0.28;
    capeMesh.castShadow = true;
    capeGroup.add(capeMesh);

    dynamicClothMeshes.push({ mesh: capeMesh, basePositions });

    // Neck collar ring
    const collarGeo = new THREE.TorusGeometry(0.68, 0.075, 14, 36, Math.PI * 1.35);
    const collarMat = new THREE.MeshStandardMaterial({
      color: trimHex ?? colorHex,
      roughness: 0.45,
      metalness: 0.15,
    });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.34, 0.05);
    collar.rotation.x = Math.PI * 0.52;
    collar.rotation.z = -Math.PI * 0.175;
    capeGroup.add(collar);

    // Golden clasp medallion in front
    const claspGeo = new THREE.SphereGeometry(0.085, 16, 16);
    claspGeo.scale(1.1, 1.1, 0.5);
    const claspMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.22,
      metalness: 0.85,
    });
    const clasp = new THREE.Mesh(claspGeo, claspMat);
    clasp.position.set(0, -0.18, 0.96);
    capeGroup.add(clasp);

    return capeGroup;
  };

  // Helper: Build Wizard Hat (Purple or Midnight Blue)
  const buildWizardHat = (isCelestial: boolean): THREE.Group => {
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.84, 0.02);
    hatGroup.rotation.z = -0.08;
    hatGroup.rotation.x = -0.1;

    const mainColor = isCelestial ? 0x162447 : 0x4a148c;
    const bandColor = isCelestial ? 0xffb703 : 0x7b1fa2;

    const hatMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.65,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });

    // Wide Curved Brim
    const brimGeo = new THREE.CylinderGeometry(0.98, 1.04, 0.05, 36);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.y = 0;
    hatGroup.add(brim);

    // Lower Cone
    const lowerConeGeo = new THREE.ConeGeometry(0.64, 0.78, 32);
    const lowerCone = new THREE.Mesh(lowerConeGeo, hatMat);
    lowerCone.position.y = 0.38;
    hatGroup.add(lowerCone);

    // Crooked Upper Cone Tip
    const upperConeGeo = new THREE.ConeGeometry(0.34, 0.62, 24);
    const upperCone = new THREE.Mesh(upperConeGeo, hatMat);
    upperCone.position.set(-0.12, 0.82, -0.04);
    upperCone.rotation.z = 0.38;
    hatGroup.add(upperCone);

    // Ribbon Hatband
    const bandGeo = new THREE.TorusGeometry(0.56, 0.055, 12, 32);
    const bandMat = new THREE.MeshStandardMaterial({
      color: bandColor,
      roughness: 0.4,
      metalness: 0.25,
    });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = 0.08;
    band.rotation.x = Math.PI / 2;
    hatGroup.add(band);

    // Golden Buckle on Front
    const buckleGeo = new THREE.BoxGeometry(0.18, 0.14, 0.04);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.25,
      metalness: 0.85,
      emissive: 0x332200,
    });
    const buckle = new THREE.Mesh(buckleGeo, goldMat);
    buckle.position.set(0, 0.09, 0.59);
    hatGroup.add(buckle);

    // Golden Stars Studded on Cone
    const starGeo = new THREE.OctahedronGeometry(0.058, 0);
    const starPositions = [
      [0.24, 0.38, 0.42],
      [-0.26, 0.46, 0.36],
      [0.05, 0.62, 0.32],
      [-0.18, 0.28, -0.45],
      [0.28, 0.45, -0.35],
    ];
    for (const [sx, sy, sz] of starPositions) {
      const sMesh = new THREE.Mesh(starGeo, goldMat);
      sMesh.position.set(sx, sy, sz);
      hatGroup.add(sMesh);
    }

    return hatGroup;
  };

  // Helper: Build Magic Wand + Glowing Star
  const buildMagicWandAndStar = (includeStar: boolean): THREE.Group => {
    const wandGroup = new THREE.Group();
    wandGroup.position.set(0.96, -0.02, 0.48);
    wandGroup.rotation.z = -0.35;
    wandGroup.rotation.x = 0.45;

    const shaftGeo = new THREE.CylinderGeometry(0.028, 0.042, 0.68, 16);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x5c3818,
      roughness: 0.55,
      metalness: 0.1,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    wandGroup.add(shaft);

    const ringGeo = new THREE.TorusGeometry(0.045, 0.014, 10, 20);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.2,
      metalness: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, goldMat);
    ring.position.y = 0.28;
    ring.rotation.x = Math.PI / 2;
    wandGroup.add(ring);

    if (includeStar) {
      const starHolder = new THREE.Group();
      starHolder.position.set(0, 0.42, 0);

      const coreGeo = new THREE.OctahedronGeometry(0.12, 0);
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xffe600,
        emissive: 0xffae00,
        emissiveIntensity: 1.6,
        roughness: 0.15,
        metalness: 0.3,
      });
      const starA = new THREE.Mesh(coreGeo, starMat);
      const starB = new THREE.Mesh(coreGeo, starMat);
      starB.rotation.y = Math.PI / 4;
      starB.rotation.z = Math.PI / 4;
      starHolder.add(starA);
      starHolder.add(starB);

      const haloGeo = new THREE.SphereGeometry(0.16, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xfff380,
        transparent: true,
        opacity: 0.35,
      });
      starHolder.add(new THREE.Mesh(haloGeo, haloMat));

      wandGroup.add(starHolder);
      animatedStars.push(starHolder);
    }

    return wandGroup;
  };

  // Helper: Build Astronaut Transparent Bubble Helmet & EVA Suit Collar/Pack
  const buildAstronautHelmetAndSuit = (includeSuit: boolean): THREE.Group => {
    const astroGroup = new THREE.Group();

    // Transparent Glass Sphere Helmet
    const helmetGeo = new THREE.SphereGeometry(1.24, 36, 28);
    const helmetMat = new THREE.MeshPhysicalMaterial({
      color: 0xdff4ff,
      transparent: true,
      opacity: 0.34,
      roughness: 0.06,
      metalness: 0.05,
      transmission: 0.72,
      ior: 1.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      depthWrite: false,
    });
    const helmetMesh = new THREE.Mesh(helmetGeo, helmetMat);
    helmetMesh.position.set(0, 0.08, 0.04);
    astroGroup.add(helmetMesh);

    // Visor Golden Rim Frame
    const visorFrameGeo = new THREE.TorusGeometry(0.86, 0.038, 14, 42);
    const whiteMetalMat = new THREE.MeshStandardMaterial({
      color: 0xf0f4f8,
      roughness: 0.28,
      metalness: 0.65,
    });
    const visorFrame = new THREE.Mesh(visorFrameGeo, whiteMetalMat);
    visorFrame.position.set(0, 0.12, 0.72);
    astroGroup.add(visorFrame);

    // Neck Seal Collar Ring
    const neckRingGeo = new THREE.TorusGeometry(0.88, 0.085, 16, 40);
    const neckRing = new THREE.Mesh(neckRingGeo, whiteMetalMat);
    neckRing.position.set(0, -0.46, 0.04);
    neckRing.rotation.x = Math.PI / 2;
    astroGroup.add(neckRing);

    // Side Ear Comms Pods + Antenna
    for (const side of [-1, 1]) {
      const podGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20);
      const pod = new THREE.Mesh(podGeo, whiteMetalMat);
      pod.position.set(side * 1.22, 0.08, 0.04);
      pod.rotation.z = Math.PI / 2;
      astroGroup.add(pod);
    }

    const antGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.38, 10);
    const ant = new THREE.Mesh(antGeo, whiteMetalMat);
    ant.position.set(1.22, 0.34, 0.04);
    astroGroup.add(ant);

    const antTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x00b4d8,
        emissiveIntensity: 1.2,
      })
    );
    antTip.position.set(1.22, 0.54, 0.04);
    astroGroup.add(antTip);

    if (includeSuit) {
      // Chest EVA Control Box
      const boxGeo = new THREE.BoxGeometry(0.42, 0.28, 0.14);
      const box = new THREE.Mesh(boxGeo, whiteMetalMat);
      box.position.set(0, -0.34, 0.96);
      astroGroup.add(box);

      // Red & Blue telemetry buttons on chest box
      const btnRed = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.04, 14),
        new THREE.MeshBasicMaterial({ color: 0xff2a55 })
      );
      btnRed.rotation.x = Math.PI / 2;
      btnRed.position.set(-0.1, -0.32, 1.03);
      astroGroup.add(btnRed);

      const btnBlue = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.04, 14),
        new THREE.MeshBasicMaterial({ color: 0x00b4ff })
      );
      btnBlue.rotation.x = Math.PI / 2;
      btnBlue.position.set(0.1, -0.32, 1.03);
      astroGroup.add(btnBlue);
    }

    return astroGroup;
  };

  // Helper: Build Superhero Mask & Chest Emblem
  const buildHeroMask = (): THREE.Group => {
    const maskGroup = new THREE.Group();
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xe6192e,
      roughness: 0.32,
      metalness: 0.18,
    });

    for (const side of [-1, 1]) {
      const eyeRingGeo = new THREE.TorusGeometry(0.21, 0.055, 14, 28);
      eyeRingGeo.scale(1.15, 0.92, 0.55);
      const eyeRing = new THREE.Mesh(eyeRingGeo, redMat);
      eyeRing.position.set(side * 0.31, 0.16, 0.93);
      eyeRing.rotation.y = side * 0.22;
      maskGroup.add(eyeRing);
    }

    const bridgeGeo = new THREE.BoxGeometry(0.24, 0.08, 0.08);
    const bridge = new THREE.Mesh(bridgeGeo, redMat);
    bridge.position.set(0, 0.18, 0.97);
    maskGroup.add(bridge);

    return maskGroup;
  };

  const buildHeroEmblem = (): THREE.Group => {
    const emblemGroup = new THREE.Group();
    emblemGroup.position.set(0, -0.26, 0.97);
    emblemGroup.rotation.x = 0.18;

    const shieldGeo = new THREE.OctahedronGeometry(0.22, 0);
    shieldGeo.scale(1.15, 0.85, 0.22);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd000,
      roughness: 0.25,
      metalness: 0.75,
    });
    const shield = new THREE.Mesh(shieldGeo, goldMat);
    emblemGroup.add(shield);

    const innerGeo = new THREE.OctahedronGeometry(0.15, 0);
    innerGeo.scale(1.15, 0.85, 0.26);
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.3,
      metalness: 0.3,
    });
    emblemGroup.add(new THREE.Mesh(innerGeo, redMat));

    return emblemGroup;
  };

  // Helper: Build Pirate Tricorn Hat, Eyepatch & Coat
  const buildPirateHat = (): THREE.Group => {
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.82, 0.06);
    hatGroup.rotation.x = -0.12;
    hatGroup.rotation.z = -0.05;

    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x16161a,
      roughness: 0.7,
      metalness: 0.1,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffc300,
      roughness: 0.3,
      metalness: 0.8,
    });
    const redBandMat = new THREE.MeshStandardMaterial({
      color: 0xc1121f,
      roughness: 0.6,
    });

    // Red bandana base
    const bandanaGeo = new THREE.CylinderGeometry(0.72, 0.78, 0.14, 32);
    const bandana = new THREE.Mesh(bandanaGeo, redBandMat);
    bandana.position.y = -0.04;
    hatGroup.add(bandana);

    // Tricorn triangular brim
    const brimGeo = new THREE.CylinderGeometry(1.06, 0.92, 0.26, 3);
    brimGeo.scale(1.15, 1.0, 0.85);
    const brim = new THREE.Mesh(brimGeo, blackMat);
    brim.position.y = 0.12;
    brim.rotation.y = Math.PI;
    hatGroup.add(brim);

    // Gold trim ring
    const trimGeo = new THREE.TorusGeometry(0.94, 0.028, 10, 3);
    trimGeo.scale(1.15, 0.85, 1.0);
    const trim = new THREE.Mesh(trimGeo, goldMat);
    trim.position.y = 0.24;
    trim.rotation.x = Math.PI / 2;
    trim.rotation.z = Math.PI / 6;
    hatGroup.add(trim);

    // White Skull & Crossbones on Front
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 14), whiteMat);
    skull.position.set(0, 0.15, 0.56);
    skull.scale.set(1.0, 1.1, 0.5);
    hatGroup.add(skull);

    for (const angle of [-0.65, 0.65]) {
      const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 8), whiteMat);
      bone.position.set(0, 0.13, 0.54);
      bone.rotation.z = angle;
      hatGroup.add(bone);
    }

    return hatGroup;
  };

  const buildEyepatch = (): THREE.Group => {
    const patchGroup = new THREE.Group();
    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.6,
    });

    // Patch over Left Eye (-0.31, 0.16, 0.94)
    const cupGeo = new THREE.SphereGeometry(0.185, 20, 16);
    cupGeo.scale(1.02, 1.08, 0.42);
    const cup = new THREE.Mesh(cupGeo, blackMat);
    cup.position.set(-0.31, 0.16, 0.96);
    cup.rotation.y = -0.22;
    patchGroup.add(cup);

    // Diagonal Strap across head
    const strapGeo = new THREE.TorusGeometry(0.98, 0.022, 10, 40);
    const strap = new THREE.Mesh(strapGeo, blackMat);
    strap.position.set(0, 0.18, 0.05);
    strap.rotation.y = 0.12;
    strap.rotation.z = 0.38;
    patchGroup.add(strap);

    return patchGroup;
  };

  // Helper: Build Chef Toque, Scarf & Wooden Spoon
  const buildChefToque = (): THREE.Group => {
    const toqueGroup = new THREE.Group();
    toqueGroup.position.set(0, 0.85, -0.02);
    toqueGroup.rotation.x = -0.08;
    toqueGroup.rotation.z = 0.06;

    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xfafcff,
      roughness: 0.55,
      metalness: 0.02,
    });

    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.52, 0.36, 28), whiteMat);
    baseCyl.position.y = 0.14;
    toqueGroup.add(baseCyl);

    // Ring of Puffy Cloud Lobes on Top
    const puffCount = 8;
    for (let i = 0; i < puffCount; i++) {
      const a = (i / puffCount) * Math.PI * 2;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 16), whiteMat);
      puff.position.set(Math.cos(a) * 0.36, 0.44, Math.sin(a) * 0.36);
      toqueGroup.add(puff);
    }
    const centerPuff = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), whiteMat);
    centerPuff.position.set(0, 0.48, 0);
    toqueGroup.add(centerPuff);

    return toqueGroup;
  };

  const buildWoodenSpoon = (): THREE.Group => {
    const spoonGroup = new THREE.Group();
    spoonGroup.position.set(0.95, 0.02, 0.42);
    spoonGroup.rotation.z = -0.28;
    spoonGroup.rotation.x = 0.25;

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xb5651d,
      roughness: 0.62,
      metalness: 0.05,
    });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.62, 14), woodMat);
    spoonGroup.add(handle);

    const bowlGeo = new THREE.SphereGeometry(0.13, 18, 16);
    bowlGeo.scale(0.85, 1.25, 0.45);
    const bowl = new THREE.Mesh(bowlGeo, woodMat);
    bowl.position.set(0, 0.36, 0);
    spoonGroup.add(bowl);

    return spoonGroup;
  };

  // Helper: Build Gaming / Studio / Kawaii Headphones
  const buildHeadset = (mode: 'rgb' | 'pink' | 'studio'): THREE.Group => {
    const hsGroup = new THREE.Group();

    const bandColor = mode === 'pink' ? 0xff7eb6 : 0x181a20;
    const bandMat = new THREE.MeshStandardMaterial({
      color: bandColor,
      roughness: 0.35,
      metalness: 0.4,
    });

    // Over-Head Arch
    const archGeo = new THREE.TorusGeometry(1.04, 0.058, 14, 40, Math.PI * 1.05);
    const arch = new THREE.Mesh(archGeo, bandMat);
    arch.position.set(0, 0.06, 0.06);
    arch.rotation.z = -0.025 * Math.PI;
    hsGroup.add(arch);

    // Earcups + LED Rings
    for (const side of [-1, 1]) {
      const cupGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 24);
      const cup = new THREE.Mesh(cupGeo, bandMat);
      cup.position.set(side * 1.04, 0.06, 0.08);
      cup.rotation.z = Math.PI / 2;
      hsGroup.add(cup);

      if (mode === 'rgb' || mode === 'pink') {
        const ledColor = mode === 'pink' ? 0xffb3d5 : 0x00e5ff;
        const ledMat = new THREE.MeshStandardMaterial({
          color: ledColor,
          emissive: ledColor,
          emissiveIntensity: mode === 'rgb' ? 1.5 : 0.7,
          roughness: 0.2,
        });
        if (mode === 'rgb') {
          rgbEmissiveMaterials.push(ledMat);
        }
        const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.024, 12, 28), ledMat);
        ledRing.position.set(side * 1.13, 0.06, 0.08);
        ledRing.rotation.y = Math.PI / 2;
        hsGroup.add(ledRing);
      }
    }

    // Boom Microphone on Left Earcup
    if (mode !== 'studio') {
      const micArm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 10), bandMat);
      micArm.position.set(-0.92, -0.06, 0.42);
      micArm.rotation.x = Math.PI / 2.4;
      micArm.rotation.z = -0.35;
      hsGroup.add(micArm);
    }

    return hsGroup;
  };

  // Helper: Build Glasses & Sunglasses
  const buildGlasses = (isSunglasses: boolean): THREE.Group => {
    const gGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x15151a,
      roughness: 0.25,
      metalness: 0.6,
    });

    for (const side of [-1, 1]) {
      const ringGeo = new THREE.TorusGeometry(0.21, isSunglasses ? 0.036 : 0.022, 12, 28);
      const ring = new THREE.Mesh(ringGeo, frameMat);
      ring.position.set(side * 0.31, 0.20, 1.16);
      ring.rotation.y = side * 0.2;
      gGroup.add(ring);

      if (isSunglasses) {
        const lensGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24);
        const lensMat = new THREE.MeshPhysicalMaterial({
          color: 0x09090d,
          roughness: 0.08,
          metalness: 0.4,
          clearcoat: 1.0,
        });
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(side * 0.31, 0.20, 1.16);
        lens.rotation.z = -side * 0.2;
        gGroup.add(lens);
      }
    }

    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 10), frameMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.22, 1.18);
    gGroup.add(bridge);
    gGroup.scale.set(1.1, 1.1, 1.1);

    return gGroup;
  };

  // Helper: Build Royal Crown or Mini Crown
  const buildCrown = (isMini: boolean): THREE.Group => {
    const crownGroup = new THREE.Group();
    const scale = isMini ? 0.62 : 1.0;
    crownGroup.scale.setScalar(scale);
    crownGroup.position.set(isMini ? -0.22 : 0, 0.88, 0.06);
    if (isMini) crownGroup.rotation.z = 0.24;

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.22,
      metalness: 0.88,
    });

    const baseCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.42, 0.22, 24, 1, false),
      goldMat
    );
    crownGroup.add(baseCyl);

    const spikes = 6;
    const gemColors = [0xe6192e, 0x0077ff, 0x00c853];
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 12), goldMat);
      spike.position.set(Math.cos(a) * 0.42, 0.22, Math.sin(a) * 0.42);
      crownGroup.add(spike);

      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), goldMat);
      pearl.position.set(Math.cos(a) * 0.42, 0.35, Math.sin(a) * 0.42);
      crownGroup.add(pearl);

      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.048, 0),
        new THREE.MeshStandardMaterial({
          color: gemColors[i % gemColors.length],
          roughness: 0.15,
          metalness: 0.4,
        })
      );
      gem.position.set(Math.cos(a) * 0.45, 0.02, Math.sin(a) * 0.45);
      crownGroup.add(gem);
    }

    return crownGroup;
  };

  // Helper: Build Baseball / Snapback Cap (Forward or Backwards)
  const buildBaseballCap = (
    backwards: boolean,
    domeHex: number,
    visorHex: number
  ): THREE.Group => {
    const capGroup = new THREE.Group();
    capGroup.position.set(0, 0.64, 0.02);
    if (backwards) {
      capGroup.rotation.y = Math.PI * 0.88;
      capGroup.rotation.z = -0.08;
    }

    const domeMat = new THREE.MeshStandardMaterial({
      color: domeHex,
      roughness: 0.65,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: visorHex,
      roughness: 0.55,
    });

    const domeGeo = new THREE.SphereGeometry(0.76, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const dome = new THREE.Mesh(domeGeo, domeMat);
    capGroup.add(dome);

    const visorGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.04, 24, 1, false, -0.8, 1.6);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.02, 0.34);
    visor.rotation.x = 0.15;
    capGroup.add(visor);

    return capGroup;
  };

  // Helper: Build Elemental Crowns & Rock Armor (Image 3)
  const buildFlameCrown = (): THREE.Group => {
    const fGroup = new THREE.Group();
    fGroup.position.set(0, 0.86, 0.0);

    const count = 7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const h = i % 2 === 0 ? 0.58 : 0.38;
      const coneGeo = new THREE.ConeGeometry(0.18, h, 14);
      const flameMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xff5500 : 0xffaa00,
        emissive: i % 2 === 0 ? 0xff3300 : 0xff8800,
        emissiveIntensity: 1.35,
        roughness: 0.3,
      });
      const tongue = new THREE.Mesh(coneGeo, flameMat);
      tongue.position.set(Math.cos(a) * 0.32, h * 0.35, Math.sin(a) * 0.32);
      tongue.rotation.z = -Math.cos(a) * 0.22;
      tongue.rotation.x = Math.sin(a) * 0.22;
      fGroup.add(tongue);
      flameParts.push(tongue);
    }
    return fGroup;
  };

  const buildIceCrystalCrown = (): THREE.Group => {
    const iGroup = new THREE.Group();
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: 0xa2f2ff,
      emissive: 0x0096c7,
      emissiveIntensity: 0.65,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.65,
      transparent: true,
      opacity: 0.82,
      flatShading: true,
    });

    const placements = [
      [0, 1.06, 0.05, 0.26, 0.62, 0, 0],
      [-0.36, 0.96, 0.08, 0.2, 0.5, 0, 0.35],
      [0.36, 0.96, 0.08, 0.2, 0.5, 0, -0.35],
      [-0.64, 0.76, 0.02, 0.17, 0.42, 0, 0.65],
      [0.64, 0.76, 0.02, 0.17, 0.42, 0, -0.65],
      [-0.86, 0.42, 0.1, 0.15, 0.36, 0, 0.95],
      [0.86, 0.42, 0.1, 0.15, 0.36, 0, -0.95],
    ];
    for (const [x, y, z, r, h, rx, rz] of placements) {
      const shardGeo = new THREE.ConeGeometry(r, h, 5);
      const shard = new THREE.Mesh(shardGeo, iceMat);
      shard.position.set(x, y, z);
      shard.rotation.set(rx, Math.random() * Math.PI, rz);
      iGroup.add(shard);
      iceParts.push(shard);
    }
    return iGroup;
  };

  const buildRockArmor = (): THREE.Group => {
    const rGroup = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5c5549,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
    });
    const mossMat = new THREE.MeshStandardMaterial({
      color: 0x6b8e23,
      roughness: 0.88,
      flatShading: true,
    });

    const boulderPositions = [
      [0, 0.92, 0.08, 0.32],
      [-0.44, 0.82, 0.12, 0.26],
      [0.44, 0.82, 0.12, 0.26],
      [-0.88, 0.28, 0.18, 0.28],
      [0.88, 0.28, 0.18, 0.28],
      [-0.78, -0.18, 0.28, 0.24],
      [0.78, -0.18, 0.28, 0.24],
    ];
    boulderPositions.forEach(([x, y, z, rad], idx) => {
      const geo = new THREE.DodecahedronGeometry(rad, 0);
      geo.scale(1.15, 0.72, 0.95);
      const mesh = new THREE.Mesh(geo, rockMat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(idx * 0.7, idx * 1.1, idx * 0.5);
      rGroup.add(mesh);

      if (idx % 2 === 0) {
        const mossGeo = new THREE.DodecahedronGeometry(rad * 0.65, 0);
        mossGeo.scale(1.2, 0.35, 1.1);
        const moss = new THREE.Mesh(mossGeo, mossMat);
        moss.position.set(x, y + rad * 0.35, z);
        rGroup.add(moss);
      }
    });
    return rGroup;
  };

  const setAccessories = (accessories: AccessoryType[], _profile?: CharacterProfile) => {
    clearCurrentAccessories();
    if (!accessories || accessories.length === 0) return;

    const set = new Set(accessories);

    // 1. Wizard Hats, Cloaks, Wands & Stars
    if (set.has('wizard_hat')) {
      group.add(buildWizardHat(false));
    }
    if (set.has('celestial_wizard_hat')) {
      group.add(buildWizardHat(true));
    }
    if (set.has('wizard_cloak')) {
      group.add(createAnimatedCape(0x4a148c, 0xffd700));
    }
    if (set.has('celestial_cloak')) {
      group.add(createAnimatedCape(0x162447, 0xffb703));
    }
    if (set.has('magic_wand')) {
      group.add(buildMagicWandAndStar(set.has('glowing_star')));
    }

    // 2. Astronaut
    if (set.has('astro_helmet')) {
      group.add(buildAstronautHelmetAndSuit(set.has('astro_suit')));
    }

    // 3. Superhero
    if (set.has('hero_mask')) {
      group.add(buildHeroMask());
    }
    if (set.has('hero_cape')) {
      group.add(createAnimatedCape(0xd90429, 0xffd000));
    }
    if (set.has('hero_emblem')) {
      group.add(buildHeroEmblem());
    }

    // 4. Pirate
    if (set.has('pirate_hat')) {
      group.add(buildPirateHat());
    }
    if (set.has('eyepatch')) {
      group.add(buildEyepatch());
    }
    if (set.has('pirate_coat')) {
      const scarf = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.085, 14, 32),
        new THREE.MeshStandardMaterial({ color: 0xc1121f, roughness: 0.6 })
      );
      scarf.position.set(0, -0.32, 0.14);
      scarf.rotation.x = Math.PI / 2 + 0.18;
      group.add(scarf);
    }

    // 5. Chef
    if (set.has('chef_toque')) {
      group.add(buildChefToque());
    }
    if (set.has('chef_coat')) {
      const scarf = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.065, 12, 32),
        new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.55 })
      );
      scarf.position.set(0, -0.28, 0.16);
      scarf.rotation.x = Math.PI / 2 + 0.16;
      group.add(scarf);
    }
    if (set.has('wooden_spoon')) {
      group.add(buildWoodenSpoon());
    }

    // 6. Headsets (RGB Gamer, Kawaii Pink, Studio DJ)
    if (set.has('rgb_headset')) {
      group.add(buildHeadset('rgb'));
    }
    if (set.has('pink_headset')) {
      group.add(buildHeadset('pink'));
    }
    if (set.has('studio_headset')) {
      group.add(buildHeadset('studio'));
    }

    // 7. Glasses & Sunglasses
    if (set.has('round_glasses')) {
      group.add(buildGlasses(false));
    }
    if (set.has('sunglasses')) {
      group.add(buildGlasses(true));
    }

    // 8. Royalty Crowns & Cape
    if (set.has('royal_crown')) {
      group.add(buildCrown(false));
    }
    if (set.has('mini_crown')) {
      group.add(buildCrown(true));
    }
    if (set.has('royal_cape')) {
      group.add(createAnimatedCape(0xb80c09, 0xffffff));
    }

    // 9. Graduation Cap & Diploma
    if (set.has('grad_cap')) {
      const gradGroup = new THREE.Group();
      gradGroup.position.set(0, 0.88, 0.04);
      const blackMat = new THREE.MeshStandardMaterial({ color: 0x16161d, roughness: 0.6 });
      const skullCap = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.48, 0.18, 24), blackMat);
      gradGroup.add(skullCap);
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.045, 1.25), blackMat);
      board.position.y = 0.11;
      board.rotation.y = Math.PI / 4;
      gradGroup.add(board);
      const tassel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.045, 0.42, 10),
        new THREE.MeshStandardMaterial({ color: 0xffc300, roughness: 0.3 })
      );
      tassel.position.set(-0.58, -0.05, 0.25);
      gradGroup.add(tassel);
      group.add(gradGroup);
    }
    if (set.has('diploma_scroll')) {
      const scrollGroup = new THREE.Group();
      scrollGroup.position.set(-0.92, -0.05, 0.46);
      scrollGroup.rotation.z = 0.55;
      const paper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.48, 16),
        new THREE.MeshStandardMaterial({ color: 0xfdf0d5, roughness: 0.6 })
      );
      scrollGroup.add(paper);
      const ribbon = new THREE.Mesh(
        new THREE.TorusGeometry(0.072, 0.018, 10, 20),
        new THREE.MeshStandardMaterial({ color: 0xd90429 })
      );
      ribbon.rotation.x = Math.PI / 2;
      scrollGroup.add(ribbon);
      group.add(scrollGroup);
    }

    // 10. Pink Ribbon Bow / Flower Crown / Devil Horns
    if (set.has('pink_bow')) {
      const bowGroup = new THREE.Group();
      bowGroup.position.set(0, 0.88, 0.24);
      const pinkMat = new THREE.MeshStandardMaterial({ color: 0xff4d94, roughness: 0.4 });
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 16), pinkMat);
      bowGroup.add(knot);
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.36, 16), pinkMat);
        wing.position.set(side * 0.2, 0, 0);
        wing.rotation.z = side * (Math.PI / 2);
        wing.scale.set(1.0, 1.0, 0.45);
        bowGroup.add(wing);
      }
      group.add(bowGroup);
    }

    if (set.has('flower_crown')) {
      const fcGroup = new THREE.Group();
      fcGroup.position.set(0, 0.72, 0.08);
      fcGroup.rotation.x = 0.14;
      const vine = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.032, 10, 32),
        new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.7 })
      );
      vine.rotation.x = Math.PI / 2;
      fcGroup.add(vine);
      const colors = [0xff80ab, 0xfff59d, 0xffffff, 0xea80fc];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.085, 12, 12),
          new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.4 })
        );
        flower.position.set(Math.cos(a) * 0.68, 0.02, Math.sin(a) * 0.68);
        fcGroup.add(flower);
      }
      group.add(fcGroup);
    }

    if (set.has('devil_horns')) {
      const hornMat = new THREE.MeshStandardMaterial({
        color: 0xd90429,
        roughness: 0.3,
        metalness: 0.25,
      });
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 16), hornMat);
        horn.position.set(side * 0.44, 0.88, 0.18);
        horn.rotation.z = -side * 0.35;
        horn.rotation.x = 0.18;
        group.add(horn);
      }
    }

    // 11. Caps, Beanies, Safari Hat, Ninja Mask, Neko Hoodie, Bowtie & Necktie
    if (set.has('backwards_cap')) {
      group.add(buildBaseballCap(true, 0x18181f, 0x18181f));
    }
    if (set.has('console_cap') || set.has('crown_snapback')) {
      group.add(buildBaseballCap(false, 0x18181f, 0x18181f));
    }
    if (set.has('rebel_cap')) {
      group.add(buildBaseballCap(false, 0x18181f, 0xd90429));
    }
    if (set.has('winter_beanie') || set.has('hipster_beanie')) {
      const isWinter = set.has('winter_beanie');
      const bColor = isWinter ? 0x0066cc : 0x22242a;
      const bGroup = new THREE.Group();
      bGroup.position.set(0, 0.68, 0.0);
      const bMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.82 });
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.76, 26, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
        bMat
      );
      bGroup.add(dome);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.095, 14, 34), bMat);
      cuff.rotation.x = Math.PI / 2;
      bGroup.add(cuff);
      if (isWinter) {
        const pom = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0x14161f, roughness: 0.9 })
        );
        pom.position.y = 0.82;
        bGroup.add(pom);
      }
      group.add(bGroup);
    }
    if (set.has('winter_scarf')) {
      const scarfMat = new THREE.MeshStandardMaterial({ color: 0x0055b3, roughness: 0.8 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.11, 14, 36), scarfMat);
      ring.position.set(0, -0.34, 0.12);
      ring.rotation.x = Math.PI / 2 + 0.14;
      group.add(ring);
    }
    if (set.has('cat_hoodie')) {
      const hoodMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.65 });
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.36, 16), hoodMat);
        ear.position.set(side * 0.56, 0.86, 0.12);
        ear.rotation.z = -side * 0.42;
        group.add(ear);
      }
    }
    if (set.has('bow_tie')) {
      const btGroup = new THREE.Group();
      btGroup.position.set(0, -0.22, 0.98);
      const blackMat = new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: 0.5 });
      btGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), blackMat));
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 12), blackMat);
        wing.position.set(side * 0.1, 0, 0);
        wing.rotation.z = side * (Math.PI / 2);
        wing.scale.set(1, 1, 0.4);
        btGroup.add(wing);
      }
      group.add(btGroup);
    }
    if (set.has('necktie_collar')) {
      const tieMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const tie = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.36, 4), tieMat);
      tie.position.set(0, -0.34, 0.97);
      tie.rotation.x = Math.PI;
      tie.scale.set(1.0, 1.0, 0.3);
      group.add(tie);
    }
    if (set.has('safari_hat')) {
      const sGroup = new THREE.Group();
      sGroup.position.set(0, 0.72, 0.02);
      const tanMat = new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.72 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.08, 0.05, 32), tanMat);
      sGroup.add(brim);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
        tanMat
      );
      sGroup.add(dome);
      if (set.has('safari_goggles')) {
        const brassMat = new THREE.MeshStandardMaterial({
          color: 0xb8860b,
          roughness: 0.3,
          metalness: 0.75,
        });
        for (const side of [-1, 1]) {
          const gog = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.032, 12, 24), brassMat);
          gog.position.set(side * 0.22, 0.22, 0.62);
          sGroup.add(gog);
        }
      }
      group.add(sGroup);
    }
    if (set.has('ninja_mask') || set.has('ninja_hood')) {
      const ninjaMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.72 });
      const mask = new THREE.Mesh(
        new THREE.SphereGeometry(0.96, 28, 18, -0.9, 1.8, Math.PI * 0.48, Math.PI * 0.35),
        ninjaMat
      );
      mask.position.set(0, 0.02, 0.12);
      group.add(mask);
      const hood = new THREE.Mesh(
        new THREE.SphereGeometry(0.98, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.46),
        ninjaMat
      );
      hood.position.set(0, 0.18, -0.02);
      group.add(hood);
    }

    // 12. Elemental Crowns & Armor (Fire, Ice, Rock)
    if (set.has('flame_crown')) {
      group.add(buildFlameCrown());
    }
    if (set.has('ice_crystal_crown')) {
      group.add(buildIceCrystalCrown());
    }
    if (set.has('rock_armor')) {
      group.add(buildRockArmor());
    }

    // =========================================================================
    // 3D ACCESSORY RENDERING FIX (LAYERING ABOVE FUR)
    // =========================================================================
    currentBounds = calculateAccessoryBounds(accessories);

    // 1. OFFSET: Move accessory slightly outwards along the normal vector (+0.15 on Y-axis)
    group.position.y = 0.15;
    // 2. SCALING: Increase scale slightly (1.12x) so it sits above maximum fur length without clipping
    group.scale.set(1.12, 1.12, 1.12);
    // 3. RENDER ORDER: Set renderOrder for all accessories to 10 so they render AFTER fur shells
    group.renderOrder = 10;
    // 4. DEPTH TEST: Ensure depthTest: true and depthWrite: true across all accessory meshes & materials
    group.traverse((obj: THREE.Object3D) => {
      obj.renderOrder = 10;
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.renderOrder = 10;
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m: THREE.Material) => {
            m.depthTest = true;
            m.depthWrite = true;
          });
        }
      }
    });
  };

  const update = (_dt: number, elapsedTime: number, isFlying = false, flightSpeed = 0) => {
    // 1. Procedural Cloth Wave Physics on Capes (Superhero, Wizard, Royal King)
    for (const item of dynamicClothMeshes) {
      const posAttr = item.mesh.geometry.attributes.position as THREE.BufferAttribute;
      const base = item.basePositions;
      const waveAmp = isFlying ? 0.18 + Math.min(0.18, flightSpeed * 0.06) : 0.075;
      const waveSpeed = isFlying ? 9.5 : 4.2;

      for (let i = 0; i < posAttr.count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const bz = base[i * 3 + 2];

        // Pin top edge (by near +0.72), billow progressively toward bottom hem (by near -0.72)
        const vFactor = Math.max(0, (0.72 - by) / 1.44);
        const waveZ =
          Math.sin(elapsedTime * waveSpeed - vFactor * 4.5 + bx * 2.2) * waveAmp * vFactor -
          vFactor * (isFlying ? 0.28 : 0.08);
        const waveX = Math.cos(elapsedTime * (waveSpeed * 0.7) + by * 3.0) * 0.04 * vFactor;

        posAttr.setXYZ(i, bx + waveX, by, bz + waveZ);
      }
      posAttr.needsUpdate = true;
      item.mesh.geometry.computeVertexNormals();
    }

    // 2. Rotate & Pulse Wizard Wand Glowing Star
    for (const star of animatedStars) {
      star.rotation.y = elapsedTime * 2.8;
      star.rotation.z = Math.sin(elapsedTime * 3.5) * 0.25;
      const s = 1.0 + Math.sin(elapsedTime * 6.0) * 0.14;
      star.scale.setScalar(s);
    }

    // 3. Cycle RGB Gaming Headset Emissive Hue
    if (rgbEmissiveMaterials.length > 0) {
      const hue = (elapsedTime * 0.25) % 1.0;
      for (const mat of rgbEmissiveMaterials) {
        mat.color.setHSL(hue, 0.95, 0.55);
        mat.emissive.setHSL(hue, 0.95, 0.5);
      }
    }

    // 4. Flicker Elemental Flame Crown Tongues
    flameParts.forEach((part, idx) => {
      const sy = 1.0 + Math.sin(elapsedTime * 9.0 + idx * 1.4) * 0.22;
      const sx = 1.0 + Math.cos(elapsedTime * 7.5 + idx) * 0.1;
      part.scale.set(sx, sy, sx);
    });

    // 5. Shimmer Ice Crown Shards
    iceParts.forEach((part, idx) => {
      part.position.y += Math.sin(elapsedTime * 3.0 + idx) * 0.0006;
    });
  };

  const dispose = () => {
    clearCurrentAccessories();
  };

  return {
    group,
    setAccessories,
    getAccessoryBounds: () => currentBounds,
    update,
    dispose,
  };
}
