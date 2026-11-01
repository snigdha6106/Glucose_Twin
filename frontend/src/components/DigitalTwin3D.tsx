import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DigitalTwin3DProps {
  currentGlucose: number;
  glucoseTrend: number;
  cob: number;
  iob: number;
  basalRate: number;
}

export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({
  currentGlucose,
  glucoseTrend,
  cob,
  iob,
  basalRate
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Determine glycemic state color
  let glycemicHex = 0x10b981; // green (target)
  let statusLabel = 'In Target Range (70-180 mg/dL)';
  if (currentGlucose < 70) {
    glycemicHex = 0xef4444; // red (hypo)
    statusLabel = 'Hypoglycemic Range (<70 mg/dL)';
  } else if (currentGlucose > 250) {
    glycemicHex = 0xdc2626; // deep red (severe hyper)
    statusLabel = 'Severe Hyperglycemia (>250 mg/dL)';
  } else if (currentGlucose > 180) {
    glycemicHex = 0xf59e0b; // amber (hyper)
    statusLabel = 'Hyperglycemic Range (>180 mg/dL)';
  }

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 400;
    const height = mountRef.current.clientHeight || 450;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712); // slate-950

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 4.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Ambient & Point Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(glycemicHex, 3.5, 10);
    pointLight.position.set(0, 1.5, 2);
    scene.add(pointLight);

    const backLight = new THREE.DirectionalLight(0x0284c7, 1.5);
    backLight.position.set(-2, 3, -2);
    scene.add(backLight);

    // Group for the avatar
    const avatarGroup = new THREE.Group();

    // Stylized Holographic Human Figure (Head, Torso, Limbs)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });

    const glowMat = new THREE.MeshBasicMaterial({
      color: glycemicHex,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });

    // Head
    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 2.0;
    avatarGroup.add(head);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.2, 12);
    const neck = new THREE.Mesh(neckGeo, bodyMat);
    neck.position.y = 1.65;
    avatarGroup.add(neck);

    // Torso (Upper & Lower)
    const torsoGeo = new THREE.CylinderGeometry(0.42, 0.32, 1.1, 16);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.position.y = 1.05;
    avatarGroup.add(torso);

    // Core Glucose Energy Sphere (Represents blood glucose homeostasis)
    const coreGeo = new THREE.SphereGeometry(0.22, 24, 24);
    const coreMat = new THREE.MeshStandardMaterial({
      color: glycemicHex,
      emissive: glycemicHex,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    coreSphere.position.set(0, 1.1, 0.05);
    avatarGroup.add(coreSphere);

    // Gut Absorption Node (Stomach compartment Q_gut)
    const gutGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const gutMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // Orange for meals / carbohydrates
      emissive: 0xf97316,
      emissiveIntensity: cob > 0 ? 0.9 : 0.2
    });
    const gutSphere = new THREE.Mesh(gutGeo, gutMat);
    gutSphere.position.set(-0.15, 0.85, 0.15);
    avatarGroup.add(gutSphere);

    // Subcutaneous Insulin Infusion Site (S1/S2 compartment)
    const insulinGeo = new THREE.SphereGeometry(0.10, 16, 16);
    const insulinMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan for insulin
      emissive: 0x06b6d4,
      emissiveIntensity: iob > 0 ? 0.9 : 0.2
    });
    const insulinSphere = new THREE.Mesh(insulinGeo, insulinMat);
    insulinSphere.position.set(0.18, 0.75, 0.15);
    avatarGroup.add(insulinSphere);

    // Circulating Vascular Glow Ring
    const ringGeo = new THREE.TorusGeometry(0.38, 0.015, 12, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: glycemicHex, transparent: true, opacity: 0.7 });
    const vascularRing = new THREE.Mesh(ringGeo, ringMat);
    vascularRing.rotation.x = Math.PI / 2;
    vascularRing.position.y = 1.1;
    avatarGroup.add(vascularRing);

    // Limbs
    // Arms
    const armGeo = new THREE.CylinderGeometry(0.09, 0.07, 1.0, 12);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.58, 1.0, 0);
    leftArm.rotation.z = 0.15;
    avatarGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.58, 1.0, 0);
    rightArm.rotation.z = -0.15;
    avatarGroup.add(rightArm);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.13, 0.09, 1.3, 12);
    const leftLeg = new THREE.Mesh(legGeo, bodyMat);
    leftLeg.position.set(-0.22, -0.2, 0);
    avatarGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, bodyMat);
    rightLeg.position.set(0.22, -0.2, 0);
    avatarGroup.add(rightLeg);

    scene.add(avatarGroup);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle rotating avatar
      avatarGroup.rotation.y = Math.sin(elapsed * 0.4) * 0.35;

      // Pulse core sphere based on glucose level
      const pulse = 1.0 + Math.sin(elapsed * 2.5) * 0.08;
      coreSphere.scale.set(pulse, pulse, pulse);

      // Rotate vascular ring
      vascularRing.rotation.z = elapsed * 0.8;

      // Pulse gut and insulin nodes if active
      if (cob > 0) {
        const gutPulse = 1.0 + Math.sin(elapsed * 4.0) * 0.15;
        gutSphere.scale.set(gutPulse, gutPulse, gutPulse);
      }
      if (iob > 0) {
        const insPulse = 1.0 + Math.sin(elapsed * 4.0 + 1.0) * 0.15;
        insulinSphere.scale.set(insPulse, insPulse, insPulse);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [currentGlucose, glycemicHex, cob, iob]);

  return (
    <div className="relative w-full h-[450px] bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-between p-4 shadow-2xl">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Hologram Header */}
      <div className="relative z-10 w-full flex items-center justify-between bg-slate-950/70 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div
            className="w-3.5 h-3.5 rounded-full animate-ping"
            style={{ backgroundColor: currentGlucose < 70 ? '#ef4444' : currentGlucose > 180 ? '#f59e0b' : '#10b981' }}
          />
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Digital Twin State</h4>
            <div className="text-sm font-bold text-white flex items-center space-x-2">
              <span>{currentGlucose.toFixed(1)} mg/dL</span>
              <span className="text-xs text-cyan-400 font-mono">
                {glucoseTrend > 0 ? `+${glucoseTrend.toFixed(1)}` : glucoseTrend.toFixed(1)} mg/dL/5m
              </span>
            </div>
          </div>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{
            backgroundColor: currentGlucose < 70 ? 'rgba(239, 68, 68, 0.2)' : currentGlucose > 180 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: currentGlucose < 70 ? '#fca5a5' : currentGlucose > 180 ? '#fde68a' : '#6ee7b7'
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Physiological Pathway Legend / Gauges */}
      <div className="relative z-10 w-full grid grid-cols-3 gap-2 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800/80 mt-auto">
        <div className="flex flex-col items-center text-center p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-orange-400 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
            <span>Carbs on Board</span>
          </span>
          <span className="text-base font-bold text-white mt-0.5">{cob.toFixed(1)} g</span>
          <span className="text-[9px] text-slate-400">Gut Transit Q_gut</span>
        </div>

        <div className="flex flex-col items-center text-center p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span>
            <span>Insulin on Board</span>
          </span>
          <span className="text-base font-bold text-white mt-0.5">{iob.toFixed(2)} U</span>
          <span className="text-[9px] text-slate-400">Subcutaneous S1/S2</span>
        </div>

        <div className="flex flex-col items-center text-center p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-purple-400 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
            <span>Basal Infusion</span>
          </span>
          <span className="text-base font-bold text-white mt-0.5">{basalRate.toFixed(2)} U/h</span>
          <span className="text-[9px] text-slate-400">Steady State u2ss</span>
        </div>
      </div>
    </div>
  );
};
