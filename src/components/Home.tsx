import React from 'react';
import { Shield, ShieldAlert, Users, ArrowRight, CheckCircle, Globe, Phone, Camera, Send, MessageSquare, Facebook, Bot, LayoutDashboard, Menu, X, LogIn, UserPlus } from 'lucide-react';
import { sendTelegramMessage, escapeHtml } from '../services/telegramService';
import { Language, translations } from '../lib/translations';
import { openUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AIAssistant } from './AIAssistant';

interface HomeProps {
  onLogin: () => void;
  onSignup: () => void;
  onReport: (type: 'Crime' | 'Traffic') => void;
  onViewContacts: () => void;
  onOpenQR: () => void;
  onCommunityReport: () => void;
  onCorruptionReport: () => void;
  onGoToDashboard: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  isLoggedIn: boolean;
}

export function Home({ onLogin, onSignup, onReport, onViewContacts, onOpenQR, onCommunityReport, onCorruptionReport, onGoToDashboard, lang, setLang, isLoggedIn }: HomeProps) {
  const t = translations[lang];

  const [quickTip, setQuickTip] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleQuickTipSubmit = async () => {
    if (!quickTip.trim()) {
      alert(t.writeTipFirst || 'Please write your tip first!');
      return;
    }

    setSending(true);
    const message = `🚨 አዲስ የፖሊስ ጥቆማ፦\n\n${escapeHtml(quickTip)}`;
    
    try {
      // Send to Telegram and Firebase in parallel
      const [telegramSuccess] = await Promise.all([
        sendTelegramMessage(message),
        addDoc(collection(db, 'quick_tips'), {
          tip: quickTip,
          timestamp: serverTimestamp()
        }).catch(e => console.error("Error saving to Firebase:", e))
      ]);
      
      if (telegramSuccess) {
        // Send to Google Sheets (using the same URL, but with different fields)
        const sheetURL = "https://script.google.com/macros/s/AKfycbw2Bkjrv9SbObSFs0xOlcONYKJKpsa_lqSu2to4PfIKlHoP8U5KVMj0DQYrkvkS_jYS/exec";
        const reportData = {
          name: 'Anonymous Tip',
          phone: '',
          email: '',
          message: quickTip,
          location: '',
          date: new Date().toISOString().split('T')[0],
          status: 'New Tip'
        };
        
        console.log("Sending quick tip to Google Sheets:", reportData);
        
        // Send to Google Sheets in the background without blocking
        fetch(sheetURL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reportData)
        }).then(() => console.log("Quick tip successfully sent to Google Sheets"))
          .catch(e => console.error("Error sending tip to Google Sheets:", e));

        setSent(true);
        setQuickTip('');
        setTimeout(() => setSent(false), 3000);
      } else {
        alert(t.sendTipError || 'An error occurred! Please try again later.');
      }
    } catch (error) {
      console.error("Error submitting quick tip:", error);
      alert(t.sendTipError || 'An error occurred! Please try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-brand-bg text-brand-text-primary overflow-x-hidden custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Production-Ready Navbar */}
      <nav className="fixed top-0 w-full z-[100] bg-brand-bg/80 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 group cursor-pointer" 
            onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
          >
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight leading-none text-brand-text-primary">West Gojjam Police</span>
              <span className="text-[8px] font-bold text-brand-accent uppercase tracking-widest mt-0.5 opacity-80 font-mono italic">
                Official Management System
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4 border-r border-brand-border pr-4">
              <Globe size={16} className="text-brand-text-secondary" />
              <button 
                onClick={() => setLang('en')}
                className={`text-xs font-bold px-2 py-1 rounded ${lang === 'en' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLang('am')}
                className={`text-xs font-bold px-2 py-1 rounded ${lang === 'am' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}
              >
                AM
              </button>
            </div>
            {isLoggedIn ? (
              <button onClick={onGoToDashboard} className="btn-primary py-2 px-6 text-sm flex items-center gap-2">
                <LayoutDashboard size={16} />
                {t.goToDashboard}
              </button>
            ) : (
              <>
                <button onClick={onLogin} className="text-sm font-medium text-brand-text-secondary hover:text-brand-text-primary transition-colors">
                  {t.login}
                </button>
                <button onClick={onSignup} className="btn-primary py-2 px-4 text-sm">
                  {t.register}
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-brand-text-primary hover:bg-white/5 rounded-lg transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-brand-card border-b border-brand-border overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between p-2 bg-brand-bg/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-brand-text-secondary" />
                    <span className="text-sm font-medium">{t.language}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setLang('en'); setIsMenuOpen(false); }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${lang === 'en' ? 'bg-brand-accent text-white' : 'bg-white/5 text-brand-text-secondary'}`}
                    >
                      EN
                    </button>
                    <button 
                      onClick={() => { setLang('am'); setIsMenuOpen(false); }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${lang === 'am' ? 'bg-brand-accent text-white' : 'bg-white/5 text-brand-text-secondary'}`}
                    >
                      AM
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {isLoggedIn ? (
                    <button 
                      onClick={() => { onGoToDashboard(); setIsMenuOpen(false); }}
                      className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                    >
                      <LayoutDashboard size={18} />
                      {t.goToDashboard}
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => { onLogin(); setIsMenuOpen(false); }}
                        className="w-full py-3 rounded-xl border border-brand-border font-bold hover:bg-white/5 transition-all"
                      >
                        {t.login}
                      </button>
                      <button 
                        onClick={() => { onSignup(); setIsMenuOpen(false); }}
                        className="w-full btn-primary py-3"
                      >
                        {t.register}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 md:pt-20 pb-6 md:pb-8 px-4 relative overflow-hidden border-b border-brand-border">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-40 h-40 bg-brand-accent/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-40 h-40 bg-brand-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <span className="inline-block px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent text-[8px] md:text-[10px] font-bold uppercase tracking-widest mb-2 md:mb-3 border border-brand-accent/20">
                {t.officialManagementSystem}
              </span>
              <h1 className="text-xl md:text-3xl lg:text-5xl font-bold tracking-tight mb-2 md:mb-3 leading-tight">
                {t.heroTitle}
              </h1>
              <p className="text-sm md:text-lg font-bold text-brand-accent mb-2 md:mb-3 italic">
                "{t.motto}"
              </p>
              <p className="text-xs md:text-base text-brand-text-secondary max-w-xl mx-auto lg:mx-0 mb-4 md:mb-6 leading-relaxed">
                {t.heroDesc}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                {isLoggedIn ? (
                  <button onClick={onGoToDashboard} className="w-full sm:w-auto btn-primary text-sm px-5 py-2.5 bg-brand-accent hover:bg-brand-accent/90">
                    <LayoutDashboard size={16} />
                    {t.goToDashboard}
                  </button>
                ) : (
                  <div className="flex flex-col gap-4 w-full">
                    <div className="bg-brand-card/50 p-6 rounded-2xl border border-brand-border backdrop-blur-sm">
                      <p className="text-sm font-bold mb-4 text-brand-text-primary">
                        {lang === 'am' 
                          ? 'ይህ ክፍል ለተፈቀደላቸው የፖሊስ አባላት ብቻ የተዘጋጀ ነው። ኦፊሰሮች ወደ ስርዓቱ ለመግባት ወይም ለመመዝገብ ከታች ያሉትን ቁልፎች ይጠቀሙ።'
                          : 'This section is for authorized police members only. Officers use the buttons below to login or register.'
                        }
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={onLogin} className="flex-1 px-6 py-3 rounded-xl border-2 border-brand-accent/30 hover:border-brand-accent hover:bg-brand-accent/5 transition-all font-bold text-sm text-brand-accent flex items-center justify-center gap-2">
                          <LogIn size={18} />
                          {t.officerLogin}
                        </button>
                        <button onClick={onSignup} className="flex-1 btn-primary py-3 bg-brand-accent hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2">
                          <UserPlus size={18} />
                          {t.officerRegister || (lang === 'am' ? 'የኦፊሰር ምዝገባ' : 'Officer Registration')}
                        </button>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => document.getElementById('report-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full sm:w-auto self-center lg:self-start px-6 py-2 text-brand-text-secondary hover:text-brand-accent transition-colors flex items-center gap-2 text-sm font-bold"
                    >
                      {t.citizenReporting}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center"
            >
              <div className="relative group">
                {/* Enhanced Glow Effect */}
                <div className="absolute inset-0 bg-brand-accent/30 rounded-full blur-[40px] animate-pulse group-hover:bg-brand-accent/40 transition-all" />
                <div className="absolute -inset-4 bg-brand-accent/10 rounded-full blur-2xl" />
                
                <div className="relative w-[140px] h-[140px] md:w-[240px] md:h-[240px] bg-brand-accent/5 rounded-full p-1 shadow-[0_0_50px_rgba(255,215,0,0.2)] border-4 md:border-8 border-brand-accent/30 flex items-center justify-center ring-4 md:ring-8 ring-brand-bg transition-transform duration-500 group-hover:scale-105">
                  <Shield size={120} className="text-brand-accent w-1/2 h-1/2" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Public Services Section */}
      <section className="py-6 md:py-8 px-4 bg-brand-card/20 border-b border-brand-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-lg md:text-2xl font-bold mb-1.5">{t.publicServices}</h2>
            <p className="text-[10px] md:text-sm text-brand-text-secondary">{t.publicServicesDesc}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <button onClick={() => onReport('Crime')} className="flex flex-col items-center justify-center p-2.5 md:p-3 glass-card hover:bg-rose-500/10 hover:border-rose-500/50 transition-all group">
              <div className="p-1.5 md:p-2 bg-rose-500/10 rounded-lg mb-1.5 md:mb-2 group-hover:scale-110 transition-transform">
                <ShieldAlert className="text-rose-500 w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="font-bold text-[9px] md:text-[10px] text-center">{t.crimeControl}</span>
            </button>
            <button onClick={() => onReport('Traffic')} className="flex flex-col items-center justify-center p-2.5 md:p-3 glass-card hover:bg-amber-500/10 hover:border-amber-500/50 transition-all group">
              <div className="p-1.5 md:p-2 bg-amber-500/10 rounded-lg mb-1.5 md:mb-2 group-hover:scale-110 transition-transform">
                <Shield className="text-amber-500 w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="font-bold text-[9px] md:text-[10px] text-center">{t.trafficSafety}</span>
            </button>
            <button onClick={onViewContacts} className="flex flex-col items-center justify-center p-2.5 md:p-3 glass-card hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group">
              <div className="p-1.5 md:p-2 bg-emerald-500/10 rounded-lg mb-1.5 md:mb-2 group-hover:scale-110 transition-transform">
                <Phone className="text-emerald-500 w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="font-bold text-[9px] md:text-[10px] text-center">{t.contacts}</span>
            </button>
            <button onClick={onCommunityReport} className="flex flex-col items-center justify-center p-2.5 md:p-3 glass-card hover:bg-blue-500/10 hover:border-blue-500/50 transition-all group">
              <div className="p-1.5 md:p-2 bg-blue-500/10 rounded-lg mb-1.5 md:mb-2 group-hover:scale-110 transition-transform">
                <MessageSquare className="text-blue-500 w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="font-bold text-[9px] md:text-[10px] text-center">{t.communityReport}</span>
            </button>
            <button onClick={onCorruptionReport} className="flex flex-col items-center justify-center p-2.5 md:p-3 glass-card hover:bg-brand-accent/10 hover:border-brand-accent/50 transition-all group">
              <div className="p-1.5 md:p-2 bg-brand-accent/10 rounded-lg mb-1.5 md:mb-2 group-hover:scale-110 transition-transform">
                <ShieldAlert className="text-brand-accent w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="font-bold text-[9px] md:text-[10px] text-center">{t.corruptionTip || 'Corruption Tip'}</span>
            </button>
            <button onClick={onOpenQR} className="flex flex-col items-center justify-center p-2.5 md:p-3 glass-card hover:bg-brand-accent/10 hover:border-brand-accent/50 transition-all group">
              <div className="p-1.5 md:p-2 bg-brand-accent/10 rounded-lg mb-1.5 md:mb-2 group-hover:scale-110 transition-transform">
                <Camera className="text-brand-accent w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="font-bold text-[9px] md:text-[10px] text-center">{t.scanQr}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Tip & AI Assistant Section */}
      <section className="py-6 md:py-8 px-4 border-b border-brand-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Tip */}
            <div className="glass-card p-3 md:p-6 border-brand-accent/20 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <div className="p-1.5 bg-brand-accent/10 rounded-lg">
                  <MessageSquare className="text-brand-accent w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold">{t.quickTip}</h2>
                  <p className="text-[10px] md:text-xs text-brand-text-secondary">{t.quickTipDesc}</p>
                </div>
              </div>

              <div className="space-y-2 md:space-y-3 flex-1 flex flex-col">
                <textarea 
                  id="crimeReport"
                  className="input-field flex-1 min-h-[80px] md:min-h-[120px] text-xs md:text-sm resize-none"
                  placeholder={t.writeTipPlaceholder}
                  value={quickTip}
                  onChange={(e) => setQuickTip(e.target.value)}
                />
                
                <button 
                  onClick={handleQuickTipSubmit}
                  disabled={sending || sent}
                  className={`w-full py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                    sent ? 'bg-emerald-500 text-white' : 'btn-primary'
                  }`}
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : sent ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      {t.tipSent}
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      {t.sendTip}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Assistant */}
            <div className="glass-card p-2 md:p-4 border-brand-accent/20 flex flex-col h-full">
              <AIAssistant lang={lang} compact={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Officer Portal Section - Separated Login and Registration */}
      <section className="py-8 md:py-16 px-4 bg-brand-card/30 border-t border-brand-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-12 h-12 bg-brand-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-brand-accent/30 shadow-inner">
              <Users size={24} className="text-brand-accent" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              {isLoggedIn ? (lang === 'am' ? 'የኦፊሰሮች መግቢያ' : 'Officer Workspace') : (lang === 'am' ? 'የፖሊስ ኦፊሰሮች መግቢያ' : 'Police Officers Entrance')}
            </h2>
            <p className="text-xs md:text-sm text-brand-text-secondary max-w-lg mx-auto leading-relaxed">
              {lang === 'am' 
                ? 'ይህ ክፍል ለተፈቀደላቸው የፖሊስ አባላት ብቻ የተዘጋጀ ነው። ኦፊሰሮች ወደ ስርዓቱ ለመግባት ወይም ለመመዝገብ ከታች ያሉትን ቁልፎች ይጠቀሙ።'
                : 'This section is reserved for authorized police personnel. Use the sections below to access your account or register as a new officer.'}
            </p>
          </div>

          {isLoggedIn ? (
            <div className="max-w-md mx-auto">
              <motion.div 
                whileHover={{ y: -5 }}
                className="glass-card p-8 border-brand-accent/30 text-center"
              >
                <LayoutDashboard size={48} className="text-brand-accent mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">{lang === 'am' ? 'ወደ ዳሽቦርድ ይሂዱ' : 'Go to Dashboard'}</h3>
                <p className="text-xs text-brand-text-secondary mb-6">
                  {lang === 'am' ? 'ወደ ኦፊሴላዊው የአመራር ስርዓት በመመለስዎ ደስተኞች ነን። ስራዎን ለመቀጠል ዳሽቦርዱን ይክፈቱ።' : 'Welcome back! Open your personal dashboard to continue your official duties.'}
                </p>
                <button 
                  onClick={onGoToDashboard}
                  className="btn-primary w-full py-4 text-sm shadow-xl shadow-brand-accent/30"
                >
                  {t.goToDashboard}
                </button>
              </motion.div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Login Card */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="glass-card p-8 border-brand-accent/20 flex flex-col items-center text-center group"
              >
                <div className="p-4 bg-brand-accent/5 rounded-2xl mb-6 group-hover:bg-brand-accent/10 transition-colors">
                  <Shield size={40} className="text-brand-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3">{t.officerLogin}</h3>
                <p className="text-xs text-brand-text-secondary mb-6 flex-1">
                  {lang === 'am' 
                    ? 'አካውንት ካለዎት መለያዎን ተጠቅመው ይግቡ።' 
                    : 'If you already have an account, sign in to access your dashboard.'}
                </p>
                <button 
                  onClick={onLogin}
                  className="w-full py-4 rounded-xl border-2 border-brand-accent hover:bg-brand-accent hover:text-brand-bg transition-all font-bold text-sm"
                >
                  {t.officerLogin}
                </button>
              </motion.div>

              {/* Registration Card */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="glass-card p-8 border-brand-accent/20 flex flex-col items-center text-center group"
              >
                <div className="p-4 bg-emerald-500/5 rounded-2xl mb-6 group-hover:bg-emerald-500/10 transition-colors">
                  <CheckCircle size={40} className="text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">{t.officerRegister}</h3>
                <p className="text-xs text-brand-text-secondary mb-6 flex-1">
                  {lang === 'am' 
                    ? 'አዲስ የፖሊስ አባል ከሆኑ እዚህ ይመዝገቡ። ምዝገባው በሚመለከተው ክፍል መረጋገጥ አለበት።' 
                    : 'New to the force? Register here. Your account will require official verification.'}
                </p>
                <button 
                  onClick={onSignup}
                  className="w-full btn-primary py-4 text-sm shadow-xl shadow-brand-accent/20"
                >
                  {t.officerRegister}
                </button>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full text-center py-8 px-4 bg-brand-bg border-t border-brand-border mt-auto">
        <div className="max-w-4xl mx-auto">
          <p className="text-xl font-bold text-brand-text-primary mb-4">
            {t.footerAppName}
          </p>
          <div className="flex justify-center gap-6 mb-6">
            <button 
              onClick={() => openUrl('https://www.facebook.com/share/1CCxnhaNmX/')}
              className="flex items-center gap-2 text-[#1877F2] hover:text-[#166fe5] transition-colors font-medium bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10"
            >
              <Facebook size={20} />
              <span>Facebook</span>
            </button>
            <button 
              onClick={() => openUrl('https://t.me/westgojjamepolice')}
              className="flex items-center gap-2 text-[#229ED9] hover:text-[#2094cc] transition-colors font-medium bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10"
            >
              <Send size={20} />
              <span>Telegram</span>
            </button>
          </div>
          <hr className="border-brand-border mb-6" />
          <p className="text-brand-text-secondary italic font-medium">
            {t.developedByLabel} Chief Sergeant Mengesha Yimam Abera
          </p>
        </div>
      </footer>
    </div>
  );
}
