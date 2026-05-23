import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Trash2, Download, Edit2, Shield, Mic, Square, ChevronLeft, ChevronRight, Send, CheckCircle, Info, X, Volume2, Camera, File as FileIcon, FileCheck, Image as ImageIcon } from 'lucide-react';
import { Report, Officer } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Capacitor } from '@capacitor/core';

interface ReportsProps {
  reports: Report[];
  officers: Officer[];
  lang: Language;
  initialEditId?: string | null;
  onAdd: (report: Omit<Report, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Report>) => void;
  onDelete: (id: string) => void;
}

export function Reports({ reports, officers, lang, initialEditId, onAdd, onUpdate, onDelete }: ReportsProps) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<{ blob: Blob, name: string }[]>([]);

  React.useEffect(() => {
    if (initialEditId) {
      const report = reports.find(r => r.id === initialEditId);
      if (report) {
        setEditingReport(report);
        setNewReport({
          title: report.title,
          status: report.status,
          date: report.date,
          location: report.location || '',
          officerId: report.officerId,
          filingStation: report.filingStation,
          recordingOfficerName: report.recordingOfficerName,
          recordingOfficerRank: report.recordingOfficerRank,
          type: report.type,
          category: report.category,
          description: report.description,
          photos: report.photos || [],
          document_url: report.document_url || '',
          voice_url: report.voice_url || '',
          trafficDetails: report.trafficDetails || {
            accidentType: 'pedestrianCollision',
            accidentImpact: 'death',
            numDeaths: 0,
            numHeavyInjuries: 0,
            numLightInjuries: 0,
            propertyDamageEstimate: '',
            driverExperience: 'exp1to5',
            vehicleType: 'vPrivate',
            plateNumber: '',
            licenseGrade: 'lAutomobile',
            reporterName: '',
            reporterAddress: '',
            reporterPhone: '',
            reporterOther: ''
          }
        });
        setIsModalOpen(true);
      }
    }
  }, [initialEditId, reports]);
  const [newReport, setNewReport] = useState<Omit<Report, 'id'>>({
    title: '',
    status: 'Pending Review',
    date: new Date().toISOString().split('T')[0],
    officerId: officers[0]?.id || '',
    filingStation: '',
    recordingOfficerName: officers[0]?.name || '',
    recordingOfficerRank: officers[0]?.rank || 'constable',
    type: 'Crime',
    category: 'other',
    description: '',
    photos: [] as string[],
    documents: [] as { name: string; url: string }[],
    voice_url: '',
    trafficDetails: {
      accidentType: 'pedestrianCollision',
      accidentImpact: 'death',
      numDeaths: 0,
      numHeavyInjuries: 0,
      numLightInjuries: 0,
      propertyDamageEstimate: '',
      driverExperience: 'exp1to5',
      vehicleType: 'vPrivate',
      plateNumber: '',
      licenseGrade: 'lAutomobile',
      accidentCause: 'Other',
      reporterName: '',
      reporterAddress: '',
      reporterPhone: '',
      reporterOther: ''
    }
  });

  const [activeAudio, setActiveAudio] = useState<string | null>(null);

  const handlePhotoUpload = async () => {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt
      });

      if (image.dataUrl) {
        setNewReport(prev => ({
          ...prev,
          photos: [...(prev.photos || []), image.dataUrl!].slice(0, 10)
        }));
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const removePhoto = (index: number) => {
    setNewReport(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  const handleDocUpload = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FilePicker.pickFiles({
          types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        });
        
        if (result.files.length > 0) {
          const newDocs: { blob: Blob, name: string }[] = [];
          for (const file of result.files) {
            if (file.path) {
              const response = await fetch(Capacitor.convertFileSrc(file.path));
              const blob = await response.blob();
              newDocs.push({ 
                blob, 
                name: file.name || `doc_${Date.now()}` 
              });
            }
          }
          setSelectedDocs(prev => [...prev, ...newDocs]);
        }
      } catch (err) {
        console.error("File picker error:", err);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx';
      input.multiple = true;
      input.onchange = async (e: any) => {
        const files = Array.from(e.target.files || []) as File[];
        if (files.length > 0) {
          const newDocs = files.map(file => ({ blob: file, name: file.name }));
          setSelectedDocs(prev => [...prev, ...newDocs]);
        }
      };
      input.click();
    }
  };

  const removeDoc = (index: number) => {
    setSelectedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingDoc = (index: number) => {
    setNewReport(prev => ({
      ...prev,
      documents: (prev.documents || []).filter((_, i) => i !== index)
    }));
  };

  // Update default officer when officers list is loaded
  useEffect(() => {
    if (officers.length > 0 && !newReport.officerId) {
      setNewReport(prev => ({ ...prev, officerId: officers[0].id }));
    }
  }, [officers, newReport.officerId]);

  const filteredReports = reports.filter(r => 
    (r.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.recordingOfficerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/ogg';

      const mediaRecorder = new NewMediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingDuration(0);
      mediaRecorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert(lang === 'am' ? 'ማይክሮፎን ማግኘት አልተቻለም' : 'Could not access microphone');
    }
  };

  // Helper alias since NewMediaRecorder doesn't exist, we use standard MediaRecorder
  const NewMediaRecorder = window.MediaRecorder;


  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    setNewReport({
      ...report,
      trafficDetails: report.type === 'Traffic' ? {
        accidentType: 'pedestrianCollision',
        accidentImpact: 'death',
        numDeaths: 0,
        numHeavyInjuries: 0,
        numLightInjuries: 0,
        propertyDamageEstimate: '',
        driverExperience: 'exp1to5',
        vehicleType: 'vPrivate',
        plateNumber: '',
        licenseGrade: 'lAutomobile',
        accidentCause: 'Other',
        reporterName: '',
        reporterAddress: '',
        reporterPhone: '',
        reporterOther: '',
        ...report.trafficDetails
      } : report.trafficDetails
    });
    setIsModalOpen(true);
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newReport.title.trim() || newReport.title.length < 3) {
      alert(lang === 'am' ? 'እባክዎ ትክክለኛ ርዕስ ያስገቡ (ቢያንስ 3 ፊደላት)' : 'Please enter a valid title (min 3 characters)');
      return;
    }
    if (!newReport.officerId) {
      alert(lang === 'am' ? 'እባክዎ መኮንን ይምረጡ' : 'Please select an officer');
      return;
    }
    if (!newReport.date) {
      alert(lang === 'am' ? 'እባክዎ ቀን ይምረጡ' : 'Please select a date');
      return;
    }
    if (!newReport.description?.trim() || newReport.description.length < 10) {
      alert(lang === 'am' ? 'እባክዎ ዝርዝር መግለጫ ያስገቡ (ቢያንስ 10 ፊደላት)' : 'Please enter a detailed description (min 10 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalVoiceUrl = newReport.voice_url;
      let finalDocuments = [...(newReport.documents || [])];
      let finalPhotos = [...(newReport.photos || [])];

      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('../firebase');

      if (audioBlob) {
        const extension = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
        const voiceRef = ref(storage, `reports/${Date.now()}_voice.${extension}`);
        const snapshot = await uploadBytes(voiceRef, audioBlob, { contentType: audioBlob.type });
        finalVoiceUrl = await getDownloadURL(snapshot.ref);
      }

      // Upload new documents
      if (selectedDocs.length > 0) {
        const uploadPromises = selectedDocs.map(async (docObj) => {
          const docRef = ref(storage, `reports/${Date.now()}_${docObj.name}`);
          const snapshot = await uploadBytes(docRef, docObj.blob);
          const url = await getDownloadURL(snapshot.ref);
          return { name: docObj.name, url };
        });
        const uploadedDocs = await Promise.all(uploadPromises);
        finalDocuments = [...finalDocuments, ...uploadedDocs];
      }

      // Upload photos
      finalPhotos = await Promise.all((newReport.photos || []).map(async (photo) => {
        if (photo.startsWith('data:')) {
          const photoRef = ref(storage, `reports/${Date.now()}_photo.jpg`);
          const response = await fetch(photo);
          const blob = await response.blob();
          const snapshot = await uploadBytes(photoRef, blob, { contentType: 'image/jpeg' });
          return await getDownloadURL(snapshot.ref);
        }
        return photo; // Already a URL
      }));

      const reportData = { 
        ...newReport, 
        voice_url: finalVoiceUrl, 
        documents: finalDocuments,
        photos: finalPhotos,
        // For backward compatibility
        document_url: finalDocuments.length > 0 ? finalDocuments[0].url : newReport.document_url 
      };

      if (editingReport) {
        await onUpdate(editingReport.id, reportData);
      } else {
        await onAdd(reportData);
      }
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        handleCloseModal();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert(lang === 'am' ? 'ሪፖርት ሲላክ ስህተት ተፈጥሯል' : 'Error submitting report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">Report Title</label>
              <input 
                required
                type="text" 
                className="input-field" 
                placeholder="e.g. Incident 001 Final Report"
                value={newReport.title}
                onChange={(e) => setNewReport({...newReport, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.type}</label>
                <select 
                  className="input-field"
                  value={newReport.type}
                  onChange={(e) => setNewReport({...newReport, type: e.target.value as any, category: 'other'})}
                >
                  <option value="Crime">{t.crime}</option>
                  <option value="Traffic">{t.traffic}</option>
                </select>
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.selectCategory}</label>
                <select 
                  className="input-field"
                  value={newReport.category}
                  onChange={(e) => setNewReport({...newReport, category: e.target.value})}
                >
                  {newReport.type === 'Crime' ? (
                    Object.entries(t.categories.crime).map(([key, label]) => (
                      <option key={key} value={key}>{label as string}</option>
                    ))
                  ) : (
                    Object.entries(t.categories.traffic).map(([key, label]) => (
                      <option key={key} value={key}>{label as string}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.filingStation}</label>
                <select 
                  required
                  className="input-field"
                  value={newReport.filingStation}
                  onChange={(e) => setNewReport({...newReport, filingStation: e.target.value})}
                >
                  <option value="">{t.stationPlaceholder}</option>
                  {Object.entries(t.stations).map(([key, label]) => (
                    <option key={key} value={label as string}>{label as string}</option>
                  ))}
                </select>
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.date}</label>
                <input 
                  required
                  type="date" 
                  className="input-field" 
                  value={newReport.date}
                  onChange={(e) => setNewReport({...newReport, date: e.target.value})}
                />
              </div>
            </div>

            {newReport.type === 'Traffic' && (
              <div className="space-y-6 border-t border-brand-border pt-6">
                <h3 className="text-lg font-bold text-brand-accent mb-4">{(t as any).trafficForm.accidentType}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.accidentType}</label>
                    <select 
                      className="input-field"
                      value={newReport.trafficDetails?.accidentType}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, accidentType: e.target.value}})}
                    >
                      <option value="pedestrianCollision">{(t as any).trafficForm.pedestrianCollision}</option>
                      <option value="vehicleToVehicle">{(t as any).trafficForm.vehicleToVehicle}</option>
                      <option value="overturning">{(t as any).trafficForm.overturning}</option>
                      <option value="objectCollision">{(t as any).trafficForm.objectCollision}</option>
                      <option value="falling">{(t as any).trafficForm.falling}</option>
                    </select>
                  </div>

                    <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                      <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.accidentCause || 'Accident Cause'}</label>
                      <select 
                        className="input-field"
                        value={newReport.trafficDetails?.accidentCause}
                        onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, accidentCause: e.target.value}})}
                      >
                        <option value="Other">{(t as any).other || 'Other'}</option>
                        <option value="Speeding">{lang === 'am' ? 'ከፍጥነት በላይ' : 'Speeding'}</option>
                        <option value="DrunkDriving">{lang === 'am' ? 'በስካር መንዳት' : 'Drunk Driving'}</option>
                        <option value="Technical">{lang === 'am' ? 'የቴክኒክ ችግር' : 'Technical Issue'}</option>
                      </select>
                    </div>
                  </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.numDeaths}</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={newReport.trafficDetails?.numDeaths}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, numDeaths: parseInt(e.target.value) || 0}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.numHeavyInjuries}</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={newReport.trafficDetails?.numHeavyInjuries}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, numHeavyInjuries: parseInt(e.target.value) || 0}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.numLightInjuries}</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={newReport.trafficDetails?.numLightInjuries}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, numLightInjuries: parseInt(e.target.value) || 0}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.propertyEstimate}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 50,000 ETB"
                      className="input-field" 
                      value={newReport.trafficDetails?.propertyDamageEstimate}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, propertyDamageEstimate: e.target.value}})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.driverExperience}</label>
                    <select 
                      className="input-field"
                      value={newReport.trafficDetails?.driverExperience}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, driverExperience: e.target.value}})}
                    >
                      <option value="exp1to5">{(t as any).trafficForm.exp1to5}</option>
                      <option value="exp5to10">{(t as any).trafficForm.exp5to10}</option>
                      <option value="expAbove10">{(t as any).trafficForm.expAbove10}</option>
                    </select>
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.vehicleType}</label>
                    <select 
                      className="input-field"
                      value={newReport.trafficDetails?.vehicleType}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, vehicleType: e.target.value}})}
                    >
                      <option value="vPublic">{(t as any).trafficForm.vPublic}</option>
                      <option value="vPrivate">{(t as any).trafficForm.vPrivate}</option>
                      <option value="vFreight">{(t as any).trafficForm.vFreight}</option>
                      <option value="vMotorcycle">{(t as any).trafficForm.vMotorcycle}</option>
                      <option value="vOther">{(t as any).trafficForm.vOther}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.plateNumber}</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newReport.trafficDetails?.plateNumber}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, plateNumber: e.target.value}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.licenseGrade}</label>
                    <select 
                      className="input-field"
                      value={newReport.trafficDetails?.licenseGrade}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, licenseGrade: e.target.value}})}
                    >
                      <option value="lPublic1">{(t as any).trafficForm.lPublic1}</option>
                      <option value="lPublic2">{(t as any).trafficForm.lPublic2}</option>
                      <option value="lDry1">{(t as any).trafficForm.lDry1}</option>
                      <option value="lDry2">{(t as any).trafficForm.lDry2}</option>
                      <option value="lDry3">{(t as any).trafficForm.lDry3}</option>
                      <option value="lLiquid1">{(t as any).trafficForm.lLiquid1}</option>
                      <option value="lLiquid2">{(t as any).trafficForm.lLiquid2}</option>
                      <option value="lAutomobile">{(t as any).trafficForm.lAutomobile}</option>
                    </select>
                  </div>
                </div>

                <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-brand-text-primary underline">{(t as any).trafficForm.reporterInfo}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.reporterName}</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={newReport.trafficDetails?.reporterName}
                        onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, reporterName: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.reporterAddress}</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={newReport.trafficDetails?.reporterAddress}
                        onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, reporterAddress: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.reporterPhone}</label>
                      <input 
                        type="tel" 
                        className="input-field" 
                        value={newReport.trafficDetails?.reporterPhone}
                        onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, reporterPhone: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.recordingOfficer}</label>
              <select 
                required
                className="input-field"
                value={newReport.officerId}
                onChange={(e) => {
                  const selectedOfficer = officers.find(o => o.id === e.target.value);
                  if (selectedOfficer) {
                    setNewReport({
                      ...newReport, 
                      officerId: selectedOfficer.id,
                      recordingOfficerName: selectedOfficer.name,
                      recordingOfficerRank: selectedOfficer.rank
                    });
                  }
                }}
              >
                <option value="">{t.selectOfficer || 'Select Officer'}</option>
                {officers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.name} ({(t.ranks as any)[officer.rank] || officer.rank})
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.detailedDescription}</label>
              <textarea 
                className="input-field min-h-[100px]"
                placeholder={t.descriptionPlaceholder}
                value={newReport.description}
                onChange={(e) => setNewReport({...newReport, description: e.target.value})}
              />
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-3">{t.attachFiles || 'Attach Photos & Documents'}</label>
              <div className="grid grid-cols-4 gap-4">
                {(newReport.photos || []).map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-brand-border group">
                    <img src={photo} alt="Report" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {(newReport.photos || []).length < 10 && (
                  <button 
                    type="button"
                    onClick={handlePhotoUpload}
                    className="aspect-square rounded-xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center gap-2 hover:border-brand-accent hover:bg-brand-accent/5 transition-all cursor-pointer"
                  >
                    <Camera size={24} className="text-brand-text-secondary" />
                    <span className="text-[10px] uppercase font-bold text-brand-text-secondary">Photo</span>
                  </button>
                )}
                
                {/* Existing Documents */}
                {(newReport.documents || []).map((doc, index) => (
                  <div key={`existing-${index}`} className="relative aspect-square rounded-xl border border-emerald-500 bg-emerald-500/5 flex flex-col items-center justify-center gap-1 group overflow-hidden">
                    <FileCheck size={24} className="text-emerald-500" />
                    <span className="text-[8px] font-bold text-emerald-500 truncate w-full px-1 text-center">{doc.name}</span>
                    <button 
                      type="button"
                      onClick={() => removeExistingDoc(index)}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {/* New Selected Documents */}
                {selectedDocs.map((doc, index) => (
                  <div key={`new-${index}`} className="relative aspect-square rounded-xl border-2 border-brand-accent bg-brand-accent/5 flex flex-col items-center justify-center gap-1 group overflow-hidden">
                    <FileIcon size={24} className="text-brand-accent" />
                    <span className="text-[8px] font-bold text-brand-accent truncate w-full px-1 text-center">{doc.name}</span>
                    <button 
                      type="button"
                      onClick={() => removeDoc(index)}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}

                <button 
                  type="button"
                  onClick={handleDocUpload}
                  className="aspect-square rounded-xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center gap-2 hover:border-brand-accent hover:bg-brand-accent/5 transition-all cursor-pointer"
                >
                  <FileIcon size={24} className="text-brand-text-secondary" />
                  <span className="text-[10px] uppercase font-bold text-brand-text-secondary">File</span>
                </button>
              </div>
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-brand-text-secondary">{t.recordAudio || 'Voice Note'}</label>
                {isRecording && (
                  <span className="text-xs font-mono text-rose-500 animate-pulse font-bold">
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')} / 1:00
                  </span>
                )}
                {!isRecording && audioBlob && (
                  <span className="text-xs font-mono text-emerald-500 font-bold">
                    {t.recordingReady || 'Recording Ready'}
                  </span>
                )}
              </div>
              {!isRecording && !audioUrl ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all group"
                >
                  <div className="p-2 rounded-full bg-rose-500/10 group-hover:bg-rose-500/20 transition-all">
                    <Mic size={20} />
                  </div>
                  <span className="font-bold">{t.recordAudio || 'Start Voice Note (Max 60s)'}</span>
                </button>
              ) : isRecording ? (
                <div className="space-y-4">
                  <div className="flex justify-center items-center gap-1 h-8">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [4, Math.random() * 20 + 4, 4] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                        className="w-1 bg-rose-500 rounded-full"
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-rose-500 text-white rounded-lg shadow-lg shadow-rose-500/20 transition-all"
                  >
                    <Square size={20} fill="currentColor" />
                    <span className="font-bold">{t.stopRecording || 'Stop & Save'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full">
                      <Volume2 size={20} />
                    </div>
                    <audio src={audioUrl!} controls className="flex-1 h-10 custom-audio-player" />
                    <button
                      type="button"
                      onClick={deleteRecording}
                      className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all"
                      title={t.delete || 'Delete'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-brand-accent/5 p-4 rounded-xl border border-brand-accent/20 space-y-3">
              <div className="flex items-center gap-2 text-brand-accent">
                <Info size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">{(translations[lang] as any).summary || 'Summary'}</h4>
              </div>
              <p className="text-xs text-brand-text-secondary italic">{(translations[lang] as any).confirmDetails || 'Please confirm your details before sending'}</p>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-brand-text-secondary">Report Title:</span>
                <span className="font-bold">{newReport.title}</span>
                <span className="text-brand-text-secondary">{t.type}:</span>
                <span className="font-bold">{newReport.type}</span>
                <span className="text-brand-text-secondary">{t.filingStation}:</span>
                <span className="font-bold">{newReport.filingStation}</span>
                <span className="text-brand-text-secondary">{t.date}:</span>
                <span className="font-bold">{newReport.date}</span>
                {((newReport.documents || []).length > 0 || selectedDocs.length > 0) && (
                  <>
                    <span className="text-brand-text-secondary">Documents:</span>
                    <span className="font-bold text-emerald-400">
                      {(newReport.documents || []).length + selectedDocs.length} files
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReport(null);
    setCurrentStep(1);
    setAudioBlob(null);
    setAudioUrl(null);
    setSelectedDocs([]);
    setNewReport({ 
      title: '', 
      status: 'Pending Review', 
      date: new Date().toISOString().split('T')[0], 
      officerId: officers[0]?.id || '',
      filingStation: '',
      recordingOfficerName: officers[0]?.name || '',
      recordingOfficerRank: officers[0]?.rank || 'constable',
      type: 'Crime',
      category: 'other',
      description: '',
      voice_url: '',
      trafficDetails: {
        accidentType: 'pedestrianCollision',
        accidentImpact: 'death',
        numDeaths: 0,
        numHeavyInjuries: 0,
        numLightInjuries: 0,
        propertyDamageEstimate: '',
        driverExperience: 'exp1to5',
        vehicleType: 'vPrivate',
        plateNumber: '',
        licenseGrade: 'lAutomobile',
        reporterName: '',
        reporterAddress: '',
        reporterPhone: '',
        reporterOther: ''
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.reports || 'Reports'}</h1>
          <p className="text-brand-text-secondary">Official documentation and case reports.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={18} />
          {t.newReport}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border-l-4 border-brand-accent">
          <p className="text-brand-text-secondary text-sm font-medium mb-1">Total Reports</p>
          <h3 className="text-2xl font-bold">{reports.length}</h3>
        </div>
        <div className="glass-card p-6 border-l-4 border-emerald-500">
          <p className="text-brand-text-secondary text-sm font-medium mb-1">Submitted</p>
          <h3 className="text-2xl font-bold">{reports.filter(r => r.status === 'Submitted').length}</h3>
        </div>
        <div className="glass-card p-6 border-l-4 border-amber-500">
          <p className="text-brand-text-secondary text-sm font-medium mb-1">Pending Review</p>
          <h3 className="text-2xl font-bold">{reports.filter(r => r.status === 'Pending Review').length}</h3>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-brand-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={18} />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder} 
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-brand-bg/50 text-brand-text-secondary text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Report Title</th>
                <th className="px-6 py-4 font-semibold">Filing Station</th>
                <th className="px-6 py-4 font-semibold">Recording Officer</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-brand-bg/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">
                        <FileText size={16} className="text-brand-accent" />
                      </div>
                      <div>
                        <p className="font-bold">{report.title}</p>
                        <p className="text-xs text-brand-text-secondary">
                          {report.type === 'Crime' 
                            ? (t.categories.crime as any)[report.category] 
                            : (t.categories.traffic as any)[report.category]}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-brand-text-secondary">
                    {report.filingStation}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{report.recordingOfficerName}</span>
                      <span className="text-[10px] text-brand-text-secondary uppercase">
                        {(t.ranks as any)[report.recordingOfficerRank]}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                      ${report.status === 'Submitted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}
                    `}>
                      {(t.reportStatuses as any)[report.status] || report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {report.voice_url && (
                        <div className="flex items-center gap-1">
                          {activeAudio === report.id ? (
                            <div className="flex items-center gap-2 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                              <audio 
                                autoPlay 
                                src={report.voice_url} 
                                onEnded={() => setActiveAudio(null)}
                                className="h-6 w-32"
                                controls
                              />
                              <button 
                                onClick={() => setActiveAudio(null)}
                                className="text-rose-400 hover:text-rose-300"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setActiveAudio(report.id)}
                              className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title={lang === 'am' ? 'ድምፅ አጫውት' : 'Play Voice Note'}
                            >
                              <Volume2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                      {(report.documents || []).length > 0 ? (
                        <div className="flex items-center gap-1">
                          {report.documents?.map((doc, idx) => (
                            <a 
                              key={idx}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors"
                              title={doc.name}
                            >
                              <FileText size={18} />
                            </a>
                          ))}
                        </div>
                      ) : report.document_url ? (
                        <a 
                          href={report.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors"
                          title={lang === 'am' ? 'ሰነድ እይ' : 'View Document'}
                        >
                          <FileText size={18} />
                        </a>
                      ) : null}
                      <button 
                        onClick={() => handleEdit(report)}
                        className="p-2 text-brand-text-secondary hover:text-brand-accent transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => onDelete(report.id)}
                        className="p-2 text-brand-text-secondary hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button className="p-2 text-brand-text-secondary hover:text-brand-accent transition-colors">
                        <Download size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-3xl p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">{editingReport ? t.editReport : t.newReport}</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-brand-bg rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    currentStep === s 
                      ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' 
                      : currentStep > s 
                        ? 'bg-emerald-500 text-white'
                        : 'bg-brand-bg text-brand-text-secondary border border-brand-border'
                  }`}>
                    {currentStep > s ? <CheckCircle size={16} /> : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-0.5 ${currentStep > s ? 'bg-emerald-500' : 'bg-brand-border'}`} />}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
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

              <div className="flex gap-4 pt-4 border-t border-brand-border">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={18} />
                    {t.back}
                  </button>
                )}
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep === 1) {
                        if (!newReport.title) {
                          alert(lang === 'am' ? 'እባክዎ ሁሉንም መስኮች ይሙሉ' : 'Please fill all fields');
                          return;
                        }
                      }
                      if (currentStep === 2) {
                        if (!newReport.filingStation || !newReport.officerId) {
                          alert(lang === 'am' ? 'እባክዎ ሁሉንም መስኮች ይሙሉ' : 'Please fill all fields');
                          return;
                        }
                      }
                      setCurrentStep(prev => prev + 1);
                    }}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {t.next}
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Send size={18} />
                    {editingReport ? t.saveProfile : t.submitReport}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
