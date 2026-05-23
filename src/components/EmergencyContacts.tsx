import React from 'react';
import { Phone, ExternalLink, ArrowLeft, Mail, Search, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { EMERGENCY_CONTACTS } from '../constants';
import { auth } from '../firebase';
import { dialPhone } from '../lib/utils';

interface EmergencyContactsProps {
  lang: Language;
  onBack?: () => void;
}

export function EmergencyContacts({ lang, onBack }: EmergencyContactsProps) {
  const t = translations[lang];
  const isLoggedIn = !!auth.currentUser;
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredContacts = EMERGENCY_CONTACTS.filter(contact => {
    const name = (t.emergencyContacts as any)[contact.nameKey]?.toLowerCase() || '';
    return name.includes(searchTerm.toLowerCase()) || contact.phone.includes(searchTerm) || (contact.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.contactList || t.emergencyContacts.title}</h1>
          <p className="text-brand-text-secondary">{lang === 'am' ? 'የምዕራብ ጎጃም ዞን ፖሊስ መምሪያ እና የጣቢያዎች አድራሻ' : 'West Gojjam Zone Police Department & Station Contacts'}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={16} />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder} 
              className="input-field pl-10 py-2 text-sm w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {!isLoggedIn && onBack && (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-brand-accent font-bold hover:underline"
            >
              <ArrowLeft size={20} />
              {t.backToHome}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map((contact, index) => (
          <motion.div
            key={contact.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card p-6 flex flex-col justify-between hover:border-brand-accent/30 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2 opacity-5 italic text-[8px] font-black uppercase tracking-tighter rotate-12">
              {contact.category}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center border border-brand-accent/20 group-hover:bg-brand-accent group-hover:text-brand-bg transition-all">
                  {contact.category === 'HQ' ? <Shield size={20} /> : <Phone size={20} />}
                </div>
                <h3 className="text-lg font-bold">
                  {(t.emergencyContacts as any)[contact.nameKey]}
                </h3>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-brand-accent" />
                  <p className="text-brand-text-primary font-mono text-lg">{contact.phone}</p>
                </div>
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-brand-text-secondary" />
                    <p className="text-xs text-brand-text-secondary truncate">{contact.email}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => dialPhone(contact.phone)}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-xs"
              >
                <Phone size={14} />
                {t.call}
              </button>
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="btn-secondary px-3 py-2 text-brand-accent border-brand-accent/30"
                >
                  <Mail size={14} />
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
