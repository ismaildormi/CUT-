import * as THREE from 'three';

export interface WingsHandle {
  group: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  update: (dt: number, elapsedTime: number, isFlying: boolean, flightSpeed?: number) => void;
  setTint: (hexColor: string) => void;
  dispose: () => void;
}

/**
 * Creates procedural angelic/pegasus 3D feathered wings with multi-layered
 * primary, secondary, and covert feathers using ExtrudeGeometry + bevels.
 * Sprouts from NEVEA's back and flaps dynamically with harmonic phase lag when flying.
 */
export function createProceduralWings(): WingsHandle {
  const group = new THREE.Group();
  group.name = 'NeveaAngelicWings';
  // Positioned on the upper-back of Mochi-Puff
  group.position.set(0, 0.16, -0.68);
  group.scale.setScalar(0.001);
  group.visible = false;

  const primaryFeatherMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    roughness: 0.32,
    metalness: 0.04,
    clearcoat: 0.65,
    clearcoatRoughness: 0.25,
    sheen: 0.85,
    sheenRoughness: 0.35,
    sheenColor: new THREE.Color('#dbeafe'),
    emissive: new THREE.Color('#e0f2fe'),
    emissiveIntensity: 0.14,
  });

  const covertFeatherMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f8fafc'),
    roughness: 0.58,
    metalness: 0.02,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.08,
  });

  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#fef08a'),
    roughness: 0.22,
    metalness: 0.78,
    emissive: new THREE.Color('#fde047'),
    emissiveIntensity: 0.18,
  });

  // Procedural single feather geometry using ExtrudeGeometry with soft bevels
  const featherShape = new THREE.Shape();
  featherShape.moveTo(0, 0);
  featherShape.bezierCurveTo(0.06, 0.18, 0.09, 0.55, 0.02, 0.96);
  featherShape.quadraticCurveTo(0.0, 1.04, -0.02, 0.96);
  featherShape.bezierCurveTo(-0.07, 0.58, -0.05, 0.18, 0, 0);

  const featherGeo = new THREE.ExtrudeGeometry(featherShape, {
    steps: 1,
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  featherGeo.center();

  const armArchGeo = new THREE.CapsuleGeometry(0.065, 0.62, 8, 14);
  const shoulderJointGeo = new THREE.SphereGeometry(0.09, 14, 14);

  const primaryFeathersLeft: THREE.Mesh[] = [];
  const primaryFeathersRight: THREE.Mesh[] = [];

  const buildWingSide = (side: 1 | -1, primaryStore: THREE.Mesh[]): THREE.Group => {
    const wingPivot = new THREE.Group();
    wingPivot.position.set(side * 0.22, 0.04, 0);

    // 1. Shoulder Halo Joint Accent
    const shoulderMesh = new THREE.Mesh(shoulderJointGeo, goldAccentMat);
    shoulderMesh.scale.set(1.0, 0.85, 0.7);
    wingPivot.add(shoulderMesh);

    // 2. Humeral Wing Bone Arch
    const archMesh = new THREE.Mesh(armArchGeo, covertFeatherMat);
    archMesh.position.set(side * 0.34, 0.18, -0.02);
    archMesh.rotation.z = -side * 1.12;
    archMesh.castShadow = true;
    wingPivot.add(archMesh);

    // 3. Primary Flight Feathers (7 graduated long feathers)
    const primaryCount = 7;
    for (let i = 0; i < primaryCount; i++) {
      const t = i / (primaryCount - 1);
      const feather = new THREE.Mesh(featherGeo, primaryFeatherMat);
      const len = 0.65 + Math.sin(t * Math.PI * 0.85) * 0.42;
      const width = 0.85 + (1.0 - t) * 0.35;
      feather.scale.set(width, len, 1.0);

      const spanX = side * (0.18 + t * 0.68);
      const spanY = 0.16 + Math.sin(t * Math.PI) * 0.14 - t * 0.12;
      const spanZ = -0.02 - i * 0.008;
      feather.position.set(spanX, spanY, spanZ);

      const baseAngleZ = -side * (0.48 + t * 1.05);
      feather.rotation.z = baseAngleZ;
      feather.rotation.y = side * (0.08 + t * 0.14);
      feather.userData.baseRotZ = baseAngleZ;
      feather.userData.featherIndex = i;
      feather.castShadow = true;

      primaryStore.push(feather);
      wingPivot.add(feather);
    }

    // 4. Secondary Covert Feathers (5 shorter upper-layer feathers)
    const covertCount = 5;
    for (let j = 0; j < covertCount; j++) {
      const ct = j / (covertCount - 1);
      const covert = new THREE.Mesh(featherGeo, covertFeatherMat);
      covert.scale.set(0.95, 0.38 + (1.0 - ct) * 0.16, 1.15);
      covert.position.set(side * (0.14 + ct * 0.44), 0.18 - ct * 0.04, 0.028);
      covert.rotation.z = -side * (0.35 + ct * 0.82);
      wingPivot.add(covert);
    }

    return wingPivot;
  };

  const leftWing = buildWingSide(-1, primaryFeathersLeft);
  const rightWing = buildWingSide(1, primaryFeathersRight);
  group.add(leftWing);
  group.add(rightWing);

  let unfoldProgress = 0.0;

  const update = (dt: number, elapsedTime: number, isFlying: boolean, flightSpeed = 1.0) => {
    const targetUnfold = isFlying ? 1.0 : 0.0;
    const dampRate = isFlying ? 8.5 : 6.0;
    unfoldProgress = THREE.MathUtils.damp(unfoldProgress, targetUnfold, dampRate, dt);

    if (unfoldProgress < 0.01) {
      group.visible = false;
      group.scale.setScalar(0.001);
      return;
    }

    group.visible = true;
    // Elastic overshoot sprout curve
    const sproutScale = unfoldProgress * (1.0 + Math.sin(unfoldProgress * Math.PI) * 0.18);
    group.scale.setScalar(Math.max(0.001, sproutScale));

    // Dynamic flap frequency modulated by flight velocity
    const speedBoost = Math.min(2.2, 1.0 + flightSpeed * 0.35);
    const flapPhase = elapsedTime * 11.5 * speedBoost;
    const primaryFlap = Math.sin(flapPhase) * 0.58 * unfoldProgress;
    const sweepBack = (1.0 - unfoldProgress) * 0.85 + Math.cos(flapPhase) * 0.18 * unfoldProgress;
    const featherPitch = Math.cos(flapPhase) * 0.24 * unfoldProgress;

    leftWing.rotation.y = -0.28 - primaryFlap + sweepBack * 0.6;
    leftWing.rotation.z = 0.18 + primaryFlap * 0.48;
    leftWing.rotation.x = featherPitch;

    rightWing.rotation.y = 0.28 + primaryFlap - sweepBack * 0.6;
    rightWing.rotation.z = -0.18 - primaryFlap * 0.48;
    rightWing.rotation.x = featherPitch;

    // Secondary harmonic ripple across individual primary feathers
    for (let i = 0; i < primaryFeathersLeft.length; i++) {
      const fL = primaryFeathersLeft[i];
      const fR = primaryFeathersRight[i];
      const lag = Math.sin(flapPhase - i * 0.26) * 0.14 * unfoldProgress;
      fL.rotation.z = fL.userData.baseRotZ + lag;
      fR.rotation.z = fR.userData.baseRotZ - lag;
    }
  };

  const setTint = (hexColor: string) => {
    primaryFeatherMat.sheenColor.set(hexColor);
    primaryFeatherMat.emissive.set(hexColor);
  };

  const dispose = () => {
    featherGeo.dispose();
    armArchGeo.dispose();
    shoulderJointGeo.dispose();
    primaryFeatherMat.dispose();
    covertFeatherMat.dispose();
    goldAccentMat.dispose();
  };

  return {
    group,
    leftWing,
    rightWing,
    update,
    setTint,
    dispose,
  };
}
