import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { startFaceTracking, stopFaceTracking } from './tracking';
import { initRetarget, retargetFrame } from './retarget';

interface ModelInfo {
  name: string;
  version: string;
  author: string;
  vertices: number;
  triangles: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'loading' | 'connected'>('disconnected');
  const [cameraIndex, setCameraIndex] = useState(0);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Three.js refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);

  // Initialize Three.js scene
  const initScene = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1, 3);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 10;
    dirLight.shadow.camera.left = -3;
    dirLight.shadow.camera.right = 3;
    dirLight.shadow.camera.top = 3;
    dirLight.shadow.camera.bottom = -3;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x00d9ff, 0.3);
    fillLight.position.set(-2, 2, -2);
    scene.add(fillLight);

    // Ground plane shadow catcher
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.15 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Resize handler
    const handleResize = () => {
      if (!canvasRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const delta = clockRef.current.getDelta();

      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      if (vrm) {
        // Procedural idle animation: breathing
        const time = clockRef.current.getElapsedTime();
        const breath = Math.sin(time * 0.8) * 0.02 + 0.02;
        const blink = Math.sin(time * 3.7) > 0.95 ? 1 : 0;

        // Apply breathing to spine
        const spine = vrm.humanoid?.getBoneNode('spine');
        if (spine) {
          spine.rotation.x = breath;
        }

        // Blinking
        vrm.expressionManager?.setValue('blink', blink);
        vrm.expressionManager?.setValue('blinkLeft', blink);
        vrm.expressionManager?.setValue('blinkRight', blink);

        // Subtle head movement
        const head = vrm.humanoid?.getBoneNode('head');
        if (head) {
          head.rotation.y = Math.sin(time * 0.5) * 0.03;
          head.rotation.x = Math.sin(time * 0.7) * 0.02;
        }
      }

      controlsRef.current?.update();
      rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, [vrm]);

  // Initialize face tracking
  const initTracking = useCallback(async () => {
    if (!vrm) return;

    try {
      setTrackingError(null);
      initRetarget({ vrm, smoothing: 0.3, blendshapeMultiplier: 1.0 });

      await startFaceTracking({
        cameraIndex,
        faceConfidence: 0.7,
        onResult: (result) => {
          // Retarget MediaPipe results to VRM
          retargetFrame(result);
        },
        onError: (error) => {
          setTrackingError(error);
          setIsTracking(false);
        },
      });

      setIsTracking(true);
    } catch (err) {
      setTrackingError(err instanceof Error ? err.message : 'Failed to start tracking');
      setIsTracking(false);
    }
  }, [vrm, cameraIndex]);

  // Start/stop tracking when camera index or VRM changes
  useEffect(() => {
    if (vrm && cameraIndex >= 0) {
      initTracking();
    } else {
      stopFaceTracking();
      setIsTracking(false);
    }

    return () => {
      stopFaceTracking();
    };
  }, [vrm, cameraIndex, initTracking]);

  // Load VRM from file
  const loadVRM = useCallback(async (file: File) => {
    setStatus('loading');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const gltf = await loader.parseAsync(arrayBuffer, '');
      const loadedVrm = gltf.userData.vrm as VRM;

      // Setup VRM
      loadedVrm.scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      // Position model
      loadedVrm.scene.position.y = 0;

      // Add to scene
      if (sceneRef.current) {
        // Remove previous VRM
        if (vrm) {
          sceneRef.current.remove(vrm.scene);
          vrm.humanoid?.getBoneNode('hips')?.parent?.remove(vrm.scene);
        }
        sceneRef.current.add(loadedVrm.scene);
      }

      // Animation mixer for idle animations
      const mixer = new THREE.AnimationMixer(loadedVrm.scene);
      mixerRef.current = mixer;

      if (gltf.animations.length > 0) {
        const clip = gltf.animations.find(a => a.name.toLowerCase().includes('idle')) || gltf.animations[0];
        const action = mixer.clipAction(clip);
        action.play();
        idleActionRef.current = action;
      }

      // Compute model info
      let vertices = 0;
      let triangles = 0;
      loadedVrm.scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          vertices += obj.geometry.attributes.position?.count || 0;
          const index = obj.geometry.getIndex();
          triangles += index ? index.count / 3 : (obj.geometry.attributes.position?.count || 0) / 3;
        }
      });

      const meta = loadedVrm.meta;
      // Handle both VRM0Meta (title, author) and VRM1Meta (name, authors)
      let name = file.name.replace('.vrm', '');
      let author = 'Unknown';
      let version = '1.0';

      if (meta) {
        if ('name' in meta) {
          // VRM1Meta
          name = meta.name;
          author = meta.authors?.[0] || 'Unknown';
          version = meta.version || '1.0';
        } else {
          // VRM0Meta
          name = meta.title || file.name.replace('.vrm', '');
          author = meta.author || 'Unknown';
          version = meta.version || '1.0';
        }
      }

      const info: ModelInfo = {
        name,
        version,
        author,
        vertices: Math.round(vertices),
        triangles: Math.round(triangles),
      };

      setVrm(loadedVrm);
      setModelInfo(info);
      setStatus('connected');
    } catch (err) {
      console.error('Failed to load VRM:', err);
      setStatus('disconnected');
      alert(`Failed to load VRM: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [vrm]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.vrm') || file.type === 'model/vrm')) {
      await loadVRM(file);
    }
  }, [loadVRM]);

  // Initialize cameras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
    });
  }, []);

  // Initialize scene on mount
  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">VTuberCC</h1>
        <div className="status">
          <span className={`status-dot ${status}`}></span>
          <span>{status === 'connected' ? 'Model Loaded' : status === 'loading' ? 'Loading...' : 'No Model'}</span>
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <div
            className={`drop-zone ${dragActive ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto', color: 'var(--accent)' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>Drag & drop .vrm file here</p>
          </div>

          {modelInfo && (
            <div className="panel">
              <div className="panel-title">Model Info</div>
              <div className="model-info">
                <div className="model-info-row">
                  <span className="model-info-label">Name</span>
                  <span className="model-info-value">{modelInfo.name}</span>
                </div>
                <div className="model-info-row">
                  <span className="model-info-label">Author</span>
                  <span className="model-info-value">{modelInfo.author}</span>
                </div>
                <div className="model-info-row">
                  <span className="model-info-label">Version</span>
                  <span className="model-info-value">{modelInfo.version}</span>
                </div>
                <div className="model-info-row">
                  <span className="model-info-label">Vertices</span>
                  <span className="model-info-value">{modelInfo.vertices.toLocaleString()}</span>
                </div>
                <div className="model-info-row">
                  <span className="model-info-label">Triangles</span>
                  <span className="model-info-value">{modelInfo.triangles.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-title">Camera</div>
            <select className="select" value={cameraIndex} onChange={e => setCameraIndex(Number(e.target.value))}>
              {cameras.map((cam, i) => (
                <option key={cam.deviceId} value={i}>{cam.label || `Camera ${i + 1}`}</option>
              ))}
              {cameras.length === 0 && <option value={-1}>No cameras found</option>}
            </select>
          </div>

          <div className="panel">
            <div className="panel-title">Tracking</div>
            <div className="slider-container">
              <div className="slider-label">
                <span>Face Confidence</span>
                <span>0.7</span>
              </div>
              <input type="range" className="slider" min="0.1" max="1" step="0.05" defaultValue="0.7" />
            </div>
            <div className="slider-container" style={{ marginTop: 12 }}>
              <div className="slider-label">
                <span>Hand Confidence</span>
                <span>0.5</span>
              </div>
              <input type="range" className="slider" min="0.1" max="1" step="0.05" defaultValue="0.5" />
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                className={`btn ${isTracking ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => vrm ? (isTracking ? stopFaceTracking() : initTracking()) : null}
                disabled={!vrm}
              >
                {isTracking ? 'Stop Tracking' : 'Start Tracking'}
              </button>
              {trackingError && (
                <div style={{ color: 'var(--error)', marginTop: 8, fontSize: 12 }}>
                  {trackingError}
                </div>
              )}
            </div>
          </div>

          <button className="btn btn-secondary" onClick={() => { if (vrm) { setVrm(null); setModelInfo(null); setStatus('disconnected'); } }}>Unload Model</button>
        </aside>

        <main className="canvas-container" ref={canvasRef as React.RefObject<HTMLCanvasElement>}>
          <canvas ref={canvasRef} />
        </main>
      </div>
    </div>
  );
}