import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  MapPin, 
  Camera, 
  FileText, 
  Trash2, 
  Edit2, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  CheckCircle, 
  Info, 
  X, 
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  FileDown,
  Navigation
} from 'lucide-react';
import { Incident, Officer } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { STABLE_KEYS, Language, translations } from '../lib/translations';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { Geolocation } from '@capacitor/geolocation';
import { Camera as CapCamera, CameraResultType } from '@capacitor/camera';

interface TrafficSafetyProps {
  incidents: Incident[];
  officers: Officer[];
  lang: Language;
  initialEditId?: string | null;
  onAdd: (incident: Omit<Incident, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Incident>) => void;
  onDelete: (id: string) => void;
}

export function TrafficSafety({ incidents, officers, lang, initialEditId, onAdd, onUpdate, onDelete }: TrafficSafetyProps) {
  const t = translations[lang];
  const ts = (t as any).trafficSafetyModule;
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'stats'>( 'list');

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
    type: 'Traffic',
    category: 'other',
    description: '',
    photos: [] as string[],
    document_url: '',
    trafficDetails: {
      accidentType: STABLE_KEYS.accidentTypes[0],
      accidentImpact: STABLE_KEYS.damageTypes[0],
      numDeaths: 0,
      numHeavyInjuries: 0,
      numLightInjuries: 0,
      propertyDamageEstimate: '',
      driverExperience: 'Unknown',
      vehicleType: STABLE_KEYS.vehicleTypes[0],
      plateNumber: '',
      licenseGrade: 'None/Illegal',
      accidentCause: 'Other',
      reporterName: '',
      reporterAddress: '',
      reporterPhone: '',
      reporterOther: ''
    }
  });

  useEffect(() => {
    if (initialEditId) {
      const incident = incidents.find(i => i.id === initialEditId);
      if (incident && incident.type === 'Traffic') {
        handleEdit(incident);
      }
    }
  }, [initialEditId, incidents]);

  useEffect(() => {
    if (officers.length > 0 && !newIncident.officerId) {
      setNewIncident(prev => ({ 
        ...prev, 
        officerId: officers[0].id,
        recordingOfficerName: officers[0].name,
        recordingOfficerRank: officers[0].rank
      }));
    }
  }, [officers, newIncident.officerId]);

  const getLabel = (type: 'accidentTypes' | 'damageTypes' | 'vehicleTypes' | 'driverExp' | 'licenseGrades' | 'accidentCauses', value: string) => {
    const enOpts = (translations.en as any).trafficSafetyModule.options[type];
    const amOpts = (translations.am as any).trafficSafetyModule.options[type];
    const index = enOpts.indexOf(value);
    if (index === -1) {
      // If not found in English, maybe it was saved in Amharic?
      const amIndex = amOpts.indexOf(value);
      if (amIndex !== -1) {
        return lang === 'am' ? amOpts[amIndex] : enOpts[amIndex];
      }
      return value;
    }
    return lang === 'am' ? amOpts[index] : enOpts[index];
  };

  const trafficIncidents = incidents.filter(i => i.type === 'Traffic');
  const filteredIncidents = trafficIncidents.filter(i => 
    (i.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.trafficDetails?.plateNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    getLabel('accidentTypes', i.trafficDetails?.accidentType || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statsData = STABLE_KEYS.accidentTypes.slice(0, 5).map(type => ({
    name: getLabel('accidentTypes', type),
    count: trafficIncidents.filter(i => i.trafficDetails?.accidentType === type).length
  }));

    const totalDeaths = trafficIncidents.reduce((sum, i) => sum + (i.trafficDetails?.numDeaths || 0), 0);
    const totalHeavy = trafficIncidents.reduce((sum, i) => sum + (i.trafficDetails?.numHeavyInjuries || 0), 0);
    const totalLight = trafficIncidents.reduce((sum, i) => sum + (i.trafficDetails?.numLightInjuries || 0), 0);
    const totalAccidents = trafficIncidents.length;

  const handleEdit = (incident: Incident) => {
    setEditingIncident(incident);
    setNewIncident({
      ...incident,
      type: 'Traffic',
      trafficDetails: {
        accidentType: STABLE_KEYS.accidentTypes[0],
        accidentImpact: STABLE_KEYS.damageTypes[0],
        numDeaths: 0,
        numHeavyInjuries: 0,
        numLightInjuries: 0,
        propertyDamageEstimate: '',
        driverExperience: 'Unknown',
        vehicleType: STABLE_KEYS.vehicleTypes[0],
        plateNumber: '',
        licenseGrade: 'None/Illegal',
        accidentCause: 'Other',
        reporterName: '',
        reporterAddress: '',
        reporterPhone: '',
        reporterOther: '',
        ...incident.trafficDetails
      }
    });
    setIsModalOpen(true);
  };

  const handleGPSDetect = async () => {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      setNewIncident({
        ...newIncident,
        lat: coordinates.coords.latitude,
        lng: coordinates.coords.longitude
      });
    } catch (err) {
      console.error('GPS error:', err);
      alert(ts.gpsError || (lang === 'am' ? 'GPS መረጃ ማግኘት አልተቻለም' : 'Could not detect GPS location'));
    }
  };

  const handleCapture = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64
      });
      if (image.base64String) {
        setNewIncident({
          ...newIncident,
          photos: [...(newIncident.photos || []), `data:image/jpeg;base64,${image.base64String}`].slice(0, 3)
        });
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const exportPDF = (incident: Incident) => {
    const doc = new jsPDF();
    const amChar = lang === 'am';
    
    doc.setFontSize(20);
    doc.text(amChar ? 'የትራፊክ አደጋ ሪፖርት' : 'Traffic Accident Report', 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`${ts.fields.location}: ${incident.location}`, 10, 30);
    doc.text(`${amChar ? 'ቀን' : 'Date'}: ${incident.date}`, 10, 40);
    doc.text(`${ts.fields.plateNumber}: ${incident.trafficDetails?.plateNumber || 'N/A'}`, 10, 50);
    doc.text(`${ts.fields.accidentType}: ${getLabel('accidentTypes', incident.trafficDetails?.accidentType || '')}`, 10, 60);

    const tableData = [
      [ts.fields.impact, amChar ? 'ብዛት' : 'Quantity'],
      [getLabel('damageTypes', STABLE_KEYS.damageTypes[0]), incident.trafficDetails?.numDeaths?.toString() || '0'],
      [getLabel('damageTypes', STABLE_KEYS.damageTypes[1]), incident.trafficDetails?.numHeavyInjuries?.toString() || '0'],
      [getLabel('damageTypes', STABLE_KEYS.damageTypes[2]), incident.trafficDetails?.numLightInjuries?.toString() || '0'],
      [getLabel('damageTypes', STABLE_KEYS.damageTypes[3]), incident.trafficDetails?.propertyDamageEstimate || '0 ETB'],
    ];

    autoTable(doc, {
      startY: 70,
      head: [tableData[0]],
      body: tableData.slice(1),
    });

    doc.text(`${amChar ? 'መግለጫ' : 'Description'}:`, 10, (doc as any).lastAutoTable.finalY + 10);
    doc.setFontSize(10);
    doc.text(incident.description || 'No description provided.', 10, (doc as any).lastAutoTable.finalY + 20, { maxWidth: 180 });

    doc.save(`Traffic_Report_${incident.id}.pdf`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingIncident(null);
    setCurrentStep(1);
    setNewIncident({
      title: '',
      status: 'Open',
      date: new Date().toISOString().split('T')[0],
      location: '',
      lat: undefined,
      lng: undefined,
      officerId: officers[0]?.id || '',
      filingStation: '',
      recordingOfficerName: officers[0]?.name || '',
      recordingOfficerRank: officers[0]?.rank || 'constable',
      type: 'Traffic',
      category: 'other',
      description: '',
      photos: [],
      trafficDetails: {
        accidentType: STABLE_KEYS.accidentTypes[0],
        accidentImpact: STABLE_KEYS.damageTypes[0],
        numDeaths: 0,
        numHeavyInjuries: 0,
        numLightInjuries: 0,
        propertyDamageEstimate: '',
        driverExperience: 'Unknown',
        vehicleType: STABLE_KEYS.vehicleTypes[0],
        plateNumber: '',
        licenseGrade: 'None/Illegal',
        accidentCause: 'Other',
        reporterName: '',
        reporterAddress: '',
        reporterPhone: '',
        reporterOther: ''
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Use "Traffic Accident" as title if empty
      const finalTitle = newIncident.title || ts.newReport;
      const finalIncident = { ...newIncident, title: finalTitle };

      if (editingIncident) {
        await onUpdate(editingIncident.id, finalIncident);
      } else {
        await onAdd(finalIncident);
      }
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        handleCloseModal();
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts.fields.accidentType}</label>
                <select 
                  className="input-field"
                  value={newIncident.trafficDetails?.accidentType}
                  onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, accidentType: e.target.value}})}
                >
                  {STABLE_KEYS.accidentTypes.map((opt: string) => (
                    <option key={opt} value={opt}>{getLabel('accidentTypes', opt)}</option>
                  ))}
                </select>
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts.fields.damageType}</label>
                <div className="grid grid-cols-2 gap-2">
                  {STABLE_KEYS.damageTypes.map((opt: string) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-brand-accent/5 rounded-lg transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent bg-brand-bg"
                        checked={newIncident.trafficDetails?.accidentImpact === opt}
                        onChange={() => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, accidentImpact: opt}})}
                      />
                      <span className="text-sm font-medium">{getLabel('damageTypes', opt)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.trafficForm.accidentCause || 'Accident Cause'}</label>
                <select 
                  className="input-field"
                  value={newIncident.trafficDetails?.accidentCause}
                  onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, accidentCause: e.target.value}})}
                >
                  {ts.options.accidentCauses.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-3">{ts.fields.involvedPersons}</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-brand-text-secondary mb-1">{(t as any).trafficForm.numDeaths}</label>
                  <input type="number" className="input-field" value={newIncident.trafficDetails?.numDeaths} onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, numDeaths: parseInt(e.target.value) || 0}})} />
                </div>
                <div>
                  <label className="block text-xs text-brand-text-secondary mb-1">{(t as any).trafficForm.numHeavyInjuries}</label>
                  <input type="number" className="input-field" value={newIncident.trafficDetails?.numHeavyInjuries} onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, numHeavyInjuries: parseInt(e.target.value) || 0}})} />
                </div>
                <div>
                  <label className="block text-xs text-brand-text-secondary mb-1">{(t as any).trafficForm.numLightInjuries}</label>
                  <input type="number" className="input-field" value={newIncident.trafficDetails?.numLightInjuries} onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, numLightInjuries: parseInt(e.target.value) || 0}})} />
                </div>
                <div>
                  <label className="block text-xs text-brand-text-secondary mb-1">{(t as any).trafficForm.propertyEstimate}</label>
                  <input type="text" placeholder="ETB" className="input-field" value={newIncident.trafficDetails?.propertyDamageEstimate} onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, propertyDamageEstimate: e.target.value}})} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts.fields.driverExp}</label>
                <select 
                  className="input-field"
                  value={newIncident.trafficDetails?.driverExperience}
                  onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, driverExperience: e.target.value}})}
                >
                  {ts.options.driverExp.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts.fields.vehicleType}</label>
                <select 
                  className="input-field"
                  value={newIncident.trafficDetails?.vehicleType}
                  onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, vehicleType: e.target.value}})}
                >
                  {STABLE_KEYS.vehicleTypes.map((opt: string) => (
                    <option key={opt} value={opt}>{getLabel('vehicleTypes', opt)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts.fields.plateNumber}</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. AA 12345"
                  value={newIncident.trafficDetails?.plateNumber}
                  onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, plateNumber: e.target.value}})}
                />
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts.fields.licenseGrade}</label>
                <select 
                  className="input-field"
                  value={newIncident.trafficDetails?.licenseGrade}
                  onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, licenseGrade: e.target.value}})}
                >
                  {ts.options.licenseGrades.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts.fields.location}</label>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  className="input-field flex-1" 
                  placeholder={t.locationPlaceholder}
                  value={newIncident.location}
                  onChange={(e) => setNewIncident({...newIncident, location: e.target.value})}
                />
                <button 
                  type="button" 
                  onClick={handleGPSDetect}
                  className="p-3 bg-brand-accent text-brand-bg rounded-lg hover:opacity-90 transition-opacity"
                  title={ts.gpsDetect}
                >
                  <Navigation size={20} />
                </button>
              </div>
              {newIncident.lat && (
                <p className="text-[10px] text-brand-text-secondary font-mono">
                  Coordinates: {newIncident.lat.toFixed(6)}, {newIncident.lng?.toFixed(6)}
                </p>
              )}
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts.captureImage}</label>
              <div className="flex flex-wrap gap-3">
                <button 
                  type="button" 
                  onClick={handleCapture}
                  className="w-20 h-20 bg-brand-bg border-2 border-dashed border-brand-border rounded-xl flex flex-col items-center justify-center gap-1 text-brand-text-secondary hover:border-brand-accent hover:text-brand-accent transition-all"
                >
                  <Camera size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t.call}</span>
                </button>
                {newIncident.photos?.map((photo, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-brand-border">
                    <img src={photo} className="w-full h-full object-cover" alt="" />
                    <button 
                      type="button"
                      onClick={() => setNewIncident({...newIncident, photos: newIncident.photos?.filter((_, idx) => idx !== i)})}
                      className="absolute top-1 right-1 p-0.5 bg-rose-500 text-white rounded-full"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <h4 className="text-sm font-bold text-brand-accent mb-4 underline uppercase tracking-widest">{ts.fields.reporter}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-brand-text-secondary mb-1">{t.fullName}</label>
                  <input type="text" className="input-field" value={newIncident.trafficDetails?.reporterName} onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, reporterName: e.target.value}})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-text-secondary mb-1">{t.address}</label>
                  <input type="text" className="input-field" value={newIncident.trafficDetails?.reporterAddress} onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, reporterAddress: e.target.value}})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-text-secondary mb-1">{t.phoneNumber}</label>
                  <input type="tel" className="input-field" value={newIncident.trafficDetails?.reporterPhone} onChange={(e) => setNewIncident({...newIncident, trafficDetails: {...newIncident.trafficDetails!, reporterPhone: e.target.value}})} />
                </div>
              </div>
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{ts.fields.detailedDamage}</label>
              <textarea 
                className="input-field min-h-[120px]"
                placeholder={t.descriptionPlaceholder}
                value={newIncident.description}
                onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
              />
            </div>

            <div className="bg-brand-accent/5 p-4 rounded-xl border border-brand-accent/20">
              <div className="flex items-center gap-2 text-brand-accent mb-3">
                <Info size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">{t.summary}</h4>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div className="flex justify-between border-b border-brand-border/30 pb-1">
                  <span className="text-brand-text-secondary">{ts.fields.accidentType}:</span>
                  <span className="font-bold">{getLabel('accidentTypes', newIncident.trafficDetails?.accidentType || '')}</span>
                </div>
                <div className="flex justify-between border-b border-brand-border/30 pb-1">
                  <span className="text-brand-text-secondary">{ts.fields.plateNumber}:</span>
                  <span className="font-bold">{newIncident.trafficDetails?.plateNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-brand-border/30 pb-1">
                  <span className="text-brand-text-secondary">{t.date}:</span>
                  <span className="font-bold">{newIncident.date}</span>
                </div>
                <div className="flex justify-between border-b border-brand-border/30 pb-1">
                  <span className="text-brand-text-secondary">{ts.fields.location}:</span>
                  <span className="font-bold truncate max-w-[100px]">{newIncident.location}</span>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-brand-text-primary uppercase flex items-center gap-3">
            <div className="p-2 bg-brand-accent text-brand-bg rounded-xl shadow-lg shadow-brand-accent/20">
              <Car size={32} />
            </div>
            {ts.title}
          </h1>
          <p className="text-brand-text-secondary font-medium tracking-wide mt-1">{ts.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveView(activeView === 'list' ? 'stats' : 'list')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-card border border-brand-border rounded-xl text-sm font-bold text-brand-text-primary hover:bg-brand-bg transition-colors"
          >
            {activeView === 'list' ? <BarChart3 size={18} /> : <FileText size={18} />}
            {activeView === 'list' ? ts.statistics : ts.accidentReport}
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary shadow-xl shadow-brand-accent/20">
            <Plus size={20} />
            {ts.newReport}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-secondary italic opacity-50" size={18} />
                <input 
                  type="text" 
                  placeholder={ts.searchAccident} 
                  className="input-field pl-12 h-14 text-lg font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 md:col-span-2 gap-3">
                <div className="bg-brand-card p-4 rounded-xl border border-brand-border flex flex-col items-center justify-center text-rose-500 shadow-sm">
                  <span className="text-2xl font-black">{totalDeaths}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest">{getLabel('damageTypes', STABLE_KEYS.damageTypes[0])}</span>
                </div>
                <div className="bg-brand-card p-4 rounded-xl border border-brand-border flex flex-col items-center justify-center text-amber-500 shadow-sm">
                  <span className="text-2xl font-black">{totalHeavy}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest">{getLabel('damageTypes', STABLE_KEYS.damageTypes[1])}</span>
                </div>
                <div className="bg-brand-card p-4 rounded-xl border border-brand-border flex flex-col items-center justify-center text-brand-accent shadow-sm">
                  <span className="text-2xl font-black">{totalLight}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest">{getLabel('damageTypes', STABLE_KEYS.damageTypes[2])}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredIncidents.map((incident) => (
                <div key={incident.id} className="bg-brand-card/50 p-5 rounded-2xl border border-brand-border hover:border-brand-accent/30 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-brand-bg rounded-xl border border-brand-border text-brand-accent shadow-sm">
                        <Car size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-brand-text-primary">{getLabel('accidentTypes', incident.trafficDetails?.accidentType || '')}</h4>
                        <div className="flex items-center gap-2 text-xs text-brand-text-secondary font-medium">
                          <MapPin size={12} className="text-brand-accent" />
                          {incident.location}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      incident.trafficDetails?.accidentImpact === STABLE_KEYS.damageTypes[0] ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-brand-bg text-brand-text-secondary border-brand-border'
                    }`}>
                      {getLabel('damageTypes', incident.trafficDetails?.accidentImpact || '')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4 bg-brand-bg/40 p-3 rounded-xl border border-brand-border">
                    <div className="text-center">
                      <p className="text-[10px] text-brand-text-secondary uppercase tracking-wider font-bold mb-1">{ts.fields.plateNumber}</p>
                      <p className="font-black text-sm">{incident.trafficDetails?.plateNumber || '---'}</p>
                    </div>
                    <div className="text-center border-x border-brand-border">
                      <p className="text-[10px] text-brand-text-secondary uppercase tracking-wider font-bold mb-1">{t.date}</p>
                      <p className="font-black text-sm">{incident.date}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-brand-text-secondary uppercase tracking-wider font-bold mb-1">
                        {lang === 'am' ? 'ጉዳት የደረሰባቸው' : 'Casualties'}
                      </p>
                      <p className="font-black text-sm text-brand-accent">{(incident.trafficDetails?.numDeaths || 0) + (incident.trafficDetails?.numHeavyInjuries || 0) + (incident.trafficDetails?.numLightInjuries || 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-brand-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent font-bold text-xs">
                        {incident.recordingOfficerName.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-brand-text-secondary truncate max-w-[100px]">{incident.recordingOfficerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => exportPDF(incident)} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors border border-emerald-500/20">
                        <Download size={16} />
                      </button>
                      <button onClick={() => handleEdit(incident)} className="p-2 text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors border border-brand-accent/20">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDelete(incident.id)} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors border border-rose-400/20">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredIncidents.length === 0 && (
                <div className="col-span-full py-20 text-center animate-pulse">
                  <AlertTriangle size={48} className="mx-auto text-brand-text-secondary mb-4 opacity-20" />
                  <p className="text-brand-text-secondary font-bold tracking-widest">{t.noReports}</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="stats"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <div className="glass-card p-8 border-t-4 border-brand-accent shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2 italic">
                  <TrendingUp size={20} className="text-brand-accent" />
                  Accident Types
                </h3>
                <PieChartIcon size={20} className="text-brand-text-secondary opacity-50" />
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={10} tick={{ fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} tick={{ fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ color: '#FFD700', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="count" fill="#FFD700" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-8 border-t-4 border-rose-500 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2 italic">
                  <TrendingUp size={20} className="text-rose-500" />
                  Casualty Distribution
                </h3>
                <BarChart3 size={20} className="text-brand-text-secondary opacity-50" />
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: getLabel('damageTypes', STABLE_KEYS.damageTypes[0]), value: totalDeaths },
                        { name: getLabel('damageTypes', STABLE_KEYS.damageTypes[1]), value: totalHeavy },
                        { name: getLabel('damageTypes', STABLE_KEYS.damageTypes[2]), value: totalLight },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#F43F5E" stroke="none" />
                      <Cell fill="#F59E0B" stroke="none" />
                      <Cell fill="#FFD700" stroke="none" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accident Reporting Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-[#002366] w-full max-w-4xl rounded-3xl border border-brand-accent/30 shadow-[0_0_50px_rgba(255,215,0,0.15)] overflow-hidden flex flex-col max-h-[95vh]"
          >
            {/* Modal Header */}
            <div className="p-8 bg-[#001D4D] border-b border-brand-accent/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-brand-accent text-brand-bg rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                  <Navigation size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                    {editingIncident ? t.editReport : ts.newReport}
                  </h2>
                  <div className="flex items-center gap-2 text-brand-accent text-[10px] font-bold uppercase tracking-widest mt-1">
                    <span className="px-2 py-0.5 bg-brand-accent/10 rounded-full border border-brand-accent/20">Official Form</span>
                    <span>•</span>
                    <span>Zone Police Command</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-3 hover:bg-white/5 rounded-2xl text-white/50 hover:text-white transition-all border border-transparent hover:border-white/10"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {/* Progress Stepper */}
              <div className="flex items-center justify-center gap-3 mb-10">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div 
                      onClick={() => s < currentStep && setCurrentStep(s)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                      currentStep === s 
                        ? 'bg-brand-accent text-brand-bg shadow-[0_0_15px_rgba(255,215,0,0.4)] scale-110' 
                        : currentStep > s 
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/5 text-white/30 border border-white/10'
                    }`}>
                      {currentStep > s ? <CheckCircle size={20} /> : s}
                    </div>
                    {s < 3 && <div className={`w-8 h-1 rounded-full mx-1 ${currentStep > s ? 'bg-emerald-500' : 'bg-white/5'}`} />}
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
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-[#001D4D] border-t border-brand-accent/20 flex gap-4 shrink-0">
               {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="flex-1 py-4 bg-white/5 text-white font-black uppercase tracking-widest text-xs rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={18} />
                  {t.back}
                </button>
              )}
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="flex-1 py-4 bg-brand-accent text-brand-bg font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand-accent/10 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {t.next}
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-brand-accent text-brand-bg font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand-accent/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <span className="animate-spin text-xl">⏳</span> : <Send size={18} />}
                  {editingIncident ? t.saveProfile : ts.saveToFirebase}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold border border-white/20"
          >
            <CheckCircle size={24} />
            {t.successTitle}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
