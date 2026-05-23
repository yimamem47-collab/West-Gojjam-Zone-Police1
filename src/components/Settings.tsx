import React, { useState } from 'react';
import { User, Mail, Shield, Bell, Palette, Send, CheckCircle2, XCircle, Loader2, Activity, RefreshCw, Copy, ExternalLink, Info } from 'lucide-react';
import { User as UserType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { onFirestoreStatusChange, clearFirestoreCache } from '../firebase';
import { testFirebaseConnection, testTelegramConnection, testGoogleSheetsConnection, DiagnosticResult } from '../services/diagnostics';
import { APP_VERSION } from '../constants';
import { pushFileToGitHub, SyncResult } from '../services/githubFileService';
interface SettingsProps {
  user: UserType | null;
  lang: Language;
  onUpdate: (updates: Partial<UserType>) => Promise<void>;
}

export function Settings({ user, lang, onUpdate }: SettingsProps) {
  const t = translations[lang];
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(true);
  
  // Diagnostic State
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [showDiagnosticReport, setShowDiagnosticReport] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairComplete, setRepairComplete] = useState(false);

  // GitHub Sync State
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [githubSyncResults, setGithubSyncResults] = useState<SyncResult[]>([]);
  const [showGithubDetails, setShowGithubDetails] = useState(false);

  React.useEffect(() => {
    const unsubscribe = onFirestoreStatusChange((connected) => {
      setIsFirestoreConnected(connected);
    });
    return () => unsubscribe();
  }, []);

  const handleGitHubSync = async () => {
    if (!window.confirm('This will sync the latest dashboard code directly to your GitHub repository (yimamem47-collab/west-gojjame-police). Continue?')) return;
    
    setIsSyncingGitHub(true);
    setGithubSyncResults([]);
    setShowGithubDetails(true);
    
    try {
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Server sync failed');
      }

      const data = await response.json();
      setGithubSyncResults(data.results);
      
      const successCount = data.results.filter((r: any) => r.status === 'success').length;
      if (successCount === data.results.length) {
        alert('All files synced successfully to GitHub! You can now pull the latest code in Android Studio.');
      } else {
        alert(`Sync partially successful. ${successCount} of ${data.results.length} files synced. Check details below.`);
      }
    } catch (e: any) {
      console.error('GitHub Sync Error:', e);
      alert(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncingGitHub(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAllDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setDiagnostics([]);
    
    const results: DiagnosticResult[] = [];
    
    // 1. Firebase
    const firebaseResult = await testFirebaseConnection();
    results.push(firebaseResult);
    setDiagnostics([...results]);
    
    // 2. Telegram
    const telegramResult = await testTelegramConnection();
    results.push(telegramResult);
    setDiagnostics([...results]);
    
    // 3. Google Sheets
    const sheetsResult = await testGoogleSheetsConnection();
    results.push(sheetsResult);
    setDiagnostics([...results]);
    
    setIsRunningDiagnostics(false);
  };

  const copyDiagnosticReport = () => {
    const report = diagnostics.map(d => 
      `[${d.service}] Status: ${d.status.toUpperCase()}\nMessage: ${d.message}${d.details ? `\nDetails: ${d.details}` : ''}`
    ).join('\n\n');
    
    const fullReport = `SYSTEM CONNECTIVITY DIAGNOSTIC REPORT\nDate: ${new Date().toLocaleString()}\n-----------------------------------\n${report}`;
    
    navigator.clipboard.writeText(fullReport);
    alert('Diagnostic report copied to clipboard!');
  };

  const handleRepair = async () => {
    if (!window.confirm(t.repairDescription)) return;
    
    setIsRepairing(true);
    try {
      const success = await clearFirestoreCache();
      if (success) {
        setRepairComplete(true);
        setTimeout(() => setRepairComplete(false), 5000);
      }
    } catch (error) {
      console.error('Repair failed:', error);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.settings || 'Settings'}</h1>
          <p className="text-brand-text-secondary">Manage your account preferences and profile.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-card border border-brand-border rounded-xl">
          <div className={`w-2 h-2 rounded-full ${isFirestoreConnected ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {isFirestoreConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* SECTION 1: ACCESS & PROFILE */}
          <div className="glass-card p-8 bg-brand-bg/20 border-brand-border/40">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <User size={20} className="text-brand-accent" />
              Access & Profile Information
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-brand-text-secondary mb-2">Display Name</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-text-secondary mb-2">Email Address</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="pt-4 flex items-center gap-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {t.saveProfile || 'Save Changes'}
                </button>
                {success && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-emerald-400 text-sm font-medium"
                  >
                    Profile updated successfully!
                  </motion.span>
                )}
              </div>
            </form>
          </div>

          {/* SECTION 2: CODE, PLANNING & AUTOMATION */}
          <section id="automation" className="glass-card p-8 border-brand-accent/30 bg-brand-accent/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <RefreshCw size={80} className="text-brand-accent" />
            </div>
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-accent/20 rounded-2xl text-brand-accent">
                  <Send size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-white uppercase italic">Planning & Automation</h3>
                  <p className="text-xs text-brand-text-secondary font-bold tracking-widest opacity-60">GITHUB REPOSITORY SYNC</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="p-5 bg-black/40 border border-brand-accent/20 rounded-2xl backdrop-blur-sm">
                <h4 className="text-sm font-bold text-brand-accent mb-2 flex items-center gap-2">
                  <ExternalLink size={14} />
                  Continuous Integration
                </h4>
                <p className="text-sm text-brand-text-secondary leading-relaxed">
                  Pushes the latest dashboard source code, Firestore rules, and application blueprints directly to your connected GitHub repository. This process enables synchronized development with your Android Studio local environment.
                </p>
                
                <div className="mt-4 flex items-center justify-between p-3 bg-brand-bg/50 border border-brand-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                      <Shield size={16} className="text-brand-accent" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-brand-text-secondary">REPO: yimamem47-collab / west-gojjame-police</span>
                  </div>
                  <button 
                    onClick={handleGitHubSync}
                    disabled={isSyncingGitHub}
                    className={`btn-primary flex items-center gap-2 text-xs py-2 px-6 shadow-xl shadow-brand-accent/20 transition-all active:scale-95 ${isSyncingGitHub ? 'opacity-50 grayscale' : ''}`}
                  >
                    {isSyncingGitHub ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {isSyncingGitHub ? 'SYNCING...' : 'SYNC CORE NOW'}
                  </button>
                </div>
              </div>

              {githubSyncResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-t border-brand-border pt-4">
                    <button 
                      onClick={() => setShowGithubDetails(!showGithubDetails)}
                      className="text-[10px] font-black uppercase tracking-widest text-brand-accent hover:text-white transition-colors"
                    >
                      {showGithubDetails ? 'Collapse Logs' : 'View Sync Details'}
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-brand-bg rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(githubSyncResults.filter(r => r.status === 'success').length / githubSyncResults.length) * 100}%` }}
                          className="h-full bg-emerald-500"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-white tracking-widest">
                        {githubSyncResults.filter(r => r.status === 'success').length}/{githubSyncResults.length} OK
                      </span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showGithubDetails && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-black/80 border border-brand-border/50 rounded-2xl p-4 overflow-hidden"
                      >
                        <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                          {githubSyncResults.map((result, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[10px] font-mono py-1 border-b border-white/5 last:border-0">
                              <span className="text-brand-text-secondary truncate pr-4">{result.file}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                {result.status === 'success' ? (
                                  <span className="text-emerald-400 font-black">SYNCED</span>
                                ) : (
                                  <span className="text-rose-400 font-black" title={result.message}>ERROR</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 3: SECURITY & DATA INTEGRITY */}
          <div className="glass-card p-8 border-brand-border/40">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Shield size={20} className="text-brand-accent" />
                Security & Data Integrity
              </h3>
            </div>
            <div className="space-y-4">
              <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h4 className="font-bold text-rose-400 flex items-center gap-2">
                    <RefreshCw size={16} className={isRepairing ? "animate-spin" : ""} />
                    Network Cache Reset
                  </h4>
                  <p className="text-xs text-brand-text-secondary mt-1">
                    Forces the local database to bypass cached snapshots and re-sync all records from the cloud authorities.
                  </p>
                </div>
                <button 
                  onClick={handleRepair}
                  disabled={isRepairing}
                  className="min-w-[140px] px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 disabled:opacity-50"
                >
                  {isRepairing ? 'Resetting...' : 'Repair Sync'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-brand-bg/30 border border-brand-border rounded-xl">
                  <div>
                    <p className="text-sm font-bold">Two-Factor Authentication</p>
                    <p className="text-[10px] text-brand-text-secondary">Secure your digital officer identity.</p>
                  </div>
                  <button className="text-brand-accent font-bold text-[10px] uppercase tracking-wider">Enable</button>
                </div>
                <div className="flex items-center justify-between p-4 bg-brand-bg/30 border border-brand-border rounded-xl">
                  <div>
                    <p className="text-sm font-bold">Biometric Access</p>
                    <p className="text-[10px] text-brand-text-secondary">Face/Fingerprint ID for mobile app.</p>
                  </div>
                  <button className="text-brand-accent font-bold text-[10px] uppercase tracking-wider">Configure</button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: INTEGRATIONS & CONNECTIVITY */}
          <div className="glass-card p-8 bg-brand-bg/20 border-brand-accent/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Activity size={20} className="text-brand-accent" />
                Integrations & Connectivity
              </h3>
              <button 
                onClick={runAllDiagnostics}
                disabled={isRunningDiagnostics}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-accent hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {isRunningDiagnostics ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {isRunningDiagnostics ? 'Checking...' : 'Run Diagnostics'}
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Firebase', 'Telegram', 'GoogleSheets'].map((service) => {
                  const result = diagnostics.find(d => d.service === service);
                  return (
                    <div key={service} className="p-5 bg-brand-bg/40 border border-brand-border rounded-2xl flex flex-col items-center justify-center text-center group hover:border-brand-accent/30 transition-colors">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary/60 mb-3">{service}</p>
                      {result ? (
                        <div className="flex flex-col items-center">
                          {result.status === 'success' ? (
                            <CheckCircle2 className="text-emerald-500 mb-2" size={28} />
                          ) : (
                            <XCircle className="text-rose-500 mb-2" size={28} />
                          )}
                          <p className={`text-[11px] font-bold leading-tight ${result.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {result.message}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center opacity-20">
                          <Activity className="text-brand-text-secondary mb-2" size={28} />
                          <p className="text-[11px] font-bold text-brand-text-secondary">Waiting</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <AnimatePresence>
                {showDiagnosticReport && diagnostics.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-black/60 border border-brand-border rounded-xl"
                  >
                    <div className="p-4 font-mono text-[10px] leading-relaxed text-brand-text-secondary">
                      <p className="text-brand-accent mb-3 font-bold uppercase tracking-[0.2em] border-b border-brand-border pb-1">System Trace Log:</p>
                      {diagnostics.map((d, i) => (
                        <div key={i} className="mb-3 last:mb-0">
                          <span className={d.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>[{d.service}] {d.status.toUpperCase()}</span>
                          <p className="mt-0.5 opacity-80">{d.message}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {diagnostics.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <button 
                    onClick={() => setShowDiagnosticReport(!showDiagnosticReport)}
                    className="text-xs font-bold text-brand-text-secondary hover:text-white flex items-center gap-1"
                  >
                    {showDiagnosticReport ? 'Hide Network Logs' : 'View Network Logs'}
                  </button>
                  <button 
                    onClick={copyDiagnosticReport}
                    className="text-xs font-bold text-brand-accent hover:opacity-80 flex items-center gap-1"
                  >
                    <Copy size={12} />
                    Copy Trace
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Bell size={20} className="text-brand-accent" />
              Notifications
            </h3>
            <div className="space-y-4">
              {['Email Notifications', 'Project Updates', 'Task Reminders', 'Invoice Alerts'].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item}</span>
                  <div className="w-10 h-5 bg-brand-accent/20 rounded-full relative cursor-pointer border border-brand-accent/30">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-brand-accent rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Palette size={20} className="text-brand-accent" />
              Appearance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 bg-brand-bg border-2 border-brand-accent rounded-xl text-center">
                <p className="text-xs font-bold">Dark</p>
              </button>
              <button className="p-4 bg-slate-100 border-2 border-transparent rounded-xl text-center opacity-50 cursor-not-allowed">
                <p className="text-xs font-bold text-slate-900">Light</p>
              </button>
            </div>
          </div>

          <div className="p-6 border border-brand-border/10 rounded-2xl bg-brand-bg/20 flex flex-col items-center">
            <div className="flex items-center gap-2 text-brand-text-secondary/50 mb-2">
              <Info size={14} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Application Build Info</span>
            </div>
            <p className="text-xs font-mono text-brand-text-secondary/80">Version: {APP_VERSION}</p>
            <p className="text-[9px] font-mono text-brand-text-secondary/40 mt-1 uppercase tracking-tighter">Production Channel • Optimized Build</p>
          </div>
        </div>
      </div>
    </div>
  );
}
