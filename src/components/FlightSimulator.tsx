import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Plane, Text } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Gauge, 
  Navigation, 
  Plane as PlaneIcon, 
  Play, 
  Pause, 
  Camera,
  Settings
} from 'lucide-react';

// Aircraft component
function Aircraft({ position, rotation, onUpdate }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(position);
      meshRef.current.rotation.copy(rotation);
      onUpdate?.(meshRef.current);
    }
  });

  return (
    <group ref={meshRef}>
      {/* Aircraft body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.1, 4, 8]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      
      {/* Wings */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[6, 0.2, 1]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
      
      {/* Tail */}
      <mesh position={[0, 1, -1.5]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[2, 0.1, 0.5]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
      
      {/* Vertical stabilizer */}
      <mesh position={[0, 1, -1.5]}>
        <boxGeometry args={[0.1, 2, 0.5]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
    </group>
  );
}

// Terrain component
function Terrain() {
  return (
    <group>
      {/* Ground plane */}
      <mesh position={[0, -50, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      
      {/* Runway */}
      <mesh position={[0, -49.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 200]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      
      {/* Runway markings */}
      <mesh position={[0, -49.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 200]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
    </group>
  );
}

// Camera controller
function CameraController({ 
  aircraft, 
  cameraMode, 
  controls 
}: { 
  aircraft: THREE.Object3D | null; 
  cameraMode: string;
  controls: any;
}) {
  const { camera } = useThree();
  
  useFrame(() => {
    if (!aircraft) return;
    
    switch (cameraMode) {
      case 'cockpit':
        camera.position.copy(aircraft.position);
        camera.position.y += 2;
        camera.position.z += 1;
        camera.lookAt(
          aircraft.position.x,
          aircraft.position.y,
          aircraft.position.z + 10
        );
        break;
      case 'chase': {
        const chaseDistance = 15;
        camera.position.copy(aircraft.position);
        camera.position.y += 5;
        camera.position.z -= chaseDistance;
        camera.lookAt(aircraft.position);
        break;
      }
      case 'free':
        // Let OrbitControls handle this
        break;
    }
  });

  return cameraMode === 'free' ? <OrbitControls ref={controls} /> : null;
}

// Main Flight Simulator Component
export default function FlightSimulator() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [cameraMode, setCameraMode] = useState('chase');
  const [aircraft, setAircraft] = useState<THREE.Object3D | null>(null);
  const [flightData, setFlightData] = useState({
    speed: 0,
    altitude: 100,
    heading: 0,
    throttle: 0,
    landingGear: true,
    engineStatus: 'IDLE'
  });
  
  const [aircraftState, setAircraftState] = useState({
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0)
  });

  const controlsRef = useRef<any>();
  const keysPressed = useRef<Set<string>>(new Set());

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressed.current.add(event.key.toLowerCase());
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current.delete(event.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Flight physics update
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setAircraftState(prev => {
        const newState = { ...prev };
        const keys = keysPressed.current;
        
        // Throttle control
        let newThrottle = flightData.throttle;
        if (keys.has('shift')) newThrottle = Math.min(100, newThrottle + 2);
        if (keys.has('control')) newThrottle = Math.max(0, newThrottle - 2);
        
        // Flight controls
        const pitchSpeed = 0.02;
        const rollSpeed = 0.03;
        const yawSpeed = 0.01;
        
        if (keys.has('w') || keys.has('arrowup')) {
          newState.rotation.x = Math.max(-Math.PI / 4, newState.rotation.x - pitchSpeed);
        }
        if (keys.has('s') || keys.has('arrowdown')) {
          newState.rotation.x = Math.min(Math.PI / 4, newState.rotation.x + pitchSpeed);
        }
        if (keys.has('a') || keys.has('arrowleft')) {
          newState.rotation.z = Math.min(Math.PI / 6, newState.rotation.z + rollSpeed);
          newState.rotation.y -= yawSpeed;
        }
        if (keys.has('d') || keys.has('arrowright')) {
          newState.rotation.z = Math.max(-Math.PI / 6, newState.rotation.z - rollSpeed);
          newState.rotation.y += yawSpeed;
        }
        
        // Apply physics
        const thrust = (newThrottle / 100) * 0.5;
        const forward = new THREE.Vector3(0, 0, thrust);
        forward.applyEuler(newState.rotation);
        
        newState.velocity.add(forward);
        newState.velocity.multiplyScalar(0.98); // Air resistance
        newState.position.add(newState.velocity);
        
        // Ground collision
        if (newState.position.y < 0) {
          newState.position.y = 0;
          newState.velocity.y = 0;
        }
        
        // Update flight data
        const speed = newState.velocity.length() * 100;
        const altitude = Math.max(0, newState.position.y * 10);
        const heading = ((newState.rotation.y * 180 / Math.PI) + 360) % 360;
        
        setFlightData(prev => ({
          ...prev,
          speed: Math.round(speed),
          altitude: Math.round(altitude),
          heading: Math.round(heading),
          throttle: newThrottle,
          engineStatus: newThrottle > 0 ? 'RUNNING' : 'IDLE'
        }));
        
        return newState;
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [isPlaying, flightData.throttle]);

  const toggleLandingGear = () => {
    setFlightData(prev => ({ ...prev, landingGear: !prev.landingGear }));
  };

  const cycleCameraMode = () => {
    const modes = ['chase', 'cockpit', 'free'];
    const currentIndex = modes.indexOf(cameraMode);
    setCameraMode(modes[(currentIndex + 1) % modes.length]);
  };

  return (
    <div className="w-full h-screen bg-slate-900 relative overflow-hidden">
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 10, 20], fov: 75 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <Sky sunPosition={[100, 20, 100]} />
        
        <Aircraft
          position={aircraftState.position}
          rotation={aircraftState.rotation}
          onUpdate={setAircraft}
        />
        
        <Terrain />
        
        <CameraController
          aircraft={aircraft}
          cameraMode={cameraMode}
          controls={controlsRef}
        />
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          {/* Flight Instruments */}
          <div className="instrument-panel rounded-lg p-4 pointer-events-auto">
            <div className="grid grid-cols-2 gap-4 text-amber-400">
              <div className="text-center">
                <div className="hud-text text-xs opacity-75">SPEED</div>
                <div className="hud-text text-2xl font-bold">{flightData.speed}</div>
                <div className="hud-text text-xs opacity-75">KTS</div>
              </div>
              <div className="text-center">
                <div className="hud-text text-xs opacity-75">ALT</div>
                <div className="hud-text text-2xl font-bold">{flightData.altitude}</div>
                <div className="hud-text text-xs opacity-75">FT</div>
              </div>
            </div>
          </div>

          {/* Compass */}
          <div className="instrument-panel rounded-lg p-4 pointer-events-auto">
            <div className="text-center text-amber-400">
              <div className="hud-text text-xs opacity-75">HEADING</div>
              <div className="hud-text text-2xl font-bold">{flightData.heading}°</div>
              <Navigation className="w-6 h-6 mx-auto mt-2" style={{ transform: `rotate(${flightData.heading}deg)` }} />
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          {/* Engine Status */}
          <div className="instrument-panel rounded-lg p-4 pointer-events-auto">
            <div className="text-amber-400">
              <div className="hud-text text-xs opacity-75">ENGINE</div>
              <div className="hud-text text-lg font-bold">{flightData.engineStatus}</div>
              <div className="hud-text text-xs opacity-75">THROTTLE: {flightData.throttle}%</div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="control-button rounded-lg p-3 pointer-events-auto"
            >
              {isPlaying ? <Pause className="w-6 h-6 text-amber-400" /> : <Play className="w-6 h-6 text-amber-400" />}
            </button>
            
            <button
              onClick={cycleCameraMode}
              className="control-button rounded-lg p-3 pointer-events-auto"
            >
              <Camera className="w-6 h-6 text-amber-400" />
            </button>
            
            <button
              onClick={toggleLandingGear}
              className="control-button rounded-lg p-3 pointer-events-auto"
            >
              <PlaneIcon className={`w-6 h-6 ${flightData.landingGear ? 'text-green-400' : 'text-red-400'}`} />
            </button>
          </div>

          {/* Landing Gear Status */}
          <div className="instrument-panel rounded-lg p-4 pointer-events-auto">
            <div className="text-amber-400">
              <div className="hud-text text-xs opacity-75">GEAR</div>
              <div className={`hud-text text-lg font-bold ${flightData.landingGear ? 'text-green-400' : 'text-red-400'}`}>
                {flightData.landingGear ? 'DOWN' : 'UP'}
              </div>
            </div>
          </div>
        </div>

        {/* Controls Help */}
        <div className="absolute top-4 right-4 instrument-panel rounded-lg p-4 pointer-events-auto max-w-xs">
          <div className="text-amber-400 text-sm">
            <div className="hud-text font-bold mb-2">CONTROLS</div>
            <div className="hud-text text-xs space-y-1 opacity-75">
              <div>WASD / Arrows: Pitch & Roll</div>
              <div>Shift: Increase Throttle</div>
              <div>Ctrl: Decrease Throttle</div>
              <div>Camera: {cameraMode.toUpperCase()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}