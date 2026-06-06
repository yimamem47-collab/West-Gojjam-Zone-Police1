import React from 'react';
import { Shield, Target, Heart, Award, FileText, Download, MessageSquare, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { Language, translations } from '../lib/translations';

interface PoliceServicesProps {
  lang: Language;
  onCorruptionReport: () => void;
}

export function PoliceServices({ lang, onCorruptionReport }: PoliceServicesProps) {
  const t = translations[lang];

  const values = [
    { icon: Award, title: t.valueProfessionalism },
    { icon: Shield, title: t.valueIntegrity },
    { icon: Heart, title: t.valueReadiness },
    { icon: Target, title: t.valueHumanRights },
  ];

  const complaintSteps = [
    t.complaintStep1,
    t.complaintStep2,
    t.complaintStep3,
  ];

  return (
    <div className="space-y-8 pb-20">
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-accent p-8 lg:p-12 text-brand-bg">
        <div className="relative z-10 max-w-2xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-bold mb-4"
          >
            {t.ourServices}
          </motion.h1>

          <p className="text-lg opacity-90 font-medium italic">
            "{t.motto}"
          </p>
        </div>

        <Shield size={200} className="absolute -right-10 -bottom-10 text-brand-bg/10 rotate-12" />
      </div>

      {/* Vision + Mission */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">

          {/* Vision */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="icon-box">
                <Target className="text-brand-accent" size={24} />
              </div>
              <h2 className="text-2xl font-bold">{t.vision}</h2>
            </div>
            <p className="text-brand-text-secondary leading-relaxed text-lg">
              {t.visionText}
            </p>
          </motion.div>

          {/* Mission */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="icon-box">
                <Shield className="text-brand-accent" size={24} />
              </div>
              <h2 className="text-2xl font-bold">{t.mission}</h2>
            </div>
            <p className="text-brand-text-secondary leading-relaxed text-lg">
              {t.missionText}
            </p>
          </motion.div>
        </div>

        {/* Values */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8"
        >
          <h2 className="text-2xl font-bold mb-8">{t.values}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((value) => (
              <div key={value.title} className="value-card">
                <div className="icon-sm">
                  <value.icon className="text-brand-accent" size={20} />
                </div>
                <span className="font-bold text-sm">{value.title}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Service + PDF */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="lg:col-span-2 glass-card p-8"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="icon-box">
              <FileText className="text-brand-accent" size={24} />
            </div>
            <h2 className="text-2xl font-bold">{t.serviceStandards}</h2>
          </div>

          <div className="bg-brand-bg rounded-2xl p-6 border border-brand-border mb-8">
            <p className="text-brand-text-secondary mb-6 italic">
              {lang === 'am'
                ? 'ዝርዝር መረጃ ከታች ያለውን ፋይል በማውረድ ይመልከቱ።'
                : 'Download the file below for detailed service standards.'}
            </p>

            <a 
              href="/service-standard.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center justify-center gap-3 py-4 px-8"
            >
              <Download size={20} />
              {t.downloadPdf}
            </a>
          </div>
        </motion.div>

        {/* Complaint */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8 flex flex-col"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="icon-box-red">
              <MessageSquare className="text-rose-500" size={24} />
            </div>
            <h2 className="text-xl font-bold">{t.complaintProcess}</h2>
          </div>

          <div className="space-y-6 flex-1">
            {complaintSteps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="step-circle">{i + 1}</div>
                <p className="text-sm text-brand-text-secondary">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-brand-border">
            <button 
              onClick={onCorruptionReport}
              aria-label="Report corruption"
              className="btn-danger"
            >
              <ShieldAlert size={20} />
              {t.corruptionTip}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}