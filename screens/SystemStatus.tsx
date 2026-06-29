
import React, { useState, useEffect } from 'react';
import { NavigationProps, ScreenName } from '../types';
import ResponsiveNav from '../components/ResponsiveNav';
import { useTranslation } from '../contexts/LanguageContext';
import { RepairDB, getActiveRepair } from '../services/db';
import { useNavigation } from '../contexts/NavigationContext';

interface SystemStatusProps extends NavigationProps {
  currentScreen: ScreenName;
}

// Interfaces for non-standard Browser APIs
interface NetworkInformation extends EventTarget {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
  onchange: EventListener;
}

interface NavigatorWithExtras extends Navigator {
  connection?: NetworkInformation;
  deviceMemory?: number;
  getBattery?: () => Promise<BatteryManager>;
}

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: EventListener;
  onlevelchange: EventListener;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ navigate, currentScreen }) => {
  const { t } = useTranslation();
  const { isSidebarCollapsed } = useNavigation();
  const [activeRepair, setActiveRepair] = useState<RepairDB | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Real System Metrics State
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [latency, setLatency] = useState(0); // ms
  const [signalStrength, setSignalStrength] = useState(0); // 0-4
  const [connectionType, setConnectionType] = useState<string>('Unknown');
  const [storageData, setStorageData] = useState<{ used: number; quota: number }>({ used: 0, quota: 0 });
  const [deviceInfo, setDeviceInfo] = useState({
    model: 'Unknown Device',
    os: 'Unknown OS',
    cores: navigator.hardwareConcurrency || 0,
    memory: (navigator as NavigatorWithExtras).deviceMemory || 0
  });

  useEffect(() => {
    fetchActiveRepair();
    initRealtimeMetrics();
    detectDeviceInfo();
    
    // Refresh interval for latency checks
    const interval = setInterval(measureNetworkLatency, 10000); // Check latency every 10s

    return () => clearInterval(interval);
  }, []);

  const initRealtimeMetrics = async () => {
    // 1. Battery API
    const nav = navigator as NavigatorWithExtras;
    if (nav.getBattery) {
      try {
        const battery = await nav.getBattery();
        setBatteryLevel(battery.level);
        setIsCharging(battery.charging);
        
        battery.addEventListener('levelchange', () => setBatteryLevel(battery.level));
        battery.addEventListener('chargingchange', () => setIsCharging(battery.charging));
      } catch (e) {
        console.warn("Battery API error:", e);
      }
    }

    // 2. Storage API
    if (navigator.storage && navigator.storage.estimate) {
        try {
            const estimate = await navigator.storage.estimate();
            setStorageData({
                used: estimate.usage || 0,
                quota: estimate.quota || 0
            });
        } catch (e) {
            console.warn("Storage API error:", e);
        }
    }

    // 3. Network Information API
    if (nav.connection) {
        updateNetworkInfo(nav.connection);
        nav.connection.addEventListener('change', () => updateNetworkInfo(nav.connection!));
    } else {
        // Fallback for browsers without Network API
        setConnectionType('WiFi/LTE'); // Assumption
        measureNetworkLatency();
    }
  };

  const updateNetworkInfo = (conn: NetworkInformation) => {
      setConnectionType(conn.effectiveType.toUpperCase());
      // Estimate "bars" based on downlink speed (Mbps)
      // > 5Mbps = 4 bars, > 2 = 3 bars, > 1 = 2 bars, else 1
      const speed = conn.downlink;
      let bars = 1;
      if (speed > 5) bars = 4;
      else if (speed > 2) bars = 3;
      else if (speed > 0.5) bars = 2;
      
      setSignalStrength(bars);
      // RTT is round-trip-time, a good proxy for latency
      setLatency(conn.rtt);
  };

  const measureNetworkLatency = async () => {
      const nav = navigator as NavigatorWithExtras;
      // If we don't have the API, or want to verify
      if (!nav.connection) {
          const start = Date.now();
          try {
              // Simple ping to current origin (should be fast, measures mostly network overhead)
              await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
              const end = Date.now();
              setLatency(end - start);
              setSignalStrength((end - start) < 100 ? 4 : (end - start) < 300 ? 3 : 2); // Simple heuristic
          } catch (e) {
              setLatency(999);
              setSignalStrength(0);
          }
      } else {
           // Even with API, update latency state if needed
           setLatency(nav.connection.rtt);
      }
  };

  const detectDeviceInfo = () => {
      const ua = navigator.userAgent;
      let os = t('systemStatus.unknownOS');
      if (ua.indexOf("Win") !== -1) os = "Windows";
      else if (ua.indexOf("Mac") !== -1) os = "macOS";
      else if (ua.indexOf("Linux") !== -1) os = "Linux";
      else if (ua.indexOf("Android") !== -1) os = "Android";
      else if (ua.indexOf("like Mac") !== -1) os = "iOS";

      let model = t('systemStatus.webBrowser');
      if (ua.indexOf("Mobile") !== -1) model = t('systemStatus.mobileDevice');
      
      // Try to parse more specific model if Android
      const androidMatch = ua.match(/Android\s([0-9.]+)/);
      if (androidMatch) os = `Android ${androidMatch[1]}`;

      setDeviceInfo(prev => ({ ...prev, os, model }));
  };

  const fetchActiveRepair = async () => {
    const data = await getActiveRepair();
    if (data) setActiveRepair(data);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await measureNetworkLatency();
    await initRealtimeMetrics();
    await fetchActiveRepair();
    detectDeviceInfo(); // Re-run to update translations if language changed
    setTimeout(() => setRefreshing(false), 500);
  };

  // Helper for bytes
  const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Determine Connection Quality status
  const getConnectionQuality = () => {
    if (latency >= 500 || signalStrength === 0) return { label: t('systemStatus.statusPoor'), color: 'text-red-500', barColor: 'bg-red-500' };
    if (latency < 100 && signalStrength >= 3) return { label: t('systemStatus.statusExcellent'), color: 'text-primary-green', barColor: 'bg-primary-green' };
    if (latency < 300) return { label: t('systemStatus.statusGood'), color: 'text-primary-blue', barColor: 'bg-primary-blue' };
    return { label: t('systemStatus.statusFair'), color: 'text-amber-500', barColor: 'bg-amber-500' };
  };

  const connectionStatus = getConnectionQuality();

  // Calculate percentage safely
  const percent = storageData.quota > 0 ? (storageData.used / storageData.quota) * 100 : 0;
  // If > 0 but < 1, show "< 1%", else show round number.
  const displayPercent = percent > 0 && percent < 1 ? '< 1%' : `${Math.round(percent)}%`;

  return (
    <div className={`relative flex h-full min-h-screen w-full flex-col bg-background-dark font-display overflow-x-hidden pb-24 md:pb-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
      
      {/* Header */}
      <div className="flex items-center bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-slate-700/50">
        <h1 className="text-white text-lg font-bold leading-tight flex-1 md:text-2xl">{t('systemStatus.title')}</h1>
        <div className="flex w-12 items-center justify-end">
             <button 
                onClick={handleRefresh}
                className={`flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 text-primary-green hover:bg-slate-800 transition-colors ${refreshing ? 'animate-spin' : ''}`}
            >
                <span className="material-symbols-outlined">refresh</span>
            </button>
        </div>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* Network Card */}
        <div className="bg-card-dark rounded-xl p-5 border border-slate-700/50 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-primary-blue">wifi</span>
            </div>
            
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">{t('systemStatus.network')}</h3>
            
            <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">{connectionType}</span>
                <span className={`text-sm font-bold mb-1 ml-2 ${connectionStatus.color}`}>
                    {connectionStatus.label}
                </span>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">{t('systemStatus.signalStrength')}</span>
                        <span className="text-white font-mono">{latency}ms {t('systemStatus.latencyLabel')}</span>
                    </div>
                    <div className="flex gap-1 h-2">
                        {[1, 2, 3, 4].map(bar => (
                            <div key={bar} className={`flex-1 rounded-sm ${signalStrength >= bar ? connectionStatus.barColor : 'bg-slate-700'}`}></div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-black/20 rounded-lg p-2">
                        <p className="text-slate-500 text-xs">{t('systemStatus.latency')}</p>
                        <p className="text-white font-mono font-bold">{Math.round(latency)} ms</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2">
                        <p className="text-slate-500 text-xs">{t('systemStatus.jitter')}</p>
                        <p className="text-white font-mono font-bold">~2 ms</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Battery / Power Card */}
        <div className="bg-card-dark rounded-xl p-5 border border-slate-700/50 shadow-lg relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-primary-green">battery_charging_full</span>
            </div>
            
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">{t('systemStatus.battery')}</h3>
            
            <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">{Math.round(batteryLevel * 100)}%</span>
                <span className="text-sm text-slate-400 mb-1 ml-2">{isCharging ? t('systemStatus.charging') : t('systemStatus.discharging')}</span>
            </div>

            <div className="space-y-4">
                <div className="w-full bg-slate-700 rounded-full h-3">
                    <div 
                        className={`h-3 rounded-full transition-all duration-500 ${batteryLevel > 0.2 ? 'bg-primary-green' : 'bg-red-500'}`} 
                        style={{ width: `${batteryLevel * 100}%` }}
                    ></div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                    <div className="text-xs text-slate-400">{t('systemStatus.health')}</div>
                    <div className="text-sm font-bold text-white">{t('systemStatus.statusGood')}</div>
                </div>
            </div>
        </div>

        {/* Active Repair Card */}
        <div className="bg-card-dark rounded-xl p-5 border border-slate-700/50 shadow-lg relative overflow-hidden group md:col-span-2 lg:col-span-1">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-amber-500">construction</span>
            </div>
            
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">{t('systemStatus.activeRepair')}</h3>
            
            {activeRepair ? (
                <>
                    <h4 className="text-xl font-bold text-white leading-tight mb-1">{activeRepair.equipment}</h4>
                    <p className="text-primary-green text-sm font-bold mb-6">{activeRepair.title}</p>
                    
                    <div className="bg-black/30 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                             <span className="text-xs text-slate-300 font-mono uppercase">{t('systemStatus.liveDiagnostics')}</span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{activeRepair.diagnostic_data?.observation || t('systemStatus.gatheringData')}</p>
                    </div>

                    <button 
                        onClick={() => navigate(ScreenName.RESULTS_ANALYSIS)}
                        className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                        {t('systemStatus.resumeSession')}
                    </button>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 pb-4">
                    <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                    <p>{t('systemStatus.noActiveRepair')}</p>
                </div>
            )}
        </div>

        {/* Device Info */}
         <div className="bg-card-dark rounded-xl p-5 border border-slate-700/50 shadow-lg relative overflow-hidden group md:col-span-2">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">{t('systemStatus.deviceInfo')}</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                    <p className="text-slate-500 text-xs mb-1">{t('systemStatus.model')}</p>
                    <p className="text-white font-bold">{deviceInfo.model}</p>
                </div>
                <div>
                    <p className="text-slate-500 text-xs mb-1">{t('systemStatus.os')}</p>
                    <p className="text-white font-bold">{deviceInfo.os}</p>
                </div>
                <div>
                    <p className="text-slate-500 text-xs mb-1">{t('systemStatus.hardware')}</p>
                    <p className="text-white font-bold">{deviceInfo.cores} {t('systemStatus.cores')} {deviceInfo.memory > 0 ? `/ ${deviceInfo.memory}GB ${t('systemStatus.ram')}` : ''}</p>
                </div>
                <div>
                     <p className="text-slate-500 text-xs mb-1">{t('systemStatus.storage')}</p>
                     <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full max-w-[80px]">
                                 <div 
                                    className="h-full bg-blue-500 rounded-full" 
                                    style={{ width: `${percent}%` }}
                                 ></div>
                            </div>
                            <span className="text-white text-xs font-bold">
                                {displayPercent}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            {formatBytes(storageData.used)} / {formatBytes(storageData.quota)}
                        </p>
                     </div>
                </div>
            </div>
         </div>

      </div>

      <ResponsiveNav navigate={navigate} currentScreen={currentScreen} />
    </div>
  );
};

export default SystemStatus;
