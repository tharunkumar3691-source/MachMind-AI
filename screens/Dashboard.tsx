import React, { useEffect, useState } from 'react';
import { NavigationProps, ScreenName, DEFAULT_SESSION } from '../types';
import ResponsiveNav from '../components/ResponsiveNav';
import { useTranslation } from '../contexts/LanguageContext';
import { RepairDB, getAllRepairs, deleteRepair } from '../services/db';
import { useDiagnostic } from '../contexts/DiagnosticContext';
import { useNavigation } from '../contexts/NavigationContext';
import IndustrialScene from '../components/IndustrialScene';

interface DashboardProps extends NavigationProps {
  currentScreen?: ScreenName;
}

const Dashboard: React.FC<DashboardProps> = ({ navigate, currentScreen, setSelectedId }) => {
  const { t } = useTranslation();
  const { setDiagnosticResult, setActiveRepairId } = useDiagnostic();
  const { isSidebarCollapsed } = useNavigation();
  const [repairsList, setRepairsList] = useState<RepairDB[]>([]);
  const [deletedSimulatedIds, setDeletedSimulatedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDemo, setShowDemo] = useState(false);

  // Profile session states
  const [profileName, setProfileName] = useState(DEFAULT_SESSION.name);
  const [profileTitle, setProfileTitle] = useState(DEFAULT_SESSION.title);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  // Load local session profile
  useEffect(() => {
    try {
      const saved = localStorage.getItem('machmind-ai_local_session');
      if (saved) {
        const session = JSON.parse(saved);
        if (session.name) setProfileName(session.name);
        if (session.title) setProfileTitle(session.title);
        if (session.avatar_url) setProfileAvatar(session.avatar_url);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Fetch all repairs from DB
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getAllRepairs();
        setRepairsList(data || []);
      } catch (error) {
        console.error('Error fetching repairs for dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Combine database repairs with simulated active tasks so we always have a populated active tasks section
  const getCombinedTasks = () => {
    const dbTasks = repairsList.map(r => ({
      id: r.id,
      equipment: r.equipment,
      title: r.title,
      status: r.status,
      current_step: r.current_step,
      technician_name: r.technician_name,
      created_at: r.created_at,
      diagnostic_data: r.diagnostic_data,
      isSimulated: false,
    }));

    const simulatedTasks = [
      {
        id: 9001,
        equipment: '⚙️ CNC Spindle Axis G-7',
        title: 'Spindle vibration alignment and acoustic baseline verification',
        status: 'IN_PROGRESS',
        current_step: 3,
        technician_name: 'Marcus Vance',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        diagnostic_data: undefined,
        isSimulated: true,
      },
      {
        id: 9002,
        equipment: '🛠️ Hydraulic Piston H-400',
        title: 'Check structural seal integrity and fluid pressure limits',
        status: 'VERIFICATION_NEEDED',
        current_step: 4,
        technician_name: 'Evelyn Carter',
        created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        diagnostic_data: undefined,
        isSimulated: true,
      },
      {
        id: 9003,
        equipment: '🔌 High-Torque Rotor M-90',
        title: 'Multimodal acoustic pattern detection and bearing lubrication',
        status: 'DIAGNOSED',
        current_step: 1,
        technician_name: 'David Chen',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        diagnostic_data: undefined,
        isSimulated: true,
      }
    ].filter(sim => !deletedSimulatedIds.includes(sim.id));

    // Show actual DB tasks first, then fill in with simulated tasks up to a minimum of 3
    if (dbTasks.length >= 3) {
      return dbTasks;
    }
    const combined = [...dbTasks];
    for (const sim of simulatedTasks) {
      if (combined.length < 3) {
        combined.push(sim);
      }
    }
    return combined;
  };

  // Delete task function
  const handleDeleteTask = async (repair: any) => {
    try {
      if (repair.isSimulated) {
        setDeletedSimulatedIds(prev => [...prev, repair.id]);
      } else {
        await deleteRepair(repair.id);
        setRepairsList(prev => prev.filter(r => r.id !== repair.id));
      }
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  };

  // Resume or start repair session
  const handleResumeRepair = (repair: any) => {
    if (repair.isSimulated) {
      // Find the first actual database repair to link or fallback
      const realRepair = repairsList.find(r => r.status !== 'COMPLETED');
      if (realRepair) {
        if (setSelectedId) setSelectedId(realRepair.id);
        setActiveRepairId(realRepair.id);
        if (realRepair.diagnostic_data) setDiagnosticResult(realRepair.diagnostic_data);
      }
      
      if (repair.status === 'VERIFICATION_NEEDED') {
        navigate(ScreenName.VERIFICATION_SYSTEM);
      } else if (repair.status === 'IN_PROGRESS') {
        navigate(ScreenName.AR_REPAIR_GUIDE);
      } else {
        navigate(ScreenName.RESULTS_ANALYSIS);
      }
      return;
    }

    if (setSelectedId) setSelectedId(repair.id);
    setActiveRepairId(repair.id);

    if (repair.diagnostic_data) {
      setDiagnosticResult(repair.diagnostic_data);
    }

    // Direct routing based on status
    if (repair.status === 'VERIFICATION_NEEDED') {
      navigate(ScreenName.VERIFICATION_SYSTEM);
    } else if (repair.status === 'IN_PROGRESS') {
      navigate(ScreenName.AR_REPAIR_GUIDE);
    } else {
      navigate(ScreenName.RESULTS_ANALYSIS);
    }
  };

  // Get status class/accent color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20';
      case 'VERIFICATION_NEEDED': return 'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20';
      case 'IN_PROGRESS': return 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20';
      default: return 'text-[#0ea5e9] bg-[#0ea5e9]/10 border-[#0ea5e9]/20';
    }
  };

  // Helper to determine estimated progress percentages
  const getProgressPercent = (status: string, currentStep: number) => {
    if (status === 'COMPLETED') return 100;
    if (status === 'VERIFICATION_NEEDED') return 80;
    if (status === 'IN_PROGRESS') return Math.min(30 + currentStep * 15, 75);
    return 20;
  };

  const activeTasks = getCombinedTasks();

  return (
    <div className={`relative flex h-full min-h-screen w-full flex-col bg-[#030712] text-white overflow-x-hidden transition-all duration-300 ease-in-out pb-24 md:pb-0 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
      
      {/* ─── TOP HEADER BAR ─── */}
      <div className="flex items-center justify-between p-6 pb-2 sticky top-0 z-40 bg-[#030712]/80 backdrop-blur-md border-b border-white/5">
        <h2 className="text-white tracking-tight text-xl font-bold leading-tight text-left flex items-center gap-2">
          <span className="material-symbols-outlined text-[#38bdf8]">grid_view</span>
          Command Central
        </h2>
        <button
          onClick={() => navigate(ScreenName.PROFILE)}
          className="flex items-center gap-3 hover:bg-white/5 rounded-full pr-4 p-1 transition-colors border border-white/5 bg-white/[0.01]"
        >
          <div className="h-8 w-8 bg-slate-700 rounded-full flex items-center justify-center text-white border border-[#38bdf8] overflow-hidden">
            {profileAvatar ? (
              <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-sm">person</span>
            )}
          </div>
          <div className="text-right hidden lg:block">
            <p className="text-xs font-bold text-white leading-none">{profileName}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{profileTitle}</p>
          </div>
        </button>
      </div>

      {/* ─── 3D HERO SECTION ─── */}
      <section className="relative w-full h-[85vh] flex flex-col justify-center items-center px-6 relative z-10 border-b border-white/5">
        {/* Interactive 3D Canvas Scene Background */}
        <IndustrialScene />

        {/* Ambient Dark Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/50 via-transparent to-[#030712]/50 pointer-events-none"></div>

        {/* 3D Floating Information Cards Overlay */}
        <div className="absolute inset-x-0 top-12 max-w-7xl mx-auto hidden lg:flex justify-between px-6 pointer-events-none">
          {/* Card Left */}
          <div className="backdrop-blur-md bg-black/40 border border-white/10 rounded-xl p-4 shadow-xl w-60 space-y-3 animate-[float_6s_ease-in-out_infinite] self-start pointer-events-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#38bdf8] tracking-widest font-semibold uppercase">AI DIAGNOSIS</span>
              <span className="size-2 rounded-full bg-[#10b981] animate-pulse"></span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Hydraulic Pump Valve leak</h4>
              <p className="text-[11px] text-slate-400 mt-1">Vibration amplitude out of spec.</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#10b981] font-mono">
              <span className="material-symbols-outlined text-sm">verified</span>
              98.2% Confidence
            </div>
          </div>

          {/* Card Right */}
          <div className="backdrop-blur-md bg-black/40 border border-white/10 rounded-xl p-4 shadow-xl w-60 space-y-3 animate-[float_8s_ease-in-out_infinite_1s] self-end pointer-events-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#8b5cf6] tracking-widest font-semibold uppercase">AR GUIDANCE HUD</span>
              <span className="material-symbols-outlined text-[#8b5cf6] text-xs">view_in_ar</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Lock Alignment</span>
                <span className="text-[#8b5cf6] font-mono">OK</span>
              </div>
              <div className="h-1 bg-white/10 rounded overflow-hidden">
                <div className="h-full bg-[#8b5cf6] w-5/6"></div>
              </div>
            </div>
            <p className="text-[10px] font-mono text-slate-400 text-center">Projecting holographic assembly vectors.</p>
          </div>
        </div>

        {/* Hero Central Content */}
        <div className="relative z-10 text-center max-w-3xl space-y-6 pt-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
            <span className="material-symbols-outlined text-[#38bdf8] text-sm">precision_manufacturing</span>
            ENTERPRISE INDUSTRIAL AUTOMATION
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none font-display">
            Diagnose. Repair. Verify. <br />
            <span className="bg-gradient-to-r from-[#38bdf8] via-[#0ea5e9] to-[#8b5cf6] bg-clip-text text-transparent">
              Powered by AI + AR.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            AI-powered industrial maintenance using computer vision, multimodal reasoning, and interactive augmented reality.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate(ScreenName.DIAGNOSTIC_CAPTURE)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] text-black font-bold text-sm tracking-wide shadow-[0_4px_20px_rgba(56,189,248,0.25)] hover:shadow-[0_4px_30px_rgba(56,189,248,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Start Inspection
            </button>
            <button
              onClick={() => setShowDemo(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">play_circle</span>
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* ─── ACTIVE TASKS SECTION ─── */}
      <section className="max-w-7xl mx-auto px-6 py-20 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold tracking-tight">Active Tasks</h2>
            <p className="text-sm text-slate-400">Live maintenance operations connected directly to Aurora PG.</p>
          </div>
          <div>
            {/* BIG PROMINENT NEW SCAN BUTTON */}
            <button
              onClick={() => navigate(ScreenName.DIAGNOSTIC_CAPTURE)}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] hover:from-[#0ea5e9] hover:to-[#38bdf8] text-black font-bold text-sm tracking-wide shadow-[0_4px_25px_rgba(56,189,248,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">biotech</span>
              New Diagnostic Scan
            </button>
          </div>
        </div>

        {/* Task Cards Grid */}
        {loading ? (
          <div className="w-full py-12 flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTasks.map((repair) => {
              const progress = getProgressPercent(repair.status, repair.current_step);
              return (
                <div 
                  key={repair.id} 
                  className="backdrop-blur-md bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-white/15 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6 transition-all duration-300"
                >
                  <div className="space-y-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-base text-white tracking-tight">{repair.equipment}</h4>
                        <p className="text-xs text-slate-400 mt-1">{repair.title}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${getStatusColor(repair.status)}`}>
                        {repair.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Progress indicator */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] transition-all duration-500" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-2 text-xs border-t border-white/5">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Technician</div>
                        <div className="text-slate-300 font-medium truncate">{repair.technician_name}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Priority</div>
                        <div className="text-slate-300 font-medium">HIGH</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Last Updated</div>
                        <div className="text-slate-300 font-mono">{new Date(repair.created_at).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Est. Completion</div>
                        <div className="text-slate-300 font-mono">4 Hours</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions inside card */}
                  <div className="pt-4 border-t border-white/5 flex gap-3">
                    <button
                      onClick={() => handleResumeRepair(repair)}
                      className="flex-grow py-2.5 rounded-lg bg-white hover:bg-slate-100 text-black text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-xs">verified</span>
                      Start Verification
                    </button>
                    <button
                      onClick={() => handleDeleteTask(repair)}
                      className="px-3 py-2.5 rounded-lg border border-red-500/30 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all flex items-center justify-center"
                      title="Delete Active Task"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section className="max-w-7xl mx-auto px-6 py-20 w-full border-t border-white/5 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Enterprise Features</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">High-performance digital tools designed for reliable heavy industry diagnostic workflows.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="backdrop-blur-md bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-[#38bdf8]/30 rounded-2xl p-6 transition-all duration-300 space-y-4">
            <div className="size-10 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center">
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <h3 className="text-base font-bold">AI Diagnosis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accelerate repair operations with Gemini-powered vision models that instantly extract equipment faults from telemetry images and logs.
            </p>
          </div>

          {/* Card 2 */}
          <div className="backdrop-blur-md bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-[#38bdf8]/30 rounded-2xl p-6 transition-all duration-300 space-y-4">
            <div className="size-10 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center">
              <span className="material-symbols-outlined">view_in_ar</span>
            </div>
            <h3 className="text-base font-bold">AR Repair Guidance</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Step-by-step augmented HUD projection guides technicians through complex mechanical disassemblies in real-time.
            </p>
          </div>

          {/* Card 3 */}
          <div className="backdrop-blur-md bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-[#38bdf8]/30 rounded-2xl p-6 transition-all duration-300 space-y-4">
            <div className="size-10 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center">
              <span className="material-symbols-outlined">timeline</span>
            </div>
            <h3 className="text-base font-bold">Predictive Maintenance</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Acoustic monitoring and mechanical frequency pattern analysis warn of failure points before they trigger downtime.
            </p>
          </div>

          {/* Card 4 */}
          <div className="backdrop-blur-md bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-[#38bdf8]/30 rounded-2xl p-6 transition-all duration-300 space-y-4">
            <div className="size-10 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center">
              <span className="material-symbols-outlined">history_edu</span>
            </div>
            <h3 className="text-base font-bold">Machine History</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Chronological log history of previous repair attempts, database migrations, and diagnostic logs preserved on postgres.
            </p>
          </div>

          {/* Card 5 */}
          <div className="backdrop-blur-md bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-[#38bdf8]/30 rounded-2xl p-6 transition-all duration-300 space-y-4">
            <div className="size-10 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center">
              <span className="material-symbols-outlined">verified_user</span>
            </div>
            <h3 className="text-base font-bold">Repair Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Double-check repair results via structured validation checklists to certify that equipment is fully cleared for startup.
            </p>
          </div>

          {/* Card 6 */}
          <div className="backdrop-blur-md bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-[#38bdf8]/30 rounded-2xl p-6 transition-all duration-300 space-y-4">
            <div className="size-10 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center">
              <span className="material-symbols-outlined">cloud_sync</span>
            </div>
            <h3 className="text-base font-bold">Cloud Storage</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Attachments, audio reports, and mechanical photos are pushed securely to isolated Amazon S3 buckets.
            </p>
          </div>

          {/* Card 7 */}
          <div className="backdrop-blur-md bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-[#38bdf8]/30 rounded-2xl p-6 transition-all duration-300 space-y-4">
            <div className="size-10 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <h3 className="text-base font-bold">Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detailed operations logs, confidence metric histories, and resolution distributions for plant-wide auditing.
            </p>
          </div>

          {/* Card 8 */}
          <div className="backdrop-blur-md bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-[#38bdf8]/30 rounded-2xl p-6 transition-all duration-300 space-y-4">
            <div className="size-10 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center">
              <span className="material-symbols-outlined">chat_bubble</span>
            </div>
            <h3 className="text-base font-bold">Expert Chat</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect technicians with senior off-site industrial specialists via secure text, voice, and snapshot streams.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FOOTER SECTION ─── */}
      <footer className="w-full border-t border-white/5 py-12 bg-black/40 text-center text-xs text-slate-500 font-mono mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>© 2026 MachMind AI. Fully Certified Enterprise diagnostic platform.</div>
          <div className="flex gap-4">
            <span className="hover:text-white transition-colors">Vercel Ready</span>
            <span>•</span>
            <span className="hover:text-white transition-colors">Auth.js Express</span>
          </div>
        </div>
      </footer>

      {/* ─── VIDEO DEMO MODAL ─── */}
      {showDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-card-dark border border-white/10 rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">MachMind AI Operation Demonstration</h3>
              <button 
                onClick={() => setShowDemo(false)}
                className="size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {/* Embedded mockup video screen */}
            <div className="aspect-video w-full rounded-xl bg-black border border-white/5 flex flex-col justify-center items-center p-8 text-center space-y-4 relative overflow-hidden">
              {/* Fake visual scanning graphics overlay */}
              <div className="absolute top-1/4 left-1/4 size-36 border border-dashed border-[#38bdf8]/30 rounded-full animate-spin"></div>
              <div className="absolute bottom-1/4 right-1/4 size-44 border border-dashed border-[#8b5cf6]/30 rounded-full animate-spin"></div>
              
              <span className="material-symbols-outlined text-[#38bdf8] text-5xl animate-pulse">radar</span>
              <div>
                <p className="text-sm font-semibold">Loading High-Fidelity AR Simulator...</p>
                <p className="text-xs text-slate-500 mt-1">Simulating computer vision overlay on a CNC Machine and Hydraulic Pump.</p>
              </div>
              <div className="text-[10px] font-mono text-[#10b981] bg-[#10b981]/15 px-3 py-1 rounded-full">
                PIPELINE STATUS: ONLINE (90 FPS)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation elements */}
      <ResponsiveNav navigate={navigate} currentScreen={currentScreen || ScreenName.DASHBOARD} />
    </div>
  );
};

export default Dashboard;
