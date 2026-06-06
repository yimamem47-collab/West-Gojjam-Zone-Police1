import React, { useState } from 'react';
import { Shield, Send, CheckCircle, AlertCircle, X, Info, MapPin, Phone, User, Mail, MessageSquare, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../firebase';
import { sendTelegramMessage } from '../services/telegramService';

interface CorruptionReportProps {
  lang: Language;
  onClose: () => void;
}

export function CorruptionReport({ lang, onClose }: CorruptionReportProps) {
  const t = translations[lang];
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    tipType: '',
    reporterName: '',
    reporterPhone: '',
    reporterEmail: '',
    location: '',
    woreda: '',
    details: '',
    otherInfo: ''
  });

  const tipTypes = lang === 'am' 
    ? ['ጉቦ መቀበል', 'ስልጣንን ያለአግባብ መጠቀም', 'የመንግስት ንብረት ማባከን', 'ሌላ']
    : ['Bribery', 'Abuse of Power', 'Embezzlement', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.details || !formData.reporterPhone) return;

    setStatus('submitting');
    try {
      await addDoc(collection(db, 'corruption_reports'), {
        ...formData,
        submittedBy: auth.currentUser?.uid || 'anonymous',
        submittedByName: auth.currentUser?.displayName || 'Anonymous',
        status: 'New',
        timestamp: serverTimestamp(),
        source: 'Citizen Form'
      });

      // Send to Telegram using service for consistency
      const telegramMessage = `🚨 <b>አዲስ የሙስና ጥቆማ / New Corruption Tip</b>\n---------------------------\n<b>Type:</b> ${formData.tipType}\n<b>Reporter:</b> ${formData.reporterName}\n<b>Phone:</b> ${formData.reporterPhone}\n<b>Woreda:</b> ${formData.woreda}\n<b>Location:</b> ${formData.location}\n---------------------------\n<b>Details:</b>\n${formData.details}`;
      
      await sendTelegramMessage(telegramMessage);

      setStatus('success');
    } catch (error) {
      console.error("Submission error:", error);
      setStatus('error');
      try {
        handleFirestoreError(error, OperationType.WRITE, 'corruption_reports');
      } catch (e) {
        // Error already logged and reported by handleFirestoreError
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-brand-bg/95 backdrop-blur-md flex flex-col p-4 md:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-accent/10 rounded-xl">
              <Shield className="text-brand-accent" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t.corruptionReport}</h2>
              <p className="text-brand-text-secondary text-sm">West Gojjam Police Anti-Corruption Department</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-accent/10 rounded-full transition-colors">
            <X size={28} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/20">
                <CheckCircle size={48} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold text-emerald-500">{t.corruptionReportSuccess}</h3>
              <p className="text-brand-text-secondary">ጥቆማዎ በሚስጥር ይጠበቃል። ለሀገር ሰላም መቆምዎ እናመሰግናለን።</p>
              <button onClick={onClose} className="btn-primary px-8 py-3">
                {lang === 'am' ? 'ተመለስ' : 'Return'}
              </button>
            </motion.div>
          ) : (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary mb-2">
                      <Briefcase size={16} /> {t.tipType}
                    </label>
                    <select 
                      required
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent h-[50px]"
                      value={formData.tipType}
                      onChange={e => setFormData({...formData, tipType: e.target.value})}
                    >
                      <option value="">{lang === 'am' ? 'የጥቆማ አይነት ይምረጡ' : 'Select Tip Type'}</option>
                      {tipTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary mb-2">
                      <User size={16} /> {t.reporterName}
                    </label>
                    <input 
                      type="text" 
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
                      value={formData.reporterName}
                      onChange={e => setFormData({...formData, reporterName: e.target.value})}
                      placeholder={lang === 'am' ? 'ሙሉ ስምዎን ይጥቀሱ' : 'Enter your full name'}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary mb-2">
                      <Phone size={16} /> {t.reporterPhone} *
                    </label>
                    <input 
                      required
                      type="tel" 
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
                      value={formData.reporterPhone}
                      onChange={e => setFormData({...formData, reporterPhone: e.target.value})}
                      placeholder="09..."
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary mb-2">
                      <Mail size={16} /> {t.reporterEmail || t.email}
                    </label>
                    <input 
                      type="email" 
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
                      value={formData.reporterEmail}
                      onChange={e => setFormData({...formData, reporterEmail: e.target.value})}
                      placeholder="example@mail.com"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary mb-2">
                      <MapPin size={16} /> {t.woreda}
                    </label>
                    <input 
                      type="text" 
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
                      value={formData.woreda}
                      onChange={e => setFormData({...formData, woreda: e.target.value})}
                      placeholder={lang === 'am' ? 'ወረዳ ወይም ዞን' : 'Woreda or Zone'}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary mb-2">
                      <MapPin size={16} /> {t.locationOriginal}
                    </label>
                    <input 
                      type="text" 
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      placeholder={lang === 'am' ? 'ወንጀሉ የተፈጸመበት ቦታ' : 'Where did this happen?'}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary mb-2">
                      <MessageSquare size={16} /> {t.details} *
                    </label>
                    <textarea 
                      required
                      rows={5}
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent resize-none"
                      value={formData.details}
                      onChange={e => setFormData({...formData, details: e.target.value})}
                      placeholder={lang === 'am' ? 'ስለ ሁኔታው በዝርዝር ይጥቀሱ' : 'Describe the incident in detail'}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary mb-2">
                  <Info size={16} /> {t.otherInfo}
                </label>
                <input 
                  type="text" 
                  className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
                  value={formData.otherInfo}
                  onChange={e => setFormData({...formData, otherInfo: e.target.value})}
                  placeholder="..."
                />
              </div>

              <div className="pt-4">
                {status === 'error' && (
                  <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-500 text-sm">
                    <AlertCircle size={20} />
                    <span>{lang === 'am' ? 'ጥቆማውን መላክ አልተቻለም። እባክዎ ኢንተርኔትዎን ያረጋግጡ።' : 'Failed to submit tip. Please check your internet connection.'}</span>
                  </div>
                )}
                <button 
                  disabled={status === 'submitting'}
                  className="btn-primary w-full py-4 text-brand-bg font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-brand-accent/20"
                >
                  {status === 'submitting' ? <RefreshCw className="animate-spin" /> : <Send size={24} />}
                  {t.submitCorruptionTip}
                </button>
              </div>

              <div className="bg-brand-accent/5 p-4 rounded-xl border border-brand-accent/20">
                <p className="text-xs text-brand-text-secondary text-center italic">
                  የሰጡት መረጃ በሚስጥር የተጠበቀ ነው። ለትብብርዎ እናመሰግናለን።
                </p>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={`w-6 h-6 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
  </svg>
);
