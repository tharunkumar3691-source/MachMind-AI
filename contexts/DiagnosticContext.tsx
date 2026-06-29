
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DiagnosticLog, TelemetryData } from '../types';

interface DiagnosticContextProps {
  videoBlob: Blob | null;
  setVideoBlob: (blob: Blob | null) => void;
  mimeType: string;
  setMimeType: (type: string) => void;
  diagnosticResult: DiagnosticLog | null;
  setDiagnosticResult: (result: DiagnosticLog | null) => void;
  activeRepairId: number | null;
  setActiveRepairId: (id: number | null) => void;
  telemetryData: TelemetryData | null;
  setTelemetryData: (data: TelemetryData | null) => void;
}

const DiagnosticContext = createContext<DiagnosticContextProps | undefined>(undefined);

export const DiagnosticProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState<string>('video/webm');
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticLog | null>(null);
  const [activeRepairId, setActiveRepairId] = useState<number | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);

  return (
    <DiagnosticContext.Provider value={{ 
      videoBlob, 
      setVideoBlob, 
      mimeType, 
      setMimeType,
      diagnosticResult,
      setDiagnosticResult,
      activeRepairId,
      setActiveRepairId,
      telemetryData,
      setTelemetryData
    }}>
      {children}
    </DiagnosticContext.Provider>
  );
};

export const useDiagnostic = () => {
  const context = useContext(DiagnosticContext);
  if (!context) {
    throw new Error('useDiagnostic must be used within a DiagnosticProvider');
  }
  return context;
};
