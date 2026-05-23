import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, Trash2, Calendar, Edit2, CheckCircle, Shield, User } from 'lucide-react';
import { Assignment, Incident, Officer } from '../types';
import { motion } from 'motion/react';
import { Language, translations } from '../lib/translations';

interface AssignmentsProps {
  assignments: Assignment[];
  incidents: Incident[];
  officers: Officer[];
  lang: Language;
  onAdd: (assignment: Omit<Assignment, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Assignment>) => void;
  onDelete: (id: string) => void;
}

export function Assignments({ assignments, incidents, officers, lang, onAdd, onUpdate, onDelete }: AssignmentsProps) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [newAssignment, setNewAssignment] = useState<Omit<Assignment, 'id'>>({
    title: '',
    status: 'Pending',
    dueDate: '',
    incidentId: '',
    officerId: ''
  });

  // Update default values when lists are loaded
  useEffect(() => {
    if (officers.length > 0 && !newAssignment.officerId) {
      setNewAssignment(prev => ({ ...prev, officerId: officers[0].id }));
    }
    if (incidents.length > 0 && !newAssignment.incidentId) {
      setNewAssignment(prev => ({ ...prev, incidentId: incidents[0].id }));
    }
  }, [officers, incidents, newAssignment.officerId, newAssignment.incidentId]);

  const filteredAssignments = assignments.filter(a => 
    (a.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newAssignment.title.trim() || newAssignment.title.length < 3) {
      alert(lang === 'am' ? 'እባክዎ ትክክለኛ ርዕስ ያስገቡ (ቢያንስ 3 ፊደላት)' : 'Please enter a valid title (min 3 characters)');
      return;
    }
    if (!newAssignment.dueDate) {
      alert(lang === 'am' ? 'እባክዎ ቀን ይምረጡ' : 'Please select a due date');
      return;
    }
    if (!newAssignment.officerId) {
      alert(lang === 'am' ? 'እባክዎ መኮንን ይምረጡ' : 'Please select an officer');
      return;
    }
    if (!newAssignment.incidentId) {
      alert(lang === 'am' ? 'እባክዎ ክስተት ይምረጡ' : 'Please select an incident');
      return;
    }

    if (editingAssignment) {
      onUpdate(editingAssignment.id, newAssignment);
      setEditingAssignment(null);
    } else {
      onAdd(newAssignment);
    }
    setIsModalOpen(false);
    setNewAssignment({ title: '', status: 'Pending', dueDate: '', incidentId: incidents[0]?.id || '', officerId: officers[0]?.id || '' });
  };

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setNewAssignment({
      title: assignment.title,
      status: assignment.status,
      dueDate: assignment.dueDate,
      incidentId: assignment.incidentId,
      officerId: assignment.officerId
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAssignment(null);
    setNewAssignment({ title: '', status: 'Pending', dueDate: '', incidentId: incidents[0]?.id || '', officerId: officers[0]?.id || '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.assignments || 'Assignments'}</h1>
          <p className="text-brand-text-secondary">Task management and duty assignments.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={18} />
          {t.newReport}
        </button>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="relative max-w-md w-full">
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

        <div className="space-y-3">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-16 bg-brand-bg/20 rounded-2xl border border-brand-border/50">
              <ClipboardList className="mx-auto text-brand-text-secondary opacity-20 mb-4" size={48} />
              <h3 className="text-lg font-bold mb-1">
                {lang === 'am' ? 'ምንም የተሰጡ ስራዎች የሉም' : 'No Results'}
              </h3>
              <p className="text-sm text-brand-text-secondary">
                {lang === 'am' ? 'እባክዎ ሌላ ሰርች ወይም ፊልተር ይሞክሩ።' : 'No assignments found matching your criteria.'}
              </p>
            </div>
          ) : (
            filteredAssignments.map((assignment) => (
              <motion.div 
              layout
              key={assignment.id}
              className="group flex items-center gap-4 p-4 bg-brand-bg/30 border border-brand-border rounded-xl hover:border-brand-accent/30 transition-all"
            >
              <button 
                onClick={() => onUpdate(assignment.id, { status: assignment.status === 'Pending' ? 'Completed' : 'Pending' })}
                className={`
                  w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                  ${assignment.status === 'Completed' 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'border-brand-border hover:border-brand-accent'}
                `}
              >
                {assignment.status === 'Completed' && <CheckCircle size={14} />}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-bold transition-all ${assignment.status === 'Completed' ? 'text-brand-text-secondary line-through' : ''}`}>
                    {assignment.title}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    assignment.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {assignment.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-xs text-brand-accent font-medium flex items-center gap-1">
                    <Shield size={10} />
                    {incidents.find(i => i.id === assignment.incidentId)?.title || 'Unknown Incident'}
                  </span>
                  <span className="text-xs text-brand-text-secondary flex items-center gap-1">
                    <User size={10} />
                    {officers.find(o => o.id === assignment.officerId)?.name || 'Unknown Officer'}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-brand-text-secondary">
                    <Calendar size={12} />
                    <span>Due: {assignment.dueDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(assignment)}
                  className="p-2 text-brand-text-secondary hover:text-brand-accent transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => onDelete(assignment.id)}
                  className="p-2 text-brand-text-secondary hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-md p-8 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold mb-6">{editingAssignment ? t.editReport : t.newReport}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">Assignment Title</label>
                <input 
                  required
                  type="text" 
                  className="input-field" 
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">Related Incident</label>
                <select 
                  className="input-field"
                  value={newAssignment.incidentId}
                  onChange={(e) => setNewAssignment({...newAssignment, incidentId: e.target.value})}
                >
                  {incidents.map(i => (
                    <option key={i.id} value={i.id}>{i.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.officerName}</label>
                <select 
                  className="input-field"
                  value={newAssignment.officerId}
                  onChange={(e) => setNewAssignment({...newAssignment, officerId: e.target.value})}
                >
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.name} ({o.rank})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">Due Date</label>
                <input 
                  required
                  type="date" 
                  className="input-field" 
                  value={newAssignment.dueDate}
                  onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="btn-secondary flex-1">
                  {t.cancel}
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingAssignment ? t.saveProfile : t.submitReport}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
