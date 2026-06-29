
import React, { useMemo } from 'react';

interface DiagnosticLoaderProps {
  elapsedSeconds: number;
}

const DiagnosticLoader: React.FC<DiagnosticLoaderProps> = ({ elapsedSeconds }) => {
  
  // Determine Phase based on time
  // Adjusted for faster 30s timeout strategy:
  // 0-8s: Upload/Compress
  // 8-18s: Fusion
  // 18-28s: Reasoning (Attempts to Think)
  // 28s+: Synthesis/Fallback
  const phase = useMemo(() => {
    if (elapsedSeconds <= 8) return 'OPTIMIZING'; 
    if (elapsedSeconds <= 18) return 'FUSION';    
    if (elapsedSeconds <= 28) return 'NEURAL';    
    return 'SYNTHESIS';                           
  }, [elapsedSeconds]);

  // --- PHASE 1: VIDEO OPTIMIZATION (Data Stream) ---
  if (phase === 'OPTIMIZING') {
    return (
      <div className="relative w-48 h-48 flex items-center justify-center perspective-1000 animate-in fade-in duration-500">
        {/* Central Core */}
        <div className="absolute w-24 h-24 bg-slate-800/80 rounded-xl border border-primary-green/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(0,255,0,0.2)]">
           <span className="material-symbols-outlined text-4xl text-white animate-pulse">videocam</span>
        </div>
        
        {/* Orbiting Data Packets */}
        <div className="absolute w-full h-full animate-spin-slow">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary-green rounded-full shadow-[0_0_10px_#00ff00]"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary-blue rounded-full shadow-[0_0_10px_#3B82F6]"></div>
        </div>
        
        {/* Compression Rings */}
        <div className="absolute w-32 h-32 border-2 border-dashed border-primary-green/50 rounded-full animate-reverse-spin"></div>
        <div className="absolute w-40 h-40 border border-primary-blue/30 rounded-full animate-ping-slow"></div>

        {/* Labels */}
        <div className="absolute -bottom-8 text-xs font-mono text-primary-green uppercase tracking-widest">
           COMPRESSING STREAM
        </div>
      </div>
    );
  }

  // --- PHASE 2: SENSOR FUSION (Waveforms & Scan) ---
  if (phase === 'FUSION') {
    return (
      <div className="relative w-64 h-48 flex items-center justify-center perspective-1000 animate-in zoom-in duration-500">
        {/* HUD Frame */}
        <div className="absolute inset-0 border-x-2 border-primary-green/30 rounded-lg"></div>
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary-green"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary-green"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary-green"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary-green"></div>

        <div className="flex items-center gap-6">
            {/* Audio Visualizer */}
            <div className="flex gap-1 items-end h-16">
                {[...Array(5)].map((_, i) => (
                    <div 
                        key={i} 
                        className="w-2 bg-primary-green rounded-sm"
                        style={{ 
                            animation: `sound-wave ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                            boxShadow: '0 0 10px rgba(0,255,0,0.5)'
                        }}
                    ></div>
                ))}
            </div>

            {/* Separator */}
            <div className="h-20 w-px bg-slate-600"></div>

            {/* Visual Scan */}
            <div className="relative w-16 h-16 border border-primary-blue/50 rounded-full flex items-center justify-center">
                <div className="absolute w-full h-full border-t-2 border-primary-blue rounded-full animate-spin"></div>
                <div className="w-10 h-10 bg-primary-blue/20 rounded-full animate-pulse"></div>
            </div>
        </div>

        <div className="absolute -bottom-8 text-xs font-mono text-primary-blue uppercase tracking-widest flex items-center gap-2">
           <span className="material-symbols-outlined text-sm animate-spin">sync</span>
           SYNCING SENSORS
        </div>
      </div>
    );
  }

  // --- PHASE 3: NEURAL PROCESSING (Atom / Deep Think) ---
  if (phase === 'NEURAL') {
    return (
      <div className="relative w-48 h-48 flex items-center justify-center preserve-3d perspective-1000 animate-in fade-in duration-700">
          {/* Core */}
          <div className="absolute w-12 h-12 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,0.6)] animate-pulse z-10 flex items-center justify-center">
             <span className="material-symbols-outlined text-black text-2xl">psychology</span>
          </div>

          {/* Electron Rings 3D */}
          <div className="holo-ring w-32 h-32 border-primary-green/60" style={{ animation: 'orbit-x 3s linear infinite' }}>
             <div className="absolute top-0 left-1/2 w-3 h-3 bg-primary-green rounded-full shadow-[0_0_10px_#00ff00]"></div>
          </div>
          
          <div className="holo-ring w-32 h-32 border-primary-blue/60" style={{ animation: 'orbit-y 4s linear infinite' }}>
             <div className="absolute bottom-0 left-1/2 w-3 h-3 bg-primary-blue rounded-full shadow-[0_0_10px_#3B82F6]"></div>
          </div>

          <div className="holo-ring w-40 h-40 border-purple-500/40" style={{ animation: 'spin 8s linear infinite reverse' }}></div>

          <div className="absolute -bottom-10 text-xs font-mono text-white uppercase tracking-widest">
           SYSTEM 2 REASONING
        </div>
      </div>
    );
  }

  // --- PHASE 4: SYNTHESIS (Blueprint Assembly) ---
  return (
    <div className="relative w-48 h-48 flex items-center justify-center animate-in zoom-in duration-500">
        {/* Base Grid */}
        <div className="absolute w-full h-full bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]"></div>
        
        {/* Holographic Cube */}
        <div className="relative w-24 h-24 border-2 border-primary-green/50 bg-primary-green/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,0,0.2)] backdrop-blur-sm">
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-white"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white"></div>
            
            <span className="material-symbols-outlined text-5xl text-primary-green animate-bounce">fact_check</span>
        </div>

        <div className="absolute -bottom-8 text-xs font-mono text-primary-green uppercase tracking-widest">
           FINALIZING REPORT
        </div>
    </div>
  );
};

export default DiagnosticLoader;
