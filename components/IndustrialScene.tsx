import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';

// ─── PROCEDURAL MODELS ───

// Robotic Arm Component
const RoboticArm: React.FC = () => {
  const baseRef = useRef<THREE.Mesh>(null);
  const joint1Ref = useRef<THREE.Group>(null);
  const joint2Ref = useRef<THREE.Group>(null);
  const clawRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (joint1Ref.current) {
      joint1Ref.current.rotation.y = Math.sin(t * 0.5) * 0.4;
    }
    if (joint2Ref.current) {
      joint2Ref.current.rotation.z = (Math.cos(t * 0.8) * 0.3) - 0.2;
    }
    if (clawRef.current) {
      clawRef.current.rotation.x = t * 1.5;
    }
  });

  return (
    <group position={[-2.5, -1, -1]}>
      {/* Base */}
      <mesh ref={baseRef} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.4, 32]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Joint 1 group */}
      <group ref={joint1Ref} position={[0, 0.4, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Lower Arm segment */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[0.2, 1.2, 0.2]} />
          <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Joint 2 group */}
        <group ref={joint2Ref} position={[0, 1.3, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.4} />
          </mesh>

          {/* Upper Arm segment */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[0.15, 1.0, 0.15]} />
            <meshStandardMaterial color="#10b981" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* End Effector Claw */}
          <group ref={clawRef} position={[0, 1.1, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.18, 0.18, 0.2, 16]} />
              <meshStandardMaterial color="#6b7280" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Prongs */}
            <mesh position={[-0.1, 0.15, 0]} castShadow>
              <boxGeometry args={[0.04, 0.2, 0.08]} />
              <meshStandardMaterial color="#f3f4f6" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[0.1, 0.15, 0]} castShadow>
              <boxGeometry args={[0.04, 0.2, 0.08]} />
              <meshStandardMaterial color="#f3f4f6" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};

// Electric Motor Component
const ElectricMotor: React.FC = () => {
  const rotorRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (rotorRef.current) {
      rotorRef.current.rotation.z = state.clock.getElapsedTime() * 4.0;
    }
  });

  return (
    <group position={[2.5, -1, -2]}>
      {/* Motor Housing */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.6, 1.4, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Ribs (cooling fins) */}
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[0, (i - 2.5) * 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.68, 0.68, 0.04, 32]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Terminal box on top */}
      <mesh position={[0, 0, 0.6]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.3]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Rotating Axle/Rotor shaft */}
      <group ref={rotorRef} position={[0, 0.8, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Fan blades */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.4, 0.02, 0.4]} />
          <meshStandardMaterial color="#ef4444" metalness={0.4} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

// Rotating Gears System
const GearSystem: React.FC = () => {
  const gear1Ref = useRef<THREE.Mesh>(null);
  const gear2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (gear1Ref.current) gear1Ref.current.rotation.z = t * 0.8;
    if (gear2Ref.current) gear2Ref.current.rotation.z = -t * 0.8 - 0.25; // opposite rotation + offset
  });

  return (
    <group position={[0, 1.5, -3]}>
      {/* Large Gear */}
      <mesh ref={gear1Ref} castShadow>
        <cylinderGeometry args={[1, 1, 0.15, 24]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Small Gear */}
      <mesh ref={gear2Ref} position={[1.4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.15, 12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

// Moving Conveyor System
const ConveyorSystem: React.FC = () => {
  const boxRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (boxRef.current) {
      // Loop boxes along the conveyor belt from -2 to 2
      boxRef.current.position.x = ((t * 0.5) % 4) - 2;
    }
  });

  return (
    <group position={[0, -1.2, 1]}>
      {/* Conveyor Belt Bed */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4.2, 0.2, 0.6]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Rollers */}
      {[...Array(8)].map((_, i) => (
        <mesh key={i} position={[(i - 3.5) * 0.55, -0.15, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.62, 16]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* Moving Box */}
      <mesh ref={boxRef} position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial color="#d97706" metalness={0.1} roughness={0.8} />
      </mesh>
    </group>
  );
};

// Hydraulic Pump Piston Component
const HydraulicPump: React.FC = () => {
  const pistonRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pistonRef.current) {
      pistonRef.current.position.y = (Math.sin(t * 1.5) * 0.35) + 0.35;
    }
  });

  return (
    <group position={[-0.5, -1, -2]}>
      {/* Outer Cylinder cylinder */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Moving Piston shaft */}
      <mesh ref={pistonRef} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.7, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

// CNC Laser Machine Component
const CncMachine: React.FC = () => {
  const toolHeadRef = useRef<THREE.Mesh>(null);
  const laserRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (toolHeadRef.current) {
      // Circle toolpath
      toolHeadRef.current.position.x = Math.sin(t * 2.0) * 0.4;
      toolHeadRef.current.position.z = Math.cos(t * 2.0) * 0.4;
    }
    if (laserRef.current) {
      // Glow laser intensity oscilations
      const mat = laserRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + Math.sin(t * 15.0) * 0.3;
    }
  });

  return (
    <group position={[0, -0.6, -1]}>
      {/* CNC Base/Bed */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.4, 1.5]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Overhead Gantry Girders */}
      <mesh position={[0, 0.9, -0.6]} castShadow>
        <boxGeometry args={[1.5, 0.1, 0.15]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.7, 0.45, -0.6]} castShadow>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.7, 0.45, -0.6]} castShadow>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Moving tool head */}
      <group ref={toolHeadRef} position={[0, 0.9, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#0ea5e9" metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* Laser emitter nozzle */}
        <mesh position={[0, -0.2, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.01, 0.2, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Laser glow beam */}
        <mesh ref={laserRef} position={[0, -0.7, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
};

// Floating Particles (Volumetric Dust Motes)
const FloatingParticles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 180;

  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = Math.random() * 4 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.attributes.position;
      const t = state.clock.getElapsedTime();

      for (let i = 0; i < count; i++) {
        // Slow vertical drift
        let y = posAttr.getY(i);
        y += 0.003;
        if (y > 2) {
          y = -2;
        }
        posAttr.setY(i, y);

        // Subtle side sway
        let x = posAttr.getX(i);
        x += Math.sin(t + i) * 0.001;
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#38bdf8"
        size={0.035}
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Blinking Indicator Lights
const IndicatorLights: React.FC = () => {
  const greenLightRef = useRef<THREE.Mesh>(null);
  const amberLightRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (greenLightRef.current) {
      const mat = greenLightRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(t * 6.0) * 0.5;
    }
    if (amberLightRef.current) {
      const mat = amberLightRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.cos(t * 4.0) * 0.5;
    }
  });

  return (
    <group position={[0, -0.2, -3.2]}>
      {/* Green Blinking indicator */}
      <mesh ref={greenLightRef} position={[-0.8, 0, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={1.0}
          roughness={0.1}
        />
      </mesh>
      {/* Amber Blinking indicator */}
      <mesh ref={amberLightRef} position={[0.8, 0, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={1.0}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
};

// Scene Assembler with camera parallax & lighting
const SceneWrapper: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Parallax effect from mouse position
      const targetX = state.pointer.x * 0.45;
      const targetY = state.pointer.y * 0.25;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetX, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -targetY, 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Ambient environment setup */}
      <ambientLight intensity={0.4} />
      
      {/* Volumetric spot light effect */}
      <spotLight
        position={[0, 4, 1]}
        angle={0.6}
        penumbra={0.5}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        color="#38bdf8"
      />
      <directionalLight
        position={[3, 5, -2]}
        intensity={1.5}
        castShadow
        color="#10b981"
      />
      <pointLight position={[-3, -1, 2]} intensity={0.8} color="#8b5cf6" />

      {/* Assembly of industrial machinery */}
      <RoboticArm />
      <CncMachine />
      <ElectricMotor />
      <GearSystem />
      <ConveyorSystem />
      <HydraulicPump />
      <IndicatorLights />
      <FloatingParticles />
      <Stars radius={100} depth={50} count={300} factor={4} saturation={0.5} fade speed={1} />
    </group>
  );
};

// Main Export Component
const IndustrialScene: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full z-0 select-none pointer-events-none">
      <Canvas
        camera={{ position: [0, 1.2, 5], fov: 45 }}
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Suspense fallback={null}>
          <SceneWrapper />
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            maxPolarAngle={Math.PI / 2 + 0.1} 
            minPolarAngle={Math.PI / 3}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default IndustrialScene;
