
import React, { useMemo } from 'react';

interface VerificationLoaderProps {
  elapsedSeconds: number;
}

const VerificationLoader: React.FC<VerificationLoaderProps> = ({ elapsedSeconds }) => {
  
  // Define phases for the Verification Process (Total ~8-10s)
  const phase = useMemo(() => {
    if (elapsedSeconds <= 3) return 'TELEMETRY'; // Comparing Audio/Vibration
    if (elapsedSeconds <= 6) return 'VISUAL';    // Comparing Image Frames
    if (elapsedSeconds <= 8) return 'LOGIC';     // Calculating Delta/Improvement
    return 'FINALIZING';                         // Pass/Fail Decision
  }, [elapsedSeconds]);

  // --- PHASE 1: TELEMETRY COMPARISON (Twin Rings Merging) ---
  if (phase === 'TELEMETRY') {
    return (
      <div className="relative w-48 h-48 flex items-center justify-center perspective-1000 animate-in fade-in duration-500">
        {/* Left Ring (Baseline) */}
        <div className="absolute w-24 h-24 border-4 border-slate-600 rounded-full animate-spin-slow" style={{ left: '20%', opacity: 0.5 }}></div>
        
        {/* Right Ring (New Data) */}
        <div className="absolute w-24 h-24 border-4 border-primary-green rounded-full animate-reverse-spin" style={{ right: '20%' }}></div>
        
        {/* Central Merge Point */}
        <div className="absolute flex flex-col items-center gap-1 z-10 bg-black/50 backdrop-blur-sm p-2 rounded-lg">
            <span className="material-symbols-outlined text-3xl text-white">compare_arrows</span>
        </div>

        {/* Floating Data Particles */}
        <div className="absolute top-0 w-full flex justify-center gap-8">
             <div className="w-1 h-8 bg-slate-600 animate-pulse delay-75"></div>
             <div className="w-1 h-12 bg-primary-green animate-pulse"></div>
        </div>

        <div className="absolute -bottom-12 text-xs font-mono text-primary-green uppercase tracking-widest text-center">
           <div>COMPARING TELEMETRY</div>
           <div className="text-[10px] text-slate-400">Baseline vs. Current</div>
        </div>
      </div>
    );
  }

  // --- PHASE 2: VISUAL MATCHING (3D Scanner) ---
  if (phase === 'VISUAL') {
    return (
      <div className="relative w-48 h-48 flex items-center justify-center perspective-1000 animate-in zoom-in duration-500">
        {/* 3D Wireframe Plane */}
        <div className="absolute w-32 h-32 border border-primary-blue/30 bg-primary-blue/5 transform rotate-x-60 rounded-lg"></div>
        
        {/* Scanning Laser */}
        <div className="absolute w-40 h-2 bg-primary-green shadow-[0_0_15px_#00ff00] animate-[scan_2s_linear_infinite]"></div>

        {/* Target Points */}
        <div className="absolute top-10 left-10 w-2 h-2 bg-white rounded-full animate-ping"></div>
        <div className="absolute bottom-12 right-14 w-2 h-2 bg-white rounded-full animate-ping delay-300"></div>
        
        {/* Lens HUD */}
        <div className="absolute inset-0 border-2 border-dashed border-primary-blue/50 rounded-full animate-spin-slow"></div>

        <div className="absolute -bottom-12 text-xs font-mono text-primary-blue uppercase tracking-widest text-center">
           <div>VISUAL ALIGNMENT</div>
           <div className="text-[10px] text-slate-400">Verifying component state</div>
        </div>
      </div>
    );
  }

  // --- PHASE 3: LOGIC & DELTA CALCULATION (Computing) ---
  if (phase === 'LOGIC') {
    return (
      <div className="relative w-48 h-48 flex items-center justify-center preserve-3d perspective-1000 animate-in fade-in duration-500">
          {/* Central Processor */}
          <div className="relative w-16 h-16 bg-slate-800 border-2 border-primary-green rounded-lg flex items-center justify-center shadow-[0_0_30px_rgba(0,255,0,0.3)] animate-bounce">
             <span className="text-xl font-bold text-white">%</span>
          </div>

          {/* Orbiting Logic Gates */}
          <div className="absolute w-32 h-32 border-t-2 border-b-2 border-white/20 rounded-full animate-spin"></div>
          <div className="absolute w-40 h-40 border-l-2 border-r-2 border-primary-green/40 rounded-full animate-reverse-spin"></div>

          {/* Data Streams */}
          <div className="absolute -right-8 top-0 text-[10px] text-green-400 font-mono animate-pulse">+15%</div>
          <div className="absolute -left-8 bottom-0 text-[10px] text-green-400 font-mono animate-pulse">-2dB</div>

          <div className="absolute -bottom-12 text-xs font-mono text-white uppercase tracking-widest text-center">
           <div>CALCULATING DELTAS</div>
           <div className="text-[10px] text-slate-400">Measuring improvement</div>
        </div>
      </div>
    );
  }

  // --- PHASE 4: FINALIZING ---
  return (
    <div className="relative w-48 h-48 flex items-center justify-center animate-in zoom-in duration-300">
        <div className="relative w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center">
            <div className="w-20 h-20 bg-white/10 rounded-full animate-ping"></div>
            <span className="material-symbols-outlined text-5xl text-white animate-pulse">fact_check</span>
        </div>
        <div className="absolute -bottom-12 text-xs font-mono text-white uppercase tracking-widest text-center">
           <div>VERIFICATION COMPLETE</div>
        </div>
    </div>
  );
};

export default VerificationLoader;
