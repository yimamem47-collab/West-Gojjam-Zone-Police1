import React from 'react';
import { 
  Shield, 
  Users, 
  ClipboardList, 
  FileText, 
  TrendingUp,
  Plus,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Camera,
  Facebook,
  Send,
  Volume2,
  Lock,
  CheckCircle,
  ShieldAlert,
  Map as MapIcon,
  Car,
  Globe,
  Settings
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'motion/react';
import { Incident, Officer, Assignment, Report, ZoneReport, User } from '../types';
import { Language, translations } from '../lib/translations';
import { openUrl, dialPhone } from '../lib/utils';
import { CrimeMap } from './CrimeMap';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  onClick?: () => void;
}

function StatCard({ label, value, icon: Icon, color = "text-brand-accent", onClick }: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`glass-card p-4 lg:p-6 hover:scale-[1.02] transition-all border-brand-accent/10 ${onClick ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-brand-accent/10 rounded-xl border border-brand-accent/20">
          <Icon size={24} className={color} />
        </div>
        <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
          <TrendingUp size={10} />
          <span>+12%</span>
        </div>
      </div>
      <p className="text-brand-text-secondary text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-3xl font-black tracking-tight text-white">{value}</h3>
    </div>
  );
}

interface DashboardProps {
  user: User | null;
  incidents: Incident[];
  officers: Officer[];
  assignments: Assignment[];
  reports: Report[];
  zoneReports: ZoneReport[];
  lang: Language;
  onQuickAction: (action: string) => void;
  onCorruptionReport: () => void;
  onUpdateIncident: (id: string, updates: Partial<Incident>) => void;
  onDeleteIncident: (id: string) => void;
  onUpdateReport: (id: string, updates: Partial<Report>) => void;
  onDeleteReport: (id: string) => void;
}

export function Dashboard({ 
  user,
  incidents, 
  officers, 
  assignments, 
  reports, 
  zoneReports,
  lang, 
  onQuickAction,
  onCorruptionReport,
  onUpdateIncident,
  onDeleteIncident,
  onUpdateReport,
  onDeleteReport
}: DashboardProps) {
  const t = translations[lang];
  
  const chartData = [
    { name: 'ሰኞ', value: 12 },
    { name: 'ማክሰኞ', value: 19 },
    { name: 'ረቡዕ', value: 15 },
    { name: 'ሐሙስ', value: 22 },
    { name: 'ዓርብ', value: 30 },
    { name: 'ቅዳሜ', value: 25 },
    { name: 'እሁድ', value: 18 },
  ];
  
  const [dashboardSearch, setDashboardSearch] = React.useState('');
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ id: string; type: string } | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const { clearFirestoreCache } = await import('../firebase');
      await clearFirestoreCache();
      // Wait for a moment to let persistence clear
      await new Promise(resolve => setTimeout(resolve, 800));
      // Force reload the entire app for a clean state
      window.location.reload();
    } catch (err) {
      console.error("Sync failed:", err);
      setIsSyncing(false);
    }
  };

  const crimeIncidents = incidents.filter(i => i.type === 'Crime');
  const trafficIncidents = incidents.filter(i => i.type === 'Traffic');

  const recentActivities = React.useMemo(() => {
    const list = [
      ...incidents.map(i => ({ 
        id: i.id,
        type: i.type === 'Traffic' ? (lang === 'am' ? 'ትራፊክ' : 'Traffic') : t.crime, 
        icon: i.type === 'Traffic' ? Car : ShieldAlert,
        iconColor: i.type === 'Traffic' ? 'text-brand-accent' : 'text-rose-400',
        rawType: 'incident',
        title: i.title, 
        time: i.date, 
        status: i.status,
        station: i.filingStation,
        officer: `${(t.ranks as any)[i.recordingOfficerRank] || ''} ${i.recordingOfficerName || ''}`.trim(),
        officerId: i.officerId,
        voice_url: i.voice_url
      })),
      ...reports.map(r => ({ 
        id: r.id,
        type: t.reports || 'Report', 
        icon: FileText,
        iconColor: 'text-emerald-400',
        rawType: 'report',
        title: r.title, 
        time: r.date, 
        status: r.status,
        station: r.filingStation,
        officer: `${(t.ranks as any)[r.recordingOfficerRank] || ''} ${r.recordingOfficerName || ''}`.trim(),
        officerId: r.officerId,
        voice_url: r.voice_url
      })),
    ];

    return list
      .filter(activity => {
        const officer = officers.find(o => o.id === activity.officerId);
        const searchLower = dashboardSearch.toLowerCase();
        return (
          (activity.title || '').toLowerCase().includes(searchLower) ||
          (activity.officer || '').toLowerCase().includes(searchLower) ||
          (officer && (officer.badgeNumber || '').toLowerCase().includes(searchLower))
        );
      })
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 6);
  }, [incidents, reports, officers, dashboardSearch, lang, t]);

  return (
    <div 
      className="space-y-6 relative pb-16"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 relative z-10 px-1">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-3xl font-black tracking-tight text-white">
              {t.dashboard}
              {user && (
                <span className="ml-2 text-sm font-medium text-brand-text-secondary opacity-60 flex items-center gap-2">
                  | {user.name} 
                  <span className="text-[10px] bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded uppercase">
                    {user.role === 'Admin' ? 'Admin' : 'Officer'}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-brand-accent animate-pulse' : 'bg-emerald-500'}`} title="Real-time Sync Active" />
                </span>
              )}
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-brand-text-secondary text-xs lg:text-sm font-medium tracking-wide opacity-80">{t.dashboardOverview}</p>
              {isSyncing && (
                <span className="flex items-center gap-1 text-[10px] text-brand-accent animate-pulse font-bold">
                  <div className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
                  {lang === 'am' ? 'በማመሳሰል ላይ...' : 'Syncing...'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-2 text-brand-text-secondary hover:text-brand-accent transition-colors bg-brand-bg/50 rounded-lg border border-brand-border"
            title={lang === 'am' ? 'አሁን አመሳስል' : 'Sync Now'}
          >
            <Clock size={18} className={isSyncing ? "animate-spin" : ""} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={16} />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder} 
              className="input-field pl-10 w-full md:w-64 py-2 text-sm"
              value={dashboardSearch}
              onChange={(e) => setDashboardSearch(e.target.value)}
            />
          </div>
          <button onClick={onCorruptionReport} className="glass-button py-2 px-4 text-sm whitespace-nowrap bg-brand-accent/10 border-brand-accent/30 text-brand-accent hover:bg-brand-accent/20">
            <ShieldAlert size={18} />
            {t.corruptionTip || 'Corruption Tip'}
          </button>
          <button onClick={() => onQuickAction('add-incident')} className="btn-primary py-2 px-4 text-sm whitespace-nowrap">
            <Plus size={18} />
            {t.newReport}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 px-1">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard 
              label={t.crime} 
              value={crimeIncidents.length} 
              icon={AlertTriangle} 
              color="text-rose-400" 
              onClick={() => onQuickAction('add-incident')}
            />
            <StatCard 
              label={lang === 'am' ? 'የትራፊክ አደጋ' : t.traffic} 
              value={trafficIncidents.length} 
              icon={Car} 
              color="text-brand-accent" 
              onClick={() => onQuickAction('view-traffic')}
            />
            <StatCard 
              label={t.officers || 'Officers'} 
              value={officers.length} 
              icon={Users} 
              color="text-blue-400" 
              onClick={() => onQuickAction('view-officers')}
            />
            <StatCard 
              label={t.assignments || 'Assignments'} 
              value={assignments.filter(a => a.status === 'Pending').length} 
              icon={ClipboardList} 
              color="text-amber-400" 
              onClick={() => onQuickAction('view-assignments')}
            />
            <StatCard 
              label={t.reports || 'Reports'} 
              value={reports.length} 
              icon={FileText} 
              color="text-emerald-400" 
              onClick={() => onQuickAction('view-reports')}
            />
          </div>

          {/* Crime Map Section */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapIcon size={20} className="text-brand-accent" />
                <h3 className="text-base lg:text-lg font-bold text-white">{t.crimeLocationMap}</h3>
              </div>
              <button 
                onClick={() => onQuickAction('view-map')}
                className="text-[10px] font-bold text-brand-accent hover:underline uppercase tracking-widest"
              >
                {t.viewFullMap}
              </button>
            </div>
            <CrimeMap incidents={incidents} />
          </div>

          {/* Trends Chart */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-brand-accent" />
                <h3 className="text-base lg:text-lg font-bold text-white">{t.incidentTrends}</h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] lg:text-xs text-brand-text-secondary font-bold">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-brand-accent rounded-full" />
                  <span>{t.reportedIncidents}</span>
                </div>
              </div>
            </div>
            <div className="h-[200px] lg:h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22D3EE" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      border: '1px solid #1E293B', 
                      borderRadius: '12px', 
                      color: '#F8FAFC', 
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }} 
                  />
                  <Area type="monotone" dataKey="value" stroke="#22D3EE" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar Content Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="text-base font-bold text-white mb-4">{t.quickActions}</h3>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => onQuickAction('add-corruption')} className="btn-secondary bg-rose-500/10 border-rose-500/20 text-rose-400 py-3 text-sm group">
                <ShieldAlert size={18} className="group-hover:scale-110 transition-transform" />
                {t.corruptionTip || 'Corruption Tip'}
              </button>
              <button onClick={() => onQuickAction('view-contacts')} className="btn-secondary py-3 text-sm">
                <Users size={18} />
                {t.contactList || 'Contact List'}
              </button>
              <button onClick={() => onQuickAction('add-traffic')} className="btn-primary py-3 text-sm group bg-brand-accent text-brand-bg border-none">
                <Car size={18} className="group-hover:scale-110 transition-transform" />
                {t.trafficReport}
              </button>
              <button onClick={() => onQuickAction('add-incident')} className="btn-secondary py-3 text-sm group">
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                {t.newReport}
              </button>
              <button onClick={() => onQuickAction('add-assignment')} className="btn-secondary py-3 text-sm">
                <ClipboardList size={18} />
                {t.assignments || 'Assignments'}
              </button>
              <button onClick={() => onQuickAction('open-id-scanner')} className="btn-secondary bg-[#1A237E]/10 border-[#1A237E]/20 text-blue-400 py-3 text-sm">
                <Search size={18} />
                {t.idScanner}
              </button>
              <button onClick={() => onQuickAction('open-qr')} className="btn-secondary bg-brand-accent/10 border-brand-accent/20 text-brand-accent py-3 text-sm">
                <Camera size={18} />
                {t.qrScanner}
              </button>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">{t.recentActivities}</h3>
              <div className="flex items-center gap-2">
                {user?.role !== 'Admin' && (
                  <span className="text-[9px] font-bold text-brand-text-secondary uppercase opacity-60">
                    {t.myReportsOnly}
                  </span>
                )}
                <button onClick={() => onQuickAction('view-reports')} className="text-[10px] font-bold text-brand-accent hover:underline uppercase tracking-widest">
                  {t.viewAll}
                </button>
              </div>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-brand-bg/50 border border-brand-border rounded-xl hover:border-brand-accent/30 transition-colors group">
                    <div className="p-2 bg-brand-bg rounded-lg border border-brand-border group-hover:bg-brand-accent/10 transition-colors">
                      <activity.icon size={16} className={activity.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-bold text-white truncate">{activity.title}</p>
                        <div className="flex items-center gap-1">
                          {activity.voice_url && (
                            <button onClick={() => new Audio(activity.voice_url).play()} className="text-emerald-400 hover:scale-110 transition-transform">
                              <Volume2 size={14} />
                            </button>
                          )}
                          <button 
                            onClick={() => onQuickAction(`edit-${activity.rawType}-${activity.id}`)}
                            className="p-1 text-brand-text-secondary hover:text-brand-accent transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-brand-text-secondary font-medium">{activity.time}</p>
                        <span className="text-[9px] font-bold text-brand-accent uppercase tracking-tighter">{activity.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-brand-bg/50 rounded-full flex items-center justify-center mb-4 border border-brand-border">
                    <ClipboardList size={24} className="text-brand-text-secondary opacity-30" />
                  </div>
                  <p className="text-xs text-brand-text-secondary font-medium italic mb-1">{t.noReports}</p>
                  <p className="text-[10px] text-brand-text-secondary opacity-70 px-4">
                    {lang === 'am' 
                      ? 'የተመዘገቡ ሪፖርቶች የሉም። አዲስ ሪፖርት ለመመዝገብ ከላይ ያለውን "አዲስ ሪፖርት" ቁልፍ ይጫኑ።' 
                      : 'No reports found. Use the "New Report" button above to start recording incidents.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Public Services Section */}
          <div className="glass-card p-6 border-brand-accent/20">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Globe className="text-brand-accent" size={18} />
              {t.publicServices}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={onCorruptionReport} 
                className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all group"
              >
                <div className="p-2 bg-rose-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <ShieldAlert size={20} className="text-rose-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white">{t.corruptionTip}</p>
                  <p className="text-[10px] text-brand-text-secondary">{lang === 'am' ? 'ሙስናን ለፖሊስ ይጠቁሙ' : 'Report corruption to police'}</p>
                </div>
              </button>
              
              <button 
                onClick={() => onQuickAction('traffic')} 
                className="flex items-center gap-3 p-3 bg-brand-accent/10 border border-brand-accent/20 rounded-xl hover:bg-brand-accent/20 transition-all group"
              >
                <div className="p-2 bg-brand-accent/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Car size={20} className="text-brand-accent" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white">{t.traffic || 'Traffic'}</p>
                  <p className="text-[10px] text-brand-text-secondary">{lang === 'am' ? 'የትራፊክ አደጋ ሪፖርት' : 'Traffic accident report'}</p>
                </div>
              </button>

              <button 
                onClick={() => onQuickAction('view-contacts')} 
                className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all group"
              >
                <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Users size={20} className="text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white">{t.contacts}</p>
                  <p className="text-[10px] text-brand-text-secondary">{lang === 'am' ? 'የስልክ ማውጫ' : 'Phone directory'}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Emergency Numbers */}
          <div className="glass-card p-6 bg-emerald-500/5 border-emerald-500/20">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">
              {t.emergencyContacts.title}
            </h3>
            <div className="space-y-3">
              {[
                { label: t.zonePolice, phone: '0587750972' },
                { label: t.trafficPolice, phone: '0587751002' }
              ].map((contact, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 group hover:bg-emerald-500/20 transition-all">
                  <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{contact.label}</span>
                  <button 
                    onClick={() => dialPhone(contact.phone)}
                    className="text-lg font-black text-white tracking-tighter group-hover:text-emerald-400 transition-colors"
                  >
                    {contact.phone}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-md p-8 text-center border-rose-500/20"
          >
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
              <AlertCircle size={40} className="text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">{t.deleteConfirm || 'Are you sure?'}</h3>
            <p className="text-brand-text-secondary text-sm font-medium mb-8">
              {t.deleteWarning || 'This action is permanent and cannot be undone. All data associated with this report will be lost.'}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 btn-secondary py-3"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button 
                onClick={() => {
                  if (deleteConfirm.type === 'incident') onDeleteIncident(deleteConfirm.id);
                  else onDeleteReport(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-rose-600/20"
              >
                {t.delete || 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
