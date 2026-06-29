
import React from 'react';
import { ScreenName } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface BottomNavProps {
  navigate: (screen: ScreenName) => void;
  currentScreen: ScreenName;
}

const BottomNav: React.FC<BottomNavProps> = ({ navigate, currentScreen }) => {
  const { t } = useTranslation();
  
  const navItems = [
    { name: t('nav.home'), icon: 'home', screen: ScreenName.DASHBOARD },
    { name: t('nav.repairs'), icon: 'build', screen: ScreenName.REPAIRS },
    { name: t('nav.status'), icon: 'hub', screen: ScreenName.SYSTEM_STATUS },
    { name: t('nav.settings'), icon: 'settings', screen: ScreenName.SETTINGS },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-card-dark border-t border-slate-700/50 flex justify-around items-center px-4 max-w-md mx-auto z-50">
      {navItems.map((item) => {
        const isActive = currentScreen === item.screen;
        return (
          <button
            key={item.screen} // Changed key to screen as name is translated and might change
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
  );
};

export default BottomNav;
