import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, CheckCircle, ChevronRight, ChevronLeft, Paperclip, X as XIcon, Image as ImageIcon, FileText as FileIcon, Trash2, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { sendTelegramMessage, escapeHtml } from '../services/telegramService';
import { VoiceRecorder } from './VoiceRecorder';

interface CommunityReportFormProps {
  lang: Language;
  onBack: () => void;
}

export function CommunityReportForm({ lang, onBack }: CommunityReportFormProps) {
  const t = translations[lang];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [step, setStep] = useState(1);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);
  
  const [report, setReport] = useState({
    reporterName: '',
    reporterPhone: '',
    reporterEmail: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    details: '',
    files: [] as { name: string, type: string, data: string }[]
  });
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileList = Array.from(files);
      fileList.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReport(prev => ({
            ...prev,
            files: [...prev.files, { 
              name: file.name, 
              type: file.type, 
              data: reader.result as string 
            }].slice(0, 3)
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setReport(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!report.reporterName.trim() || report.reporterName.length < 3) {
        alert(lang === 'am' ? 'እባክዎ ትክክለኛ ስም ያስገቡ (ቢያንስ 3 ፊደላት)' : 'Please enter a valid name (min 3 characters)');
        return;
      }
      if (!report.reporterPhone.trim() || !/^\+?[\d\s-]{9,}$/.test(report.reporterPhone)) {
        alert(lang === 'am' ? 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ' : 'Please enter a valid phone number');
        return;
      }
      if (report.reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.reporterEmail)) {
        alert(lang === 'am' ? 'እባክዎ ትክክለኛ ኢሜይል ያስገቡ ወይም ባዶ ይተውት' : 'Please enter a valid email or leave it empty');
        return;
      }
    } else if (step === 2) {
      if (!report.details.trim() || report.details.length < 10) {
        alert(lang === 'am' ? 'እባክዎ ዝርዝር መግለጫ ያስገቡ (ቢያንስ 10 ፊደላት)' : 'Please enter detailed information (min 10 characters)');
        return;
      }
      if (!report.location.trim()) {
        alert(lang === 'am' ? 'እባክዎ ትክክለኛ ቦታ ያስገቡ' : 'Please enter a valid location');
        return;
      }
      if (!report.date) {
        alert(lang === 'am' ? 'እባክዎ ቀን ይምረጡ' : 'Please select a date');
        return;
      }
    }
    setStep(step + 1);
  };

  const handlePrev = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const uploadedFileUrls: string[] = [];
      let voiceUrl = '';

      if ((report.files.length > 0 || voiceBlob) && navigator.onLine) {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../firebase');
        
        for (const file of report.files) {
          const fileRef = ref(storage, `community_reports/${Date.now()}_${file.name}`);
          // Convert dataurl/base64 to blob/file
          const response = await fetch(file.data);
          const blob = await response.blob();
          const snapshot = await uploadBytes(fileRef, blob);
          const url = await getDownloadURL(snapshot.ref);
          uploadedFileUrls.push(url);
        }

        if (voiceBlob) {
          const voiceRef = ref(storage, `community_reports_audio/${Date.now()}.webm`);
          const snapshot = await uploadBytes(voiceRef, voiceBlob);
          voiceUrl = await getDownloadURL(snapshot.ref);
        }
      }

      const reportData = {
        ...report,
        files: uploadedFileUrls,
        voice_url: voiceUrl,
        status: 'New',
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'community_reports'), reportData);
      
      // Send Telegram notification
      let filesString = uploadedFileUrls.length > 0 
        ? `\n<b>Attachments (${uploadedFileUrls.length}):</b>\n${uploadedFileUrls.map((url, i) => `<a href="${url}">File ${i+1}</a>`).join(', ')}`
        : "";
      
      let voiceString = voiceUrl ? `\n<b>Voice Note:</b> <a href="${voiceUrl}">Listen</a>` : "";
        
      const message = `🚨 <b>አዲስ የማህበረሰብ ሪፖርት / New Community Report</b>\n---------------------------\n<b>Name:</b> ${escapeHtml(report.reporterName)}\n<b>Phone:</b> ${escapeHtml(report.reporterPhone)}\n<b>Location:</b> ${escapeHtml(report.location)}\n<b>Date:</b> ${escapeHtml(report.date)}\n---------------------------\n<b>Details:</b>\n${escapeHtml(report.details)}${filesString}${voiceString}`;
      await sendTelegramMessage(message);

      // Send to Google Sheets
      const sheetURL = "https://script.google.com/macros/s/AKfycbw2Bkjrv9SbObSFs0xOlcONYKJKpsa_lqSu2to4PfIKlHoP8U5KVMj0DQYrkvkS_jYS/exec";
      
      const sheetData = {
        name: report.reporterName,
        phone: report.reporterPhone,
        email: report.reporterEmail || "",
        message: report.details + 
                 (uploadedFileUrls.length > 0 ? ` [Files: ${uploadedFileUrls.join(', ')}]` : "") + 
                 (voiceUrl ? ` [Voice: ${voiceUrl}]` : ""),
        location: report.location,
        date: report.date,
        status: 'New Community Report'
      };
      
      console.log("Sending report to Google Sheets:", sheetData);
      
      // Send to Google Sheets in the background without blocking
      fetch(sheetURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sheetData)
      }).then(() => console.log("Data successfully sent to Google Sheets (no-cors mode)"))
        .catch(error => console.error("Error sending to Google Sheets:", error));
      
      setIsSuccess(true);
    } catch (error) {
      console.error('Failed to submit report:', error);
      try {
        handleFirestoreError(error, OperationType.CREATE, 'community_reports');
      } catch (e) {
        // Ignore the thrown error from handleFirestoreError as we want to show an alert instead
      }
      alert(lang === 'am' ? 'ሪፖርቱን መላክ አልተቻለም። እባክዎ እንደገና ይሞክሩ።' : 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card max-w-md w-full p-8 text-center"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4">
            {lang === 'am' ? 'ሪፖርትዎ በተሳካ ሁኔታ ተልኳል' : 'Report Submitted Successfully'}
          </h2>
          <p className="text-brand-text-secondary mb-8">
            {lang === 'am' ? 'ስለ ትብብርዎ እናመሰግናለን። ፖሊስ ሪፖርትዎን በቅርቡ ይመለከተዋል።' : 'Thank you for your cooperation. The police will review your report shortly.'}
          </p>
          <button onClick={onBack} className="btn-primary w-full">
            {lang === 'am' ? 'ወደ ዋናው ገጽ ተመለስ' : 'Return to Home'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-brand-bg py-12 px-4 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-brand-text-secondary hover:text-brand-text-primary mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>{lang === 'am' ? 'ተመለስ' : 'Back'}</span>
        </button>

        <div className="glass-card p-8 border-t-4 border-blue-500">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-brand-text-primary mb-2">
              {lang === 'am' ? 'የማህበረሰብ ሪፖርት ማቅረቢያ' : 'Community Report Submission'}
            </h1>
            <p className="text-brand-text-secondary">
              {lang === 'am' ? 'እባክዎ የሚከተለውን ቅጽ በመሙላት ሪፖርትዎን ያቅርቡ።' : 'Please fill out the form below to submit your report.'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="flex justify-between mb-8 gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-2.5 flex-1 rounded-full transition-colors duration-300 ${s <= step ? 'bg-brand-accent' : 'bg-brand-border'}`}
              />
            ))}
          </div>

          <div className="relative min-h-[300px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold mb-4">{lang === 'am' ? 'ደረጃ 1: መሰረታዊ መረጃ' : 'Step 1: Basic Information'}</h3>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'ሙሉ ስም' : 'Full Name'}</label>
                    <input 
                      required
                      type="text" 
                      className="input-field" 
                      placeholder={lang === 'am' ? 'ሙሉ ስም' : 'Full Name'}
                      value={report.reporterName}
                      onChange={(e) => setReport({...report, reporterName: e.target.value})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'ስልክ ቁጥር' : 'Phone Number'}</label>
                    <input 
                      required
                      type="tel" 
                      className="input-field" 
                      placeholder={lang === 'am' ? 'ስልክ ቁጥር' : 'Phone Number'}
                      value={report.reporterPhone}
                      onChange={(e) => setReport({...report, reporterPhone: e.target.value})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'ኢሜይል (አማራጭ)' : 'Email (Optional)'}</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      placeholder={lang === 'am' ? 'ኢሜይል' : 'Email'}
                      value={report.reporterEmail}
                      onChange={(e) => setReport({...report, reporterEmail: e.target.value})}
                    />
                  </div>
                  <button onClick={handleNext} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                    {lang === 'am' ? 'ቀጣይ' : 'Next'} <ChevronRight size={18} />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold mb-4">{lang === 'am' ? 'ደረጃ 2: የጥቆማ ዝርዝር' : 'Step 2: Report Details'}</h3>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'የሪፖርቱ ዝርዝር' : 'Report Details'}</label>
                    <textarea 
                      required
                      className="input-field min-h-[120px]"
                      placeholder={lang === 'am' ? 'የጥቆማውን ዝርዝር እዚህ ይጻፉ...' : 'Write the details here...'}
                      value={report.details}
                      onChange={(e) => setReport({...report, details: e.target.value})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'ቦታ / አድራሻ' : 'Location / Address'}</label>
                    <input 
                      required
                      type="text" 
                      className="input-field" 
                      placeholder={lang === 'am' ? 'ቦታ (ለምሳሌ፡ ፍኖተ ሰላም)' : 'Location (e.g., Finote Selam)'}
                      value={report.location}
                      onChange={(e) => setReport({...report, location: e.target.value})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'ቀን' : 'Date'}</label>
                    <input 
                      required
                      type="date" 
                      className="input-field" 
                      value={report.date}
                      onChange={(e) => setReport({...report, date: e.target.value})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{lang === 'am' ? 'ፋይል ያያይዙ (ምስል ወይም ፒዲኤፍ)' : 'Attach Files (Image or PDF)'}</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {report.files.map((file, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center overflow-hidden group">
                          {file.type.startsWith('image/') ? (
                            <img src={file.data} alt="Upload" className="w-full h-full object-cover" />
                          ) : (
                            <FileIcon size={32} className="text-brand-accent" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => removeFile(idx)} className="p-2 bg-rose-500 rounded-full text-white">
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[8px] text-white truncate text-center">
                            {file.name}
                          </div>
                        </div>
                      ))}
                      {report.files.length < 3 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center gap-2 hover:border-brand-accent hover:bg-brand-accent/5 transition-all cursor-pointer">
                          <Paperclip size={24} className="text-brand-text-secondary" />
                          <span className="text-[10px] font-bold uppercase text-brand-text-secondary">{lang === 'am' ? 'አክል' : 'Add File'}</span>
                          <input 
                            type="file" 
                            accept="image/*,application/pdf" 
                            multiple
                            className="hidden" 
                            onChange={handleFileUpload}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <VoiceRecorder 
                    lang={lang}
                    onRecordingComplete={(blob) => setVoiceBlob(blob)}
                    onDelete={() => setVoiceBlob(null)}
                  />

                  <div className="flex gap-4">
                    <button onClick={handlePrev} className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2">
                      <ChevronLeft size={18} /> {lang === 'am' ? 'ወደ ኋላ' : 'Back'}
                    </button>
                    <button onClick={handleNext} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                      {lang === 'am' ? 'ቀጣይ' : 'Next'} <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold mb-4">{lang === 'am' ? 'ደረጃ 3: ማረጋገጫ' : 'Step 3: Confirmation'}</h3>
                  <p className="text-brand-text-secondary mb-4">
                    {lang === 'am' ? 'መረጃው በትክክል መሞላቱን ያረጋግጡ።' : 'Please review the information before submitting.'}
                  </p>
                  
                  <div className="bg-brand-bg/50 p-6 rounded-xl border border-brand-border shadow-sm space-y-4">
                    <div>
                      <span className="text-sm text-brand-text-secondary block">{lang === 'am' ? 'ሙሉ ስም' : 'Full Name'}</span>
                      <span className="font-medium">{report.reporterName}</span>
                    </div>
                    <div>
                      <span className="text-sm text-brand-text-secondary block">{lang === 'am' ? 'ስልክ ቁጥር' : 'Phone Number'}</span>
                      <span className="font-medium">{report.reporterPhone}</span>
                    </div>
                    <div>
                      <span className="text-sm text-brand-text-secondary block">{lang === 'am' ? 'ቦታ' : 'Location'}</span>
                      <span className="font-medium">{report.location}</span>
                    </div>
                    <div>
                      <span className="text-sm text-brand-text-secondary block">{lang === 'am' ? 'የሪፖርቱ ዝርዝር' : 'Report Details'}</span>
                      <p className="font-medium whitespace-pre-wrap mt-1">{report.details}</p>
                    </div>
                    <div>
                      <span className="text-sm text-brand-text-secondary block mb-2">{lang === 'am' ? 'የተያያዙ ፋይሎች' : 'Attached Files'}</span>
                      <div className="flex flex-wrap gap-2">
                        {report.files.length > 0 ? report.files.map((f, i) => (
                          <div key={i} className="px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-full text-xs flex items-center gap-2">
                            {f.type.startsWith('image/') ? <ImageIcon size={12} /> : <FileIcon size={12} />}
                            <span className="truncate max-w-[150px]">{f.name}</span>
                          </div>
                        )) : <span className="text-xs text-brand-text-secondary italic">{lang === 'am' ? 'ምንም ፋይል አልተያያዘም' : 'No files attached'}</span>}
                      </div>
                    </div>
                    {voiceBlob && (
                      <div className="pt-2 border-t border-brand-border">
                        <span className="text-sm text-brand-text-secondary block mb-2">{lang === 'am' ? 'ድምፅ ተመዝግቧል' : 'Voice Recorded'}</span>
                        <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-xs inline-flex items-center gap-2">
                          <Mic size={12} className="text-rose-500" />
                          <span>{lang === 'am' ? 'የድምፅ ጥቆማ ተያይዟል' : 'Voice Note Attached'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button onClick={handlePrev} className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2" disabled={isSubmitting}>
                      <ChevronLeft size={18} /> {lang === 'am' ? 'ወደ ኋላ' : 'Back'}
                    </button>
                    <button onClick={handleSubmit} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2" disabled={isSubmitting}>
                      <Send size={18} /> {isSubmitting ? (lang === 'am' ? 'በመላክ ላይ...' : 'Submitting...') : (lang === 'am' ? 'ጥቆማውን ላክ' : 'Submit Report')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
