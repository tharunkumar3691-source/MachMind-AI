
import React, { useState } from 'react';
import { ScreenName } from './types';
import Dashboard from './screens/Dashboard';
import DiagnosticCapture from './screens/DiagnosticCapture';
import ResultsAnalysis from './screens/ResultsAnalysis';
import ARRepairGuide from './screens/ARRepairGuide';
import VerificationSystem from './screens/VerificationSystem';
import Repairs from './screens/Repairs';
import Settings from './screens/Settings';
import Profile from './screens/Profile';
import Manuals from './screens/Manuals';
import UploadManual from './screens/UploadManual';
import SystemStatus from './screens/SystemStatus';
import { LanguageProvider } from './contexts/LanguageContext';
import { DiagnosticProvider } from './contexts/DiagnosticContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './screens/Login';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ScreenName>(ScreenName.DASHBOARD);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  const navigate = (screen: ScreenName) => {
    if (screen === ScreenName.DASHBOARD || screen === ScreenName.DIAGNOSTIC_CAPTURE) {
      setSelectedId(null);
    }
    setCurrentScreen(screen);
    window.scrollTo(0, 0);
  };

  const navProps = {
    navigate,
    currentScreen,
    selectedId,
    setSelectedId
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case ScreenName.DASHBOARD:
        return <Dashboard {...navProps} />;
      case ScreenName.DIAGNOSTIC_CAPTURE:
        return <DiagnosticCapture {...navProps} />;
      case ScreenName.RESULTS_ANALYSIS:
        return <ResultsAnalysis {...navProps} />;
      case ScreenName.AR_REPAIR_GUIDE:
        return <ARRepairGuide {...navProps} />;
      case ScreenName.VERIFICATION_SYSTEM:
        return <VerificationSystem {...navProps} />;
      case ScreenName.REPAIRS:
        return <Repairs {...navProps} />;
      case ScreenName.SETTINGS:
        return <Settings {...navProps} />;
      case ScreenName.PROFILE:
        return <Profile {...navProps} />;
      case ScreenName.MANUALS:
        return <Manuals {...navProps} />;
      case ScreenName.UPLOAD_MANUAL:
        return <UploadManual {...navProps} />;
      case ScreenName.SYSTEM_STATUS:
        return <SystemStatus {...navProps} />;
      default:
        return <Dashboard {...navProps} />;
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background-dark text-primary-green">
        <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="font-display text-white min-h-screen w-full bg-background-dark relative overflow-hidden">
      {renderScreen()}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <DiagnosticProvider>
          <NavigationProvider>
            <AppContent />
          </NavigationProvider>
        </DiagnosticProvider>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
