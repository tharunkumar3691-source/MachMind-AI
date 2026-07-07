
import React, { useState, useEffect, useRef } from 'react';
import { NavigationProps, ScreenName, VerificationLog, TelemetryData } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useDiagnostic } from '../contexts/DiagnosticContext';
import { verifyRepair, blobToBase64 } from '../services/gemini';
import { updateRepairStatus } from '../services/db';
import VerificationLoader from '../components/VerificationLoader';

const VerificationSystem: React.FC<NavigationProps> = ({ navigate, selectedId }) => {
  const { t, language } = useTranslation();
  const { diagnosticResult, activeRepairId, setActiveRepairId } = useDiagnostic();
  const [status, setStatus] = useState<'IDLE' | 'RECORDING' | 'ANALYZING' | 'SUCCESS' | 'FAILURE'>('IDLE');
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // Analysis Visualization State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysisStepText, setAnalysisStepText] = useState("");
  
  // Real-time Metrics (Visualization Only)
  const [currentDb, setCurrentDb] = useState(0); 
  const [currentVibration, setCurrentVibration] = useState(0);
  
  // AI Result State
  const [verificationResult, setVerificationResult] = useState<VerificationLog | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  // Live Telemetry Ref
  const telemetryRef = useRef({
      maxVibration: 0,
      frequencyBins: [] as Uint8Array[],
      startTime: 0
  });

  useEffect(() => {
    startCamera();
    return () => {
        cleanupMedia();
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Update text based on elapsed seconds during analysis
  useEffect(() => {
      if (status === 'ANALYZING') {
          if (elapsedSeconds <= 3) setAnalysisStepText(t('verification.steps.telemetry'));
          else if (elapsedSeconds <= 6) setAnalysisStepText(t('verification.steps.visual'));
          else if (elapsedSeconds <= 8) setAnalysisStepText(t('verification.steps.delta'));
          else setAnalysisStepText(t('verification.steps.decision'));
      }
  }, [elapsedSeconds, status, t]);

  const cleanupMedia = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
          streamRef.current = stream;
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
          setupSensors(stream);
      } catch (e) {
          console.error("Camera/Mic denied", e);
          setPermissionError(t('verification.cameraPermission'));
      }
  };

  const setupSensors = (stream: MediaStream) => {
      // Audio Visualization
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Device Motion (Mobile Only)
      const handleMotion = (event: DeviceMotionEvent) => {
          if (event.acceleration) {
             const { x, y, z } = event.acceleration;
             const magnitude = Math.sqrt((x||0)**2 + (y||0)**2 + (z||0)**2);
             const mag = Math.min(magnitude, 2.0);
             setCurrentVibration(mag);

             if (status === 'RECORDING') {
                if (mag > telemetryRef.current.maxVibration) {
                    telemetryRef.current.maxVibration = mag;
                }
             }
          }
      };
      if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
          window.addEventListener('devicemotion', handleMotion);
      }

      // Render Loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMetrics = () => {
          if (status === 'SUCCESS' || status === 'FAILURE') return;

          analyser.getByteFrequencyData(dataArray);
          
          if (status === 'RECORDING') {
              telemetryRef.current.frequencyBins.push(new Uint8Array(dataArray));
          }

          let sum = 0;
          for(let i=0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          const db = 30 + (avg / 255) * 60; 
          setCurrentDb(db);
          
          if (!window.DeviceMotionEvent) {
              setCurrentVibration((avg / 255) * 0.5 + Math.random() * 0.1);
          }

          animationFrameRef.current = requestAnimationFrame(updateMetrics);
      };
      updateMetrics();
  };

  const startRecording = () => {
      setStatus('RECORDING');
      chunksRef.current = [];
      
      // Reset Telemetry
      telemetryRef.current = {
        maxVibration: 0,
        frequencyBins: [],
        startTime: Date.now()
      };

      if (!streamRef.current) {
          // Headless VM fallback: Simulate 5s recording progress
          let p = 0;
          const interval = setInterval(() => {
              p += 2;
              setRecordingProgress(p);
              if (p >= 100) {
                  clearInterval(interval);
                  const dummyBlob = new Blob([], { type: 'video/webm' });
                  const dummyTelemetry = { peakFrequency: 0, avgDecibels: 0, maxVibration: 0, recordingDuration: 5000 };
                  analyzeRecording(dummyBlob, dummyTelemetry);
              }
          }, 100);
          return;
      }

      let options: MediaRecorderOptions = {};
      let actualMime = 'video/webm';
      
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options.mimeType = 'video/webm;codecs=vp9';
        actualMime = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options.mimeType = 'video/webm';
        actualMime = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options.mimeType = 'video/mp4';
        actualMime = 'video/mp4';
      }

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(streamRef.current, options);
      } catch (err) {
        console.warn("MediaRecorder creation failed, falling back to dummy recording:", err);
        // Fallback to simulating the recording progress
        let p = 0;
        const interval = setInterval(() => {
            p += 2;
            setRecordingProgress(p);
            if (p >= 100) {
                clearInterval(interval);
                const dummyBlob = new Blob([], { type: 'video/webm' });
                const dummyTelemetry = { peakFrequency: 0, avgDecibels: 0, maxVibration: 0, recordingDuration: 5000 };
                analyzeRecording(dummyBlob, dummyTelemetry);
            }
        }, 100);
        return;
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: actualMime });
          
          // Calculate Live Telemetry
          const duration = Date.now() - telemetryRef.current.startTime;
          const telemetry = calculateTelemetry(telemetryRef.current.frequencyBins, duration, telemetryRef.current.maxVibration);
          
          analyzeRecording(blob, telemetry);
      };

      recorder.start();

      // Record for exactly 5 seconds
      let p = 0;
      const interval = setInterval(() => {
          p += 2;
          setRecordingProgress(p);
          if (p >= 100) {
              clearInterval(interval);
              recorder.stop();
          }
      }, 100);
  };

  const calculateTelemetry = (frequencyBins: Uint8Array[], duration: number, vibration: number): TelemetryData => {
      let avgDb = 0;
      let peakFreq = 0;
      
      if (frequencyBins.length > 0) {
          let totalSum = 0;
          let maxVal = 0;
          let maxBinIndex = 0;
          
          frequencyBins.forEach(bin => {
              for(let i=0; i<bin.length; i++) {
                  totalSum += bin[i];
                  if (bin[i] > maxVal) {
                      maxVal = bin[i];
                      maxBinIndex = i;
                  }
              }
          });
          
          const totalSamples = frequencyBins.length * frequencyBins[0].length;
          avgDb = (totalSum / totalSamples) / 255 * 100;
          const nyquist = 22050; 
          peakFreq = (maxBinIndex / 128) * nyquist;
      }
      
      return {
          avgDecibels: Math.round(avgDb),
          peakFrequency: Math.round(peakFreq),
          maxVibration: parseFloat(vibration.toFixed(2)),
          recordingDuration: duration
      };
  };

  const analyzeRecording = async (videoBlob: Blob, telemetry: TelemetryData) => {
      setStatus('ANALYZING');
      setElapsedSeconds(0);
      
      // Start 3D Loader Timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
          setElapsedSeconds(prev => prev + 1);
      }, 1000);

      try {
          const base64 = await blobToBase64(videoBlob);
          
          // Artificial minimum delay (8s) to allow full 3D animation cycle to play
          // This builds user trust in the "processing" depth
          const minDelay = new Promise(resolve => setTimeout(resolve, 8000));
          const analysisPromise = verifyRepair(base64, diagnosticResult, language, telemetry, videoBlob.type);
          
          const [_, result] = await Promise.all([minDelay, analysisPromise]);
          
          setVerificationResult(result);
          setStatus(result.resolved ? 'SUCCESS' : 'FAILURE');
      } catch (e) {
          console.error("Verification failed", e);
          setStatus('FAILURE');
      } finally {
          if (timerRef.current) clearInterval(timerRef.current);
      }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVerificationResult(null);
      
      // Process uploaded video
      try {
        const telemetry = await processUploadedVideo(file);
        analyzeRecording(file, telemetry);
      } catch (e) {
          console.error("Upload process error", e);
          // Try to analyze even if telemetry fails (fallback)
          const dummyTelemetry = { peakFrequency: 0, avgDecibels: 0, maxVibration: 0, recordingDuration: 0 };
          analyzeRecording(file, dummyTelemetry);
      }
    }
  };

  // Extract Telemetry from File (Robust Version using decodeAudioData)
  const processUploadedVideo = async (file: File): Promise<TelemetryData> => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        
        // Decode the audio data directly from the file buffer (works for mp4/webm)
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        // Get primary channel data
        const rawData = audioBuffer.getChannelData(0);
        const duration = audioBuffer.duration;
        
        // 1. Calculate RMS (Volume)
        let sumSquares = 0;
        // Optimization: Process every Nth sample for speed on large files
        const step = Math.max(1, Math.ceil(rawData.length / 50000));
        let sampleCount = 0;
        
        for (let i = 0; i < rawData.length; i += step) {
             const val = rawData[i];
             sumSquares += val * val;
             sampleCount++;
        }
        
        const rms = Math.sqrt(sumSquares / sampleCount);
        // Convert to rough dB (0-100 scale for UI display)
        // Log mapping: RMS 0.1 -> -20dB. RMS 0.001 -> -60dB.
        const db = 20 * Math.log10(rms || 0.00001); 
        const avgDb = Math.max(0, Math.min(100, (db + 60) * 2));

        // 2. Calculate Zero Crossing Rate (Approx Peak Frequency)
        // Use a slice from the middle of the audio for representative frequency
        let zeroCrossings = 0;
        let prev = 0;
        const sliceLen = Math.min(rawData.length, 48000); // Analyze ~1 second
        const start = Math.floor((rawData.length - sliceLen) / 2);
        const safeStart = Math.max(0, start); // Safety check
        const safeEnd = Math.min(rawData.length, safeStart + sliceLen);

        for (let i = safeStart; i < safeEnd; i++) {
             const curr = rawData[i];
             if ((curr >= 0 && prev < 0) || (curr < 0 && prev >= 0)) {
                 zeroCrossings++;
             }
             prev = curr;
        }
        
        const sliceDuration = sliceLen / audioBuffer.sampleRate;
        const peakFreq = (zeroCrossings / 2) / sliceDuration;

        // Cleanup context
        if (ctx.state !== 'closed') ctx.close();

        return {
            avgDecibels: Math.round(avgDb),
            peakFrequency: Math.round(peakFreq),
            maxVibration: 0, // Cannot extract vibration from video file
            recordingDuration: duration * 1000
        };

      } catch (e) {
        console.warn("Telemetry extraction failed (Audio decode error)", e);
        return {
            avgDecibels: 0,
            peakFrequency: 0,
            maxVibration: 0,
            recordingDuration: 0
        };
      }
  };

  const handleRetry = () => {
      setStatus('IDLE');
      setRecordingProgress(0);
      setVerificationResult(null);
      startCamera(); 
  };

  const handleComplete = async () => {
      const repairId = selectedId || activeRepairId;

      if (repairId) {
          try {
              await updateRepairStatus(Number(repairId), 'COMPLETED');
              setActiveRepairId(null);
          } catch (e) {
              console.error("Failed to mark repair as completed in DB", e);
          }
      }
      navigate(ScreenName.DASHBOARD);
  };

  return (
    <div className="fixed inset-0 flex w-full flex-col bg-background-dark font-display overflow-hidden">
      
      {/* Background Video Feed (Visible unless showing 3D Loader or Result) */}
      {(status === 'IDLE' || status === 'RECORDING') && (
          <div className="absolute inset-0 z-0 bg-black">
               <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-black/20"></div>
          </div>
      )}

      {/* Header - Fixed Height */}
      <div className="flex-none flex items-center p-4 pb-2 pt-6 justify-between z-20">
        <button 
          onClick={() => navigate(ScreenName.AR_REPAIR_GUIDE)}
          className="flex size-12 shrink-0 items-center justify-start text-white hover:text-primary-green transition-colors drop-shadow-md"
        >
          <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight flex-1 text-center drop-shadow-md">{t('verification.title')}</h2>
        <div className="size-12"></div>
      </div>

      {/* Scrollable Content Area */}
      <div className="relative z-10 flex flex-col flex-1 p-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
        
        {/* IDLE STATE */}
        {status === 'IDLE' && (
            <div className="flex-1 flex flex-col justify-end pb-10 min-h-[500px]">
                 {/* Live Sensor HUD */}
                 <div className="mb-auto mt-10 grid grid-cols-2 gap-4">
                    <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
                        <p className="text-xs text-slate-300 uppercase font-bold mb-1">{t('verification.acoustic')}</p>
                        <p className="text-2xl font-mono text-white font-bold">{Math.round(currentDb)} dB</p>
                        <div className="w-full h-1 bg-slate-600 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-primary-green transition-all duration-100" style={{width: `${Math.min(currentDb, 100)}%`}}></div>
                        </div>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
                        <p className="text-xs text-slate-300 uppercase font-bold mb-1">{t('verification.vibration')}</p>
                        <p className="text-2xl font-mono text-white font-bold">{currentVibration.toFixed(2)} g</p>
                         <div className="w-full h-1 bg-slate-600 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-primary-blue transition-all duration-100" style={{width: `${Math.min(currentVibration*50, 100)}%`}}></div>
                        </div>
                    </div>
                 </div>

                 {permissionError && (
                    <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-lg text-center mb-6 backdrop-blur-md">
                        <p className="text-white text-sm font-bold flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">videocam_off</span>
                            {permissionError}
                        </p>
                    </div>
                 )}

                 <div className="text-center mb-6">
                    <h3 className="text-white text-xl font-bold mb-2">{t('verification.instruction')}</h3>
                    <p className="text-slate-300 text-sm max-w-xs mx-auto">{t('verification.instructionDesc')}</p>
                 </div>

                 <div className="flex flex-col gap-3 w-full">
                    <button 
                        onClick={startRecording}
                        className={`w-full bg-primary-green text-black font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(0,255,0,0.3)] hover:bg-green-400 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 ${permissionError ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className="material-symbols-outlined">videocam</span>
                        {t('verification.startRecord')}
                    </button>

                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden"
                        accept="video/mp4,video/webm,video/quicktime,video/*"
                        onChange={handleFileUpload}
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-white/10 text-white font-bold py-3 rounded-xl border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-md"
                    >
                        <span className="material-symbols-outlined">upload_file</span>
                        {t('verification.uploadVideo')}
                    </button>
                 </div>
            </div>
        )}

        {/* RECORDING STATE */}
        {status === 'RECORDING' && (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                 <div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center animate-pulse">
                     <div className="w-16 h-16 bg-red-500 rounded-lg"></div>
                 </div>
                 <h2 className="text-white font-bold text-xl mt-6 animate-pulse">{t('verification.recording')}</h2>
                 
                 <div className="w-full max-w-xs h-2 bg-slate-700 rounded-full mt-8 overflow-hidden">
                     <div className="h-full bg-red-500 transition-all duration-100 linear" style={{width: `${recordingProgress}%`}}></div>
                 </div>
            </div>
        )}

        {/* ANALYZING STATE - NEW 3D LOADER */}
        {status === 'ANALYZING' && (
             <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in min-h-[400px]">
                 
                 <VerificationLoader elapsedSeconds={elapsedSeconds} />

                 <div className="text-center mt-12 max-w-xs mx-auto space-y-2">
                    <h3 className="text-white text-xl font-bold tracking-tight animate-pulse">
                        {analysisStepText || t('verification.analyzing')}
                    </h3>
                    <p className="text-slate-400 text-sm">Gemini Neural Verification</p>
                 </div>
             </div>
        )}

        {/* RESULTS STATE (SUCCESS OR FAILURE) */}
        {(status === 'SUCCESS' || status === 'FAILURE') && verificationResult && (
             <div className="flex flex-col flex-1 pt-4 space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500 pb-20">
                
                {/* Status Header */}
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`relative flex h-24 w-24 items-center justify-center rounded-full mb-2 ${status === 'SUCCESS' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${status === 'SUCCESS' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}></div>
                        <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 z-10 ${status === 'SUCCESS' ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
                        <span className={`material-symbols-outlined text-5xl ${status === 'SUCCESS' ? 'text-primary-emerald' : 'text-red-500'}`}>
                            {status === 'SUCCESS' ? 'check_circle' : 'warning'}
                        </span>
                        </div>
                    </div>
                    
                    <div className="w-full">
                        <h1 className="text-white tracking-tight text-3xl font-bold leading-tight pb-2">
                            {status === 'SUCCESS' ? t('verification.success') : t('verification.failure')}
                        </h1>
                        <p className="text-slate-400 text-base font-normal leading-normal">
                            {status === 'SUCCESS' ? t('verification.successDesc') : t('verification.failureDesc')}
                        </p>
                    </div>
                </div>

                {/* AI Analysis Card */}
                <div className="bg-card-dark rounded-xl p-5 border border-white/10">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-blue">analytics</span>
                        {t('verification.aiAnalysis')}
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{verificationResult.analysis}</p>
                </div>

                {/* Metrics Comparison */}
                <div className="w-full rounded-xl bg-card-dark p-6 border border-white/5 shadow-xl">
                    <p className="text-white text-lg font-bold pb-4 border-b border-white/5 mb-4">{t('verification.metrics')}</p>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                                    <span className="material-symbols-outlined">graphic_eq</span>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase">{t('verification.acoustic')}</p>
                                    <p className="text-white text-sm font-medium">{verificationResult.comparison.acoustic}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                    <span className="material-symbols-outlined">visibility</span>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase">{t('verification.visual')}</p>
                                    <p className="text-white text-sm font-medium">{verificationResult.comparison.visual}</p>
                                </div>
                            </div>
                        </div>
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                    <span className="material-symbols-outlined">vibration</span>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase">{t('verification.vibration')}</p>
                                    <p className="text-white text-sm font-medium">{verificationResult.comparison.mechanical}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recommendation */}
                <div className={`rounded-xl p-4 border ${status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <p className={`text-xs font-bold uppercase mb-1 ${status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}`}>{t('verification.recommendation')}</p>
                    <p className="text-white font-medium">{verificationResult.recommendation}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 pb-8">
                    {status === 'FAILURE' ? (
                        <>
                            <button 
                                onClick={handleRetry}
                                className="flex-1 py-3 px-4 rounded-xl border border-slate-600 text-white font-bold hover:bg-white/10"
                            >
                                {t('verification.retry')}
                            </button>
                             <button 
                                className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/20"
                            >
                                {t('verification.contactExpert')}
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={handleComplete}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary-emerald text-black font-bold hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                        >
                            <span className="material-symbols-outlined">check</span>
                            {t('verification.complete')}
                        </button>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default VerificationSystem;
