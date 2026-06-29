
import React, { useState, useEffect, useRef } from 'react';
import { NavigationProps, ScreenName } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useDiagnostic } from '../contexts/DiagnosticContext';

const MAX_RECORDING_TIME_MS = 5000; 

const DiagnosticCapture: React.FC<NavigationProps> = ({ navigate, selectedId }) => {
  const { t } = useTranslation();
  const { setVideoBlob, setMimeType, setTelemetryData } = useDiagnostic();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(6).fill(0));
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [supportsFlash, setSupportsFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Telemetry
  const telemetryRef = useRef({
      maxVibration: 0,
      frequencyBins: [] as Uint8Array[],
      startTime: 0
  });

  useEffect(() => {
    const checkDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (err) {
        console.error("Error enumerating devices:", err);
      }
    };
    checkDevices();

    const handleMotion = (e: DeviceMotionEvent) => {
        if (!isRecording) return;
        const acc = e.acceleration;
        if (acc) {
            const mag = Math.sqrt((acc.x || 0)**2 + (acc.y || 0)**2 + (acc.z || 0)**2);
            if (mag > telemetryRef.current.maxVibration) {
                telemetryRef.current.maxVibration = mag;
            }
        }
    };

    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleMotion);
    }
    
    return () => {
         if (window.DeviceMotionEvent) window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isRecording]);

  useEffect(() => {
    let mounted = true;

    const startMedia = async () => {
      try {
        setPermissionError(null);
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
          });
        }
        setIsFlashOn(false);

        const constraints: MediaStreamConstraints = {
          video: { 
            facingMode: facingMode,
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          },
          audio: true
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (mounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          
          const track = mediaStream.getVideoTracks()[0];
          try {
            const capabilities = track.getCapabilities() as any;
            if (capabilities.torch) {
              setSupportsFlash(true);
            } else {
              setSupportsFlash(false);
            }
          } catch (e) {
            setSupportsFlash(false);
          }

          setupAudioVisualizer(mediaStream);
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
        if (mounted) {
          setPermissionError(t('diagnostic.cameraAccessRequired'));
        }
      }
    };

    startMedia();

    return () => {
      mounted = false;
      cleanupMedia();
    };
  }, [facingMode]);

  const cleanupMedia = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const setupAudioVisualizer = (mediaStream: MediaStream) => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256; 
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateAudioLevels = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      if (isRecording) {
          telemetryRef.current.frequencyBins.push(new Uint8Array(dataArray));
      }

      const levels = [];
      const step = Math.floor(dataArray.length / 6);
      
      for (let i = 0; i < 6; i++) {
        const value = dataArray[i * step] / 255;
        levels.push(value);
      }
      
      setAudioLevels(levels);
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
    };

    updateAudioLevels();
  };

  const toggleFlash = async () => {
    if (!stream || !supportsFlash) return;
    const track = stream.getVideoTracks()[0];
    const newFlashState = !isFlashOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: newFlashState } as any]
      });
      setIsFlashOn(newFlashState);
    } catch (err) {
      console.error("Error toggling flash:", err);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    chunksRef.current = [];
    setRecordingProgress(0);
    
    telemetryRef.current = {
        maxVibration: 0,
        frequencyBins: [],
        startTime: Date.now()
    };

    // OPTIMIZATION: Reduced bitrate to 750kbps to improve upload speed on 4G networks
    // while maintaining acceptable diagnostic clarity.
    let options: MediaRecorderOptions = { videoBitsPerSecond: 750000 }; 
    
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      options.mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      options.mimeType = 'video/webm';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      options.mimeType = 'video/mp4';
    }

    try {
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        recorder.onstop = processRecordingStop;

        recorder.start(200);
        setIsRecording(true);

        recordingTimerRef.current = window.setTimeout(() => {
            stopRecording();
        }, MAX_RECORDING_TIME_MS);

        const startTime = Date.now();
        progressIntervalRef.current = window.setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / MAX_RECORDING_TIME_MS) * 100, 100);
            setRecordingProgress(progress);
        }, 100);

    } catch (e) {
        console.error("Failed to start MediaRecorder:", e);
        alert(t('diagnostic.cameraError'));
    }
  };

  const calculateTelemetry = (frequencyBins: Uint8Array[], duration: number, vibration: number) => {
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

  const processRecordingStop = () => {
      const fullType = mediaRecorderRef.current?.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: fullType });
      const cleanType = fullType.split(';')[0];
      
      // Calculate Telemetry
      const duration = Date.now() - telemetryRef.current.startTime;
      const tData = calculateTelemetry(
          telemetryRef.current.frequencyBins, 
          duration, 
          telemetryRef.current.maxVibration
      );

      // Set Data in Context
      setTelemetryData(tData);
      setVideoBlob(blob);
      setMimeType(cleanType);
      
      // Navigate to Analysis
      setTimeout(() => navigate(ScreenName.RESULTS_ANALYSIS), 500);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      await processUploadedVideo(file);
    }
  };

  const processUploadedVideo = async (file: File) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true; 
      video.crossOrigin = "anonymous";
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      
      const bins: Uint8Array[] = [];
      
      return new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
            const source = ctx.createMediaElementSource(video);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            
            video.playbackRate = 2.0; 
            video.play();

            const processInterval = setInterval(() => {
                 if (video.paused || video.ended) {
                     clearInterval(processInterval);
                     return;
                 }
                 const dataArray = new Uint8Array(analyser.frequencyBinCount);
                 analyser.getByteFrequencyData(dataArray);
                 bins.push(dataArray);
            }, 100);

            video.onended = () => {
                clearInterval(processInterval);
                const tData = calculateTelemetry(bins, video.duration * 1000, 0); 
                
                setTelemetryData(tData);
                setVideoBlob(file);
                setMimeType(file.type);
                
                ctx.close();
                URL.revokeObjectURL(video.src);
                setIsProcessing(false);
                navigate(ScreenName.RESULTS_ANALYSIS);
                resolve();
            };
            
            setTimeout(() => {
                if (!video.paused) {
                    video.pause();
                    video.dispatchEvent(new Event('ended'));
                }
            }, 15000);
        };
      });
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="relative h-screen w-full bg-black font-display overflow-hidden flex flex-col items-center justify-center">
      
      <div className="absolute inset-0 h-full w-full bg-black">
        {permissionError ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <span className="material-symbols-outlined text-6xl text-red-500 mb-4">videocam_off</span>
            <p className="text-white text-lg font-bold mb-2">{t('diagnostic.cameraAccessRequired')}</p>
            <p className="text-slate-400 mb-6 max-w-xs">{permissionError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary-green text-black font-bold rounded-lg hover:bg-green-400 transition-colors"
            >
              {t('diagnostic.retry')}
            </button>
          </div>
        ) : (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted
            className={`h-full w-full object-cover transition-opacity duration-500 ${stream ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>

      {/* Professional HUD Overlays */}
      <div className="absolute inset-0 pointer-events-none">
          {/* Corner Brackets */}
          <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-primary-green/50 rounded-tl-lg"></div>
          <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-primary-green/50 rounded-tr-lg"></div>
          <div className="absolute bottom-32 left-8 w-16 h-16 border-b-2 border-l-2 border-primary-green/50 rounded-bl-lg"></div>
          <div className="absolute bottom-32 right-8 w-16 h-16 border-b-2 border-r-2 border-primary-green/50 rounded-br-lg"></div>
          
          {/* Center Reticle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-primary-green/30 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-primary-green rounded-full"></div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary-green/20 to-transparent"></div>
          
          {/* Status Labels */}
          <div className="absolute top-10 left-12 text-[10px] font-mono text-primary-green/80 uppercase tracking-widest">
              {t('diagnostic.hudSys')}<br/>
              {t('diagnostic.hudMode')}<br/>
              {t('diagnostic.hudAi')}
          </div>
      </div>

      <div className="absolute inset-0 bg-black/10"></div>

      {isRecording && (
          <div className="absolute top-0 left-0 h-1 bg-red-500 z-50 transition-all duration-100 ease-linear shadow-[0_0_10px_#ef4444]" style={{ width: `${recordingProgress}%` }}></div>
      )}

      {isProcessing && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
              <div className="w-16 h-16 border-4 border-primary-green border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-white text-xl font-bold">{t('diagnostic.optimizingVideo')}</h3>
              <p className="text-slate-400 text-sm mt-2">{t('diagnostic.optimizingDescription')}</p>
          </div>
      )}

      <div className="relative z-10 flex h-full w-full flex-col justify-between text-white max-w-5xl mx-auto pointer-events-none">
        
        <header className="flex items-center p-4 pb-2 pt-6 pointer-events-auto">
          <button 
            onClick={() => navigate(ScreenName.DASHBOARD)}
            className="flex size-12 items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full transition-colors border border-white/10"
          >
            <span className="material-symbols-outlined text-white text-2xl">close</span>
          </button>
          <h2 className="flex-1 text-center text-lg font-bold leading-tight tracking-[-0.015em] drop-shadow-md">
            {selectedId ? t('diagnostic.updatingRecord') : t('diagnostic.title')}
          </h2>
          <div className="flex w-12 items-center justify-end">
            {supportsFlash && (
              <button 
                onClick={toggleFlash}
                className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full backdrop-blur-md border transition-all ${isFlashOn ? 'bg-primary-green text-black border-primary-green shadow-[0_0_15px_#00ff00]' : 'bg-black/20 text-white border-white/10 hover:bg-black/40'}`}
              >
                <span className={`material-symbols-outlined ${isFlashOn ? 'filled' : ''}`}>{isFlashOn ? 'flash_on' : 'flash_off'}</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-end gap-4 px-4 pb-12">
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 rounded-full bg-black/40 px-2 py-4 backdrop-blur-md border border-white/10">
            {[...audioLevels].reverse().map((level, index) => {
               const isActive = level > 0.1;
               const opacity = Math.max(0.2, Math.min(1, level * 2)); 
               return (
                 <div 
                    key={index} 
                    className={`h-5 w-1.5 rounded-full bg-primary-green transition-all duration-75 ease-out`}
                    style={{ 
                        opacity: opacity,
                        boxShadow: isActive ? `0 0 ${level * 10}px #00ff00` : 'none'
                    }}
                 ></div>
               );
            })}
            <span className="material-symbols-outlined text-xs text-white/50 mt-1">mic</span>
          </div>

          <div className="flex w-full flex-wrap items-end mb-4 justify-center pointer-events-auto">
            {selectedId && (
                <div className="w-full text-center mb-4">
                     <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30 uppercase tracking-wider animate-pulse">
                        {t('diagnostic.updatingRecord')}
                     </span>
                </div>
            )}
            <label className="flex w-full max-w-2xl flex-col group">
              <p className="pb-2 text-base font-medium leading-normal text-white drop-shadow-md transition-opacity group-focus-within:opacity-100 opacity-80">{t('diagnostic.describeSymptom')}</p>
              <textarea 
                className="form-input flex w-full flex-1 resize-none overflow-hidden rounded-xl border border-white/20 bg-black/40 p-4 text-base font-normal leading-normal text-white placeholder:text-white/60 focus:border-primary-green focus:bg-black/60 focus:outline-0 focus:ring-1 focus:ring-primary-green backdrop-blur-md transition-all" 
                placeholder={t('diagnostic.placeholder')}
                rows={2}
              ></textarea>
            </label>
          </div>

          <div className="flex items-center justify-center gap-10 p-4 pointer-events-auto">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*"
                onChange={handleFileUpload}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-black/40 border border-white/10 text-white hover:bg-black/60 hover:scale-105 transition-all backdrop-blur-md"
            >
              <span className="material-symbols-outlined text-2xl">photo_library</span>
            </button>
            
            <div className="relative flex items-center justify-center group cursor-pointer" onClick={toggleRecording}>
              <svg className={`absolute size-[96px] -rotate-90 transform ${isRecording ? 'animate-spin' : ''}`} viewBox="0 0 100 100">
                <circle className="stroke-white/20" cx="50" cy="50" fill="transparent" r="45" strokeWidth="4"></circle>
                <circle 
                  className={`text-red-500 transition-all duration-500 ease-in-out ${isRecording ? 'opacity-100' : 'opacity-0'}`} 
                  cx="50" cy="50" fill="transparent" r="45" 
                  strokeDasharray="282.6" 
                  strokeDashoffset={isRecording ? "0" : "282.6"} 
                  strokeLinecap="round" 
                  strokeWidth="4"
                  stroke="currentColor"
                ></circle>
              </svg>
              
              <button className={`relative flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-white transition-all duration-300 ${isRecording ? 'bg-transparent scale-90' : 'bg-white hover:scale-105'}`}>
                <div className={`size-full rounded-full bg-red-500 transition-all duration-300 ${isRecording ? 'scale-50 rounded-md' : 'scale-0'}`}></div>
              </button>
              
               {isRecording && (
                   <div className="absolute -bottom-8 text-xs font-mono text-red-500 font-bold animate-pulse">
                        {t('diagnostic.rec')} {Math.round(recordingProgress / 20)}s
                   </div>
               )}
            </div>

            {hasMultipleCameras ? (
              <button 
                  onClick={switchCamera}
                  className="flex size-14 shrink-0 items-center justify-center rounded-full bg-black/40 border border-white/10 text-white hover:bg-black/60 hover:scale-105 transition-all backdrop-blur-md"
              >
                <span className={`material-symbols-outlined text-2xl transition-transform duration-500 ${facingMode === 'user' ? '-scale-x-100' : ''}`}>flip_camera_android</span>
              </button>
            ) : (
              <div className="size-14"></div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default DiagnosticCapture;
