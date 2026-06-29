
import React, { useState, useEffect, useRef } from 'react';
import { NavigationProps, ScreenName, ARCoordinate } from '../types';
import { useDiagnostic } from '../contexts/DiagnosticContext';
import { getPartCoordinates, generateGhostOverlay, blobToBase64, chatWithSiteExpert } from '../services/gemini';
import { useTranslation } from '../contexts/LanguageContext';
import { updateRepairStatus } from '../services/db';
import ResponsiveNav from '../components/ResponsiveNav';
import { useNavigation } from '../contexts/NavigationContext';

const ARRepairGuide: React.FC<NavigationProps> = ({ navigate, selectedId }) => {
  const { videoBlob, diagnosticResult } = useDiagnostic();
  const { t, language } = useTranslation();
  const { isSidebarCollapsed } = useNavigation();
  
  // AR State
  const [arCoordinates, setArCoordinates] = useState<ARCoordinate[]>([]);
  const [ghostOverlay, setGhostOverlay] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<ARCoordinate | null>(null);
  const [verifiedPartIds, setVerifiedPartIds] = useState<Set<string>>(new Set());
  
  // Layout & View State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loadingAR, setLoadingAR] = useState(false);
  const [loadingGhost, setLoadingGhost] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [ghostOpacity, setGhostOpacity] = useState(0.7); 
  
  // Camera & Image State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [baseImage, setBaseImage] = useState<string | null>(null); 
  const [cameraError, setCameraError] = useState<string | null>(null);

  // AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Default steps fallback
  const steps = diagnosticResult?.steps || [
      { id: 1, title: "Identify main housing unit", time: "5m", tools: "Visual", requiresAR: true },
      { id: 2, title: "Locate safety valve", time: "2m", tools: "None", requiresAR: false }
  ];

  const currentStep = steps[currentStepIndex] || steps[0] || { id: 1, title: "", time: "", tools: "", requiresAR: false };
  
  const isARRequired = currentStep.requiresAR !== false;

  useEffect(() => {
    if (isARRequired && !baseImage) {
        startCamera();
    } else {
        stopCamera();
    }
    return () => stopCamera();
  }, [baseImage, currentStepIndex, isARRequired]);

  useEffect(() => {
    if (isARRequired && baseImage && currentStep) {
        runAnalysis(baseImage);
    }
  }, [baseImage, currentStepIndex]); 

  useEffect(() => {
      setBaseImage(null);
      setArCoordinates([]);
      setGhostOverlay(null);
      setSelectedPart(null);
  }, [currentStepIndex]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  const startCamera = async () => {
      try {
          const ms = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
          });
          setStream(ms);
          if (videoRef.current) {
              videoRef.current.srcObject = ms;
          }
          setCameraError(null);
      } catch (e) {
          console.error("Camera access failed", e);
          setCameraError(t('ar.cameraUnavailable'));
      }
  };

  const stopCamera = () => {
      if (stream) {
          stream.getTracks().forEach(t => t.stop());
          setStream(null);
      }
  };

  // Helper: Resize image to max 800px width for faster processing
  const resizeImage = (dataUrl: string, maxWidth: number = 800): Promise<string> => {
      return new Promise((resolve) => {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const ratio = maxWidth / img.width;
              // If image is smaller, don't resize
              if (img.width <= maxWidth) {
                  resolve(dataUrl);
                  return;
              }
              
              canvas.width = maxWidth;
              canvas.height = img.height * ratio;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  resolve(canvas.toDataURL('image/jpeg', 0.8));
              } else {
                  resolve(dataUrl);
              }
          };
      });
  };

  const captureFrame = async (): Promise<string | null> => {
      if (!videoRef.current) return null;
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          return await resizeImage(canvas.toDataURL('image/jpeg', 0.9));
      }
      return null;
  };

  const handleCapture = async () => {
      const optimizedImage = await captureFrame();
      if (optimizedImage) {
           const img = new Image();
           img.src = optimizedImage;
           img.onload = () => {
                setImageAspectRatio(img.width / img.height);
           };
           setBaseImage(optimizedImage);
      }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = async (e) => {
              if (e.target?.result) {
                  const img = new Image();
                  img.onload = () => {
                      setImageAspectRatio(img.width / img.height);
                  };
                  img.src = e.target.result as string;
                  
                  const optimized = await resizeImage(e.target.result as string);
                  setBaseImage(optimized);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const runAnalysis = async (imageBase64Url: string) => {
      setLoadingAR(true);
      setLoadingGhost(true); // Ghost starts loading but doesn't block AR
      
      const base64Data = imageBase64Url.split(',')[1];
      
      // 1. FAST: Get Coordinates immediately
      try {
          const coords = await getPartCoordinates(base64Data, currentStep.title, language);
          setArCoordinates(coords);
      } catch (err) {
          console.error("AR Analysis failed", err);
      } finally {
          setLoadingAR(false);
      }

      // 2. SLOW: Generate Ghost Overlay in background
      try {
          const ghost = await generateGhostOverlay(base64Data, currentStep.title, language);
          if (ghost) setGhostOverlay(`data:image/jpeg;base64,${ghost}`);
      } catch (err) {
          console.warn("Ghost generation skipped", err);
      } finally {
          setLoadingGhost(false);
      }
  };

  const handleNext = () => {
      if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
      } else {
             updateRepairStatus(Number(selectedId), 'VERIFICATION_NEEDED', steps.length).then();
          navigate(ScreenName.VERIFICATION_SYSTEM);
      }
  };

  const handlePartClick = (coord: ARCoordinate) => {
      setSelectedPart(coord);
  };
  
  const handleVerifyPart = () => {
      if (selectedPart) {
          setVerifiedPartIds(prev => new Set(prev).add(selectedPart.id));
          setSelectedPart(null);
      }
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim()) return;
      
      const newMessage = { role: 'user' as const, text: chatInput };
      setChatMessages(prev => [...prev, newMessage]);
      setChatInput("");
      setIsChatLoading(true);

      try {
        // We need a base64 image context. If we are in "frozen" mode (baseImage), use that.
        // If we are in live camera mode, capture a frame silently.
        let imageContext = baseImage;
        if (!imageContext && videoRef.current) {
            imageContext = await captureFrame();
        }

        if (imageContext) {
           const base64 = imageContext.split(',')[1];
           // Pass formatted history
           const history = chatMessages.map(m => ({ role: m.role, text: m.text }));
           
           const response = await chatWithSiteExpert(base64, history, newMessage.text, language);
           
           setChatMessages(prev => [...prev, { role: 'model', text: response }]);
        } else {
           setChatMessages(prev => [...prev, { role: 'model', text: t('ar.cameraNeeded') }]);
        }
      } catch(e) {
          console.error("Chat error", e);
          setChatMessages(prev => [...prev, { role: 'model', text: t('ar.connectionIssues') }]);
      } finally {
          setIsChatLoading(false);
      }
  };

  return (
    <div className={`relative flex h-full min-h-screen w-full flex-col bg-black font-display overflow-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
      
      {/* Custom Styles for AR Pulse */}
      <style>
        {`
          @keyframes breathe {
            0% { box-shadow: 0 0 5px rgba(0,255,0,0.4); border-color: rgba(0,255,0,0.6); }
            50% { box-shadow: 0 0 15px rgba(0,255,0,0.8); border-color: rgba(0,255,0,1); }
            100% { box-shadow: 0 0 5px rgba(0,255,0,0.4); border-color: rgba(0,255,0,0.6); }
          }
          .animate-breathe {
            animation: breathe 3s infinite ease-in-out;
          }
        `}
      </style>

      {/* 1. HEADER */}
      <header className="flex-none z-30 p-4 bg-black/80 backdrop-blur-md border-b border-white/10 flex justify-between items-center">
          <button 
            onClick={() => navigate(ScreenName.DASHBOARD)}
            className="flex size-10 items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <div className="flex flex-col items-center">
             <span className="text-xs text-primary-green font-bold uppercase tracking-wider">{t('ar.step')} {currentStepIndex + 1} / {steps.length}</span>
             <h1 className="text-sm font-bold text-white max-w-[200px] truncate">{currentStep.title}</h1>
          </div>

          <div className="size-10"></div> 
      </header>

      {/* 2. MAIN VIEWPORT */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-900">
         
         {!isARRequired && (
             <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center space-y-8 animate-in fade-in zoom-in-95">
                 <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                    <div className="relative w-32 h-32 bg-card-dark rounded-full flex items-center justify-center border-4 border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                        <span className="material-symbols-outlined text-6xl text-blue-400">
                            {currentStep.title.toLowerCase().includes('wait') ? 'hourglass_top' : 'construction'}
                        </span>
                    </div>
                 </div>
                 
                 <div>
                    <span className="text-blue-400 font-bold tracking-widest text-xs uppercase mb-2 block">{t('ar.manualAction')}</span>
                    <h2 className="text-3xl font-bold text-white mb-4 leading-tight">{currentStep.title}</h2>
                    <p className="text-slate-300 text-lg max-w-xs mx-auto">
                        {t('ar.manualActionDesc')}
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4 w-full">
                     <div className="bg-card-dark border border-white/10 rounded-xl p-4 flex flex-col items-center">
                         <div className="text-xs text-slate-500 uppercase font-bold mb-2">{t('ar.estTime')}</div>
                         <div className="text-xl font-bold text-white flex items-center justify-center gap-2">
                             <span className="material-symbols-outlined text-primary-green">timer</span>
                             {currentStep.time}
                         </div>
                     </div>
                     <div className="bg-card-dark border border-white/10 rounded-xl p-4 flex flex-col items-center">
                         <div className="text-xs text-slate-500 uppercase font-bold mb-2">{t('ar.requiredTools')}</div>
                         <div className="text-xl font-bold text-white flex items-center justify-center gap-2 text-center">
                             <span className="material-symbols-outlined text-amber-500">build</span>
                             <span className="text-sm">{currentStep.tools}</span>
                         </div>
                     </div>
                 </div>

                 <button 
                    onClick={handleNext}
                    className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-500 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                 >
                     {t('ar.markComplete')}
                     <span className="material-symbols-outlined">check_circle</span>
                 </button>
             </div>
         )}

         {/* A. LIVE CAMERA MODE (AR REQUIRED) */}
         {isARRequired && !baseImage && (
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                 {cameraError ? (
                     <div className="text-center p-6">
                         <span className="material-symbols-outlined text-4xl text-red-500 mb-2">videocam_off</span>
                         <p className="text-white mb-4">{cameraError}</p>
                         <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-primary-green text-black font-bold rounded-lg">
                            {t('ar.uploadPhoto')}
                         </button>
                     </div>
                 ) : (
                     <video 
                        ref={videoRef}
                        autoPlay 
                        playsInline 
                        muted 
                        className="absolute inset-0 w-full h-full object-cover"
                     />
                 )}
                 
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                     <div className="w-64 h-64 border border-white/30 rounded-lg relative flex items-center justify-center">
                         <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-green"></div>
                         <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-green"></div>
                         <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-green"></div>
                         <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-green"></div>
                         <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                     </div>
                     
                     <div className="absolute top-20 text-white/80 bg-black/40 backdrop-blur px-3 py-1 rounded-full text-xs font-mono border border-white/10">
                         {t('ar.alignPart')}
                     </div>
                 </div>
                 
                 <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-8 z-20">
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileUpload}
                     />
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center text-white/80 hover:text-white group"
                     >
                        <div className="size-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center mb-1 group-hover:bg-white/10 transition-colors">
                            <span className="material-symbols-outlined">upload_file</span>
                        </div>
                        <span className="text-xs font-bold shadow-black drop-shadow-md">{t('ar.upload')}</span>
                     </button>

                     <button 
                        onClick={handleCapture}
                        className="size-20 rounded-full border-4 border-white flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                     >
                         <div className="size-16 rounded-full bg-white shadow-inner"></div>
                     </button>

                     <button 
                        onClick={handleNext}
                        className="flex flex-col items-center text-white/80 hover:text-white group"
                     >
                        <div className="size-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center mb-1 group-hover:bg-white/10 transition-colors">
                             <span className="material-symbols-outlined">skip_next</span>
                        </div>
                        <span className="text-xs font-bold shadow-black drop-shadow-md">{t('ar.skip')}</span>
                     </button>
                 </div>
             </div>
         )}

         {/* B. STATIC ANALYSIS MODE (AR OVERLAYS) */}
         {isARRequired && baseImage && (
             <div 
                ref={containerRef}
                className="relative shadow-2xl overflow-hidden bg-black"
                style={{ 
                    aspectRatio: imageAspectRatio ? `${imageAspectRatio}` : 'auto',
                    width: '100%',
                    height: 'auto',
                    maxHeight: '100%'
                }}
             >
                 {/* Base Image */}
                 <img src={baseImage} className="w-full h-full object-contain opacity-90" alt="Analysis Target" />

                 {/* Ghost Overlay */}
                 {ghostOverlay && (
                     <img 
                        src={ghostOverlay} 
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-500 animate-in fade-in"
                        style={{ opacity: ghostOpacity, mixBlendMode: 'screen' }} 
                        alt="Ghost"
                     />
                 )}

                 {/* Loading Indicator (Small, non-intrusive if ghost loading) */}
                 {loadingGhost && !loadingAR && (
                     <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10">
                         <span className="size-2 rounded-full bg-primary-blue animate-pulse"></span>
                         <span className="text-[10px] text-white font-mono uppercase">{t('ar.syncingBlueprint')}</span>
                     </div>
                 )}

                 {/* AR Bounding Boxes - HIGH VISIBILITY + ANIMATION */}
                 {!loadingAR && arCoordinates.map((coord, index) => {
                     const ymin = coord.box_2d[0] / 10;
                     const xmin = coord.box_2d[1] / 10;
                     const ymax = coord.box_2d[2] / 10;
                     const xmax = coord.box_2d[3] / 10;
                     
                     const isSelected = selectedPart?.id === coord.id;
                     const isVerified = verifiedPartIds.has(coord.id);

                     return (
                         <div 
                            key={index}
                            className={`absolute transition-all duration-300 cursor-pointer group z-20 box-content ${
                                isVerified ? 'border-[3px] border-primary-green bg-primary-green/20 ring-1 ring-white' : 
                                isSelected ? 'border-[3px] border-cyan-400 bg-cyan-400/20 ring-1 ring-white shadow-[0_0_25px_rgba(34,211,238,0.6)]' : 
                                'border-2 border-primary-green ring-1 ring-black/80 hover:bg-primary-green/10 animate-breathe'
                            }`}
                            style={{ 
                                left: `${xmin}%`, 
                                top: `${ymin}%`, 
                                width: `${xmax - xmin}%`, 
                                height: `${ymax - ymin}%` 
                            }}
                            onClick={() => handlePartClick(coord)}
                         >
                             {/* Corner Accents for Tech Look (Only on unverified/unselected to reduce noise) */}
                             {!isVerified && !isSelected && (
                                <>
                                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary-green shadow-sm ring-1 ring-black"></div>
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary-green shadow-sm ring-1 ring-black"></div>
                                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary-green shadow-sm ring-1 ring-black"></div>
                                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary-green shadow-sm ring-1 ring-black"></div>
                                </>
                             )}

                             {/* High-Contrast Label */}
                             <div className={`absolute -top-14 left-1/2 -translate-x-1/2 px-4 py-2 text-sm font-bold uppercase rounded-lg text-white flex items-center gap-2 shadow-[0_4px_15px_rgba(0,0,0,0.8)] whitespace-nowrap transform transition-transform backdrop-blur-md border ${
                                 isVerified ? 'bg-primary-green border-white text-black' : 
                                 isSelected ? 'bg-cyan-500 border-white text-black' : 
                                 'bg-slate-900/90 border-primary-green text-white group-hover:scale-110 ring-1 ring-black'
                             }`}>
                                 {isVerified && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                                 {coord.label}
                             </div>
                             
                             {/* Connector Line */}
                             <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 shadow-[0_0_2px_black] ${
                                 isVerified ? 'bg-primary-green' : isSelected ? 'bg-cyan-400' : 'bg-primary-green'
                             }`}></div>
                         </div>
                     );
                 })}
                 
                 {loadingAR && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                        <div className="size-16 border-4 border-primary-green border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-white font-bold tracking-widest animate-pulse">{t('ar.scanningComponents')}</p>
                    </div>
                 )}
             </div>
         )}

        {/* --- AI ASSISTANT OVERLAY (Moved inside main viewport to respect layout) --- */}
        {isChatOpen && (
          <div className="absolute inset-x-0 bottom-0 top-1/4 bg-slate-900/95 backdrop-blur-xl rounded-t-2xl z-50 border-t border-white/20 flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                   <div className="flex items-center gap-3">
                       <div className="size-8 rounded-full bg-gradient-to-br from-primary-blue to-purple-600 flex items-center justify-center">
                           <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                       </div>
                       <div>
                           <h3 className="text-white font-bold text-sm">{t('ar.expertChat')}</h3>
                           <p className="text-xs text-slate-400">{t('ar.viewingFrame')}</p>
                       </div>
                   </div>
                   <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white">
                       <span className="material-symbols-outlined">expand_more</span>
                   </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 && (
                      <div className="text-center text-slate-500 text-sm mt-4">
                          {t('ar.chatEmpty')}
                      </div>
                  )}
                  {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-primary-blue text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-white/10 rounded-bl-none'}`}>
                              {msg.text}
                          </div>
                      </div>
                  ))}
                  {isChatLoading && (
                      <div className="flex justify-start">
                          <div className="bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1.5 items-center">
                               <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                               <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                               <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                          </div>
                      </div>
                  )}
                  <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-white/10 bg-black/20 pb-8 md:pb-3">
                  <div className="flex gap-2">
                      <input 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={t('ar.chatPlaceholder')}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-full px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-blue"
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={isChatLoading || !chatInput.trim()}
                        className="size-10 rounded-full bg-primary-blue text-white flex items-center justify-center hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                          <span className="material-symbols-outlined text-xl">send</span>
                      </button>
                  </div>
              </div>
          </div>
        )}

        {/* Part Details Modal - MOVED INSIDE VIEWPORT TO RESPECT SIDEBAR */}
        {selectedPart && !isChatOpen && (
         <div className="absolute inset-x-0 bottom-4 mx-4 z-40 animate-in slide-in-from-bottom-5">
             <div className="bg-slate-900/95 backdrop-blur-xl border-l-4 border-cyan-400 rounded-r-xl p-5 shadow-2xl flex items-start gap-4 ring-1 ring-white/10">
                 <div className="flex-1">
                     <h3 className="text-white font-bold text-lg mb-1">{selectedPart.label}</h3>
                     {selectedPart.partNumber && <p className="text-xs font-mono text-cyan-400 mb-2 bg-cyan-900/30 inline-block px-2 py-0.5 rounded">{selectedPart.partNumber}</p>}
                     <p className="text-slate-300 text-sm leading-relaxed">{selectedPart.description || t('ar.confirmComponent')}</p>
                 </div>
                 <button onClick={() => setSelectedPart(null)} className="text-slate-400 hover:text-white p-2">
                     <span className="material-symbols-outlined">close</span>
                 </button>
             </div>
         </div>
        )}

      </div>

      {/* 3. FOOTER CONTROLS */}
      {isARRequired && baseImage && !isChatOpen && (
          <div className="flex-none bg-card-dark p-4 border-t border-white/10 z-30 animate-in slide-in-from-bottom-4">
              
              {/* Ghost Opacity Slider */}
              {ghostOverlay && (
                  <div className="flex items-center gap-3 mb-4 max-w-sm mx-auto bg-black/40 rounded-full px-4 py-2 border border-white/10">
                      <span className="material-symbols-outlined text-primary-green text-sm">layers</span>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.1"
                        value={ghostOpacity}
                        onChange={(e) => setGhostOpacity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-green"
                      />
                      <span className="text-xs font-mono text-white w-8 text-right">{(ghostOpacity * 100).toFixed(0)}%</span>
                  </div>
              )}

              <div className="flex gap-4 max-w-md mx-auto">
                  <button 
                    onClick={() => setBaseImage(null)}
                    className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  >
                      <span className="material-symbols-outlined">replay</span>
                      {t('ar.retake')}
                  </button>
                  
                  {selectedPart ? (
                       <button 
                        onClick={handleVerifyPart}
                        className="flex-[2] py-3 px-4 rounded-xl bg-primary-green text-black font-bold hover:bg-green-400 transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                      >
                          <span className="material-symbols-outlined">check_circle</span>
                          {t('ar.verifyPart')}
                      </button>
                  ) : (
                      <button 
                        onClick={handleNext}
                        className="flex-[2] py-3 px-4 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 transition-colors shadow-lg flex items-center justify-center gap-2"
                      >
                          {t('ar.nextStep')}
                          <span className="material-symbols-outlined">arrow_forward</span>
                      </button>
                  )}
              </div>
          </div>
      )}

      {/* Floating Action Button (Only show if chat closed and no part selected to avoid clutter) */}
      {!isChatOpen && !selectedPart && (
        <button 
            onClick={() => setIsChatOpen(true)}
            className="absolute bottom-28 right-4 size-14 rounded-full bg-gradient-to-br from-primary-blue to-purple-600 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center z-50 hover:scale-110 transition-transform animate-in zoom-in"
        >
            <span className="material-symbols-outlined text-3xl">smart_toy</span>
        </button>
      )}

      <ResponsiveNav navigate={navigate} currentScreen={ScreenName.AR_REPAIR_GUIDE} />
    </div>
  );
};

export default ARRepairGuide;
