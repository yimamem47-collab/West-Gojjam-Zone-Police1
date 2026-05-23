import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Shield, 
  Users, 
  ClipboardList, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Globe,
  Phone,
  HelpCircle,
  Bot,
  ArrowLeft,
  Facebook,
  Send,
  Activity,
  Car,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { onFirestoreStatusChange } from '../firebase';

interface SidebarItemProps {
  key?: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}

function SidebarItem({ icon: Icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20' 
          : 'text-brand-text-secondary hover:bg-brand-border hover:text-brand-text-primary'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onBack: () => void;
  onLogout: () => void;
  userName: string;
  userRole: string;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function Layout({ children, activeTab, setActiveTab, onBack, onLogout, userName, userRole, lang, setLang }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(true);
  const t = translations[lang];

  useEffect(() => {
    const unsubscribe = onFirestoreStatusChange((connected) => {
      setIsFirestoreConnected(connected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const menuItems = [
    { id: 'home-view', label: lang === 'am' ? 'መነሻ ገጽ' : 'Home Page', icon: Globe },
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'traffic-safety', label: lang === 'am' ? 'የትራፊክ ደህንነት' : 'Traffic Safety', icon: Car },
    { id: 'map', label: lang === 'am' ? 'የክስተቶች ካርታ' : 'Incident Map', icon: MapPin },
    { id: 'incidents', label: t.crime || 'Crime', icon: AlertTriangle },
    ...(userRole === 'Admin' ? [{ id: 'officers', label: t.officers || 'Officers', icon: Users }] : []),
    { id: 'assignments', label: t.assignments || 'Assignments', icon: ClipboardList },
    { id: 'reports', label: t.reports || 'Reports', icon: FileText },
    { id: 'zone-reports', label: t.zoneReports.title || 'Zone Reports', icon: ClipboardList },
    { id: 'community-reports', label: lang === 'am' ? 'የማህበረሰብ ሪፖርቶች' : 'Community Reports', icon: Users },
    { id: 'contacts', label: t.contacts || 'Contacts', icon: Phone },
    { id: 'info', label: t.publicServices || 'Public Services', icon: Shield },
    { id: 'ai-assistant', label: t.aiAssistant || 'AI Assistant', icon: Bot },
    { id: 'help', label: t.help || 'Help', icon: HelpCircle },
    { id: 'settings', label: t.settings || 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-brand-bg text-brand-text-primary">
      {/* Mobile Menu Button - Safe Area Aware */}
      <div 
        className="lg:hidden fixed left-0 top-0 w-full z-50 flex items-center px-4 transition-all"
        style={{ 
          paddingTop: 'var(--ion-safe-area-top, 0px)',
          height: 'calc(var(--ion-safe-area-top, 0px) + 4rem)'
        }}
      >
        <div className="flex gap-2 items-center w-full">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 bg-brand-card/90 backdrop-blur-md border border-brand-border rounded-xl text-brand-text-primary shadow-xl active:scale-95 transition-transform"
          >
            <Menu size={24} />
          </button>
          <button 
            onClick={onBack}
            className="p-3 bg-brand-card/90 backdrop-blur-md border border-brand-border rounded-xl text-brand-text-primary shadow-xl flex items-center gap-2 active:scale-95 transition-transform"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="ml-auto w-10 h-10 bg-white rounded-full flex items-center justify-center p-0.5 border border-brand-accent/30 overflow-hidden shadow-inner">
            <img src="/police-logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 w-64 bg-brand-card border-r border-brand-border z-50 transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-brand-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-0.5 border border-brand-accent shadow-lg overflow-hidden">
                <img src="/police-logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tighter text-white leading-none">WGZ POLICE</span>
                <span className="text-[8px] font-bold text-brand-accent uppercase tracking-widest mt-0.5">DIGITAL DEP.</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-brand-text-secondary">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
              />
            ))}
          </nav>

          <div className="pt-6 border-t border-brand-border mt-auto space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between px-4 py-2 bg-brand-bg/50 rounded-xl border border-brand-border">
              <div className="flex items-center gap-2">
                <Activity size={14} className={isFirestoreConnected ? 'text-emerald-500' : 'text-rose-500'} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-text-secondary">System Status</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${isFirestoreConnected ? 'bg-emerald-500' : 'bg-rose-500'} ${isFirestoreConnected ? 'animate-pulse' : ''}`} />
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-bg rounded-xl border border-brand-border">
              <Globe size={16} className="text-brand-accent" />
              <div className="flex gap-2">
                <button 
                  onClick={() => setLang('en')}
                  className={`text-xs font-bold px-2 py-1 rounded ${lang === 'en' ? 'bg-brand-accent text-brand-bg' : 'text-brand-text-secondary'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLang('am')}
                  className={`text-xs font-bold px-2 py-1 rounded ${lang === 'am' ? 'bg-brand-accent text-brand-bg' : 'text-brand-text-secondary'}`}
                >
                  አማ
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center border border-brand-accent/30">
                <span className="text-brand-accent font-bold">{userName.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{userName}</p>
                <p className="text-xs text-brand-text-secondary truncate">{t.officerAccount}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-400/10 transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">{t.logout}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        id="main-scroll-container" 
        className="flex-1 h-screen overflow-y-auto pt-24 lg:pt-8 pb-20 lg:pb-0 relative z-0 custom-scrollbar" 
        style={{ 
          WebkitOverflowScrolling: 'touch',
          paddingTop: 'calc(var(--ion-safe-area-top, 0px) + 5rem)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)' 
        }}
      >
        {!isFirestoreConnected && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-rose-500 text-white py-2 px-4 text-center text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-30 shadow-lg"
          >
            <AlertTriangle size={14} />
            {lang === 'am' ? 'ከሲስተሙ ጋር ግንኙነት ተቋርጧል - ዳታዎች ከመስመር ውጭ እየሰሩ ነው' : 'Disconnected from system - Operating in offline mode'}
          </motion.div>
        )}
        <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <button 
            onClick={onBack}
            className="hidden lg:flex items-center gap-2 text-brand-text-secondary hover:text-brand-text-primary mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>{lang === 'am' ? 'ተመለስ' : 'Back'}</span>
          </button>
          {children}
        </div>
        
        {/* Footer */}
        <footer className="w-full text-center py-8 px-4 bg-brand-bg border-t border-brand-border mt-auto">
          <div className="max-w-4xl mx-auto">
            <p className="text-xl font-bold text-brand-text-primary mb-4">
              {lang === 'am' ? 'የምዕራብ ጎጃም ዞን ፖሊስ መምሪያ' : 'West Gojjam Zone Police Department'}
            </p>
            <div className="flex justify-center gap-6 mb-6">
              <a 
                href="https://www.facebook.com/share/1CCxnhaNmX/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#1877F2] hover:text-[#166fe5] transition-colors font-medium bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10"
              >
                <Facebook size={20} />
                <span>Facebook</span>
              </a>
              <a 
                href="https://t.me/westgojjamepolice" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#229ED9] hover:text-[#2094cc] transition-colors font-medium bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10"
              >
                <Send size={20} />
                <span>Telegram</span>
              </a>
            </div>
            <hr className="border-brand-border mb-6" />
            <p className="text-brand-text-secondary italic font-medium">
              Developed by: Chief Sergeant Mengesha Yimam Abera
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
