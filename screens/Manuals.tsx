
import React, { useState, useEffect } from 'react';
import { NavigationProps, ScreenName } from '../types';
import ResponsiveNav from '../components/ResponsiveNav';
import { useTranslation } from '../contexts/LanguageContext';
import { ManualDB, getManuals } from '../services/db';
import { useNavigation } from '../contexts/NavigationContext';

interface ManualsProps extends NavigationProps {
  currentScreen: ScreenName;
}

const Manuals: React.FC<ManualsProps> = ({ navigate, currentScreen, selectedId, setSelectedId }) => {
  const { t } = useTranslation();
  const { isSidebarCollapsed } = useNavigation();
  const [manuals, setManuals] = useState<ManualDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchManuals();
  }, []);

  // Effect to handle incoming search parameters from other screens (like AR View)
  useEffect(() => {
    if (selectedId && typeof selectedId === 'string') {
        setSearchQuery(selectedId);
        // Clear the ID so it doesn't persist if they navigate away and back without intention
        if (setSelectedId) setSelectedId(null);
    }
  }, [selectedId, setSelectedId]);

  const fetchManuals = async () => {
    try {
      setLoading(true);
      const data = await getManuals();
      if (data) setManuals(data);
    } catch (error) {
      console.error('Error fetching manuals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredManuals = manuals.filter(manual => {
     const matchesCategory = selectedCategory === 'All' || manual.category === selectedCategory;
     const matchesSearch = manual.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           manual.description?.toLowerCase().includes(searchQuery.toLowerCase());
     return matchesCategory && matchesSearch;
  });

  return (
    <div className={`relative flex h-full min-h-screen w-full flex-col bg-background-dark font-display overflow-x-hidden pb-24 md:pb-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
      <div className="flex items-center bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-slate-700/50">
        <h1 className="text-white text-lg font-bold leading-tight flex-1 md:text-2xl">{t('manuals.title')}</h1>
        <div className="flex w-12 items-center justify-end">
            <button 
                onClick={() => navigate(ScreenName.UPLOAD_MANUAL)}
                className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 text-primary-green hover:bg-slate-800 transition-colors"
            >
                <span className="material-symbols-outlined">cloud_upload</span>
            </button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Search Bar */}
        <div className="relative mb-6 max-w-2xl">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('manuals.searchPlaceholder')}
            className="w-full bg-card-dark border border-slate-700/50 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-green focus:ring-1 focus:ring-primary-green transition-all"
          />
          {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                  <span className="material-symbols-outlined text-lg">close</span>
              </button>
          )}
        </div>

        {/* Categories (Horizontal Scroll) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4">
          {['All', 'Hydraulics', 'Pneumatics', 'Electrical', 'HVAC', 'Automation', 'Logistics'].map((cat, i) => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border border-slate-700/50 transition-colors cursor-pointer ${selectedCategory === cat ? 'bg-white text-background-dark border-white hover:bg-slate-200' : 'bg-card-dark text-slate-300 hover:border-slate-400 hover:text-white'}`}
            >
              {cat === 'All' ? t('manuals.categories.all') : t(`manuals.categories.${cat.toLowerCase()}`)}
            </button>
          ))}
        </div>

        {/* Manual Grid - Responsive Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {loading ? (
             <div className="col-span-full flex justify-center py-10">
               <span className="material-symbols-outlined animate-spin text-primary-green text-4xl">progress_activity</span>
             </div>
          ) : filteredManuals.length > 0 ? filteredManuals.map((manual) => (
            <div key={manual.id} className="bg-card-dark rounded-lg overflow-hidden border border-slate-700/30 group cursor-pointer hover:border-slate-500 hover:shadow-lg transition-all transform hover:-translate-y-1">
              <div className="h-32 md:h-40 bg-center bg-cover relative" style={{ backgroundImage: `url('${manual.image_url}')` }}>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-3xl">visibility</span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-white text-sm font-bold truncate">{manual.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{manual.category}</p>
              </div>
            </div>
          )) : (
              <div className="col-span-full text-center py-10 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                  <p>No manuals found for "{searchQuery}"</p>
                  <button onClick={() => setSearchQuery('')} className="mt-2 text-primary-green text-sm hover:underline">Clear Search</button>
              </div>
          )}
        </div>
      </div>

      <ResponsiveNav navigate={navigate} currentScreen={currentScreen} />
    </div>
  );
};

export default Manuals;
