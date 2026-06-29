
import React from 'react';
import { ScreenName } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';

interface ResponsiveNavProps {
  navigate: (screen: ScreenName) => void;
  currentScreen: ScreenName;
}

const ResponsiveNav: React.FC<ResponsiveNavProps> = ({ navigate, currentScreen }) => {
  const { t } = useTranslation();
  const { isSidebarCollapsed, toggleSidebar } = useNavigation();

  const navItems = [
    { name: t('nav.home'), icon: 'home', screen: ScreenName.DASHBOARD },
    { name: t('nav.repairs'), icon: 'build', screen: ScreenName.REPAIRS },
    { name: t('nav.status'), icon: 'hub', screen: ScreenName.SYSTEM_STATUS },
    { name: t('nav.settings'), icon: 'settings', screen: ScreenName.SETTINGS },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation (Hidden on md and up) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-card-dark border-t border-slate-700/50 flex justify-around items-center px-4 z-50">
        {navItems.map((item) => {
          const isActive = currentScreen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => navigate(item.screen)}
              className={`flex flex-col items-center justify-center w-16 transition-colors ${
                isActive ? 'text-primary-green' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className="text-xs mt-1 font-medium truncate w-full text-center">{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Sidebar Navigation (Hidden on sm and down) */}
      <div 
        className={`hidden md:flex fixed top-0 left-0 bottom-0 bg-card-dark border-r border-slate-700/50 flex-col z-50 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`p-6 flex items-center border-b border-slate-700/50 h-[80px] ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
           <span className="material-symbols-outlined text-primary-green shrink-0" style={{ fontSize: '32px' }}>engineering</span>
           {!isSidebarCollapsed && (
             <span className="text-xl font-bold tracking-tight text-white animate-in fade-in duration-200">MachMind AI</span>
           )}
        </div>
        
        <div className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto overflow-x-hidden">
            {navItems.map((item) => {
            const isActive = currentScreen === item.screen;
            return (
                <button
                key={item.screen}
                onClick={() => navigate(item.screen)}
                title={isSidebarCollapsed ? item.name : ''}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
                    isActive ? 'bg-primary-green/10 text-primary-green' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                <span className={`material-symbols-outlined ${isActive ? 'filled' : ''} shrink-0`}>
                    {item.icon}
                </span>
                {!isSidebarCollapsed && (
                    <span className="text-base font-medium animate-in fade-in slide-in-from-left-2 duration-200">{item.name}</span>
                )}
                </button>
            );
            })}
        </div>

        <div className="p-3 border-t border-slate-700/50 flex flex-col gap-2">
            <button className={`flex items-center gap-3 text-slate-400 hover:text-white transition-colors px-4 py-2 w-full ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <span className="material-symbols-outlined shrink-0">help</span>
                {!isSidebarCollapsed && <span className="text-sm font-medium animate-in fade-in">Support</span>}
            </button>
            
            <button 
                onClick={toggleSidebar}
                className="flex items-center justify-center w-full h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors mt-2"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                <span className="material-symbols-outlined">
                    {isSidebarCollapsed ? 'chevron_right' : 'chevron_left'}
                </span>
            </button>
        </div>
      </div>
    </>
  );
};

export default ResponsiveNav;
