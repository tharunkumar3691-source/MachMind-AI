
import React, { useState, useEffect } from 'react';
import { NavigationProps, ScreenName, DiagnosticLog } from '../types';
import ResponsiveNav from '../components/ResponsiveNav';
import { useTranslation } from '../contexts/LanguageContext';
import { RepairDB, getAllRepairs } from '../services/db';
import { useDiagnostic } from '../contexts/DiagnosticContext';
import { useNavigation } from '../contexts/NavigationContext';

interface RepairsProps extends NavigationProps {
  currentScreen?: ScreenName;
}

const Repairs: React.FC<RepairsProps> = ({ navigate, currentScreen, setSelectedId }) => {
  const { t } = useTranslation();
  const { setDiagnosticResult, setActiveRepairId } = useDiagnostic();
  const { isSidebarCollapsed } = useNavigation();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [repairs, setRepairs] = useState<RepairDB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      // RLS Policy ensures we only get the logged-in user's repairs
      const data = await getAllRepairs();
      if (data) setRepairs(data);
    } catch (error) {
      console.error('Error fetching repairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRepairClick = (repair: RepairDB) => {
    if (setSelectedId) setSelectedId(repair.id);
    setActiveRepairId(repair.id); // Sync context for DB updates
    
    // Set diagnostic data in context so AR/Verification screens have it immediately
    if (repair.diagnostic_data) {
        setDiagnosticResult(repair.diagnostic_data);
    }

    // Smart Routing based on Status
    switch (repair.status) {
        case 'IN_PROGRESS':
            navigate(ScreenName.AR_REPAIR_GUIDE);
            break;
        case 'VERIFICATION_NEEDED':
            navigate(ScreenName.VERIFICATION_SYSTEM);
            break;
        case 'DIAGNOSED':
        case 'COMPLETED':
        default:
             navigate(ScreenName.RESULTS_ANALYSIS);
             break;
    }
  };

  const filteredRepairs = repairs.filter(r => {
    // Map granular statuses to broad filters
    const isActive = r.status !== 'COMPLETED';
    const matchesFilter = filter === 'ALL' || (filter === 'ACTIVE' && isActive) || (filter === 'COMPLETED' && !isActive);
    
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.equipment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getFilterLabel = (f: 'ALL' | 'ACTIVE' | 'COMPLETED') => {
    switch(f) {
      case 'ALL': return t('repairs.filterAll');
      case 'ACTIVE': return t('repairs.filterActive');
      case 'COMPLETED': return t('repairs.filterCompleted');
      default: return f;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'COMPLETED': return 'bg-transparent text-slate-400 border border-slate-600';
          case 'VERIFICATION_NEEDED': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
          case 'IN_PROGRESS': return 'bg-green-500/10 text-green-500 border border-green-500/20';
          default: return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      }
  };

  return (
    <div className={`relative flex h-full min-h-screen w-full flex-col bg-background-dark font-display overflow-x-hidden pb-24 md:pb-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
      <div className="flex items-center bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-slate-700/50 min-h-[64px]">
        {isSearchVisible ? (
          <div className="flex flex-1 items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-200">
             <button onClick={() => { setIsSearchVisible(false); setSearchQuery(''); }} className="text-slate-400">
                <span className="material-symbols-outlined">arrow_back</span>
             </button>
             <input 
                autoFocus
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('repairs.searchPlaceholder')} 
                className="flex-1 bg-card-dark border border-slate-700/50 rounded-lg py-1.5 px-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-green focus:ring-1 focus:ring-primary-green"
             />
          </div>
        ) : (
          <>
            <h1 className="text-white text-lg font-bold leading-tight flex-1 md:text-2xl">{t('repairs.title')}</h1>
            <div className="flex w-12 items-center justify-end">
                <button 
                  onClick={() => setIsSearchVisible(true)}
                  className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 text-slate-400 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">search</span>
                </button>
            </div>
          </>
        )}
      </div>

      <div className="p-4 md:p-6 max-w-5xl">
        {/* Filter Tabs */}
        <div className="flex bg-card-dark rounded-lg p-1 mb-6 border border-slate-700/50 max-w-md">
          {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${
                filter === f ? 'bg-primary-green text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {getFilterLabel(f)}
            </button>
          ))}
        </div>

        {/* Repairs List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {loading ? (
             <div className="col-span-full flex justify-center py-10">
               <span className="material-symbols-outlined animate-spin text-primary-green text-4xl">progress_activity</span>
             </div>
          ) : filteredRepairs.length > 0 ? (
            filteredRepairs.map((item) => (
              <div 
                key={item.id} 
                onClick={() => handleRepairClick(item)}
                className="group relative flex flex-col justify-between bg-card-dark rounded-xl p-5 border border-white/5 hover:border-primary-green/50 hover:bg-white/[0.02] transition-all cursor-pointer min-h-[160px]"
              >
                 {/* Card Header: Equipment Name & Status */}
                 <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider truncate max-w-[60%]">
                        {item.equipment}
                    </h3>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                    </span>
                 </div>

                 {/* Card Body: Title (Truncated) */}
                 <div className="flex-1 mb-4">
                    <h2 className="text-white text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary-green transition-colors">
                        {item.title}
                    </h2>
                    {/* Optional: Add a subtle preview of observation if needed, also truncated */}
                    {item.diagnostic_data?.observation && (
                        <p className="text-slate-500 text-xs mt-2 line-clamp-2">
                            {item.diagnostic_data.observation}
                        </p>
                    )}
                 </div>

                 {/* Card Footer: Metadata */}
                 <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                            {formatTimeAgo(item.created_at)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            <span className="truncate max-w-[80px]">{item.technician_name}</span>
                        </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all">chevron_right</span>
                 </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-500 col-span-full">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                <p>{t('repairs.noResults')} "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={() => navigate(ScreenName.DIAGNOSTIC_CAPTURE)}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 h-14 w-14 rounded-full bg-primary-green text-black shadow-lg shadow-green-500/30 flex items-center justify-center hover:bg-green-400 transition-all hover:scale-105 z-20"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      <ResponsiveNav navigate={navigate} currentScreen={currentScreen || ScreenName.REPAIRS} />
    </div>
  );
};

export default Repairs;
