import * as THREE from 'three';

export type DuckPhase =
  | 'idle_offscreen'
  | 'flying_across'
  | 'being_chased'
  | 'caught_following'
  | 'released_flying_away';

export interface DuckHandle {
  group: THREE.Group;
  getPhase: () => DuckPhase;
  getPosition: () => THREE.Vector3;
  spawnPassBy: () => void;
  startCatchChase: () => void;
  update: (
    dt: number,
    elapsedTime: number,
    neveaWorldPos: THREE.Vector3,
    onCaught?: () => void,
    onReleased?: () => void
  ) => void;
  dispose: () => void;
}

/**
 * Procedural 9-part 3D Duck NPC with autonomous fly-by, NEVEA aerial chase,
 * companion orbit/following once caught, and gentle release flight.
 */
export function createProceduralDuck(): DuckHandle {
  const group = new THREE.Group();
  group.name = 'NeveaProceduralDuckNPC';
  group.visible = false;
  group.position.set(6.5, 1.4, -0.5);

  const yellowFeatherMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#facc15'),
    roughness: 0.42,
    metalness: 0.05,
  });

  const wingFeatherMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#eab308'),
    roughness: 0.55,
    metalness: 0.04,
  });

  const orangeBeakMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f97316'),
    roughness: 0.28,
    metalness: 0.08,
  });

  const eyeBlackMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#09090b'),
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
  });

  const catchlightMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffffff'),
  });

  // 1. Plump Duck Body
  const bodyGeo = new THREE.SphereGeometry(0.22, 20, 18);
  const bodyMesh = new THREE.Mesh(bodyGeo, yellowFeatherMat);
  bodyMesh.scale.set(1.28, 0.92, 0.96);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // 2. Tail Tuft
  const tailGeo = new THREE.ConeGeometry(0.09, 0.18, 12);
  const tailMesh = new THREE.Mesh(tailGeo, yellowFeatherMat);
  tailMesh.position.set(-0.26, 0.06, 0);
  tailMesh.rotation.z = Math.PI * 0.36;
  group.add(tailMesh);

  // 3. Sculpted Duck Head
  const headGeo = new THREE.SphereGeometry(0.155, 18, 16);
  const headMesh = new THREE.Mesh(headGeo, yellowFeatherMat);
  headMesh.position.set(0.19, 0.19, 0);
  headMesh.castShadow = true;
  group.add(headMesh);

  // 4. Rounded Duck Bill
  const beakGeo = new THREE.BoxGeometry(0.14, 0.05, 0.12);
  const beakMesh = new THREE.Mesh(beakGeo, orangeBeakMat);
  beakMesh.position.set(0.34, 0.17, 0);
  group.add(beakMesh);

  // 5 & 6. Glossy Bead Eyes + Specular Catchlights
  const eyeGeo = new THREE.SphereGeometry(0.026, 12, 12);
  const glintGeo = new THREE.SphereGeometry(0.009, 8, 8);
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(eyeGeo, eyeBlackMat);
    eye.position.set(0.27, 0.23, side * 0.11);
    group.add(eye);

    const glint = new THREE.Mesh(glintGeo, catchlightMat);
    glint.position.set(0.29, 0.242, side * 0.118);
    group.add(glint);
  });

  // 7 & 8. Left & Right Flapping Duck Wings
  const wingGeo = new THREE.SphereGeometry(0.13, 14, 12);
  const leftWingPivot = new THREE.Group();
  leftWingPivot.position.set(0.0, 0.05, 0.19);
  const leftWingMesh = new THREE.Mesh(wingGeo, wingFeatherMat);
  leftWingMesh.scale.set(1.25, 0.25, 0.72);
  leftWingMesh.position.set(-0.04, 0, 0.06);
  leftWingPivot.add(leftWingMesh);
  group.add(leftWingPivot);

  const rightWingPivot = new THREE.Group();
  rightWingPivot.position.set(0.0, 0.05, -0.19);
  const rightWingMesh = new THREE.Mesh(wingGeo, wingFeatherMat);
  rightWingMesh.scale.set(1.25, 0.25, 0.72);
  rightWingMesh.position.set(-0.04, 0, -0.06);
  rightWingPivot.add(rightWingMesh);
  group.add(rightWingPivot);

  // 9. Cute Webbed Feet
  const footGeo = new THREE.BoxGeometry(0.09, 0.025, 0.07);
  const leftFoot = new THREE.Mesh(footGeo, orangeBeakMat);
  leftFoot.position.set(-0.04, -0.2, 0.08);
  group.add(leftFoot);

  const rightFoot = new THREE.Mesh(footGeo, orangeBeakMat);
  rightFoot.position.set(-0.04, -0.2, -0.08);
  group.add(rightFoot);

  let phase: DuckPhase = 'idle_offscreen';
  let phaseTimer = 0.0;
  let nextAutonomousSpawn = 16.0;
  let flyDirection: 1 | -1 = 1;
  const targetPos = new THREE.Vector3();

  const spawnPassBy = () => {
    if (phase !== 'idle_offscreen') return;
    flyDirection = Math.random() > 0.5 ? 1 : -1;
    group.position.set(-flyDirection * 4.8, 0.85 + Math.random() * 0.9, 0.35);
    group.scale.setScalar(0.88);
    group.visible = true;
    phase = 'flying_across';
    phaseTimer = 0.0;
  };

  const startCatchChase = () => {
    if (phase === 'idle_offscreen' || phase === 'released_flying_away') {
      flyDirection = 1;
      group.position.set(-2.4, 1.15, 0.45);
      group.scale.setScalar(0.92);
      group.visible = true;
    }
    phase = 'being_chased';
    phaseTimer = 0.0;
  };

  const update = (
    dt: number,
    elapsedTime: number,
    neveaWorldPos: THREE.Vector3,
    onCaught?: () => void,
    onReleased?: () => void
  ) => {
    phaseTimer += dt;

    // Wing flap animation whenever duck is visible
    if (group.visible) {
      const flapSpeed = phase === 'being_chased' ? 24.0 : phase === 'caught_following' ? 14.0 : 18.0;
      const flapAngle = Math.sin(elapsedTime * flapSpeed) * 0.68;
      leftWingPivot.rotation.x = flapAngle;
      rightWingPivot.rotation.x = -flapAngle;
      leftFoot.rotation.z = Math.sin(elapsedTime * 10.0) * 0.25;
      rightFoot.rotation.z = -Math.sin(elapsedTime * 10.0) * 0.25;
    }

    if (phase === 'idle_offscreen') {
      nextAutonomousSpawn -= dt;
      if (nextAutonomousSpawn <= 0) {
        nextAutonomousSpawn = 22.0 + Math.random() * 18.0;
        spawnPassBy();
      }
      return;
    }

    if (phase === 'flying_across') {
      group.position.x += flyDirection * dt * 1.45;
      group.position.y = 1.05 + Math.sin(elapsedTime * 3.8) * 0.28;
      group.position.z = 0.35 + Math.cos(elapsedTime * 2.4) * 0.22;
      group.rotation.y = flyDirection > 0 ? 0 : Math.PI;
      group.rotation.z = Math.sin(elapsedTime * 6.0) * 0.08;

      if (Math.abs(group.position.x) > 5.4) {
        group.visible = false;
        phase = 'idle_offscreen';
      }
      return;
    }

    if (phase === 'being_chased') {
      // Duck loops teasingly in the upper viewport while NEVEA flies to intercept it
      targetPos.set(
        Math.sin(elapsedTime * 1.9) * 1.45,
        0.95 + Math.cos(elapsedTime * 2.5) * 0.38,
        0.4 + Math.sin(elapsedTime * 1.4) * 0.25
      );
      const prevX = group.position.x;
      group.position.lerp(targetPos, Math.min(1.0, dt * 3.5));
      const dx = group.position.x - prevX;
      if (Math.abs(dx) > 0.0005) {
        group.rotation.y = dx >= 0 ? 0 : Math.PI;
      }

      const distToNevea = group.position.distanceTo(neveaWorldPos);
      if (distToNevea < 0.88 || phaseTimer > 2.6) {
        phase = 'caught_following';
        phaseTimer = 0.0;
        onCaught?.();
      }
      return;
    }

    if (phase === 'caught_following') {
      // Happily orbits & follows right beside NEVEA for 5.2 seconds
      const orbitAngle = elapsedTime * 3.2;
      targetPos.set(
        neveaWorldPos.x + Math.cos(orbitAngle) * 0.95,
        neveaWorldPos.y + 0.42 + Math.sin(elapsedTime * 5.0) * 0.12,
        neveaWorldPos.z + Math.sin(orbitAngle) * 0.65 + 0.25
      );
      group.position.lerp(targetPos, Math.min(1.0, dt * 7.5));
      group.rotation.y = -orbitAngle + Math.PI * 0.5;
      group.rotation.z = Math.sin(elapsedTime * 8.0) * 0.12;

      if (phaseTimer > 5.2) {
        phase = 'released_flying_away';
        phaseTimer = 0.0;
        onReleased?.();
      }
      return;
    }

    if (phase === 'released_flying_away') {
      group.position.x += dt * 2.2;
      group.position.y += dt * 1.35;
      group.position.z -= dt * 0.4;
      group.rotation.y = 0;
      group.rotation.z = 0.22;

      if (phaseTimer > 2.8 || group.position.y > 4.5) {
        group.visible = false;
        phase = 'idle_offscreen';
      }
    }
  };

  const dispose = () => {
    bodyGeo.dispose();
    tailGeo.dispose();
    headGeo.dispose();
    beakGeo.dispose();
    eyeGeo.dispose();
    glintGeo.dispose();
    wingGeo.dispose();
    footGeo.dispose();
    yellowFeatherMat.dispose();
    wingFeatherMat.dispose();
    orangeBeakMat.dispose();
    eyeBlackMat.dispose();
    catchlightMat.dispose();
  };

  return {
    group,
    getPhase: () => phase,
    getPosition: () => group.position,
    spawnPassBy,
    startCatchChase,
    update,
    dispose,
  };
}
