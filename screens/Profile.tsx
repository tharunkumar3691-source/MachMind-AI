
import React, { useState, useRef, useEffect } from 'react';
import { NavigationProps, ScreenName, LocalSession, DEFAULT_SESSION } from '../types';
import { RepairDB, getRecentRepairs } from '../services/db';
import { useTranslation } from '../contexts/LanguageContext';
import { useLocalSession } from '../contexts/AuthContext';

const Profile: React.FC<NavigationProps> = ({ navigate }) => {
  const { t } = useTranslation();
  const { session, updateSession, resetSession } = useLocalSession();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recentRepairs, setRecentRepairs] = useState<RepairDB[]>([]);

  const [profileData, setProfileData] = useState<LocalSession>({ ...session });

  useEffect(() => {
    fetchUserRepairs();
  }, []);

  useEffect(() => {
    setProfileData({ ...session });
  }, [session]);

  const fetchUserRepairs = async () => {
    try {
      setLoading(true);
      const data = await getRecentRepairs();
      if (data) setRecentRepairs(data);
    } catch (e) {
      console.error('Error fetching history', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    updateSession(profileData);
  };

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData(prev => ({ ...prev, avatar_url: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background-dark text-primary-green">
        <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col bg-background-dark font-display overflow-x-hidden">
      {/* Top App Bar */}
      <div className="flex items-center p-4 pb-2 pt-6 justify-between sticky top-0 bg-background-dark z-10 border-b border-slate-700/50">
        <button
          onClick={() => navigate(ScreenName.DASHBOARD)}
          className="flex size-12 shrink-0 items-center justify-start text-[#E2E8F0] hover:text-white"
        >
          <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
        </button>
        <h2 className="text-[#E2E8F0] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('profile.title')}</h2>
        <div className="flex size-12 shrink-0 items-center justify-end">
          {isEditing ? (
            <button onClick={handleSave} className="text-primary-green font-bold text-sm">{t('profile.save')}</button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="text-primary-green font-medium text-sm">{t('profile.edit')}</button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center pt-8 pb-8 px-4 bg-card-dark/50">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />

        <div
          onClick={handleAvatarClick}
          className={`w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center mb-4 border-2 border-primary-green shadow-[0_0_15px_rgba(0,255,0,0.2)] relative group overflow-hidden ${isEditing ? 'cursor-pointer' : ''}`}
        >
          {profileData.avatar_url ? (
            <img src={profileData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-white text-5xl">person</span>
          )}

          {isEditing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity opacity-100 hover:opacity-80">
              <span className="material-symbols-outlined text-white">camera_alt</span>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-2 items-center w-full max-w-xs animate-in fade-in zoom-in-95 duration-200">
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="bg-background-dark border border-primary-green rounded px-2 py-1 text-white text-xl font-bold text-center w-full"
              placeholder={t('profile.fullName')}
            />
            <div className="flex gap-2 w-full">
              <input
                type="text"
                value={profileData.title}
                onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                className="bg-background-dark border border-slate-600 focus:border-primary-green rounded px-2 py-1 text-slate-300 text-sm font-medium text-center w-2/3 outline-none"
                placeholder={t('profile.jobTitle')}
              />
              <input
                type="text"
                value={profileData.technician_id}
                onChange={(e) => setProfileData({ ...profileData, technician_id: e.target.value })}
                className="bg-background-dark border border-slate-600 focus:border-primary-green rounded px-2 py-1 text-slate-300 text-sm font-medium text-center w-1/3 outline-none"
                placeholder={t('profile.id')}
              />
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-white text-2xl font-bold">{profileData.name || t('profile.user')}</h1>
            <p className="text-slate-400 text-sm font-medium mt-1">
              {profileData.title || t('profile.setJobTitle')} • {t('profile.id')}: {profileData.technician_id || '---'}
            </p>
            <p className="text-slate-500 text-xs mt-1">Google OAuth Session</p>
          </>
        )}

        <div className="flex gap-4 mt-6 w-full max-w-xs flex-col">
          <div className="flex-1 bg-background-dark rounded-lg p-3 text-center border border-slate-700/50">
            <p className="text-2xl font-bold text-white">{recentRepairs.length}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wide">{t('profile.repairs')}</p>
          </div>
          <button
            onClick={resetSession}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 mt-2 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-white text-lg font-bold mb-3">{t('profile.recentActivity')}</h3>
          <div className="pl-4 border-l-2 border-slate-700 space-y-6">
            {recentRepairs.length > 0 ? (
              recentRepairs.map((repair) => (
                <div key={repair.id} className="relative">
                  <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${repair.status === 'COMPLETED' ? 'bg-primary-green shadow-[0_0_8px_rgba(0,255,0,0.5)]' : 'bg-slate-600'}`}></div>
                  <p className="text-white text-sm font-medium">
                    {repair.status === 'COMPLETED' ? t('profile.repairCompleted') : t('profile.diagnosticStarted')} {repair.equipment}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    {new Date(repair.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, {new Date(repair.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm italic">{t('profile.noRecentActivity')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
