import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  FileText, 
  MapPin, 
  User, 
  Calendar, 
  Image as ImageIcon, 
  File as FileIcon, 
  Send,
  X,
  Search,
  Filter,
  FileSpreadsheet,
  FileCode,
  AlertCircle,
  CheckCircle,
  Mic,
  Square,
  Play,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Info,
  Camera
} from 'lucide-react';
import { ZoneReport, Officer } from '../types';
import { translations } from '../lib/translations';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FilePicker } from '@capawesome/capacitor-file-picker';

interface ZoneReportsProps {
  reports: ZoneReport[];
  officers: Officer[];
  onAddReport: (report: Omit<ZoneReport, 'id' | 'timestamp'>) => Promise<void>;
  language: 'en' | 'am';
  currentUser: any;
}

export default function ZoneReports({ reports, officers, onAddReport, language, currentUser }: ZoneReportsProps) {
  const t = translations[language];
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWereda, setFilterWereda] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [currentStep, setCurrentStep] = useState(1);
  
  const [newReport, setNewReport] = useState({
    officer_name: '',
    officer_id: currentUser?.id || '',
    deputy_dept: '',
    main_dept: '',
    wereda: '',
    report_type: 'Monthly' as const,
    photo_url: '',
    document_url: '',
    voice_url: '',
  });

  const [selectedPhoto, setSelectedPhoto] = useState<{ blob: Blob, name: string } | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{ blob: Blob, name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (currentUser) {
      setNewReport(prev => ({
        ...prev,
        officer_name: currentUser.name,
        officer_id: currentUser.id
      }));
    }
  }, [currentUser]);

  const handlePickPhoto = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Prompt
        });
        
        if (image.webPath) {
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          setSelectedPhoto({ 
            blob, 
            name: `photo_${Date.now()}.${image.format}` 
          });
          setSelectedDoc(null);
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          setSelectedPhoto({ blob: file, name: file.name });
          setSelectedDoc(null);
        }
      };
      input.click();
    }
  };

  const handlePickDoc = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FilePicker.pickFiles({
          types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        });
        
        if (result.files.length > 0) {
          const file = result.files[0];
          if (file.path) {
            // For Capacitor, we might need to use Filesystem to read it or if it's a webPath
            const response = await fetch(Capacitor.convertFileSrc(file.path));
            const blob = await response.blob();
            setSelectedDoc({ 
              blob, 
              name: file.name || `doc_${Date.now()}` 
            });
            setSelectedPhoto(null);
          } else if (file.data) {
            // If data (base64) is provided
            const byteCharacters = atob(file.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {type: file.mimeType});
            setSelectedDoc({
              blob,
              name: file.name || `doc_${Date.now()}`
            });
            setSelectedPhoto(null);
          }
        }
      } catch (err) {
        console.error("File picker error:", err);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          setSelectedDoc({ blob: file, name: file.name });
          setSelectedPhoto(null);
        }
      };
      input.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(language === 'am' ? 'ማይክሮፎን ማግኘት አልተቻለም' : 'Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newReport.officer_name?.trim() || newReport.officer_name.length < 3) {
      alert(language === 'am' ? 'እባክዎ ትክክለኛ የመኮንን ስም ያስገቡ (ቢያንስ 3 ፊደላት)' : 'Please enter a valid officer name (min 3 characters)');
      return;
    }
    if (!newReport.deputy_dept) {
      alert(language === 'am' ? 'እባክዎ ምክትል መምሪያ ይምረጡ' : 'Please select a deputy department');
      return;
    }
    if (!newReport.main_dept) {
      alert(language === 'am' ? 'እባክዎ ዋና ክፍል ይምረጡ' : 'Please select a main department');
      return;
    }
    if (!newReport.wereda) {
      alert(language === 'am' ? 'እባክዎ ወረዳ/ጣቢያ ይምረጡ' : 'Please select a wereda/station');
      return;
    }
    if (!newReport.report_type) {
      alert(language === 'am' ? 'እባክዎ የሪፖርት አይነት ይምረጡ' : 'Please select a report type');
      return;
    }

    setIsUploading(true);
    try {
      let photo_url = '';
      let document_url = '';
      let voice_url = '';

      if (!navigator.onLine && (selectedPhoto || selectedDoc || audioBlob)) {
        const confirmSave = window.confirm(language === 'am' 
          ? 'ኔትወርክ የለም። ሪፖርቱ ይቀመጣል ነገር ግን ፎቶዎች/ሰነዶች ሊጫኑ አይችሉም። መቀጠል ይፈልጋሉ?' 
          : 'You are offline. The report will be saved, but photos/documents cannot be uploaded. Do you want to continue?');
        if (!confirmSave) {
          setIsUploading(false);
          return;
        }
      }

      if (navigator.onLine) {
        if (selectedPhoto) {
          const photoRef = ref(storage, `documents_and_photos/${Date.now()}_${selectedPhoto.name}`);
          const snapshot = await uploadBytes(photoRef, selectedPhoto.blob);
          photo_url = await getDownloadURL(snapshot.ref);
        }

        if (selectedDoc) {
          const docRef = ref(storage, `documents_and_photos/${Date.now()}_${selectedDoc.name}`);
          const snapshot = await uploadBytes(docRef, selectedDoc.blob);
          document_url = await getDownloadURL(snapshot.ref);
        }

        if (audioBlob) {
          const voiceRef = ref(storage, `documents_and_photos/${Date.now()}_voice_note.webm`);
          const snapshot = await uploadBytes(voiceRef, audioBlob);
          voice_url = await getDownloadURL(snapshot.ref);
        }
      }

      await onAddReport({
        ...newReport,
        photo_url,
        document_url,
        voice_url,
      } as any);
      
      setIsAdding(false);
      setCurrentStep(1);
      setNewReport({
        officer_name: currentUser?.name || '',
        officer_id: currentUser?.id || '',
        deputy_dept: '',
        main_dept: '',
        wereda: '',
        report_type: 'Monthly',
        photo_url: '',
        document_url: '',
        voice_url: '',
      });
      setSelectedPhoto(null);
      setSelectedDoc(null);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (error) {
      console.error('Upload error:', error);
      alert(language === 'am' ? 'ሪፖርቱን መላክ አልተቻለም። እባክዎ እንደገና ይሞክሩ።' : 'Failed to send report. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = (report.officer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (report.wereda || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWereda = filterWereda === 'all' || report.wereda === filterWereda;
    const matchesType = filterType === 'all' || report.report_type === filterType;
    return matchesSearch && matchesWereda && matchesType;
  });

  const deputyOptions = Object.keys(t.zoneReports.deputyDepts);
  const mainDeptOptions = Object.keys(t.zoneReports.mainDepts);
  const weredaOptions = Object.keys(t.zoneReports.detailedWeredas);
  const reportTypes = ['Monthly', 'Quarterly', '6-Month', '9-Month', 'Annual'];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-sm">
              <label className="block text-white text-sm mb-[5px] font-medium">{t.zoneReports.officerName}</label>
              <input
                type="text"
                required
                placeholder={(t.zoneReports as any).officerNameHint}
                value={newReport.officer_name}
                onChange={(e) => setNewReport({ ...newReport, officer_name: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-sm">
              <label className="block text-white text-sm mb-[5px] font-medium">{t.zoneReports.deputyDept}</label>
              <select
                required
                value={newReport.deputy_dept}
                onChange={(e) => setNewReport({ ...newReport, deputy_dept: e.target.value })}
                className="input-field appearance-none"
              >
                <option value="">{language === 'am' ? 'ምክትል መምሪያ ይምረጡ' : 'Select Deputy Department'}</option>
                {deputyOptions.map(d => (
                  <option key={d} value={d}>{(t.zoneReports.deputyDepts as any)[d]}</option>
                ))}
              </select>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-sm">
              <label className="block text-white text-sm mb-[5px] font-medium">{t.zoneReports.mainDept}</label>
              <select
                required
                value={newReport.main_dept}
                onChange={(e) => setNewReport({ ...newReport, main_dept: e.target.value })}
                className="input-field appearance-none"
              >
                <option value="">{language === 'am' ? 'ዋና ክፍል ይምረጡ' : 'Select Main Department'}</option>
                {mainDeptOptions.map(m => (
                  <option key={m} value={m}>{(t.zoneReports.mainDepts as any)[m]}</option>
                ))}
              </select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-sm">
              <label className="block text-white text-sm mb-[5px] font-medium">{t.zoneReports.wereda}</label>
              <select
                required
                value={newReport.wereda}
                onChange={(e) => setNewReport({ ...newReport, wereda: e.target.value })}
                className="input-field appearance-none"
              >
                <option value="">{language === 'am' ? 'ወረዳ/ጣቢያ ይምረጡ' : 'Select Wereda/Station'}</option>
                {weredaOptions.map(w => (
                  <option key={w} value={w}>{(t.zoneReports.detailedWeredas as any)[w]}</option>
                ))}
              </select>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-sm">
              <label className="block text-white text-sm mb-[5px] font-medium">{t.zoneReports.reportType}</label>
              <select
                required
                value={newReport.report_type}
                onChange={(e) => setNewReport({ ...newReport, report_type: e.target.value as any })}
                className="input-field appearance-none"
              >
                {reportTypes.map(type => (
                  <option key={type} value={type}>{(t.zoneReports as any)[type]}</option>
                ))}
              </select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handlePickPhoto}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
              >
                <Camera className="w-8 h-8 text-brand-accent" />
                <span className="text-xs font-bold text-white uppercase">{t.zoneReports.attachPhoto || 'Photo'}</span>
              </button>
              <button
                type="button"
                onClick={handlePickDoc}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
              >
                <FileIcon className="w-8 h-8 text-brand-accent" />
                <span className="text-xs font-bold text-white uppercase">{t.zoneReports.attachFile || 'Document'}</span>
              </button>
            </div>

            <AnimatePresence>
              {(selectedPhoto || selectedDoc) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {selectedPhoto ? <ImageIcon size={20} className="text-emerald-400" /> : <FileText size={20} className="text-emerald-400" />}
                    <div className="text-left">
                      <p className="text-xs font-bold text-emerald-400 truncate max-w-[150px]">{(selectedPhoto || selectedDoc)?.name}</p>
                      <p className="text-[10px] text-emerald-400/60">{formatFileSize((selectedPhoto || selectedDoc)?.blob.size || 0)}</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setSelectedPhoto(null); setSelectedDoc(null); }}
                    className="p-1 hover:bg-rose-500/10 rounded-full text-brand-text-secondary"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Voice Note Section */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-sm">
              <label className="block text-white text-sm mb-3 font-medium">{t.recordAudio || 'Voice Note'}</label>
              <div className="flex items-center gap-3">
                {!isRecording && !audioUrl ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition-all"
                  >
                    <Mic className="w-5 h-5" />
                    {t.recordAudio}
                  </button>
                ) : isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-500 text-white rounded-lg animate-pulse"
                  >
                    <Square className="w-5 h-5" />
                    {t.stopRecording}
                  </button>
                ) : (
                  <div className="flex-1 flex items-center gap-2">
                    <audio src={audioUrl!} controls className="flex-1 h-10" />
                    <button
                      type="button"
                      onClick={deleteRecording}
                      className="p-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-white/10 p-4 rounded-xl border border-[#FFD700]/30 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[#FFD700] mb-1">
                <Info className="w-5 h-5" />
                <h4 className="font-bold text-sm uppercase tracking-wider">{t.summary}</h4>
              </div>
              <p className="text-xs text-white/70 italic mb-2">{t.confirmDetails}</p>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-white/60">{t.zoneReports.officerName}:</span>
                <span className="text-white font-bold">{newReport.officer_name}</span>
                
                <span className="text-white/60">{t.zoneReports.deputyDept}:</span>
                <span className="text-white font-bold">{(t.zoneReports.deputyDepts as any)[newReport.deputy_dept]}</span>
                
                <span className="text-white/60">{t.zoneReports.mainDept}:</span>
                <span className="text-white font-bold">{(t.zoneReports.mainDepts as any)[newReport.main_dept]}</span>
                
                <span className="text-white/60">{t.zoneReports.wereda}:</span>
                <span className="text-white font-bold">{(t.zoneReports.detailedWeredas as any)[newReport.wereda]}</span>
                
                <span className="text-white/60">{t.zoneReports.reportType}:</span>
                <span className="text-white font-bold">{(t.zoneReports as any)[newReport.report_type]}</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-600" />
          {t.zoneReports.title}
        </h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setCurrentStep(1);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {t.zoneReports.newReport}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={filterWereda}
            onChange={(e) => setFilterWereda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Weredas</option>
            {weredaOptions.map(w => (
              <option key={w} value={w}>{t.zoneReports.detailedWeredas[w as keyof typeof t.zoneReports.detailedWeredas]}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Types</option>
            {reportTypes.map(type => (
              <option key={type} value={type}>{(t.zoneReports as any)[type]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredReports.map((report) => (
            <motion.div
              key={report.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{report.officer_name}</h3>
                      <p className="text-xs text-gray-500 font-medium uppercase text-blue-600">
                        {t.zoneReports.deputyDepts[report.deputy_dept as keyof typeof t.zoneReports.deputyDepts]} / {t.zoneReports.mainDepts[report.main_dept as keyof typeof t.zoneReports.mainDepts]}
                      </p>
                      <p className="text-sm text-gray-500">{t.zoneReports.detailedWeredas[report.wereda as keyof typeof t.zoneReports.detailedWeredas]}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded uppercase">
                    {(t.zoneReports as any)[report.report_type]}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {new Date(report.timestamp).toLocaleString()}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {report.photo_url && (
                    <a
                      href={report.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Photo
                    </a>
                  )}
                  {report.document_url && (
                    <a
                      href={report.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                    >
                      <FileIcon className="w-4 h-4" />
                      Document
                    </a>
                  )}
                  {report.voice_url && (
                    <button
                      onClick={() => {
                        const audio = new Audio(report.voice_url);
                        audio.play();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors"
                    >
                      <Mic className="w-4 h-4" />
                      Voice
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-8"
          >
            <div className="p-6 bg-[#1A237E] relative">
              <button onClick={() => setIsAdding(false)} className="absolute right-6 top-6 p-1 hover:bg-white/20 rounded-full transition-colors text-white">
                <X className="w-6 h-6" />
              </button>
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-2xl font-bold text-white leading-tight">
                  {language === 'am' ? 'የምዕራብ ጎጃም ዞን ፖሊስ መምሪያ' : 'West Gojjam Zone Police Department'}
                </h3>
                <p className="text-lg text-[#FFD700] font-medium">
                  {language === 'am' ? 'አዲስ ዝርዝር ሪፖርት' : 'New Detailed Report'}
                </p>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-4 mb-8">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      currentStep === s 
                        ? 'bg-[#FFD700] text-[#1A237E] shadow-lg shadow-[#FFD700]/20' 
                        : currentStep > s 
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/10 text-white/50 border border-white/20'
                    }`}>
                      {currentStep > s ? <CheckCircle className="w-5 h-5" /> : s}
                    </div>
                    {s < 3 && <div className={`w-8 h-0.5 ${currentStep > s ? 'bg-emerald-500' : 'bg-white/10'}`} />}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStep()}
                  </motion.div>
                </AnimatePresence>

                <div className="flex gap-4 mt-8">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="flex-1 h-[50px] bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors border border-white/20 flex items-center justify-center gap-2"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      {t.back}
                    </button>
                  )}
                  
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        // Basic validation for each step
                        if (currentStep === 1) {
                          if (!newReport.officer_name || !newReport.deputy_dept || !newReport.main_dept) {
                            alert(language === 'am' ? 'እባክዎ ሁሉንም መስኮች ይሙሉ' : 'Please fill all fields');
                            return;
                          }
                        }
                        if (currentStep === 2) {
                          if (!newReport.wereda || !newReport.report_type) {
                            alert(language === 'am' ? 'እባክዎ ሁሉንም መስኮች ይሙሉ' : 'Please fill all fields');
                            return;
                          }
                        }
                        setCurrentStep(prev => prev + 1);
                      }}
                      className="flex-1 h-[50px] bg-[#FFD700] text-[#1A237E] font-bold rounded-lg hover:bg-[#FFC107] transition-colors flex items-center justify-center gap-2"
                    >
                      {t.next}
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="flex-1 h-[60px] bg-emerald-500 text-white text-lg font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {language === 'am' ? 'በመላክ ላይ...' : 'Sending...'}
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          {t.zoneReports.sendReport}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
