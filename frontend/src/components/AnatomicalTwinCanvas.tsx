import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ANATOMY_ORGAN_DATABASE, OrganAnatomyInfo } from '../data/anatomyData';

export type DiabetesMode = 'healthy' | 'type1' | 'type2';

export interface AnatomicalTwinCanvasProps {
  currentGlucose: number;       // mg/dL at current time t
  activeInsulin: number;        // U or mU/L at current time t
  carbAbsorptionFlux: number;   // mg/dL/min or g/hr at current time t
  mode: DiabetesMode;
  skinOpacity: number;          // 0 to 1
  showMuscles: boolean;
  showOrgans: boolean;
  showVessels: boolean;
  showGlucoseParticles: boolean;
  showInsulinParticles: boolean;
  showLabels: boolean;
  selectedOrganId: string | null;
  onSelectOrgan: (info: OrganAnatomyInfo | null) => void;
  cameraPreset?: 'full' | 'abdomen' | 'pancreas' | 'circulation';
  isComparisonSide?: boolean;
  comparisonLabel?: string;
  onSyncCamera?: (position: [number, number, number], target: [number, number, number]) => void;
  externalCameraState?: { position: [number, number, number]; target: [number, number, number] } | null;
}

export const AnatomicalTwinCanvas: React.FC<AnatomicalTwinCanvasProps> = ({
  currentGlucose,
  activeInsulin,
  carbAbsorptionFlux,
  mode,
  skinOpacity,
  showMuscles,
  showOrgans,
  showVessels,
  showGlucoseParticles,
  showInsulinParticles,
  showLabels,
  selectedOrganId,
  onSelectOrgan,
  cameraPreset,
  isComparisonSide,
  comparisonLabel,
  onSyncCamera,
  externalCameraState
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Group references
  const masterGroupRef = useRef<THREE.Group | null>(null);
  const bodyModelGroupRef = useRef<THREE.Group | null>(null);
  const digestiveGroupRef = useRef<THREE.Group | null>(null);
  const organsGroupRef = useRef<THREE.Group | null>(null);
  const vesselsGroupRef = useRef<THREE.Group | null>(null);
  const flowGroupRef = useRef<THREE.Group | null>(null);

  // Live state refs for instant 60 FPS animation loop access without stale closure
  const currentGlucoseRef = useRef<number>(currentGlucose);
  const activeInsulinRef = useRef<number>(activeInsulin);
  const carbAbsorptionFluxRef = useRef<number>(carbAbsorptionFlux);
  const modeRef = useRef<DiabetesMode>(mode);

  useEffect(() => {
    currentGlucoseRef.current = currentGlucose;
  }, [currentGlucose]);

  useEffect(() => {
    activeInsulinRef.current = activeInsulin;
  }, [activeInsulin]);

  useEffect(() => {
    carbAbsorptionFluxRef.current = carbAbsorptionFlux;
  }, [carbAbsorptionFlux]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Interactive meshes for raycasting & dynamic lighting
  const interactiveMeshesRef = useRef<THREE.Mesh[]>([]);
  const pancreasLightRef = useRef<THREE.PointLight | null>(null);
  const subqDepotRef = useRef<THREE.Mesh | null>(null);
  const muscleReceptorRingsRef = useRef<THREE.Mesh[]>([]);
  const heartMeshRef = useRef<THREE.Object3D | null>(null);
  const betaCellMeshesRef = useRef<THREE.Mesh[]>([]);

  // Loading state
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null);

  // InstancedMesh references for 3D volumetric fluid flow
  const glucoseInstancedRef = useRef<THREE.InstancedMesh | null>(null);
  const insulinInstancedRef = useRef<THREE.InstancedMesh | null>(null);
  const foodInstancedRef = useRef<THREE.InstancedMesh | null>(null);
  const renalInstancedRef = useRef<THREE.InstancedMesh | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 650;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Slate-950 deep space
    sceneRef.current = scene;

    // --- Perspective Camera ---
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.05, 2.7); // Focused at abdominal metabolic core
    cameraRef.current = camera;

    // --- WebGL Renderer ---
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // --- Orbit Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.02, 0); // Focus at the epigastric/pancreatic core
    controls.minDistance = 0.35;
    controls.maxDistance = 6.0;
    controls.maxPolarAngle = Math.PI - 0.05;
    controlsRef.current = controls;

    if (onSyncCamera) {
      controls.addEventListener('change', () => {
        onSyncCamera(
          [camera.position.x, camera.position.y, camera.position.z],
          [controls.target.x, controls.target.y, controls.target.z]
        );
      });
    }

    // --- Scientific Studio Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.6);
    keyLight.position.set(3, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    fillLight.position.set(-3, 1, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.8);
    rimLight.position.set(0, -3, 2);
    scene.add(rimLight);

    // Pancreas Islet Endocrine Light
    const pLight = new THREE.PointLight(
      mode === 'type1' ? 0xef4444 : (mode === 'type2' ? 0x06b6d4 : 0x10b981),
      mode === 'type1' ? 0.6 : (mode === 'type2' ? 3.8 : 2.6),
      2.5
    );
    pLight.position.set(-0.04, 1.06, 0.16);
    scene.add(pLight);
    pancreasLightRef.current = pLight;

    // Pedestal Floor Grid
    const gridHelper = new THREE.GridHelper(4.0, 24, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // --- Master Groups ---
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);
    masterGroupRef.current = masterGroup;

    const bodyModelGroup = new THREE.Group();
    masterGroup.add(bodyModelGroup);
    bodyModelGroupRef.current = bodyModelGroup;

    const digestiveGroup = new THREE.Group();
    masterGroup.add(digestiveGroup);
    digestiveGroupRef.current = digestiveGroup;

    const organsGroup = new THREE.Group();
    masterGroup.add(organsGroup);
    organsGroupRef.current = organsGroup;

    const vesselsGroup = new THREE.Group();
    masterGroup.add(vesselsGroup);
    vesselsGroupRef.current = vesselsGroup;

    const flowGroup = new THREE.Group();
    masterGroup.add(flowGroup);
    flowGroupRef.current = flowGroup;

    interactiveMeshesRef.current = [];
    muscleReceptorRingsRef.current = [];
    betaCellMeshesRef.current = [];

    // ==========================================
    // 1. ASSET LOADER (Z-ANATOMY & HIGH-RES GLBS)
    // ==========================================
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    let loadedCount = 0;
    const totalAssets = 8; // body, pancreas, stomach, intestines, liver, heart, kidney, lung

    const updateProgress = () => {
      loadedCount++;
      setLoadingProgress(Math.round((loadedCount / totalAssets) * 100));
      if (loadedCount >= totalAssets) {
        setIsLoading(false);
      }
    };

    // --- A. LOAD REALISTIC FULL BODY (body.glb) ---
    gltfLoader.load(
      '/models/body.glb',
      (gltf) => {
        const bodyScene = gltf.scene;
        bodyScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const nameLower = (mesh.name || '').toLowerCase();
            if (nameLower.includes('muscle') || nameLower.includes('myo') || nameLower.includes('pectoral') || nameLower.includes('rectus') || nameLower.includes('bicep') || nameLower.includes('femur')) {
              mesh.userData = { organId: 'skeletal_muscle', originalName: mesh.name };
              interactiveMeshesRef.current.push(mesh);
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0x9f1239, // deep rich myoglobin muscle red
                roughness: 0.45,
                metalness: 0.15
              });
            } else {
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0xf1f5f9, // realistic bone ivory
                roughness: 0.35,
                metalness: 0.05
              });
            }
          }
        });
        bodyModelGroup.add(bodyScene);
        updateProgress();
      },
      undefined,
      () => updateProgress()
    );

    // ==========================================
    // 2. AUTHENTIC GI TRACT REGISTRATION & ALIGNMENT
    // Pancreas duodenal loop nestled under stomach pylorus, leading into intestines
    // ==========================================

    // --- B. LOAD AUTHENTIC ANATOMICAL PANCREAS (pancreas.glb) ---
    // Contains: pancreatic head, body, tail, pancreatic duct of Wirsung, and duodenal C-loop
    gltfLoader.load(
      '/models/pancreas.glb',
      (gltf) => {
        const pancreasModel = gltf.scene;
        pancreasModel.scale.setScalar(0.065);
        pancreasModel.position.set(-0.02, 1.03, 0.03);

        pancreasModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.userData = { organId: 'pancreas', part: m.name };
            interactiveMeshesRef.current.push(m);

            const n = (m.name || '').toLowerCase();
            if (n.includes('duct')) {
              // Pancreatic Duct of Wirsung
              m.material = new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x0284c7,
                emissiveIntensity: 0.95,
                roughness: 0.2
              });
            } else if (n.includes('duodenum')) {
              // Authentic Duodenal C-loop wrapping pancreatic head
              m.material = new THREE.MeshPhysicalMaterial({
                color: 0xfb7185, // Enteric mucosal coral
                roughness: 0.35,
                transmission: 0.15,
                clearcoat: 0.3
              });
            } else if (n.includes('vein')) {
              m.material = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
            } else if (n.includes('artery') || n.includes('trunk')) {
              m.material = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
            } else {
              // Pancreatic Endocrine & Exocrine Parenchyma
              m.material = new THREE.MeshStandardMaterial({
                color: 0xf59e0b, // Warm endocrine amber
                roughness: 0.35,
                metalness: 0.15,
                emissive: mode === 'type1' ? 0x450a0a : (mode === 'type2' ? 0x0284c7 : 0x059669),
                emissiveIntensity: mode === 'type1' ? 0.3 : 0.65
              });
            }
          }
        });

        // Add Endocrine Islets of Langerhans Clusters along Pancreatic Parenchyma
        const isletLocalCoords = [
          new THREE.Vector3(-0.15, 0.25, 0.15),
          new THREE.Vector3(0.05, 0.35, 0.10),
          new THREE.Vector3(0.25, 0.45, 0.05),
          new THREE.Vector3(0.45, 0.55, 0.00)
        ];

        isletLocalCoords.forEach((loc) => {
          // Beta-cell sphere cluster
          const betaMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 16, 16),
            new THREE.MeshStandardMaterial({
              color: mode === 'type1' ? 0x450a0a : (mode === 'type2' ? 0x06b6d4 : 0x10b981),
              emissive: mode === 'type1' ? 0x7f1d1d : (mode === 'type2' ? 0x0284c7 : 0x059669),
              emissiveIntensity: mode === 'type1' ? 0.3 : 1.0,
              roughness: 0.2
            })
          );
          betaMesh.position.copy(loc);
          betaMesh.userData = { organId: 'pancreas', role: 'islet_beta' };
          betaCellMeshesRef.current.push(betaMesh);
          interactiveMeshesRef.current.push(betaMesh);
          pancreasModel.add(betaMesh);

          // Alpha-cell satellite sphere
          const alphaMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.030, 12, 12),
            new THREE.MeshStandardMaterial({
              color: 0xf59e0b,
              emissive: 0xd97706,
              emissiveIntensity: 0.8,
              roughness: 0.3
            })
          );
          alphaMesh.position.set(loc.x + 0.04, loc.y - 0.02, loc.z + 0.02);
          alphaMesh.userData = { organId: 'pancreas', role: 'islet_alpha' };
          interactiveMeshesRef.current.push(alphaMesh);
          pancreasModel.add(alphaMesh);
        });

        digestiveGroup.add(pancreasModel);
        updateProgress();
      },
      undefined,
      () => updateProgress()
    );

    // --- C. LOAD REALISTIC ANATOMICAL STOMACH (stomach.glb) ---
    // Only stomach & esophagus are displayed; duplicate pancreas/duodenum meshes are suppressed!
    gltfLoader.load(
      '/models/stomach.glb',
      (gltf) => {
        const stomachModel = gltf.scene;
        stomachModel.scale.setScalar(0.065);
        stomachModel.position.set(0.02, 1.10, 0.04);

        stomachModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            const n = (m.name || '').toLowerCase();

            // Suppress duplicate organs inside stomach.glb to prevent overlapping collisions
            if (n.includes('duodenum') || n.includes('pancreas') || n.includes('spleen') || n.includes('artery') || n.includes('trunk')) {
              m.visible = false;
              return;
            }

            m.userData = { organId: 'stomach', part: m.name };
            interactiveMeshesRef.current.push(m);

            if (n.includes('esophagus')) {
              m.material = new THREE.MeshStandardMaterial({
                color: 0xf472b6, // Pink esophageal tube
                roughness: 0.35,
                metalness: 0.05
              });
            } else {
              // Gastric Corpus, Fundus & Antrum
              m.material = new THREE.MeshPhysicalMaterial({
                color: 0xe11d48, // Rich gastric mucosal crimson
                roughness: 0.28,
                metalness: 0.1,
                transmission: 0.25,
                clearcoat: 0.4
              });
            }
          }
        });

        digestiveGroup.add(stomachModel);
        updateProgress();
      },
      undefined,
      () => updateProgress()
    );

    // --- D. LOAD REALISTIC ANATOMICAL INTESTINES (intestines.glb) ---
    // Fits cleanly below stomach and pancreas; duplicate duodenum is suppressed
    gltfLoader.load(
      '/models/intestines.glb',
      (gltf) => {
        const intestinesModel = gltf.scene;
        intestinesModel.scale.setScalar(0.060);
        intestinesModel.position.set(0.0, 0.90, 0.02);

        intestinesModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            const n = (m.name || '').toLowerCase();

            // Suppress duplicate duodenum because pancreas.glb already has the authentic C-loop
            if (n.includes('duodenum')) {
              m.visible = false;
              return;
            }

            const organId = n.includes('colon') || n.includes('appendix') || n.includes('rectum') ? 'large_intestine' : 'small_intestine';
            m.userData = { organId, part: m.name };
            interactiveMeshesRef.current.push(m);

            if (n.includes('taenia')) {
              m.material = new THREE.MeshStandardMaterial({
                color: 0xf472b6, // Glistening longitudinal bands
                roughness: 0.3
              });
            } else if (organId === 'large_intestine') {
              m.material = new THREE.MeshStandardMaterial({
                color: 0x9d174d, // Colon haustrated plum/magenta
                roughness: 0.42,
                metalness: 0.08
              });
            } else {
              m.material = new THREE.MeshStandardMaterial({
                color: 0xfb7185, // Jejunum & Ileum warm mucosal coral
                roughness: 0.38,
                metalness: 0.08
              });
            }
          }
        });

        digestiveGroup.add(intestinesModel);
        updateProgress();
      },
      undefined,
      () => updateProgress()
    );

    // --- E. LOAD REALISTIC LIVER (liver.glb) ---
    gltfLoader.load(
      '/models/liver.glb',
      (gltf) => {
        const liver = gltf.scene;
        liver.scale.setScalar(0.095);
        liver.position.set(0.08, 1.12, 0.04);
        liver.rotation.y = 0.15;

        liver.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.userData = { organId: 'liver' };
            interactiveMeshesRef.current.push(m);
            if (m.material) {
              (m.material as THREE.MeshStandardMaterial).roughness = 0.35;
              (m.material as THREE.MeshStandardMaterial).metalness = 0.15;
            }
          }
        });

        organsGroup.add(liver);
        updateProgress();
      },
      undefined,
      () => updateProgress()
    );

    // --- F. LOAD REALISTIC HEART (heart.glb) ---
    gltfLoader.load(
      '/models/heart.glb',
      (gltf) => {
        const heart = gltf.scene;
        heart.scale.setScalar(0.075);
        heart.position.set(-0.03, 1.28, 0.05);
        heart.rotation.y = -0.2;
        heart.rotation.z = -0.15;

        heart.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.userData = { organId: 'heart' };
            interactiveMeshesRef.current.push(m);
          }
        });

        heartMeshRef.current = heart;
        organsGroup.add(heart);
        updateProgress();
      },
      undefined,
      () => updateProgress()
    );

    // --- G. LOAD REALISTIC BILATERAL KIDNEYS (kidney.glb) ---
    gltfLoader.load(
      '/models/kidney.glb',
      (gltf) => {
        const kidneyL = gltf.scene;
        kidneyL.scale.setScalar(0.042);
        kidneyL.position.set(-0.11, 1.04, -0.06);
        kidneyL.rotation.y = 0.3;

        kidneyL.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.userData = { organId: 'kidneys' };
            interactiveMeshesRef.current.push(m);
          }
        });
        organsGroup.add(kidneyL);

        const kidneyR = kidneyL.clone();
        kidneyR.position.set(0.12, 1.01, -0.06);
        kidneyR.rotation.y = -0.3;
        kidneyR.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).userData = { organId: 'kidneys' };
            interactiveMeshesRef.current.push(child as THREE.Mesh);
          }
        });
        organsGroup.add(kidneyR);
        updateProgress();
      },
      undefined,
      () => updateProgress()
    );

    // --- H. LOAD REALISTIC LUNGS (lung.glb) ---
    gltfLoader.load(
      '/models/lung.glb',
      (gltf) => {
        const lungs = gltf.scene;
        lungs.scale.setScalar(0.015);
        lungs.position.set(0.0, 1.30, 0.01);

        lungs.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.userData = { organId: 'lungs' };
            interactiveMeshesRef.current.push(m);
            if (m.material) {
              (m.material as THREE.MeshStandardMaterial).transparent = true;
              (m.material as THREE.MeshStandardMaterial).opacity = 0.55;
            }
          }
        });

        organsGroup.add(lungs);
        updateProgress();
      },
      undefined,
      () => updateProgress()
    );

    // ==========================================
    // 3. VASCULAR TREE CONDUITS & DEPOTS
    // ==========================================
    const arteryGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.8,
      emissive: 0xdc2626,
      emissiveIntensity: 0.45
    });

    const veinGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x2563eb,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.75,
      transparent: true,
      opacity: 0.75,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.35
    });

    const portalGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xa855f7, // Glowing purple portal vein
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.85,
      transparent: true,
      opacity: 0.9,
      emissive: 0x9333ea,
      emissiveIntensity: 0.75
    });

    // Aorta Trunk (Heart down to Iliac Bifurcation)
    const aortaSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 1.34, 0.06),
      new THREE.Vector3(0.00, 1.42, 0.03),
      new THREE.Vector3(-0.03, 1.25, 0.01),
      new THREE.Vector3(-0.02, 1.05, 0.01),
      new THREE.Vector3(-0.02, 0.82, 0.00)
    ]);
    const aortaTube = new THREE.Mesh(new THREE.TubeGeometry(aortaSpline, 32, 0.024, 16, false), arteryGlassMat);
    aortaTube.userData = { organId: 'blood_vessels' };
    interactiveMeshesRef.current.push(aortaTube);
    vesselsGroup.add(aortaTube);

    // Inferior Vena Cava (Venous return to right heart)
    const ivcSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.03, 0.82, 0.00),
      new THREE.Vector3(0.03, 1.05, 0.01),
      new THREE.Vector3(0.03, 1.22, 0.02),
      new THREE.Vector3(0.00, 1.32, 0.06)
    ]);
    const ivcTube = new THREE.Mesh(new THREE.TubeGeometry(ivcSpline, 32, 0.026, 16, false), veinGlassMat);
    ivcTube.userData = { organId: 'blood_vessels' };
    interactiveMeshesRef.current.push(ivcTube);
    vesselsGroup.add(ivcTube);

    // Hepatic Portal Vein (Mesenteric Gut Bed -> Liver Hilum)
    const portalSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, 0.91, 0.04),
      new THREE.Vector3(0.05, 1.03, 0.04),
      new THREE.Vector3(0.08, 1.09, 0.04),
      new THREE.Vector3(0.10, 1.15, 0.04)
    ]);
    const portalTube = new THREE.Mesh(new THREE.TubeGeometry(portalSpline, 32, 0.022, 16, false), portalGlassMat);
    portalTube.userData = { organId: 'blood_vessels' };
    interactiveMeshesRef.current.push(portalTube);
    vesselsGroup.add(portalTube);

    // Subcutaneous Injection Depot for Type 1 Diabetes (Lower right abdomen)
    const subqGeo = new THREE.SphereGeometry(0.022, 16, 16);
    const subqMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: mode === 'type1' ? 0.9 : 0.0
    });
    const subqDepot = new THREE.Mesh(subqGeo, subqMat);
    subqDepot.position.set(0.14, 0.94, 0.12);
    subqDepot.visible = mode === 'type1';
    subqDepotRef.current = subqDepot;
    vesselsGroup.add(subqDepot);

    // Muscle Receptor Blockade Warning Rings for Type 2 Diabetes (Thigh muscle beds)
    [-0.16, 0.16].forEach((xSide) => {
      const ringGeo = new THREE.TorusGeometry(0.06, 0.008, 12, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: mode === 'type2' ? 0.85 : 0.0
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(xSide, 0.55, 0.08);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.visible = mode === 'type2';
      muscleReceptorRingsRef.current.push(ringMesh);
      vesselsGroup.add(ringMesh);
    });

    // ==========================================
    // 4. TRUE 3D VOLUMETRIC FLUID FLOW (GLUCOSE, INSULIN, FOOD, RENAL)
    // ==========================================
    const sphereGeo = new THREE.SphereGeometry(0.012, 16, 16);

    // A. 3D Glucose Molecules (Luminous Amber / Red in Hyperglycemia)
    const glucoseCount = 160;
    const glucoseMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.15
    });
    const glucoseInstanced = new THREE.InstancedMesh(sphereGeo, glucoseMat, glucoseCount);
    glucoseInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    flowGroup.add(glucoseInstanced);
    glucoseInstancedRef.current = glucoseInstanced;

    const glucoseProgress = new Float32Array(glucoseCount);
    for (let i = 0; i < glucoseCount; i++) glucoseProgress[i] = Math.random();

    // Glucose Pathway: Gut -> Portal Vein -> Liver -> IVC -> Heart -> Aorta -> Peripheral Muscle Beds
    const glucoseCirculationSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, 0.91, 0.04),   // Mesenteric gut absorptive bed
      new THREE.Vector3(0.05, 1.03, 0.04),   // Superior mesenteric vein
      new THREE.Vector3(0.08, 1.09, 0.04),   // Portal vein entering liver
      new THREE.Vector3(0.10, 1.15, 0.04),   // Liver sinusoids (glycogenesis / first-pass)
      new THREE.Vector3(0.03, 1.22, 0.02),   // Hepatic vein into IVC
      new THREE.Vector3(0.01, 1.28, 0.05),   // Right atrium -> Left ventricle
      new THREE.Vector3(0.00, 1.38, 0.03),   // Aortic arch
      new THREE.Vector3(-0.02, 1.10, 0.01),  // Thoracic descending aorta
      new THREE.Vector3(-0.02, 0.82, 0.00),  // Abdominal aorta -> Iliac bifurcation
      new THREE.Vector3(-0.16, 0.55, 0.08),  // Left quadriceps muscle GLUT4 sink
      new THREE.Vector3(0.16, 0.55, 0.08),   // Right quadriceps muscle GLUT4 sink
      new THREE.Vector3(0.03, 0.82, 0.00)    // Femoral venous return into IVC
    ]);

    // B. 3D Insulin Hormone Molecules (Luminous Cyan)
    const insulinCount = 100;
    const insulinMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.95,
      roughness: 0.15
    });
    const insulinInstanced = new THREE.InstancedMesh(sphereGeo, insulinMat, insulinCount);
    insulinInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    flowGroup.add(insulinInstanced);
    insulinInstancedRef.current = insulinInstanced;

    const insulinProgress = new Float32Array(insulinCount);
    for (let i = 0; i < insulinCount; i++) insulinProgress[i] = Math.random();

    // Dual Splines for Insulin:
    // 1) Endogenous: Pancreatic Islets -> Portal -> Heart -> Systemic Target Receptors
    const endogenousInsulinSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.04, 1.05, 0.04), // Pancreatic beta-cell islets
      new THREE.Vector3(0.04, 1.04, 0.04),  // Splenic & portal vein
      new THREE.Vector3(0.10, 1.14, 0.04),  // Liver hilum (hepatic clearance)
      new THREE.Vector3(0.03, 1.22, 0.02),  // IVC
      new THREE.Vector3(0.01, 1.28, 0.05),  // Heart
      new THREE.Vector3(0.00, 1.38, 0.03),  // Aorta
      new THREE.Vector3(-0.02, 0.82, 0.00), // Peripheral arterial distribution
      new THREE.Vector3(-0.16, 0.55, 0.08), // Skeletal muscle GLUT4 receptor binding
      new THREE.Vector3(0.16, 0.55, 0.08)
    ]);

    // 2) Exogenous: SubQ Depot -> Abdominal Wall Capillaries -> IVC -> Heart -> Systemic
    const t1dInsulinSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.14, 0.94, 0.12),  // SubQ injection depot (lower right abdomen)
      new THREE.Vector3(0.08, 0.96, 0.06),  // Abdominal wall capillary absorption
      new THREE.Vector3(0.03, 1.05, 0.01),  // Deep venous return to IVC
      new THREE.Vector3(0.01, 1.28, 0.05),  // Heart
      new THREE.Vector3(0.00, 1.38, 0.03),  // Aorta
      new THREE.Vector3(-0.02, 0.82, 0.00), // Iliac arteries
      new THREE.Vector3(-0.16, 0.55, 0.08), // Left muscle
      new THREE.Vector3(0.16, 0.55, 0.08)   // Right muscle
    ]);

    // C. 3D Food Chyme Boluses (Warm Orange)
    const foodCount = 40;
    const foodMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.85
    });
    const foodInstanced = new THREE.InstancedMesh(sphereGeo, foodMat, foodCount);
    foodInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    flowGroup.add(foodInstanced);
    foodInstancedRef.current = foodInstanced;

    const foodProgress = new Float32Array(foodCount);
    for (let i = 0; i < foodCount; i++) foodProgress[i] = Math.random();

    // Food Spline: Mouth -> Esophagus -> Gastric Corpus -> Pylorus -> Duodenal C-loop -> Jejunum
    const foodSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.00, 1.48, 0.02),   // Pharynx / upper esophagus
      new THREE.Vector3(-0.01, 1.30, 0.01),  // Mid esophagus
      new THREE.Vector3(-0.01, 1.18, 0.04),  // Lower esophagus / cardia
      new THREE.Vector3(-0.04, 1.12, 0.06),  // Gastric fundus & body
      new THREE.Vector3(-0.02, 1.05, 0.05),  // Gastric antrum & pylorus
      new THREE.Vector3(-0.05, 1.02, 0.04),  // Duodenal C-loop entry
      new THREE.Vector3(-0.02, 0.97, 0.04),  // Duodenojejunal flexure
      new THREE.Vector3(0.02, 0.91, 0.04),   // Jejunum lumen
      new THREE.Vector3(0.01, 0.84, 0.04)    // Ileum lumen
    ]);

    // D. 3D Renal Glucosuria Stream (Spills into kidneys when G > 180 mg/dL)
    const renalCount = 35;
    const renalMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.85
    });
    const renalInstanced = new THREE.InstancedMesh(sphereGeo, renalMat, renalCount);
    renalInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    flowGroup.add(renalInstanced);
    renalInstancedRef.current = renalInstanced;

    const renalProgress = new Float32Array(renalCount);
    for (let i = 0; i < renalCount; i++) renalProgress[i] = Math.random();

    const renalSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 1.05, 0.00),  // Renal artery branch from Aorta
      new THREE.Vector3(-0.11, 1.04, -0.05), // Left kidney glomerulus
      new THREE.Vector3(-0.07, 0.88, -0.03), // Left ureter descending
      new THREE.Vector3(0.00, 0.72, 0.02)    // Urinary bladder
    ]);

    // ==========================================
    // 5. RAYCASTING & INTERACTIVE SELECTION
    // ==========================================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshesRef.current, true);

      if (intersects.length > 0) {
        for (const hit of intersects) {
          const organId = hit.object.userData?.organId;
          if (organId && ANATOMY_ORGAN_DATABASE[organId]) {
            onSelectOrgan(ANATOMY_ORGAN_DATABASE[organId]);
            return;
          }
        }
      }
    };

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshesRef.current, true);

      if (intersects.length > 0) {
        for (const hit of intersects) {
          const organId = hit.object.userData?.organId;
          if (organId) {
            renderer.domElement.style.cursor = 'pointer';
            setHoveredOrgan(organId);
            return;
          }
        }
      }
      renderer.domElement.style.cursor = 'default';
      setHoveredOrgan(null);
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

    // ==========================================
    // 6. REAL-TIME 60 FPS FLUID PHYSICS & METABOLISM LOOP
    // Reads directly from mutable live refs to avoid stale closure!
    // ==========================================
    let animationFrameId: number;
    const clock = new THREE.Clock();
    const dummyMatrix = new THREE.Matrix4();
    const dummyScale = new THREE.Vector3(1, 1, 1);
    const dummyRotation = new THREE.Quaternion();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      controls.update();

      // Read instantaneous live values from refs
      const liveGlucose = currentGlucoseRef.current;
      const liveInsulin = activeInsulinRef.current;
      const liveCarbFlux = carbAbsorptionFluxRef.current;
      const liveMode = modeRef.current;

      // Cardiac systolic pulse
      if (heartMeshRef.current) {
        const pulse = 1.0 + Math.sin(elapsed * 5.0) * 0.04;
        heartMeshRef.current.scale.set(0.075 * pulse, 0.075 * pulse, 0.075 * pulse);
      }

      // Pancreas Islet Endocrine Glow
      if (pancreasLightRef.current) {
        const baseIntensity = liveMode === 'type1' ? 0.3 : (liveMode === 'type2' ? 3.8 : 2.6);
        pancreasLightRef.current.color.setHex(
          liveMode === 'type1' ? 0xef4444 : (liveMode === 'type2' ? 0x06b6d4 : 0x10b981)
        );
        pancreasLightRef.current.intensity = baseIntensity + Math.sin(elapsed * 3.5) * 0.5;
      }

      // Dynamic Beta-Cell Islet Glow across Modes
      betaCellMeshesRef.current.forEach((beta) => {
        const mat = beta.material as THREE.MeshStandardMaterial;
        if (mat) {
          if (liveMode === 'type1') {
            mat.color.setHex(0x450a0a); // Necrotic / autoimmune damaged
            mat.emissive.setHex(0x7f1d1d);
            mat.emissiveIntensity = 0.25;
          } else if (liveMode === 'type2') {
            mat.color.setHex(0x06b6d4); // Compensatory hyperactive
            mat.emissive.setHex(0x0284c7);
            mat.emissiveIntensity = 1.1 + Math.sin(elapsed * 4.0) * 0.3;
          } else {
            mat.color.setHex(0x10b981); // Healthy active
            mat.emissive.setHex(0x059669);
            mat.emissiveIntensity = 0.95 + Math.sin(elapsed * 3.0) * 0.2;
          }
        }
      });

      // Type 2 Muscle Receptor Resistance Aura Pulse
      muscleReceptorRingsRef.current.forEach((ring) => {
        ring.visible = liveMode === 'type2';
        if (ring.visible) {
          const s = 1.0 + Math.sin(elapsed * 4.0) * 0.15;
          ring.scale.set(s, s, s);
        }
      });

      // Subcutaneous Depot Pulse in Type 1 Diabetes
      if (subqDepotRef.current) {
        subqDepotRef.current.visible = liveMode === 'type1';
        if (subqDepotRef.current.visible) {
          const pulse = 1.0 + Math.sin(elapsed * 4.5) * 0.14;
          subqDepotRef.current.scale.set(pulse, pulse, pulse);
        }
      }

      // --- Animate 3D Glucose Spheres along Vessels ---
      // Velocity scales instantaneously with live glucose level
      const glucoseSpeed = 0.16 + (liveGlucose / 280) * 0.32;
      for (let i = 0; i < glucoseCount; i++) {
        glucoseProgress[i] = (glucoseProgress[i] + delta * glucoseSpeed) % 1.0;
        const pt = glucoseCirculationSpline.getPoint(glucoseProgress[i]);
        const jX = Math.sin(elapsed * 3 + i) * 0.007;
        const jY = Math.cos(elapsed * 3 + i) * 0.007;
        dummyMatrix.compose(new THREE.Vector3(pt.x + jX, pt.y + jY, pt.z), dummyRotation, dummyScale);
        glucoseInstanced.setMatrixAt(i, dummyMatrix);
      }
      glucoseInstanced.instanceMatrix.needsUpdate = true;

      // Update glucose color dynamically based on live level
      if (glucoseMat) {
        if (liveGlucose > 220) {
          glucoseMat.color.setHex(0xef4444); // Severe hyperglycemia crimson
          glucoseMat.emissive.setHex(0xdc2626);
          glucoseMat.emissiveIntensity = 1.0;
        } else if (liveGlucose > 180) {
          glucoseMat.color.setHex(0xf59e0b); // Cautionary amber above renal threshold
          glucoseMat.emissive.setHex(0xd97706);
          glucoseMat.emissiveIntensity = 0.85;
        } else {
          glucoseMat.color.setHex(0xfbbf24); // Healthy golden euglycemia
          glucoseMat.emissive.setHex(0xf59e0b);
          glucoseMat.emissiveIntensity = 0.7;
        }
      }

      // --- Animate 3D Insulin Spheres ---
      const hasInsulin = liveMode !== 'type1' || liveInsulin > 0.1;
      const insulinMultiplier = liveMode === 'type2' ? 1.8 : 1.0;
      const insulinSpeed = (0.22 + (liveInsulin / 4.0) * 0.25) * insulinMultiplier;
      const activeInsulinSpline = liveMode === 'type1' ? t1dInsulinSpline : endogenousInsulinSpline;

      for (let i = 0; i < insulinCount; i++) {
        if (!hasInsulin) {
          dummyMatrix.compose(new THREE.Vector3(0, -10, 0), dummyRotation, dummyScale);
          insulinInstanced.setMatrixAt(i, dummyMatrix);
          continue;
        }
        insulinProgress[i] = (insulinProgress[i] + delta * insulinSpeed) % 1.0;
        const pt = activeInsulinSpline.getPoint(insulinProgress[i]);
        const jX = Math.sin(elapsed * 4 + i) * 0.005;
        const jY = Math.cos(elapsed * 4 + i) * 0.005;
        dummyMatrix.compose(new THREE.Vector3(pt.x + jX, pt.y + jY, pt.z), dummyRotation, dummyScale);
        insulinInstanced.setMatrixAt(i, dummyMatrix);
      }
      insulinInstanced.instanceMatrix.needsUpdate = true;

      // --- Animate 3D Food Chyme Boluses ---
      const mealActive = liveCarbFlux > 0.05;
      const foodSpeed = 0.15 + Math.min(0.35, liveCarbFlux * 0.12);
      for (let i = 0; i < foodCount; i++) {
        if (!mealActive) {
          dummyMatrix.compose(new THREE.Vector3(0, -10, 0), dummyRotation, dummyScale);
          foodInstanced.setMatrixAt(i, dummyMatrix);
          continue;
        }
        foodProgress[i] = (foodProgress[i] + delta * foodSpeed) % 1.0;
        const pt = foodSpline.getPoint(foodProgress[i]);
        dummyMatrix.compose(new THREE.Vector3(pt.x, pt.y, pt.z), dummyRotation, dummyScale);
        foodInstanced.setMatrixAt(i, dummyMatrix);
      }
      foodInstanced.instanceMatrix.needsUpdate = true;

      // --- Animate 3D Renal Glucosuria Stream (Spills into kidneys when G >= 180 mg/dL) ---
      const glucosuriaActive = liveGlucose >= 180;
      const renalSpeed = 0.25 + ((liveGlucose - 180) / 100) * 0.35;
      for (let i = 0; i < renalCount; i++) {
        if (!glucosuriaActive) {
          dummyMatrix.compose(new THREE.Vector3(0, -10, 0), dummyRotation, dummyScale);
          renalInstanced.setMatrixAt(i, dummyMatrix);
          continue;
        }
        renalProgress[i] = (renalProgress[i] + delta * renalSpeed) % 1.0;
        const pt = renalSpline.getPoint(renalProgress[i]);
        dummyMatrix.compose(new THREE.Vector3(pt.x, pt.y, pt.z), dummyRotation, dummyScale);
        renalInstanced.setMatrixAt(i, dummyMatrix);
      }
      renalInstanced.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      dracoLoader.dispose();
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, []); // Mounted once; live values read dynamically from refs!

  // Update visibility layers
  useEffect(() => {
    if (bodyModelGroupRef.current) bodyModelGroupRef.current.visible = showMuscles;
    if (digestiveGroupRef.current) digestiveGroupRef.current.visible = showOrgans;
    if (organsGroupRef.current) organsGroupRef.current.visible = showOrgans;
    if (vesselsGroupRef.current) vesselsGroupRef.current.visible = showVessels;
    if (glucoseInstancedRef.current) glucoseInstancedRef.current.visible = showGlucoseParticles;
    if (insulinInstancedRef.current) insulinInstancedRef.current.visible = showInsulinParticles;
  }, [showMuscles, showOrgans, showVessels, showGlucoseParticles, showInsulinParticles]);

  // Camera presets
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !cameraPreset) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (cameraPreset) {
      case 'full':
        camera.position.set(0, 0.85, 3.2);
        controls.target.set(0, 0.85, 0);
        break;
      case 'abdomen':
        camera.position.set(0, 1.05, 1.35);
        controls.target.set(0, 1.04, 0.04);
        break;
      case 'pancreas':
        camera.position.set(-0.06, 1.08, 0.65);
        controls.target.set(-0.06, 1.06, 0.05);
        break;
      case 'circulation':
        camera.position.set(0, 0.95, 2.1);
        controls.target.set(0, 0.95, 0.02);
        break;
    }
    controls.update();
  }, [cameraPreset]);

  // Sync external camera state for dual viewports
  useEffect(() => {
    if (externalCameraState && cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(...externalCameraState.position);
      controlsRef.current.target.set(...externalCameraState.target);
      controlsRef.current.update();
    }
  }, [externalCameraState]);

  // Highlight selected organ
  useEffect(() => {
    interactiveMeshesRef.current.forEach((mesh) => {
      const isSelected = mesh.userData?.organId === selectedOrganId;
      const isHovered = mesh.userData?.organId === hoveredOrgan;
      const mat = mesh.material as THREE.MeshStandardMaterial;

      if (mat && mat.emissive) {
        if (isSelected) {
          mat.emissive.setHex(0x38bdf8);
          mat.emissiveIntensity = 0.95;
        } else if (isHovered) {
          mat.emissive.setHex(0xf59e0b);
          mat.emissiveIntensity = 0.65;
        } else if (mesh.userData?.organId === 'pancreas' && !mesh.userData?.role) {
          mat.emissive.setHex(mode === 'type1' ? 0x450a0a : (mode === 'type2' ? 0x0284c7 : 0x059669));
          mat.emissiveIntensity = mode === 'type1' ? 0.3 : 0.65;
        } else if (!mesh.userData?.role) {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
    });
  }, [selectedOrganId, hoveredOrgan, mode]);

  return (
    <div className="relative w-full h-full min-h-[550px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none">
      {/* 3D WebGL Canvas Mounting Point */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Asset Loading Progress HUD */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Assembling 3D Anatomy ({loadingProgress}%)
            </span>
            <p className="text-[11px] text-slate-400">
              Fitting Pancreas, Duodenum, Stomach, Intestines &amp; Z-Anatomy Frame...
            </p>
          </div>
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Comparison Viewport Header */}
      {isComparisonSide && comparisonLabel && (
        <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 backdrop-blur-md text-xs font-bold text-white shadow-lg flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>{comparisonLabel}</span>
        </div>
      )}

      {/* Live Glycemic Status HUD in 3D Canvas */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-1.5 pointer-events-none">
        <div className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-md shadow-2xl text-right">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Circulating Glucose (G)
          </span>
          <div className="flex items-baseline space-x-1 justify-end">
            <span
              className="text-3xl font-black font-mono tracking-tight"
              style={{
                color:
                  currentGlucose < 70
                    ? '#ef4444'
                    : currentGlucose > 180
                    ? '#f59e0b'
                    : '#10b981'
              }}
            >
              {Math.round(currentGlucose)}
            </span>
            <span className="text-xs text-slate-400 font-semibold">mg/dL</span>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800 backdrop-blur-md text-xs text-slate-300 flex items-center space-x-2.5 shadow-xl">
          <span className="text-cyan-400 font-mono font-bold">IOB: {activeInsulin.toFixed(1)} U</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-mono font-bold">Carb Flux: {carbAbsorptionFlux > 0 ? `+${carbAbsorptionFlux.toFixed(1)}` : '0.0'} g/h</span>
        </div>

        {/* Dynamic Mode Badge */}
        <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-lg ${
          mode === 'healthy'
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            : mode === 'type1'
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
        }`}>
          {mode === 'healthy' ? '🟢 Normal Euglycemia' : mode === 'type1' ? '🔴 T1D: Zero Beta-Cell Insulin' : '🟡 T2D: Insulin Resistance (GLUT4 Block)'}
        </div>
      </div>

      {/* Hovered Organ Indicator Badge */}
      {hoveredOrgan && (
        <div className="absolute bottom-4 left-4 z-10 px-3.5 py-2 rounded-xl bg-slate-950/95 border border-cyan-500/50 text-xs font-bold text-cyan-300 backdrop-blur-md shadow-2xl flex items-center space-x-2 pointer-events-none">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
          <span>Click to Inspect: {ANATOMY_ORGAN_DATABASE[hoveredOrgan]?.name || hoveredOrgan}</span>
        </div>
      )}

      {/* 3D Metabolic Flow Legend */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end space-y-1 text-[10px] text-slate-300 font-mono pointer-events-none bg-slate-950/90 p-2.5 rounded-xl border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-sm"></span>
          <span>Glucose Flow (Gut → Portal → Liver → Muscle)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-sm"></span>
          <span>Insulin Flow (Pancreas/SubQ → Target Receptors)</span>
        </div>
        {currentGlucose >= 180 && (
          <div className="flex items-center space-x-1.5 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block animate-ping"></span>
            <span>Glucosuria Spilling to Kidneys ({'>'}180 mg/dL)</span>
          </div>
        )}
      </div>
    </div>
  );
};
