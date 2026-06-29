
import React from 'react';
import { NavigationProps, ScreenName } from '../types';
import ResponsiveNav from '../components/ResponsiveNav';
import { useTranslation } from '../contexts/LanguageContext';
import { Language } from '../i18n/translations';
import { useNavigation } from '../contexts/NavigationContext';

interface SettingsProps extends NavigationProps {
  currentScreen: ScreenName;
}

const Settings: React.FC<SettingsProps> = ({ navigate, currentScreen }) => {
  const { language, setLanguage, t } = useTranslation();
  const { isSidebarCollapsed } = useNavigation();

  return (
    <div className={`relative flex h-full min-h-screen w-full flex-col bg-background-dark font-display overflow-x-hidden pb-24 md:pb-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
      <div className="flex items-center bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-slate-700/50">
        <h1 className="text-white text-lg font-bold leading-tight flex-1 md:text-2xl">{t('settings.title')}</h1>
      </div>

      <div className="p-4 space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0 md:max-w-4xl">

        {/* Section: Language */}
        <div className="space-y-3">
          <h3 className="text-primary-green text-sm font-bold uppercase tracking-wider">{t('settings.language')}</h3>
          <div className="bg-card-dark rounded-lg overflow-hidden border border-slate-700/30">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">translate</span>
                <p className="text-white font-medium">{t('settings.language')}</p>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-background-dark border border-slate-600 rounded-md px-3 py-1 text-white text-sm focus:outline-none focus:border-primary-green"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section: AR */}
        <div className="space-y-3">
          <h3 className="text-primary-green text-sm font-bold uppercase tracking-wider">{t('settings.ar')}</h3>
          <div className="bg-card-dark rounded-lg overflow-hidden border border-slate-700/30">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">view_in_ar</span>
                <div>
                  <p className="text-white font-medium">{t('settings.autoDetection')}</p>
                  <p className="text-slate-400 text-xs">{t('settings.autoDetectionDesc')}</p>
                </div>
              </div>
              <div className="w-10 h-6 bg-primary-green rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">layers</span>
                <div>
                  <p className="text-white font-medium">{t('settings.ghostOverlays')}</p>
                  <p className="text-slate-400 text-xs">{t('settings.ghostOverlaysDesc')}</p>
                </div>
              </div>
              <div className="w-10 h-6 bg-primary-green rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Notifications */}
        <div className="space-y-3">
          <h3 className="text-primary-green text-sm font-bold uppercase tracking-wider">{t('settings.notifications')}</h3>
          <div className="bg-card-dark rounded-lg overflow-hidden border border-slate-700/30">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">notifications</span>
                <p className="text-white font-medium">{t('settings.pushNotifications')}</p>
              </div>
              <div className="w-10 h-6 bg-primary-green rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">mail</span>
                <p className="text-white font-medium">{t('settings.emailAlerts')}</p>
              </div>
              <div className="w-10 h-6 bg-slate-700 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Account */}
        <div className="space-y-3 md:col-span-2">
          <h3 className="text-primary-green text-sm font-bold uppercase tracking-wider">{t('settings.account')}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate(ScreenName.PROFILE)}
              className="w-full bg-card-dark rounded-lg border border-slate-700/30 p-4 flex items-center justify-between group hover:border-slate-500 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">person</span>
                <p className="text-white font-medium">{t('settings.profileSettings')}</p>
              </div>
              <span className="material-symbols-outlined text-slate-500">chevron_right</span>
            </button>

            {/* Session Info — no login/logout */}
            <div className="w-full bg-card-dark rounded-lg border border-slate-700/30 p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-green">verified_user</span>
              <div>
                <p className="text-white font-medium text-sm">Anonymous Session</p>
                <p className="text-slate-500 text-xs">No authentication required</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <ResponsiveNav navigate={navigate} currentScreen={currentScreen} />
    </div>
  );
};

export default Settings;
