import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Text, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Gauge, 
  Navigation, 
  Plane as PlaneIcon, 
  Play, 
  Pause, 
  Camera,
  Settings,
  Wind,
  Thermometer,
  Fuel,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

// Aircraft component
function Aircraft({ position, rotation, flaps, onUpdate }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(position);
      meshRef.current.rotation.copy(rotation);
      onUpdate?.(meshRef.current);
    }
  });

  const flapAngle = (flaps / 40) * Math.PI / 6; // Max 30 degrees

  return (
    <group ref={meshRef}>
      {/* Aircraft body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.1, 4, 8]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      
      {/* Main Wings */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[6, 0.2, 1]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
      
      {/* Wing Flaps */}
      <mesh position={[-2.5, 0, 0.3]} rotation={[flapAngle, 0, Math.PI / 2]}>
        <boxGeometry args={[1, 0.1, 0.4]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
      <mesh position={[2.5, 0, 0.3]} rotation={[flapAngle, 0, Math.PI / 2]}>
        <boxGeometry args={[1, 0.1, 0.4]} />
        <meshStandardMaterial color="#9ca3af" />
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
      
      {/* Propeller */}
      <mesh position={[0, 0, 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
        <meshStandardMaterial color="#374151" />
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
    engineStatus: 'IDLE',
    weather: 'CLEAR',
    windSpeed: 5,
    temperature: 15,
    fuel: 100,
    engineTemp: 75,
    flaps: 0,
    verticalSpeed: 0,
    gForce: 1.0
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
        
        // Flaps control
        let newFlaps = flightData.flaps;
        if (keys.has('f')) newFlaps = Math.min(40, newFlaps + 10);
        if (keys.has('g')) newFlaps = Math.max(0, newFlaps - 10);
        
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
        const liftMultiplier = 1 + (newFlaps / 100); // Flaps increase lift
        const dragMultiplier = 1 + (newFlaps / 200); // Flaps increase drag
        
        const forward = new THREE.Vector3(0, 0, thrust);
        forward.applyEuler(newState.rotation);
        
        // Add lift based on speed and angle of attack
        const speed = newState.velocity.length();
        const lift = speed * Math.sin(-newState.rotation.x) * liftMultiplier * 0.1;
        const liftForce = new THREE.Vector3(0, lift, 0);
        
        newState.velocity.add(forward);
        newState.velocity.add(liftForce);
        
        // Gravity
        newState.velocity.y -= 0.01;
        
        // Air resistance with drag
        newState.velocity.multiplyScalar(0.98 / dragMultiplier);
        
        const prevY = newState.position.y;
        newState.position.add(newState.velocity);
        
        // Ground collision
        if (newState.position.y < 0) {
          newState.position.y = 0;
          newState.velocity.y = 0;
        }
        
        // Calculate vertical speed and G-force
        const verticalSpeed = (newState.position.y - prevY) * 600; // Convert to ft/min
        const gForce = Math.abs(verticalSpeed / 100) + 1;
        
        // Update flight data
        const currentSpeed = newState.velocity.length() * 100;
        const altitude = Math.max(0, newState.position.y * 10);
        const heading = ((newState.rotation.y * 180 / Math.PI) + 360) % 360;
        
        // Fuel consumption
        const fuelConsumption = (newThrottle / 100) * 0.02;
        const newFuel = Math.max(0, flightData.fuel - fuelConsumption);
        
        // Engine temperature
        const targetTemp = 75 + (newThrottle / 100) * 50;
        const newEngineTemp = flightData.engineTemp + (targetTemp - flightData.engineTemp) * 0.1;
        
        setFlightData(prev => ({
          ...prev,
          speed: Math.round(currentSpeed),
          altitude: Math.round(altitude),
          heading: Math.round(heading),
          throttle: newThrottle,
          flaps: newFlaps,
          fuel: Math.round(newFuel * 10) / 10,
          engineTemp: Math.round(newEngineTemp),
          verticalSpeed: Math.round(verticalSpeed),
          gForce: Math.round(gForce * 10) / 10,
          engineStatus: newFuel > 0 && newThrottle > 0 ? 'RUNNING' : newFuel <= 0 ? 'FUEL OUT' : 'IDLE'
        }));
        
        return newState;
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [isPlaying, flightData.throttle, flightData.flaps, flightData.fuel, flightData.engineTemp]);

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
        <Stars radius={300} depth={60} count={1000} factor={7} saturation={0} fade speed={1} />
        
        <Aircraft
          position={aircraftState.position}
          rotation={aircraftState.rotation}
          flaps={flightData.flaps}
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
          {/* Primary Flight Instruments */}
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
              <div className="text-center">
                <div className="hud-text text-xs opacity-75">V/S</div>
                <div className={`hud-text text-lg font-bold ${flightData.verticalSpeed > 0 ? 'text-green-400' : flightData.verticalSpeed < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                  {flightData.verticalSpeed > 0 ? '+' : ''}{flightData.verticalSpeed}
                </div>
                <div className="hud-text text-xs opacity-75">FPM</div>
              </div>
              <div className="text-center">
                <div className="hud-text text-xs opacity-75">G-FORCE</div>
                <div className={`hud-text text-lg font-bold ${flightData.gForce > 2 ? 'text-red-400' : 'text-amber-400'}`}>
                  {flightData.gForce}G
                </div>
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

          {/* Weather Panel */}
          <div className="instrument-panel rounded-lg p-4 pointer-events-auto">
            <div className="text-center text-amber-400">
              <div className="hud-text text-xs opacity-75">WEATHER</div>
              <div className="hud-text text-sm font-bold">{flightData.weather}</div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Wind className="w-4 h-4" />
                <span className="hud-text text-xs">{flightData.windSpeed} KT</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Thermometer className="w-4 h-4" />
                <span className="hud-text text-xs">{flightData.temperature}°C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          {/* Engine & Fuel Status */}
          <div className="instrument-panel rounded-lg p-4 pointer-events-auto">
            <div className="text-amber-400 space-y-2">
              <div>
                <div className="hud-text text-xs opacity-75">ENGINE</div>
                <div className={`hud-text text-lg font-bold ${flightData.engineStatus === 'FUEL OUT' ? 'text-red-400' : flightData.engineStatus === 'RUNNING' ? 'text-green-400' : 'text-amber-400'}`}>
                  {flightData.engineStatus}
                </div>
                <div className="hud-text text-xs opacity-75">THROTTLE: {flightData.throttle}%</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <Fuel className={`w-4 h-4 mx-auto ${flightData.fuel < 20 ? 'text-red-400' : 'text-amber-400'}`} />
                  <div className={`hud-text text-sm font-bold ${flightData.fuel < 20 ? 'text-red-400' : 'text-amber-400'}`}>
                    {flightData.fuel}%
                  </div>
                </div>
                <div className="text-center">
                  <Thermometer className={`w-4 h-4 mx-auto ${flightData.engineTemp > 110 ? 'text-red-400' : 'text-amber-400'}`} />
                  <div className={`hud-text text-sm font-bold ${flightData.engineTemp > 110 ? 'text-red-400' : 'text-amber-400'}`}>
                    {flightData.engineTemp}°C
                  </div>
                </div>
              </div>
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

          {/* Landing Gear & Flaps Status */}
          <div className="instrument-panel rounded-lg p-4 pointer-events-auto">
            <div className="text-amber-400 space-y-2">
              <div className="text-center">
                <div className="hud-text text-xs opacity-75">GEAR</div>
                <div className={`hud-text text-lg font-bold ${flightData.landingGear ? 'text-green-400' : 'text-red-400'}`}>
                  {flightData.landingGear ? 'DOWN' : 'UP'}
                </div>
              </div>
              <div className="text-center">
                <div className="hud-text text-xs opacity-75">FLAPS</div>
                <div className={`hud-text text-lg font-bold ${flightData.flaps > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                  {flightData.flaps}°
                </div>
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
              <div>F: Extend Flaps</div>
              <div>G: Retract Flaps</div>
              <div>Camera: {cameraMode.toUpperCase()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}