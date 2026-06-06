import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, MapPin, Calendar, Phone, Mail, CheckCircle, Clock } from 'lucide-react';
import { CommunityReport } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatFirestoreTimestamp } from '../lib/utils';

interface CommunityReportsProps {
  lang: Language;
}

export function CommunityReports({ lang }: CommunityReportsProps) {
  const t = translations[lang];
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newReport, setNewReport] = useState<Omit<CommunityReport, 'id' | 'timestamp' | 'status'>>({
    reporterName: '',
    reporterPhone: '',
    reporterEmail: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    details: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'community_reports'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const reportsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: formatFirestoreTimestamp(data.timestamp)
          };
        }) as CommunityReport[];
        setReports(reportsData);
      } catch (err) {
        console.error("Error parsing community reports:", err);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'community_reports');
    });

    return () => unsubscribe();
  }, []);

  const filteredReports = reports.filter(r => 
    (r.reporterName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.details || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newReport.reporterName.trim() || newReport.reporterName.length < 3) {
      alert(lang === 'am' ? 'እባክዎ ትክክለኛ ስም ያስገቡ (ቢያንስ 3 ፊደላት)' : 'Please enter a valid name (min 3 characters)');
      return;
    }
    if (!newReport.reporterPhone.trim() || !/^\+?[\d\s-]{9,}$/.test(newReport.reporterPhone)) {
      alert(lang === 'am' ? 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ' : 'Please enter a valid phone number');
      return;
    }
    if (!newReport.location.trim()) {
      alert(lang === 'am' ? 'እባክዎ ትክክለኛ ቦታ ያስገቡ' : 'Please enter a valid location');
      return;
    }
    if (!newReport.date) {
      alert(lang === 'am' ? 'እባክዎ ቀን ይምረጡ' : 'Please select a date');
      return;
    }
    if (!newReport.details.trim() || newReport.details.length < 10) {
      alert(lang === 'am' ? 'እባክዎ ዝርዝር መግለጫ ያስገቡ (ቢያንስ 10 ፊደላት)' : 'Please enter detailed information (min 10 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'community_reports'), {
        ...newReport,
        status: 'New',
        timestamp: serverTimestamp()
      });

      setIsModalOpen(false);
      setNewReport({
        reporterName: '',
        reporterPhone: '',
        reporterEmail: '',
        location: '',
        date: new Date().toISOString().split('T')[0],
        details: ''
      });
      alert(lang === 'am' ? 'ሪፖርትዎ በተሳካ ሁኔታ ተልኳል' : 'Your report has been submitted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'community_reports');
      alert(lang === 'am' ? 'ሪፖርቱን መላክ አልተቻለም' : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: CommunityReport['status']) => {
    try {
      await updateDoc(doc(db, 'community_reports', id), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `community_reports/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{lang === 'am' ? 'የማህበረሰብ ሪፖርቶች' : 'Community Reports'}</h1>
          <p className="text-brand-text-secondary">{lang === 'am' ? 'ከህብረተሰቡ የሚመጡ ጥቆማዎች እና ሪፖርቶች' : 'Tips and reports submitted by citizens.'}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={18} />
          {lang === 'am' ? 'አዲስ ሪፖርት አቅርብ' : 'Submit New Report'}
        </button>
      </div>

      <div className="glass-card p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={18} />
          <input 
            type="text" 
            placeholder={lang === 'am' ? 'ፈልግ...' : 'Search reports...'} 
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredReports.map((report) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={report.id} 
              className="glass-card p-6 border-l-4 border-brand-accent h-full flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-brand-text-primary mb-1">{report.reporterName}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-brand-text-secondary">
                    <span className="flex items-center gap-1"><Phone size={14} className="text-brand-accent" /> {report.reporterPhone}</span>
                    {report.reporterEmail && <span className="flex items-center gap-1"><Mail size={14} className="text-brand-accent" /> {report.reporterEmail}</span>}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                  report.status === 'New' ? 'bg-blue-500/20 text-blue-400' :
                  report.status === 'Reviewed' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {report.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-brand-text-secondary">
                  <MapPin size={14} className="text-brand-accent" />
                  <span>{report.location}</span>
                </div>
                <div className="flex items-center gap-2 text-brand-text-secondary">
                  <Calendar size={14} className="text-brand-accent" />
                  <span>{report.date}</span>
                </div>
              </div>

              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border mb-6 flex-grow">
                <p className="text-brand-text-primary text-sm whitespace-pre-wrap leading-relaxed">{report.details}</p>
              </div>

              <div className="flex gap-2 border-t border-brand-border pt-4 mt-auto">
                {report.status === 'New' && (
                  <button 
                    onClick={() => updateStatus(report.id, 'Reviewed')}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors font-medium text-xs"
                  >
                    <Clock size={14} />
                    {lang === 'am' ? 'እንደታየ ምልክት አድርግ' : 'Reviewed'}
                  </button>
                )}
                {report.status !== 'Action Taken' && (
                  <button 
                    onClick={() => updateStatus(report.id, 'Action Taken')}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors font-medium text-xs"
                  >
                    <CheckCircle size={14} />
                    {lang === 'am' ? 'እርምጃ ተወስዷል' : 'Action Taken'}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredReports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-brand-text-secondary">
          <Users size={48} className="opacity-10 mb-4" />
          <p>{lang === 'am' ? 'ምንም ሪፖርት አልተገኘም' : 'No reports found matching your search.'}</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{lang === 'am' ? 'አዲስ የማህበረሰብ ሪፖርት' : 'New Community Report'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                  <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'ሙሉ ስም' : 'Full Name'}</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    value={newReport.reporterName}
                    onChange={(e) => setNewReport({...newReport, reporterName: e.target.value})}
                  />
                </div>
                <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                  <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'ስልክ ቁጥር' : 'Phone Number'}</label>
                  <input 
                    required
                    type="tel" 
                    className="input-field" 
                    value={newReport.reporterPhone}
                    onChange={(e) => setNewReport({...newReport, reporterPhone: e.target.value})}
                  />
                </div>
                <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                  <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'ኢሜይል (አማራጭ)' : 'Email (Optional)'}</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    value={newReport.reporterEmail}
                    onChange={(e) => setNewReport({...newReport, reporterEmail: e.target.value})}
                  />
                </div>
                <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                  <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'ቀን' : 'Date'}</label>
                  <input 
                    required
                    type="date" 
                    className="input-field" 
                    value={newReport.date}
                    onChange={(e) => setNewReport({...newReport, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'ቦታ / አድራሻ' : 'Location / Address'}</label>
                <input 
                  required
                  type="text" 
                  className="input-field" 
                  value={newReport.location}
                  onChange={(e) => setNewReport({...newReport, location: e.target.value})}
                />
              </div>

              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'የሪፖርቱ ዝርዝር' : 'Report Details'}</label>
                <textarea 
                  required
                  className="input-field min-h-[120px]"
                  value={newReport.details}
                  onChange={(e) => setNewReport({...newReport, details: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 btn-secondary"
                  disabled={isSubmitting}
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (lang === 'am' ? 'በመላክ ላይ...' : 'Submitting') : (lang === 'am' ? 'አስገባ' : 'Submit Account')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
