import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createBlobCreature } from '../blobCreature.js';
import { createGPUFurPhysics } from '../gpuPhysics.js';
import { createGPUFurSystem } from '../furSystem.js';

interface CompanionViewportProps {
  onCreatureReady?: (creature: any) => void;
  toneMappingExposure?: number;
}

export const CompanionViewport: React.FC<CompanionViewportProps> = ({
  onCreatureReady,
  toneMappingExposure = 0.88,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. WebGL2 Renderer with calibrated exposure to prevent white blowout
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = toneMappingExposure;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      80
    );
    camera.position.set(0.0, 0.45, 6.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.6;
    controls.maxDistance = 15.0;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.target.set(0, 0.05, 0);

    // 3. Ethereal Fur Bloom Post-Processing
    const renderTarget = new THREE.WebGLRenderTarget(
      container.clientWidth,
      container.clientHeight,
      {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        samples: 4,
      }
    );
    const composer = new EffectComposer(renderer, renderTarget);
    const renderPass = new RenderPass(scene, camera);
    renderPass.clearAlpha = 0;
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.35, // Balanced subtle bloom for white fur
      0.45, // Soft aura radius
      0.84  // Selective threshold
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // 4. Studio 3-Point Lighting with Soft Headroom
    const keyLight = new THREE.DirectionalLight('#fff7ed', 1.05);
    keyLight.position.set(2.4, 2.1, 2.4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#c4b5fd', 0.95);
    rimLight.position.set(-2.4, 1.8, -3.2);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight('#e0f2fe', '#0f172a', 0.65);
    scene.add(hemiLight);

    // 5. Stylized Fluffy Creature & Fur System
    const creature = createBlobCreature();
    scene.add(creature.root);

    const gpuPhysics = createGPUFurPhysics(renderer);
    const furSystem = createGPUFurSystem(creature.bodyGeometry, {
      baseColor: '#e0ecfa',
      tipColor: '#ffffff',
      furLength: 0.35,
      furDensity: 0.98,
      roughness: 0.65,
      specular: 0.32,
      clumping: 0.38,
      curliness: 0.24,
      keyColor: '#fff7ed',
      lightAngle: -74,
      lightIntensity: 1.05,
      rimIntensity: 0.95,
      windStrength: 0.95,
      environment: 'studio',
      gpuFurEnabled: true,
    });

    creature.root.add(furSystem.shellMesh);
    creature.root.add(furSystem.strandMesh);

    if (onCreatureReady) {
      onCreatureReady(creature);
    }

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      controls.update();
      (creature as any).update(dt, null, camera.position, false);
      composer.render();
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      composer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [toneMappingExposure, onCreatureReady]);

  return <div ref={containerRef} className="w-full h-full relative" />;
};
