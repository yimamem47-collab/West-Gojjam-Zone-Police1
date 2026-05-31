import React, { useState } from 'react';
import { Shield, Plus, Search, Trash2, Edit2, MapPin, CheckCircle, RefreshCw, Award, Smile, X, UserCheck, Phone } from 'lucide-react';
import { WantedPerson } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../lib/translations';

interface WantedListProps {
  wantedPersons: WantedPerson[];
  lang: Language;
  onAdd?: (person: Omit<WantedPerson, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<WantedPerson>) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

export function WantedList({ wantedPersons, lang, onAdd, onUpdate, onDelete, readOnly = false }: WantedListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Wanted' | 'Captured'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<WantedPerson | null>(null);

  const [newPerson, setNewPerson] = useState<Omit<WantedPerson, 'id'>>({
    name: '',
    alias: '',
    crimeCommitted: '',
    photo: '',
    description: '',
    lastKnownLocation: '',
    status: 'Wanted',
    reward: ''
  });

  const filteredPersons = wantedPersons.filter(p => {
    const matchesSearch = 
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.alias || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.crimeCommitted || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPerson(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerson.name.trim()) {
      alert(lang === 'am' ? 'እባክዎ የተፈላጊውን ስም ያስገቡ' : 'Please enter the name');
      return;
    }
    if (!newPerson.crimeCommitted.trim()) {
      alert(lang === 'am' ? 'እባክዎ የተፈጸመውን ወንጀል ያስገቡ' : 'Please specify the crime committed');
      return;
    }

    if (editingPerson) {
      onUpdate(editingPerson.id, newPerson);
      setEditingPerson(null);
    } else {
      onAdd(newPerson);
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (person: WantedPerson) => {
    setEditingPerson(person);
    setNewPerson({
      name: person.name,
      alias: person.alias || '',
      crimeCommitted: person.crimeCommitted,
      photo: person.photo || '',
      description: person.description,
      lastKnownLocation: person.lastKnownLocation || '',
      status: person.status,
      reward: person.reward || ''
    });
    setIsModalOpen(true);
  };

  const toggleStatus = (person: WantedPerson) => {
    const nextStatus = person.status === 'Wanted' ? 'Captured' : 'Wanted';
    onUpdate(person.id, { status: nextStatus });
  };

  const resetForm = () => {
    setNewPerson({
      name: '',
      alias: '',
      crimeCommitted: '',
      photo: '',
      description: '',
      lastKnownLocation: '',
      status: 'Wanted',
      reward: ''
    });
    setEditingPerson(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">
            {lang === 'am' ? 'የተፈላጊዎች መዝገብ አስተዳደር' : 'Wanted Suspects Management'}
          </h1>
          <p className="text-brand-text-secondary text-sm">
            {lang === 'am' 
              ? 'የተፈላጊ ወንጀለኞችን መረጃ መከታተያ፣ ሁኔታቸውን ከ"ተፈላጊ" ወደ "ተያዘ" መለወጫ እና የቁጥጥር ዝርዝር' 
              : 'Add, update, or shift status from "Wanted" to "Captured" on active criminal files.'}
          </p>
        </div>
        {!readOnly && onAdd && (
          <button 
            id="add-wanted-person"
            onClick={() => { resetForm(); setIsModalOpen(true); }} 
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            <span>{lang === 'am' ? 'ተፈላጊ ጨምር' : 'Add Wanted Suspect'}</span>
          </button>
        )}
      </div>

      {/* Prominent Public Tips Hotline Banner */}
      <div className="bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <Phone size={24} className="animate-bounce" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-wide uppercase">
              {lang === 'am' ? 'ማንኛውንም የተፈላጊ ህዝባዊ ጥቆማ ለመስጠት' : 'PUBLIC SUSPECT REPORTING HOTLINE'}
            </h3>
            <p className="text-rose-300 text-sm font-medium">
              {lang === 'am' 
                ? 'የተፈላጊ ወንጀለኞችን ወይም ተጠርጣሪዎችን በተመለከተ ማንኛውንም መረጃ ለመስጠት በዚህ ስልክ ቁጥር ይደውሉልን፡ 0587750972' 
                : 'To submit any tips or physical sightings securely regarding active suspects, please call us immediately at: 0587750972'}
            </p>
          </div>
        </div>
        <a 
          href="tel:0587750972"
          className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-lg tracking-wider rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 hover:scale-105"
        >
          <Phone size={20} />
          <span>0587750972</span>
        </a>
      </div>

      {/* Control Bar */}
      <div className="glass-card p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={18} />
          <input 
            id="wanted-search"
            type="text" 
            placeholder={lang === 'am' ? 'በስም፣ ቅጽል ስም ወይም በወንጀል ፈልግ...' : 'Search wanted name, crime, alias...'} 
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 w-full md:w-auto">
          {(['All', 'Wanted', 'Captured'] as const).map((filter) => (
            <button
              id={`filter-wanted-${filter}`}
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                statusFilter === filter
                  ? 'bg-brand-accent/15 text-brand-accent border-brand-accent/30 shadow-md'
                  : 'bg-brand-bg/50 text-brand-text-secondary border-brand-border hover:bg-brand-border'
              }`}
            >
              {filter === 'All' && (lang === 'am' ? 'ሁሉም' : 'All')}
              {filter === 'Wanted' && (lang === 'am' ? 'ተፈላጊዎች' : 'Wanted')}
              {filter === 'Captured' && (lang === 'am' ? 'የተያዙ' : 'Captured')}
            </button>
          ))}
        </div>
      </div>

      {/* Suspension / Grid */}
      {filteredPersons.length === 0 ? (
        <div className="glass-card p-12 text-center py-20">
          <UserCheck className="mx-auto text-brand-text-secondary opacity-30 mb-4" size={56} />
          <h3 className="text-xl font-bold text-white mb-2">
            {lang === 'am' ? 'ምንም የተፈላጊዎች መረጃ አልተገኘም' : 'No Suspects Found'}
          </h3>
          <p className="text-sm text-brand-text-secondary max-w-md mx-auto">
            {lang === 'am' 
              ? 'ከፍለጋዎ ጋር የሚጣጣም ምንም አይነት የነቃ የተፈላጊ ወይም የተያዘ ሰው ፋይል የለም።' 
              : 'No wanted persons matches the specified search keywords or status type.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersons.map((person) => (
            <motion.div
              layout
              id={`wanted-card-${person.id}`}
              key={person.id}
              className={`glass-card hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between border ${
                person.status === 'Wanted' 
                  ? 'border-brand-border hover:border-brand-accent/40 bg-brand-bg/10' 
                  : 'border-emerald-500/20 bg-emerald-500/[0.02]'
              }`}
            >
              {/* Status Badge */}
              <div className="absolute top-3 right-3 z-10">
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${
                  person.status === 'Wanted'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                }`}>
                  {person.status === 'Wanted' 
                    ? (lang === 'am' ? 'የሚፈለግ (Wanted)' : 'WANTED') 
                    : (lang === 'am' ? 'ተይዟል (Captured)' : 'CAPTURED')}
                </span>
              </div>

              <div>
                {/* Photo Header */}
                <div className="relative aspect-[4/3] w-full bg-slate-900 overflow-hidden border-b border-brand-border">
                  {person.photo ? (
                    <img 
                      src={person.photo} 
                      alt={person.name} 
                      className={`w-full h-full object-cover ${person.status === 'Captured' ? 'grayscale opacity-65' : ''}`}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                      <Shield size={48} className="opacity-20 text-rose-500" />
                    </div>
                  )}
                  {/* Subtle vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xl font-black text-white tracking-tight">
                      {person.name}
                    </h4>
                    {person.alias && (
                      <span className="text-xs text-brand-accent font-medium italic block">
                        ({lang === 'am' ? `ቅጽል፡ ${person.alias}` : `Alias: ${person.alias}`})
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-rose-400 mt-2 tracking-wide uppercase">
                    🚨 {lang === 'am' ? `ማስረጃ/ወንጀል: ${person.crimeCommitted}` : `Crime: ${person.crimeCommitted}`}
                  </p>

                  <div className="mt-4 space-y-2.5">
                    {person.reward && (
                      <div className="flex gap-2 text-xs items-center bg-brand-accent/5 p-2 rounded-xl border border-brand-accent/20">
                        <Award size={14} className="text-brand-accent shrink-0" />
                        <div>
                          <span className="text-brand-text-secondary block font-bold text-[9px] uppercase tracking-wider">{lang === 'am' ? 'ሽልማት' : 'WANTED REWARD'}</span>
                          <span className="text-brand-accent font-black">{person.reward}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 text-xs">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-brand-text-secondary block font-bold text-[9px] uppercase tracking-wider">{lang === 'am' ? 'የመጨረሻ የታየበት ቦታ' : 'LAST KNOWN PLACE'}</span>
                        <span className="text-white font-medium">{person.lastKnownLocation || '---'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-brand-text-secondary mt-4 line-clamp-3 bg-black/30 p-2.5 rounded-xl border border-brand-border/40 font-medium">
                      {person.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              {!readOnly && onUpdate && onDelete && (
                <div className="p-6 pt-0 border-t border-brand-border/40 mt-4 flex justify-between items-center bg-brand-accent/[0.01]">
                  <button
                    id={`toggle-wanted-status-${person.id}`}
                    onClick={() => toggleStatus(person)}
                    className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider p-2 rounded-lg border transition-all ${
                      person.status === 'Wanted'
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/25'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/25'
                    }`}
                  >
                    <RefreshCw size={12} />
                    <span>
                      {person.status === 'Wanted' 
                        ? (lang === 'am' ? 'ተይዟል በል' : 'Mark Captured') 
                        : (lang === 'am' ? 'ተፈላጊ በል' : 'Mark Wanted')}
                    </span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      id={`edit-wanted-${person.id}`}
                      onClick={() => handleEdit(person)}
                      className="p-2 hover:bg-brand-accent/20 hover:text-brand-accent text-brand-text-secondary border border-brand-border/80 rounded-lg transition-colors"
                      title={lang === 'am' ? 'አስተካክል' : 'Edit'}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      id={`delete-wanted-${person.id}`}
                      onClick={() => {
                        if (window.confirm(lang === 'am' ? 'ይህን መዝገብ ማጥፋት ይፈልጋሉ? መልሶ ማግኘት አይቻልም!' : 'Delete suspect permanently?')) {
                          onDelete(person.id);
                        }
                      }}
                      className="p-2 hover:bg-rose-500/20 hover:text-rose-400 text-brand-text-secondary border border-brand-border/80 rounded-lg transition-colors"
                      title={lang === 'am' ? 'አጥፋ' : 'Delete'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto border-brand-accent/30"
            >
              <div className="flex justify-between items-center mb-6 border-b border-brand-border pb-4">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  {editingPerson 
                    ? (lang === 'am' ? 'የተፈላጊ መረጃ ማስተካከያ' : 'Edit Wanted Suspect Profile') 
                    : (lang === 'am' ? 'አዲስ ተፈላጊ መጨመሪያ' : 'Register New Wanted Suspect')}
                </h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-brand-bg rounded-lg text-brand-text-secondary">
                  <XIcon size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'የተፈላጊው ሙሉ ስም *' : 'Full Name *'}
                    </label>
                    <input
                      id="input-wanted-name"
                      required
                      type="text"
                      className="input-field animate-focus"
                      placeholder="e.g. Abebe Bekele"
                      value={newPerson.name}
                      onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                    />
                  </div>

                  {/* Alias */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'ቅጽል ስም (ማዕረግ)' : 'Alias / Nickname'}
                    </label>
                    <input
                      id="input-wanted-alias"
                      type="text"
                      className="input-field animate-focus"
                      placeholder={lang === 'am' ? 'ለምሳሌ፡ ጃንቦ' : 'e.g. Jumbo'}
                      value={newPerson.alias}
                      onChange={(e) => setNewPerson({ ...newPerson, alias: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Crime Committed */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'የተፈጸመው ወንጀል *' : 'Crime Committed *'}
                    </label>
                    <input
                      id="input-wanted-crime"
                      required
                      type="text"
                      className="input-field animate-focus"
                      placeholder={lang === 'am' ? 'ለምሳሌ፡ የጦር መሳሪያ ዝርፊያ' : 'e.g. Armed robbery'}
                      value={newPerson.crimeCommitted}
                      onChange={(e) => setNewPerson({ ...newPerson, crimeCommitted: e.target.value })}
                    />
                  </div>

                  {/* Reward */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'ለትብብሩ የተዘጋጀ ሽልማት' : 'Reward (If applicable)'}
                    </label>
                    <input
                      id="input-wanted-reward"
                      type="text"
                      className="input-field animate-focus"
                      placeholder={lang === 'am' ? 'ለምሳሌ፡ 50,000 ብር' : 'e.g. 50,000 ETB or Info Award'}
                      value={newPerson.reward}
                      onChange={(e) => setNewPerson({ ...newPerson, reward: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Last Known Location */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'መጨረሻ የታየበት አካባቢ/ከተማ' : 'Last Known Location'}
                    </label>
                    <input
                      id="input-wanted-location"
                      type="text"
                      className="input-field animate-focus"
                      placeholder={lang === 'am' ? 'e.g. ፍኖተ ሰላም ገበያ መካከለ' : 'e.g. Finote Selam central area'}
                      value={newPerson.lastKnownLocation}
                      onChange={(e) => setNewPerson({ ...newPerson, lastKnownLocation: e.target.value })}
                    />
                  </div>

                  {/* Status Toggle */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'አሁን ያለበት ሁኔታ' : 'Current Suspect Status'}
                    </label>
                    <select
                      id="input-wanted-status"
                      className="input-field focus:border-brand-accent"
                      value={newPerson.status}
                      onChange={(e) => setNewPerson({ ...newPerson, status: e.target.value as any })}
                    >
                      <option value="Wanted">{lang === 'am' ? 'ተፈላጊ (Wanted)' : 'Wanted'}</option>
                      <option value="Captured">{lang === 'am' ? 'ተይዟል (Captured)' : 'Captured'}</option>
                    </select>
                  </div>
                </div>

                {/* Photo upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                    {lang === 'am' ? 'የተፈላጊው ፎቶ ማስረጃ' : 'Suspect Photo (Base64 file or direct URL)'}
                  </label>
                  <input
                    id="input-wanted-photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-accent/15 file:text-brand-accent hover:file:bg-brand-accent/25"
                  />
                  <div className="flex gap-2 items-center text-[10px] mt-1 text-brand-text-secondary">
                    <span>{lang === 'am' ? 'ወይም ምስል ሊንክ' : 'Or paste URL:'}</span>
                    <input
                      id="input-wanted-photo-url"
                      type="text"
                      className="bg-transparent border-b border-brand-border text-white px-2 focus:outline-none flex-1 font-mono"
                      value={newPerson.photo}
                      onChange={(e) => setNewPerson({ ...newPerson, photo: e.target.value })}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                    {lang === 'am' ? 'አካላዊ መግለጫ እና ማብራሪያ' : 'Physical Markings & Details'}
                  </label>
                  <textarea
                    id="input-wanted-desc"
                    rows={4}
                    className="input-field focus:border-brand-accent min-h-[100px]"
                    placeholder={lang === 'am' ? 'ጥንቃቄ፡ የታጠቀ ሊሆን ይችላል፣ ቁመት፣ የለበሰው ልብስ...' : 'e.g. Danger: armed, 1.8m height, distinctive walk...'}
                    value={newPerson.description}
                    onChange={(e) => setNewPerson({ ...newPerson, description: e.target.value })}
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 rounded-xl border border-brand-border text-brand-text-secondary hover:bg-brand-bg transition-colors font-bold text-xs uppercase"
                  >
                    {lang === 'am' ? 'ተመለስ' : 'Cancel'}
                  </button>
                  <button
                    id="submit-wanted-person"
                    type="submit"
                    className="px-6 py-2.5 rounded-xl btn-primary transition-all font-bold text-xs uppercase"
                  >
                    {editingPerson 
                      ? (lang === 'am' ? 'መረጃ አዘምን' : 'Save Changes') 
                      : (lang === 'am' ? 'ይመዝገብ' : 'Save Suspect')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple Helper X Icons for modal dismissal
function XIcon({ size = 20, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
