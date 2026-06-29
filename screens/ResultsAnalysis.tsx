
import React, { useState, useEffect, useRef } from 'react';
import { NavigationProps, ScreenName, DiagnosticLog } from '../types';
import { useDiagnostic } from '../contexts/DiagnosticContext';
import { useTranslation } from '../contexts/LanguageContext';
import { RepairDB, getRepairById, createRepair, updateRepairStatus } from '../services/db';
import { analyzeDiagnosticVideo, blobToBase64 } from '../services/gemini';
import { DEFAULT_SESSION } from '../types';
import DiagnosticLoader from '../components/DiagnosticLoader';

const ResultsAnalysis: React.FC<NavigationProps> = ({ navigate, selectedId, setSelectedId }) => {
  const { t, language } = useTranslation();

  const [expanded, setExpanded] = useState(true);
  const { videoBlob, mimeType, setDiagnosticResult, setActiveRepairId, telemetryData } = useDiagnostic();
  const [analyzing, setAnalyzing] = useState(false);
  
  // Store translation KEY instead of evaluated string to allow dynamic updates
  const [loadingMessageKey, setLoadingMessageKey] = useState("resultsAnalysis.loading.thinking");
  
  // Track elapsed seconds for the 3D Loader
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Use boolean for error state, render content with t()
  const [isAnalysisError, setIsAnalysisError] = useState(false);
  const [dbSaveError, setDbSaveError] = useState<boolean>(false);
  
  // State for fetched repair data if viewing history
  const [dbRepair, setDbRepair] = useState<RepairDB | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);

  // Live Analysis Data
  const [liveAnalysis, setLiveAnalysis] = useState<DiagnosticLog | null>(null);
  const loadingTimerRef = useRef<number | null>(null);

  // Derived state to prevent "flash" of empty results before analysis hook fires
  const shouldShowLoading = analyzing || (!!videoBlob && !selectedId && !liveAnalysis && !isAnalysisError);

  // Sync Text with Timer via useEffect to ensure frame-perfect synchronization with DiagnosticLoader
  useEffect(() => {
      // Logic must strictly match DiagnosticLoader.tsx phases:
      // OPTIMIZING: <= 8s
      // FUSION: <= 18s
      // NEURAL: <= 28s
      // SYNTHESIS: > 28s
      
      if (elapsedSeconds <= 8) setLoadingMessageKey("resultsAnalysis.loading.temporal");
      else if (elapsedSeconds <= 18) setLoadingMessageKey("resultsAnalysis.loading.audioVisual");
      else if (elapsedSeconds <= 28) setLoadingMessageKey("resultsAnalysis.loading.system2");
      else setLoadingMessageKey("resultsAnalysis.loading.finalizing");
      
  }, [elapsedSeconds]);

  useEffect(() => {
    // 1. HISTORICAL / RESUME MODE: Fetch from Database
    if (selectedId) {
        const fetchRepair = async () => {
            setLoadingDb(true);
            const data = await getRepairById(Number(selectedId));
            
            if (data) {
                setDbRepair(data);
                if (data.diagnostic_data) {
                    setLiveAnalysis(data.diagnostic_data);
                    setDiagnosticResult(data.diagnostic_data);
                }
                if (data.status === 'IN_PROGRESS' || data.status === 'DIAGNOSED') {
                    setActiveRepairId(data.id);
                }
            }
            setLoadingDb(false);
        };
        fetchRepair();
    } 
    // 2. LIVE ANALYSIS MODE: Send video blob to Gemini
    else if (videoBlob && !liveAnalysis && !analyzing) {
        const performAnalysis = async () => {
            setAnalyzing(true);
            setIsAnalysisError(false);
            setDbSaveError(false);
            setElapsedSeconds(0);
            
            // Start the timer for animations
            loadingTimerRef.current = window.setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);

            try {
                console.log("Starting analysis on video...", mimeType);
                const base64 = await blobToBase64(videoBlob);
                
                // Pass telemetry data for Sensor Fusion
                const result = await analyzeDiagnosticVideo(base64, mimeType, language, telemetryData);
                
                console.log("Analysis complete:", result);
                
                setLiveAnalysis(result);
                setDiagnosticResult(result); 

                try {
                    // Use local session for technician name
                    let techName = DEFAULT_SESSION.name;
                    try {
                        const saved = localStorage.getItem('machmind-ai_local_session');
                        if (saved) { const s = JSON.parse(saved); if (s.name) techName = s.name; }
                    } catch (_) {}

                    const newRepair = await createRepair({
                        user_id: 'local-user',
                        title: result.hypothesis || t('resultsAnalysis.newDiagnosis'),
                        equipment: result.equipmentName || t('resultsAnalysis.unidentified'), 
                        status: 'DIAGNOSED',
                        current_step: 0,
                        technician_name: techName,
                        diagnostic_data: result
                    });
                    
                    if (newRepair) {
                        setActiveRepairId(newRepair.id);
                        if (setSelectedId) setSelectedId(newRepair.id); 
                        setDbRepair(newRepair); // Update local state
                    }
                } catch (dbEx) {
                    console.error("Failed to save to DB:", dbEx);
                    setDbSaveError(true);
                }

            } catch (error) {
                console.error("Analysis failed:", error);
                setIsAnalysisError(true);
            } finally {
                setAnalyzing(false);
                if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
            }
        };
        performAnalysis();
    }

    return () => {
        if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    };
  }, [selectedId, videoBlob, language, telemetryData]);

  const handleRetry = () => {
      // If we have an ID, we pass it to capture to update the existing record
      if (selectedId) {
          navigate(ScreenName.DIAGNOSTIC_CAPTURE);
      } else {
          navigate(ScreenName.DIAGNOSTIC_CAPTURE);
      }
  };

  const handleStartRepair = async () => {
      // Transition status to IN_PROGRESS
      if (dbRepair && dbRepair.status === 'DIAGNOSED') {
          await updateRepairStatus(dbRepair.id, 'IN_PROGRESS');
      }
      navigate(ScreenName.AR_REPAIR_GUIDE);
  };

  const handleSaveAndExit = () => {
      navigate(ScreenName.DASHBOARD);
  };

  const handleVerification = () => {
      navigate(ScreenName.VERIFICATION_SYSTEM);
  };

  const activeData: DiagnosticLog = liveAnalysis || {
      observation: t('resultsAnalysis.fallback.observation'),
      hypothesis: dbRepair?.title || t('resultsAnalysis.diagnosis'),
      verification: `${t('resultsAnalysis.fallback.verification')} ${(dbRepair?.technician_name || "Unknown")}`,
      prescription: t('resultsAnalysis.fallback.prescription'),
      confidenceScore: 92,
      steps: [
        { id: 1, title: t('resultsAnalysis.step1'), time: '15 mins', tools: 'Wrench Set, Seal Puller', requiresAR: false },
        { id: 2, title: t('resultsAnalysis.step2'), time: '30 mins', tools: 'Socket Set, Pry Bar', requiresAR: true },
        { id: 3, title: t('resultsAnalysis.step3'), time: '25 mins', tools: 'Seal Kit P/N 582-A', requiresAR: true },
      ],
      safetyWarning: {
          title: t('resultsAnalysis.criticalWarning'),
          description: t('resultsAnalysis.safetyPrecaution')
      },
      references: [
          { type: 'MANUAL', title: 'GX-500 Service Manual', details: 'Section 4.2 - Shaft Seal Replacement' },
          { type: 'HISTORY', title: 'Maintenance Log #8842', details: 'Similiar failure noted 3 months ago' }
      ]
  };

  const diagnosisTitle = liveAnalysis ? liveAnalysis.hypothesis : (dbRepair ? dbRepair.title : t('resultsAnalysis.diagnosis'));
  const equipmentName = liveAnalysis?.equipmentName || (dbRepair ? dbRepair.equipment : t('resultsAnalysis.identified'));

  // Defensively calculate confidence to avoid "0.9%" display
  const displayConfidence = (activeData.confidenceScore && activeData.confidenceScore <= 1)
      ? Math.round(activeData.confidenceScore * 100) 
      : Math.round(activeData.confidenceScore || 0);

  if (loadingDb) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background-dark text-primary-green">
            <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
        </div>
      );
  }

  if (isAnalysisError && !analyzing && !liveAnalysis) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background-dark p-6 text-center">
            <div className="size-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-red-500">error_outline</span>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">{t('resultsAnalysis.error.title')}</h2>
            <p className="text-slate-400 max-w-xs mb-8">{t('resultsAnalysis.error.message')}</p>
            <button 
                onClick={handleRetry}
                className="px-6 py-3 bg-primary-green text-black font-bold rounded-lg hover:bg-green-400 transition-colors"
            >
                {t('resultsAnalysis.error.tryAgain')}
            </button>
        </div>
      );
  }

  return (
    <div className="relative flex h-screen w-full flex-col bg-background-dark font-display overflow-hidden">
      <header className="flex-none flex items-center justify-between bg-background-dark/95 p-4 backdrop-blur-sm border-b border-white/5 z-20">
        <button 
          onClick={handleSaveAndExit}
          className="flex size-10 shrink-0 items-center justify-center text-white hover:bg-white/10 rounded-full"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-bold leading-tight tracking-[-0.015em] text-white">{t('resultsAnalysis.title')}</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-2 pb-32 scrollbar-hide">
        
        {shouldShowLoading && (
             <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in fade-in duration-500 min-h-[50vh]">
                
                {/* Replaced spinner with 3D Holographic Loader */}
                <DiagnosticLoader elapsedSeconds={elapsedSeconds} />

                <div className="text-center max-w-xs mx-auto">
                    <h3 className="text-white text-xl font-bold tracking-tight mb-2 animate-pulse">
                        {t(loadingMessageKey)}
                    </h3>
                    <p className="text-slate-400 text-sm">{t('resultsAnalysis.loading.wait')}</p>
                </div>
             </div>
        )}

        {dbSaveError && !shouldShowLoading && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg mb-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="material-symbols-outlined text-yellow-500">cloud_off</span>
                <p className="text-sm text-yellow-200">{t('resultsAnalysis.dbError')}</p>
            </div>
        )}

        {!shouldShowLoading && videoBlob && !selectedId && (
            <div className="flex items-center gap-2 mb-2 px-1">
                <span className="flex size-2 rounded-full bg-primary-green animate-pulse"></span>
                <p className="text-xs text-primary-green uppercase font-bold tracking-wider">{t('resultsAnalysis.videoSource')}</p>
            </div>
        )}
        
        {selectedId && (
            <div className="flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-slate-400">history</span>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t('resultsAnalysis.record')} #{selectedId}</p>
                </div>
                {dbRepair?.status && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        dbRepair.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                        dbRepair.status === 'VERIFICATION_NEEDED' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                        {dbRepair.status.replace('_', ' ')}
                    </span>
                )}
            </div>
        )}

        {!shouldShowLoading && (
        <>
            <section className="mt-4 rounded-xl bg-card-dark p-5 border border-white/5 shadow-lg">
                <div className="flex items-center gap-5">
                    <div className="relative flex size-20 items-center justify-center">
                        <svg className="size-full -rotate-90 transform" viewBox="0 0 36 36">
                            <circle className="stroke-current text-primary-blue/20" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                            <circle 
                                className="stroke-current text-primary-blue transition-all duration-1000 ease-out" 
                                cx="18" cy="18" fill="none" r="16" 
                                strokeDasharray="100" 
                                strokeDashoffset={100 - displayConfidence} 
                                strokeLinecap="round"
                                strokeWidth="3"
                            ></circle>
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-bold text-white">{displayConfidence}%</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{t('resultsAnalysis.confidenceScore')}</p>
                        <h2 className="text-xl font-bold leading-tight text-white mt-1">{diagnosisTitle}</h2>
                        <p className="text-sm text-primary-blue font-mono mt-1">{equipmentName}</p>
                    </div>
                </div>

                {/* --- SENSOR FUSION VISUALIZATION --- */}
                {telemetryData && !selectedId && (
                    <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-3 gap-2">
                        <div className="bg-black/20 p-2 rounded-lg text-center">
                            <span className="material-symbols-outlined text-primary-green text-sm mb-1">graphic_eq</span>
                            <p className="text-[10px] text-slate-400 uppercase">{t('resultsAnalysis.audioPeak')}</p>
                            <p className="text-white font-mono font-bold text-sm">{telemetryData.peakFrequency} Hz</p>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg text-center">
                            <span className="material-symbols-outlined text-primary-blue text-sm mb-1">vibration</span>
                            <p className="text-[10px] text-slate-400 uppercase">{t('resultsAnalysis.vibration')}</p>
                            <p className="text-white font-mono font-bold text-sm">{telemetryData.maxVibration} g</p>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg text-center">
                            <span className="material-symbols-outlined text-amber-500 text-sm mb-1">volume_up</span>
                            <p className="text-[10px] text-slate-400 uppercase">{t('resultsAnalysis.amplitude')}</p>
                            <p className="text-white font-mono font-bold text-sm">{telemetryData.avgDecibels} dB</p>
                        </div>
                    </div>
                )}
            </section>

            {/* Critical Warning Card - Enhanced Impact */}
            {activeData.safetyWarning && (
                <section className="mt-4 rounded-xl bg-red-500/10 p-4 border border-red-500/50 flex gap-4 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 shrink-0">
                        <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
                    </div>
                    <div>
                        <h3 className="text-red-500 font-bold uppercase tracking-wide text-sm mb-1">{activeData.safetyWarning.title}</h3>
                        <p className="text-white text-sm font-medium leading-relaxed">{activeData.safetyWarning.description}</p>
                    </div>
                </section>
            )}

            {/* Deep Think Reasoning - Expandable */}
            <section className="mt-4 rounded-xl bg-card-dark border border-white/5 overflow-hidden">
                <button 
                    onClick={() => setExpanded(!expanded)}
                    className="flex w-full items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-green">psychology</span>
                        <h3 className="font-bold text-white">{t('resultsAnalysis.reasoningChain')}</h3>
                    </div>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                
                {expanded && (
                    <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2">
                        <div className="relative pl-4 ml-2 border-l-2 border-primary-green/30 space-y-4">
                            <div className="relative">
                                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-slate-800 border-2 border-primary-green"></div>
                                <p className="text-xs text-primary-green font-bold uppercase mb-1">{t('resultsAnalysis.observation')}</p>
                                <p className="text-slate-200 text-sm leading-relaxed">{activeData.observation}</p>
                            </div>
                            <div className="relative">
                                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-slate-800 border-2 border-primary-blue"></div>
                                <p className="text-xs text-primary-blue font-bold uppercase mb-1">{t('resultsAnalysis.logic')}</p>
                                <p className="text-slate-200 text-sm leading-relaxed">{activeData.verification}</p>
                            </div>
                            <div className="relative">
                                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-slate-800 border-2 border-white/50"></div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">{t('resultsAnalysis.prescription')}</p>
                                <p className="text-white text-sm leading-relaxed font-medium">{activeData.prescription}</p>
                            </div>
                        </div>

                        {/* Google Search Grounding Sources */}
                        {activeData.searchSources && activeData.searchSources.length > 0 && (
                             <div className="mt-4 pt-3 border-t border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="size-4 rounded-full bg-white p-0.5">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="G" className="w-full h-full object-contain" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase">{t('resultsAnalysis.searchGrounding')}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {activeData.searchSources.map((source, idx) => (
                                        <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-xs bg-black/20 p-2 rounded border border-white/5 hover:bg-white/5 transition-colors group">
                                            <span className="text-primary-blue truncate flex-1">{source.title}</span>
                                            <span className="material-symbols-outlined text-[12px] text-slate-500 group-hover:text-white">open_in_new</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* References / Grounding */}
                        {activeData.references && activeData.references.length > 0 && !activeData.searchSources && (
                            <div className="mt-4 pt-3 border-t border-white/5">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">{t('resultsAnalysis.knowledgeSources')}</p>
                                <div className="flex flex-col gap-2">
                                    {activeData.references.map((ref, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs bg-black/20 p-2 rounded border border-white/5">
                                            <span className="material-symbols-outlined text-[14px] text-primary-blue mt-0.5">
                                                {ref.type === 'MANUAL' ? 'menu_book' : ref.type === 'HISTORY' ? 'history' : 'public'}
                                            </span>
                                            <div>
                                                <span className="text-primary-blue font-bold mr-1">{ref.type}:</span>
                                                <span className="text-slate-300">{ref.title}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Repair Steps */}
            <section className="mt-6 mb-8">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-lg font-bold text-white">{t('resultsAnalysis.repairSteps')}</h3>
                </div>
                
                <div className="space-y-3">
                    {activeData.steps.map((step, idx) => (
                        <div key={step.id} className="group relative flex gap-4 rounded-xl bg-card-dark p-4 border border-white/5 hover:border-primary-green/50 transition-all">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white group-hover:bg-primary-green group-hover:text-black transition-colors">
                                {idx + 1}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-white text-base">{step.title}</h4>
                                <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                        {step.time}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">build</span>
                                        {step.tools}
                                    </div>
                                    {/* Visual AR Indicator */}
                                    <div className={`flex items-center gap-1 ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${step.requiresAR !== false ? 'bg-primary-green/10 text-primary-green border border-primary-green/20' : 'bg-slate-700/50 text-slate-500'}`}>
                                        <span className="material-symbols-outlined text-[12px]">
                                            {step.requiresAR !== false ? 'view_in_ar' : 'format_list_bulleted'}
                                        </span>
                                        {step.requiresAR !== false ? t('resultsAnalysis.arGuided') : t('resultsAnalysis.manual')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </>
        )}
      </main>

      {!shouldShowLoading && (
      <footer className="flex-none bg-card-dark p-4 pb-6 border-t border-white/5 z-20">
         
         {(!dbRepair || dbRepair.status === 'DIAGNOSED' || dbRepair.status === 'IN_PROGRESS') ? (
             <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                    <button 
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                        onClick={handleSaveAndExit}
                    >
                        <span className="material-symbols-outlined">save</span>
                        {t('resultsAnalysis.saveLater')}
                    </button>
                    <button 
                        onClick={handleStartRepair}
                        className="flex-[2] bg-primary-green hover:bg-green-400 text-black font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">view_in_ar</span>
                        {dbRepair?.status === 'IN_PROGRESS' ? t('resultsAnalysis.resumeRepair') : t('resultsAnalysis.startRepair')}
                    </button>
                </div>
                <button 
                    onClick={handleRetry}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-300 font-bold hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
                >
                    <span className="material-symbols-outlined">refresh</span>
                    {t('resultsAnalysis.error.tryAgain')}
                </button>
             </div>
         ) : dbRepair.status === 'VERIFICATION_NEEDED' ? (
             <button 
                onClick={handleVerification}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
             >
                <span className="material-symbols-outlined">fact_check</span>
                {t('resultsAnalysis.verifyRepair')}
             </button>
         ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center justify-center gap-2 text-green-400 font-bold">
                 <span className="material-symbols-outlined">check_circle</span>
                 {t('resultsAnalysis.repairCompleted')}
            </div>
         )}
      </footer>
      )}
    </div>
  );
};

export default ResultsAnalysis;
