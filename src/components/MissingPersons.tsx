import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Trash2, Edit2, Phone, Calendar, MapPin, Check, RefreshCw, Eye, EyeOff, UserX } from 'lucide-react';
import { MissingPerson } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../lib/translations';

interface MissingPersonsProps {
  missingPersons: MissingPerson[];
  lang: Language;
  onAdd?: (person: Omit<MissingPerson, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<MissingPerson>) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

export function MissingPersons({ missingPersons, lang, onAdd, onUpdate, onDelete, readOnly = false }: MissingPersonsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Missing' | 'Found'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<MissingPerson | null>(null);
  
  const [newPerson, setNewPerson] = useState<Omit<MissingPerson, 'id'>>({
    name: '',
    age: '',
    gender: 'Male',
    lastSeenDate: new Date().toISOString().split('T')[0],
    lastSeenLocation: '',
    photo: '',
    description: '',
    contactPhone: '',
    status: 'Missing',
    reportedBy: ''
  });

  const filteredPersons = missingPersons.filter(p => {
    const matchesSearch = 
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.lastSeenLocation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      alert(lang === 'am' ? 'እባክዎ ስም ያስገቡ' : 'Please enter a name');
      return;
    }
    if (!newPerson.contactPhone.trim()) {
      alert(lang === 'am' ? 'እባክዎ የስልክ ቁጥር ያስገቡ' : 'Please enter a contact phone number');
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

  const handleEdit = (person: MissingPerson) => {
    setEditingPerson(person);
    setNewPerson({
      name: person.name,
      age: person.age,
      gender: person.gender,
      lastSeenDate: person.lastSeenDate,
      lastSeenLocation: person.lastSeenLocation,
      photo: person.photo || '',
      description: person.description,
      contactPhone: person.contactPhone,
      status: person.status,
      reportedBy: person.reportedBy || ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setNewPerson({
      name: '',
      age: '',
      gender: 'Male',
      lastSeenDate: new Date().toISOString().split('T')[0],
      lastSeenLocation: '',
      photo: '',
      description: '',
      contactPhone: '',
      status: 'Missing',
      reportedBy: ''
    });
    setEditingPerson(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const toggleStatus = (person: MissingPerson) => {
    const nextStatus = person.status === 'Missing' ? 'Found' : 'Missing';
    onUpdate(person.id, { status: nextStatus });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">
            {lang === 'am' ? 'የጠፉ ሰዎች ማህደር' : 'Missing Persons Registry'}
          </h1>
          <p className="text-brand-text-secondary text-sm">
            {lang === 'am' 
              ? 'የጠፉ ሰዎችን ለመመዝገብ፣ ለመከታተል እና ሁኔታቸውን ለማዘመን የሚያስችል ማዕከል' 
              : 'Official registry for recording, tracking, and completing investigation files for missing citizens.'}
          </p>
        </div>
        {!readOnly && onAdd && (
          <button 
            id="add-missing-person"
            onClick={() => { resetForm(); setIsModalOpen(true); }} 
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            <span>{lang === 'am' ? 'አዲስ መዝግብ' : 'Add New Record'}</span>
          </button>
        )}
      </div>

      {/* Control Bar */}
      <div className="glass-card p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={18} />
          <input 
            id="missing-search"
            type="text" 
            placeholder={lang === 'am' ? 'ስም፣ የጠፋበት ቦታ ወይም ዝርዝር መግለጫ ፈልግ...' : 'Search name, last seen location, details...'} 
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 w-full md:w-auto">
          {(['All', 'Missing', 'Found'] as const).map((filter) => (
            <button
              id={`filter-missing-${filter}`}
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                statusFilter === filter
                  ? 'bg-brand-accent/15 text-brand-accent border-brand-accent/30 shadow-md'
                  : 'bg-brand-bg/50 text-brand-text-secondary border-brand-border hover:bg-brand-border'
              }`}
            >
              {filter === 'All' && (lang === 'am' ? 'ሁሉም' : 'All')}
              {filter === 'Missing' && (lang === 'am' ? 'የጠፉ ብቻ' : 'Missing Only')}
              {filter === 'Found' && (lang === 'am' ? 'የተገኙ ብቻ' : 'Found Only')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Missing Persons */}
      {filteredPersons.length === 0 ? (
        <div className="glass-card p-12 text-center py-20">
          <UserX className="mx-auto text-brand-text-secondary opacity-30 mb-4" size={56} />
          <h3 className="text-xl font-bold text-white mb-2">
            {lang === 'am' ? 'ምንም አይነት ውጤት አልተገኘም' : 'No Records Found'}
          </h3>
          <p className="text-sm text-brand-text-secondary max-w-md mx-auto">
            {lang === 'am' 
              ? 'ከፍለጋዎ ወይም ከፊልተር ሁኔታው ጋር የሚጣጣም የጠፋ ሰው መዝገብ የለም።' 
              : 'No missing person registry matches your selection or search query.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersons.map((person) => (
            <motion.div
              layout
              id={`missing-card-${person.id}`}
              key={person.id}
              className="glass-card hover:border-brand-accent/40 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
            >
              {/* Badge */}
              <div className="absolute top-3 right-3 z-10">
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                  person.status === 'Missing' 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {person.status === 'Missing' 
                    ? (lang === 'am' ? 'የጠፋ' : 'Missing') 
                    : (lang === 'am' ? 'ተገኝቷል' : 'Found')}
                </span>
              </div>

              <div>
                {/* Photo Header */}
                <div className="relative aspect-video w-full bg-slate-800 rounded-t-2xl overflow-hidden border-b border-brand-border">
                  {person.photo ? (
                    <img 
                      src={person.photo} 
                      alt={person.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                      <Users size={48} className="opacity-25" />
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h4 className="text-lg font-black text-white hover:text-brand-accent transition-colors truncate">
                    {person.name}
                  </h4>
                  <p className="text-xs text-brand-text-secondary mt-1 flex items-center gap-2">
                    <span>{lang === 'am' ? `ዕድሜ: ${person.age}` : `Age: ${person.age}`}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-border" />
                    <span>{lang === 'am' ? `ጾታ: ${person.gender === 'Male' ? 'ወንድ' : 'ሴት'}` : `Gender: ${person.gender}`}</span>
                  </p>

                  <div className="mt-4 space-y-2.5">
                    <div className="flex gap-2 text-xs">
                      <Calendar size={14} className="text-brand-accent shrink-0 mt-0.5" />
                      <div>
                        <span className="text-brand-text-secondary block font-bold text-[9px] uppercase tracking-wider">{lang === 'am' ? 'መቼ ጠፋ?' : 'LAST SEEN TIME'}</span>
                        <span className="text-white font-medium">{person.lastSeenDate}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 text-xs">
                      <MapPin size={14} className="text-brand-accent shrink-0 mt-0.5" />
                      <div>
                        <span className="text-brand-text-secondary block font-bold text-[9px] uppercase tracking-wider">{lang === 'am' ? 'የጠፋበት ቦታ' : 'LAST SEEN LOCATION'}</span>
                        <span className="text-white font-medium truncate max-w-[200px] block">{person.lastSeenLocation}</span>
                      </div>
                    </div>

                    <p className="text-xs text-brand-text-secondary mt-4 line-clamp-3 bg-brand-bg/30 p-2.5 rounded-xl border border-brand-border/40">
                      {person.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              {!readOnly && onUpdate && onDelete && (
                <div className="p-6 pt-0 border-t border-brand-border/40 mt-4 flex justify-between items-center bg-brand-accent/[0.01]">
                  <button
                    id={`toggle-missing-status-${person.id}`}
                    onClick={() => toggleStatus(person)}
                    className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider p-2 rounded-lg border transition-all ${
                      person.status === 'Missing'
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/25'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/25'
                    }`}
                  >
                    <RefreshCw size={12} />
                    <span>
                      {person.status === 'Missing' 
                      ? (lang === 'am' ? 'ተገኝቷል በል' : 'Tog Found') 
                      : (lang === 'am' ? 'የጠፋ በል' : 'Tog Missing')}
                    </span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      id={`edit-missing-${person.id}`}
                      onClick={() => handleEdit(person)}
                      className="p-2 hover:bg-brand-accent/20 hover:text-brand-accent text-brand-text-secondary border border-brand-border/80 rounded-lg transition-colors"
                      title={lang === 'am' ? 'አስተካክል' : 'Edit'}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      id={`delete-missing-${person.id}`}
                      onClick={() => {
                        if (window.confirm(lang === 'am' ? 'ይህን መዝገብ ማጥፋት ይፈልጋሉ? መልሶ ማግኘት አይቻልም!' : 'Delete this registry permanently?')) {
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
                    ? (lang === 'am' ? 'የጠፋ ሰው መረጃ ማስተካከያ' : 'Edit Missing Person Detail') 
                    : (lang === 'am' ? 'አዲስ የጠፋ ሰው ምዝገባ' : 'Register New Missing Person')}
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
                      {lang === 'am' ? 'የጠፋው ሰው ሙሉ ስም *' : 'Full Name of Person *'}
                    </label>
                    <input
                      id="input-missing-name"
                      required
                      type="text"
                      className="input-field animate-focus"
                      placeholder={lang === 'am' ? 'ለምሳሌ፡ አሌክስ አበራ በቀለ' : 'e.g. Abebe Bekele'}
                      value={newPerson.name}
                      onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                    />
                  </div>

                  {/* Age */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'ዕድሜ' : 'Age'}
                    </label>
                    <input
                      id="input-missing-age"
                      type="text"
                      className="input-field animate-focus"
                      placeholder={lang === 'am' ? 'ለምሳሌ፡ 25 ወይም ህጻን' : 'e.g. 25 or child'}
                      value={newPerson.age}
                      onChange={(e) => setNewPerson({ ...newPerson, age: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'ጾታ' : 'Gender'}
                    </label>
                    <select
                      id="input-missing-gender"
                      className="input-field focus:border-brand-accent"
                      value={newPerson.gender}
                      onChange={(e) => setNewPerson({ ...newPerson, gender: e.target.value })}
                    >
                      <option value="Male">{lang === 'am' ? 'ወንድ' : 'Male'}</option>
                      <option value="Female">{lang === 'am' ? 'ሴት' : 'Female'}</option>
                    </select>
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'ቤተሰብ ስልክ ቁጥር *' : 'Family Contact Phone *'}
                    </label>
                    <input
                      id="input-missing-phone"
                      required
                      type="tel"
                      className="input-field animate-focus"
                      placeholder="+251-9..."
                      value={newPerson.contactPhone}
                      onChange={(e) => setNewPerson({ ...newPerson, contactPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Last Seen Date */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'የጠፋበት ቀን' : 'Last Seen Date'}
                    </label>
                    <input
                      id="input-missing-date"
                      type="date"
                      className="input-field focus:border-brand-accent"
                      value={newPerson.lastSeenDate}
                      onChange={(e) => setNewPerson({ ...newPerson, lastSeenDate: e.target.value })}
                    />
                  </div>

                  {/* Last Seen Location */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'የጠፋበት ወይም የመጨረሻ የተታየበት ቦታ' : 'Last Seen Location'}
                    </label>
                    <input
                      id="input-missing-location"
                      type="text"
                      className="input-field animate-focus"
                      placeholder={lang === 'am' ? 'ለምሳሌ፡ ፍኖተ ሰላም' : 'e.g. Finote Selam, near main road'}
                      value={newPerson.lastSeenLocation}
                      onChange={(e) => setNewPerson({ ...newPerson, lastSeenLocation: e.target.value })}
                    />
                  </div>
                </div>

                {/* Photo upload and reported by */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'የጠፊው ፎቶ ሰነድ' : 'Photo Document (Base64 or URL)'}
                    </label>
                    <input
                      id="input-missing-photo-file"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-accent/15 file:text-brand-accent hover:file:bg-brand-accent/25"
                    />
                    <div className="flex gap-2 items-center text-[10px] mt-1 text-brand-text-secondary">
                      <span>{lang === 'am' ? 'ወይም ምስል ሊንክ' : 'Or paste direct URL:'}</span>
                      <input
                        id="input-missing-photo-url"
                        type="text"
                        placeholder="https://"
                        className="bg-transparent border-b border-brand-border text-white px-2 focus:outline-none flex-1 font-mono"
                        value={newPerson.photo}
                        onChange={(e) => setNewPerson({ ...newPerson, photo: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Reported By */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'ሪፖርት ያቀረበው አካል ስም' : 'Reported By (Person/Officer)'}
                    </label>
                    <input
                      id="input-missing-reporter"
                      type="text"
                      className="input-field animate-focus"
                      placeholder={lang === 'am' ? 'ለምሳሌ፡ ወ/ሮ ማርታ ወልዴ' : 'e.g. Marta Wolde'}
                      value={newPerson.reportedBy}
                      onChange={(e) => setNewPerson({ ...newPerson, reportedBy: e.target.value })}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                    {lang === 'am' ? 'የሰውየው ሁኔታ/ልዩ መታወቂያ እና ማብራሪያ' : 'Physical Description & Specific Markers'}
                  </label>
                  <textarea
                    id="input-missing-desc"
                    rows={4}
                    className="input-field focus:border-brand-accent min-h-[100px]"
                    placeholder={lang === 'am' ? 'ቁመት፣ የለበሰው ልብስ፣ የተለየ ምልክት...' : 'e.g. Tall, wearing red shirt, scar on left arm...'}
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
                    id="submit-missing-person"
                    type="submit"
                    className="px-6 py-2.5 rounded-xl btn-primary transition-all font-bold text-xs uppercase"
                  >
                    {editingPerson 
                      ? (lang === 'am' ? 'መረጃ አዘምን' : 'Save Changes') 
                      : (lang === 'am' ? 'ይመዝገብ' : 'Save Record')}
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
