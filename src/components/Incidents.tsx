import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Search, Trash2, Edit2, Calendar, MapPin, Camera, Image as ImageIcon, Map, List, Volume2, Mic, Square, Info, X, CheckCircle, ChevronLeft, ChevronRight, Send, RefreshCw, FileText, File as FileIcon, FileCheck, Loader2 } from 'lucide-react';
import { Incident, Officer } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { IncidentMap } from './IncidentMap';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Capacitor } from '@capacitor/core';
import { VoiceRecorder } from './VoiceRecorder';

interface IncidentsProps {
  incidents: Incident[];
  officers: Officer[];
  lang: Language;
  initialEditId?: string | null;
  onAdd: (incident: Omit<Incident, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Incident>) => void;
  onDelete: (id: string) => void;
}

export function Incidents({ incidents, officers, lang, initialEditId, onAdd, onUpdate, onDelete }: IncidentsProps) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<{ blob: Blob, name: string }[]>([]);

  React.useEffect(() => {
    if (initialEditId) {
      const incident = incidents.find(i => i.id === initialEditId);
      if (incident) {
        setEditingIncident(incident);
        setNewIncident({
          title: incident.title,
          status: incident.status,
          date: incident.date,
          location: incident.location,
          lat: incident.lat,
          lng: incident.lng,
          officerId: incident.officerId,
          filingStation: incident.filingStation,
          recordingOfficerName: incident.recordingOfficerName,
          recordingOfficerRank: incident.recordingOfficerRank,
          type: incident.type,
          category: incident.category,
          description: incident.description
        });
        setIsModalOpen(true);
      }
    }
  }, [initialEditId, incidents]);
  const [newIncident, setNewIncident] = useState<Omit<Incident, 'id'>>({
    title: '',
    status: 'Open',
    date: new Date().toISOString().split('T')[0],
    location: '',
    lat: undefined,
    lng: undefined,
    officerId: '',
    filingStation: '',
    recordingOfficerName: '',
    recordingOfficerRank: 'constable',
    type: 'Crime',
    category: 'other',
    description: '',
    photos: [] as string[],
    document_url: '',
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
      reporterName: '',
      reporterAddress: '',
      reporterPhone: '',
      reporterOther: ''
    }
  });

  // Update default officer when officers list is loaded
  useEffect(() => {
    if (officers.length > 0 && !newIncident.officerId) {
      setNewIncident(prev => ({ ...prev, officerId: officers[0].id }));
    }
  }, [officers, newIncident.officerId]);

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
        setNewIncident(prev => ({
          ...prev,
          photos: [...(prev.photos || []), image.dataUrl!].slice(0, 10)
        }));
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const removePhoto = (index: number) => {
    setNewIncident(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  const handleDocUpload = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FilePicker.pickFiles({
          types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
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
      input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
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
    setNewIncident(prev => ({
      ...prev,
      documents: (prev.documents || []).filter((_, i) => i !== index)
    }));
  };

  const filteredIncidents = incidents.filter(i => 
    (i.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.recordingOfficerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<string | null>(null);

  const handleEdit = (incident: Incident) => {
    setEditingIncident(incident);
    setNewIncident({
      title: incident.title,
      status: incident.status,
      date: incident.date,
      location: incident.location,
      lat: incident.lat,
      lng: incident.lng,
      officerId: incident.officerId,
      filingStation: incident.filingStation,
      recordingOfficerName: incident.recordingOfficerName,
      recordingOfficerRank: incident.recordingOfficerRank,
      type: incident.type,
      category: incident.category,
      description: incident.description,
      photos: incident.photos || [],
      documents: incident.documents || [],
      voice_url: incident.voice_url,
      trafficDetails: incident.trafficDetails || {
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
  };

  // Voice recording logic is handled by VoiceRecorder component

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newIncident.title.trim() || newIncident.title.length < 3) {
      alert(lang === 'am' ? 'እባክዎ ትክክለኛ ርዕስ ያስገቡ (ቢያንስ 3 ፊደላት)' : 'Please enter a valid title (min 3 characters)');
      return;
    }
    if (!newIncident.location.trim()) {
      alert(lang === 'am' ? 'እባክዎ ትክክለኛ ቦታ ያስገቡ' : 'Please enter a valid location');
      return;
    }
    if (!newIncident.officerId) {
      alert(lang === 'am' ? 'እባክዎ መኮንን ይምረጡ' : 'Please select an officer');
      return;
    }
    if (!newIncident.date) {
      alert(lang === 'am' ? 'እባክዎ ቀን ይምረጡ' : 'Please select a date');
      return;
    }
    if (new Date(newIncident.date) > new Date()) {
      alert(lang === 'am' ? 'ቀን ከዛሬ ሊበልጥ አይችልም' : 'Date cannot be in the future');
      return;
    }
    if (!newIncident.description?.trim() || newIncident.description.length < 10) {
      alert(lang === 'am' ? 'እባክዎ ዝርዝር መግለጫ ያስገቡ (ቢያንስ 10 ፊደላት)' : 'Please enter a detailed description (min 10 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalVoiceUrl = newIncident.voice_url;
      let finalDocuments = [...(newIncident.documents || [])];
      let finalPhotos = [...(newIncident.photos || [])];

      if (!navigator.onLine && (audioBlob || selectedDocs.length > 0)) {
        const confirmSave = window.confirm(lang === 'am' 
          ? 'ኔትወርክ የለም። ክስተቱ ይቀመጣል ነገር ግን ፋይሎች ሊጫኑ አይችሉም። መቀጠል ይፈልጋሉ?' 
          : 'You are offline. The incident will be saved, but files cannot be uploaded. Do you want to continue?');
        if (!confirmSave) {
          setIsSubmitting(false);
          return;
        }
      }

      if (navigator.onLine) {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../firebase');

        if (audioBlob) {
          const extension = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
          const voiceRef = ref(storage, `incidents/${Date.now()}_voice.${extension}`);
          const snapshot = await uploadBytes(voiceRef, audioBlob, { contentType: audioBlob.type });
          finalVoiceUrl = await getDownloadURL(snapshot.ref);
        }

        // Upload photos
        finalPhotos = await Promise.all((newIncident.photos || []).map(async (photo) => {
          if (photo.startsWith('data:')) {
            const photoRef = ref(storage, `incidents/${Date.now()}_photo.jpg`);
            const response = await fetch(photo);
            const blob = await response.blob();
            const snapshot = await uploadBytes(photoRef, blob, { contentType: 'image/jpeg' });
            return await getDownloadURL(snapshot.ref);
          }
          return photo; // Already a URL
        }));

        // Upload new documents
        if (selectedDocs.length > 0) {
          const uploadPromises = selectedDocs.map(async (docObj) => {
            const docRef = ref(storage, `incidents/${Date.now()}_${docObj.name}`);
            const snapshot = await uploadBytes(docRef, docObj.blob);
            const url = await getDownloadURL(snapshot.ref);
            return { name: docObj.name, url };
          });
          const uploadedDocs = await Promise.all(uploadPromises);
          finalDocuments = [...finalDocuments, ...uploadedDocs];
        }
      }

      const incidentData = { 
        ...newIncident, 
        voice_url: finalVoiceUrl, 
        documents: finalDocuments,
        photos: finalPhotos,
        // For backward compatibility
        document_url: finalDocuments.length > 0 ? finalDocuments[0].url : newIncident.document_url 
      };

      if (editingIncident) {
        await onUpdate(editingIncident.id, incidentData);
      } else {
        await onAdd(incidentData);
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
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.incidentType}</label>
              <input 
                required
                type="text" 
                className="input-field" 
                value={newIncident.title}
                onChange={(e) => setNewIncident({...newIncident, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.type}</label>
                <select 
                  className="input-field"
                  value={newIncident.type}
                  onChange={(e) => setNewIncident({...newIncident, type: e.target.value as any, category: 'other'})}
                >
                  <option value="Crime">{t.crime}</option>
                  <option value="Traffic">{t.traffic}</option>
                </select>
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.selectCategory}</label>
                <select 
                  className="input-field"
                  value={newIncident.category}
                  onChange={(e) => setNewIncident({...newIncident, category: e.target.value})}
                >
                  {newIncident.type === 'Crime' ? (
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
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.incidentLocation}</label>
              <input 
                required
                type="text" 
                className="input-field mb-3" 
                value={newIncident.location}
                onChange={(e) => setNewIncident({...newIncident, location: e.target.value})}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.date}</label>
                <input 
                  required
                  type="date" 
                  className="input-field" 
                  value={newIncident.date}
                  onChange={(e) => setNewIncident({...newIncident, date: e.target.value})}
                />
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.recordingOfficer}</label>
                <select 
                  required
                  className="input-field"
                  value={newIncident.officerId}
                  onChange={(e) => {
                    const selectedOfficer = officers.find(o => o.id === e.target.value);
                    if (selectedOfficer) {
                      setNewIncident({
                        ...newIncident, 
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

            {newIncident.type === 'Traffic' && (
              <div className="space-y-6 border-t border-brand-border pt-6">
                <h3 className="text-lg font-bold text-brand-accent mb-4">{(t as any).trafficForm.accidentType}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.accidentType}</label>
                    <select 
                      className="input-field"
                      value={newIncident.trafficDetails?.accidentType}
                      onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, accidentType: e.target.value}})}
                    >
                      <option value="pedestrianCollision">{(t as any).trafficForm.pedestrianCollision}</option>
                      <option value="vehicleToVehicle">{(t as any).trafficForm.vehicleToVehicle}</option>
                      <option value="overturning">{(t as any).trafficForm.overturning}</option>
                      <option value="objectCollision">{(t as any).trafficForm.objectCollision}</option>
                      <option value="falling">{(t as any).trafficForm.falling}</option>
                    </select>
                  </div>

                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.accidentImpact}</label>
                    <select 
                      className="input-field"
                      value={newIncident.trafficDetails?.accidentImpact}
                      onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, accidentImpact: e.target.value}})}
                    >
                      <option value="death">{(t as any).trafficForm.death}</option>
                      <option value="heavyInjury">{(t as any).trafficForm.heavyInjury}</option>
                      <option value="lightInjury">{(t as any).trafficForm.lightInjury}</option>
                      <option value="propertyDamage">{(t as any).trafficForm.propertyDamage}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.numDeaths}</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={newIncident.trafficDetails?.numDeaths}
                      onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, numDeaths: parseInt(e.target.value) || 0}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.numHeavyInjuries}</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={newIncident.trafficDetails?.numHeavyInjuries}
                      onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, numHeavyInjuries: parseInt(e.target.value) || 0}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.numLightInjuries}</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={newIncident.trafficDetails?.numLightInjuries}
                      onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, numLightInjuries: parseInt(e.target.value) || 0}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.propertyEstimate}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 50,000 ETB"
                      className="input-field" 
                      value={newIncident.trafficDetails?.propertyDamageEstimate}
                      onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, propertyDamageEstimate: e.target.value}})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.driverExperience}</label>
                    <select 
                      className="input-field"
                      value={newIncident.trafficDetails?.driverExperience}
                      onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, driverExperience: e.target.value}})}
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
                      value={newIncident.trafficDetails?.vehicleType}
                      onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, vehicleType: e.target.value}})}
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
                      value={newIncident.trafficDetails?.plateNumber}
                      onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, plateNumber: e.target.value}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.licenseGrade}</label>
                    <select 
                      className="input-field"
                      value={newIncident.trafficDetails?.licenseGrade}
                      onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, licenseGrade: e.target.value}})}
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
                        value={newIncident.trafficDetails?.reporterName}
                        onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, reporterName: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.reporterAddress}</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={newIncident.trafficDetails?.reporterAddress}
                        onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, reporterAddress: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.reporterPhone}</label>
                      <input 
                        type="tel" 
                        className="input-field" 
                        value={newIncident.trafficDetails?.reporterPhone}
                        onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails, reporterPhone: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.detailedDescription}</label>
              <textarea 
                className="input-field min-h-[100px]"
                placeholder={t.descriptionPlaceholder}
                value={newIncident.description}
                onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-3">{t.attachFiles || 'Attach Photos & Documents'}</label>
              <div className="grid grid-cols-4 gap-4">
                {(newIncident.photos || []).map((photo, index) => (
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
                {(newIncident.photos || []).length < 10 && (
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
                {(newIncident.documents || []).map((doc, index) => (
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
              <label className="block text-sm font-medium text-brand-text-secondary mb-3">{t.recordAudio || 'Voice Note'}</label>
              <VoiceRecorder 
                lang={lang}
                onRecordingComplete={(blob) => setAudioBlob(blob)}
                onDelete={() => {
                  setAudioBlob(null);
                  setAudioUrl(null);
                  setNewIncident({...newIncident, voice_url: ''});
                }}
              />
              {newIncident.voice_url && !audioBlob && (
                <div className="p-2 bg-brand-bg rounded-lg border border-brand-border mt-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full">
                      <Volume2 size={20} />
                    </div>
                    <audio src={newIncident.voice_url} controls className="flex-1 h-10 custom-audio-player" />
                    <button
                      type="button"
                      onClick={() => setNewIncident({...newIncident, voice_url: ''})}
                      className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all"
                      title={t.delete || 'Delete'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-emerald-500 text-center font-medium italic">
                    {lang === 'am' ? 'የተቀመጠ ድምፅ አለ - አዲስ ከቀረጹ ይቀየራል።' : 'Draft has saved voice note - recording a new one will replace it.'}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-brand-accent/5 p-4 rounded-xl border border-brand-accent/20 space-y-3">
              <div className="flex items-center gap-2 text-brand-accent">
                <Info size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">{t.summary || 'Summary'}</h4>
              </div>
              <p className="text-xs text-brand-text-secondary italic">{t.confirmDetails || 'Please confirm your details before sending'}</p>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-brand-text-secondary">{t.incidentType}:</span>
                <span className="font-bold">{newIncident.title}</span>
                <span className="text-brand-text-secondary">{t.type}:</span>
                <span className="font-bold">{newIncident.type}</span>
                <span className="text-brand-text-secondary">{t.incidentLocation}:</span>
                <span className="font-bold">{newIncident.location}</span>
                <span className="text-brand-text-secondary">{t.date}:</span>
                <span className="font-bold">{newIncident.date}</span>
                {((newIncident.documents || []).length > 0 || selectedDocs.length > 0) && (
                  <>
                    <span className="text-brand-text-secondary">Documents:</span>
                    <span className="font-bold text-emerald-400">
                      {(newIncident.documents || []).length + selectedDocs.length} files
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
    setEditingIncident(null);
    setCurrentStep(1);
    setAudioBlob(null);
    setAudioUrl(null);
    setSelectedDocs([]);
    setNewIncident({ 
      title: '', 
      status: 'Open', 
      date: new Date().toISOString().split('T')[0], 
      location: '',
      lat: undefined,
      lng: undefined,
      officerId: officers[0]?.id || '',
      filingStation: '',
      recordingOfficerName: '',
      recordingOfficerRank: 'constable',
      type: 'Crime',
      category: 'other',
      description: '',
      photos: [],
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
          <h1 className="text-3xl font-bold tracking-tight">{t.crime}</h1>
          <p className="text-brand-text-secondary">Official record of reported incidents in the zone.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-brand-bg/50 p-1 rounded-lg border border-brand-border">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}
            >
              <List size={16} />
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}
            >
              <Map size={16} />
              Map
            </button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Plus size={18} />
            {t.newReport}
          </button>
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

        {viewMode === 'map' ? (
          <div className="p-6 h-[600px]">
            <IncidentMap incidents={filteredIncidents} lang={lang} />
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-brand-bg/50 text-brand-text-secondary text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">{t.incidentType}</th>
                <th className="px-6 py-4 font-semibold">{t.incidentLocation}</th>
                <th className="px-6 py-4 font-semibold">{t.recordingOfficer}</th>
                <th className="px-6 py-4 font-semibold">{t.type}</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredIncidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-brand-bg/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">
                        <AlertTriangle size={16} className={incident.type === 'Crime' ? 'text-rose-400' : 'text-brand-accent'} />
                      </div>
                      <div>
                        <p className="font-bold">{incident.title}</p>
                        <p className="text-xs text-brand-text-secondary">
                          {incident.type === 'Crime' 
                            ? (t.categories.crime as any)[incident.category] || incident.category
                            : (t.categories.traffic as any)[incident.category] || incident.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-brand-text-secondary">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span>{incident.location}</span>
                      </div>
                      <p className="text-[10px] opacity-70 italic">{incident.filingStation}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{incident.recordingOfficerName}</span>
                      <span className="text-[10px] text-brand-text-secondary uppercase">
                        {(t.ranks as any)[incident.recordingOfficerRank]}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                      ${incident.status === 'Open' ? 'bg-rose-400/10 text-rose-400' : 
                        incident.status === 'In Progress' ? 'bg-brand-accent/10 text-brand-accent' : 
                        'bg-emerald-500/10 text-emerald-400'}
                    `}>
                      {(t.incidentStatuses as any)[incident.status] || incident.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {incident.voice_url && (
                        <div className="flex items-center gap-1">
                          {activeAudio === incident.id ? (
                            <div className="flex items-center gap-2 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                              <audio 
                                autoPlay 
                                src={incident.voice_url} 
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
                              onClick={() => setActiveAudio(incident.id)}
                              className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1"
                              title={lang === 'am' ? 'ድምፅ አጫውት' : 'Play Voice Note'}
                            >
                              <Volume2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                      {(incident.documents || []).length > 0 ? (
                        <div className="flex items-center gap-1">
                          {incident.documents?.map((doc, idx) => (
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
                      ) : incident.document_url ? (
                        <a 
                          href={incident.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors"
                          title={lang === 'am' ? 'ሰነድ እይ' : 'View Document'}
                        >
                          <FileText size={18} />
                        </a>
                      ) : null}
                      <button 
                        onClick={() => handleEdit(incident)}
                        className="p-2 text-brand-text-secondary hover:text-brand-accent transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => onDelete(incident.id)}
                        className="p-2 text-brand-text-secondary hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
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
              <h2 className="text-2xl font-bold">{editingIncident ? t.editReport : t.newReport}</h2>
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
                        if (!newIncident.title || !newIncident.location) {
                          alert(lang === 'am' ? 'እባክዎ ሁሉንም መስኮች ይሙሉ' : 'Please fill all fields');
                          return;
                        }
                      }
                      if (currentStep === 2) {
                        if (!newIncident.date || !newIncident.officerId) {
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
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <RefreshCw className="animate-spin" size={18} />
                    ) : (
                      <Send size={18} />
                    )}
                    {showSuccess ? (lang === 'am' ? 'ተልኳል!' : 'Sent!') : (editingIncident ? t.saveProfile : t.submitReport)}
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
