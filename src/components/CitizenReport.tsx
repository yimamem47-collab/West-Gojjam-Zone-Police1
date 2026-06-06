import React, { useState, useRef, useEffect } from 'react';
import { Shield, MapPin, Calendar, Clock, FileText, Send, X, CheckCircle, Camera, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { auth } from '../firebase';
import { VoiceRecorder } from './VoiceRecorder';

interface CitizenReportProps {
  type: 'Crime' | 'Traffic';
  lang: Language;
  onClose: () => void;
  onSubmit: (report: any) => void;
}

export function CitizenReport({ type, lang, onClose, onSubmit }: CitizenReportProps) {
  const t = translations[lang];
  const [step, setStep] = useState<'form' | 'success'>('form');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [step]);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    description: '',
    category: 'other',
    filingStation: '',
    photos: [] as string[],
    plateNumber: '',
    accidentType: (t as any).trafficSafetyModule?.options.accidentTypes[0] || '',
    vehicleType: (t as any).trafficSafetyModule?.options.vehicleTypes[0] || ''
  });
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ts = (t as any).trafficSafetyModule;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileList = Array.from(files);
      fileList.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setFormData(prev => ({
              ...prev,
              photos: [...prev.photos, reader.result as string].slice(0, 3)
            }));
          };
          reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
          // For PDF, we just note it was attached in this simple version
          // Ideally we'd upload to Storage later, but for now we'll store notice in description
          setFormData(prev => ({
            ...prev,
            description: prev.description + `\n[Attached PDF: ${file.name}]`
          }));
          alert(lang === 'am' ? `ፒዲኤፍ ተያይዟል: ${file.name}` : `PDF attached: ${file.name}`);
        }
      });
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const categories = type === 'Crime' ? t.categories.crime : t.categories.traffic;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let voiceUrl = '';
      if (voiceBlob && navigator.onLine) {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../firebase');
        const voiceRef = ref(storage, `incidents_audio/${Date.now()}.webm`);
        const snapshot = await uploadBytes(voiceRef, voiceBlob);
        voiceUrl = await getDownloadURL(snapshot.ref);
      }

      const finalReport: any = {
        ...formData,
        type,
        status: 'Open',
        voice_url: voiceUrl,
        officerId: auth.currentUser?.uid || 'citizen',
        recordingOfficerName: auth.currentUser?.displayName || 'Citizen',
        recordingOfficerRank: 'citizen'
      };

      if (type === 'Traffic') {
        finalReport.trafficDetails = {
          plateNumber: formData.plateNumber,
          accidentType: formData.accidentType,
          vehicleType: formData.vehicleType
        };
        // Optional: remove redundant fields from root
        delete finalReport.plateNumber;
        delete finalReport.accidentType;
        delete finalReport.vehicleType;
      }

      onSubmit(finalReport);
      setStep('success');
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert(lang === 'am' ? 'ሪፖርቱን መላክ አልተቻለም። እባክዎ እንደገና ይሞክሩ።' : 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        ref={scrollRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-accent/10 rounded-lg">
                    <Shield className="text-brand-accent" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{type === 'Crime' ? t.crime : t.traffic} {t.newReport}</h2>
                    <p className="text-sm text-brand-text-secondary">Official Citizen Reporting Portal</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-brand-accent/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.incidentTitle}</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={18} />
                      <input 
                        required
                        type="text" 
                        className="input-field pl-10" 
                        placeholder={type === 'Traffic' ? (ts?.accidentReport || 'Accident Report') : 'Brief title of the incident'}
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.selectCategory}</label>
                    <select 
                      className="input-field"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {Object.entries(categories).map(([key, label]) => (
                        <option key={key} value={key}>{label as string}</option>
                      ))}
                    </select>
                  </div>

                  {type === 'Traffic' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts?.fields?.plateNumber || 'Plate Number'}</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="e.g. AA 12345"
                          value={formData.plateNumber}
                          onChange={(e) => setFormData({...formData, plateNumber: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts?.fields?.accidentType || 'Accident Type'}</label>
                        <select 
                          className="input-field"
                          value={formData.accidentType}
                          onChange={(e) => setFormData({...formData, accidentType: e.target.value})}
                        >
                          {ts?.options?.accidentTypes.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts?.fields?.vehicleType || 'Vehicle Type'}</label>
                        <select 
                          className="input-field"
                          value={formData.vehicleType}
                          onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                        >
                          {ts?.options?.vehicleTypes.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.incidentLocation}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={18} />
                      <input 
                        required
                        type="text" 
                        className="input-field pl-10" 
                        placeholder={t.locationPlaceholder}
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.filingStation}</label>
                    <select 
                      required
                      className="input-field"
                      value={formData.filingStation}
                      onChange={(e) => setFormData({...formData, filingStation: e.target.value})}
                    >
                      <option value="">{t.stationPlaceholder}</option>
                      {Object.entries(t.stations).map(([key, label]) => (
                        <option key={key} value={label as string}>{label as string}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.date}</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={18} />
                        <input 
                          required
                          type="date" 
                          className="input-field pl-10" 
                          value={formData.date}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.time}</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={18} />
                        <input 
                          required
                          type="time" 
                          className="input-field pl-10" 
                          value={formData.time}
                          onChange={(e) => setFormData({...formData, time: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.detailedDescription}</label>
                  <textarea 
                    id="crimeReport"
                    required
                    rows={4}
                    className="input-field resize-none" 
                    placeholder={t.descriptionPlaceholder}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.attachFiles || 'Attach Photos & Documents'} (Max 3)</label>
                  <div className="grid grid-cols-4 gap-4">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-brand-border group">
                        <img src={photo} alt="Incident" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {formData.photos.length < 3 && (
                      <label className="aspect-square rounded-xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center gap-2 hover:border-brand-accent hover:bg-brand-accent/5 transition-all cursor-pointer">
                        <ImageIcon size={24} className="text-brand-text-secondary" />
                        <span className="text-[10px] text-brand-text-secondary font-bold uppercase tracking-widest text-center">{lang === 'am' ? 'ፋይል ያክሉ' : 'Add File'}</span>
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

                <div className="bg-brand-accent/5 p-4 rounded-xl border border-brand-accent/10">
                  <p className="text-xs text-brand-text-secondary leading-relaxed">
                    {t.accuracyConfirm}
                  </p>
                </div>

                <div className="flex gap-4">
                  <button type="button" onClick={onClose} className="flex-1 btn-secondary">
                    {t.cancel}
                  </button>
                  <button type="submit" className="flex-1 btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Send size={18} />
                    )}
                    {isSubmitting ? (lang === 'am' ? 'በመላክ ላይ...' : 'Submitting...') : t.submitReport}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <CheckCircle size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">{t.successTitle}</h2>
              <p className="text-brand-text-secondary mb-8">
                {t.successDesc}
              </p>
              <div className="flex items-center justify-center gap-2 text-brand-accent font-medium">
                <div className="w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                <span>{t.redirecting}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
