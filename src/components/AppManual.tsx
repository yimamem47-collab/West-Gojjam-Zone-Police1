import React from 'react';
import { BookOpen, User, Shield, CheckCircle, Smartphone, Lock, Globe, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../lib/translations';

interface AppManualProps {
  lang: Language;
}

export function AppManual({ lang }: AppManualProps) {
  const isAm = lang === 'am';

  const citizenSteps = [
    {
      title: isAm ? 'ሪፖርት ለማድረግ' : 'How to Report',
      desc: isAm 
        ? 'በመነሻ ገጹ ላይ "የወንጀል ቁጥጥር" ወይም "የትራፊክ ደህንነት" የሚለውን ይጫኑ። ዝርዝር መረጃውን ሞልተው "ጥቆማ ላክ" የሚለውን ይጫኑ።'
        : 'Click "Crime Control" or "Traffic Safety" on the home page. Fill in the details and click "Send Tip".'
    },
    {
      title: isAm ? 'ፈጣን ጥቆማ' : 'Quick Tip',
      desc: isAm 
        ? 'በመነሻ ገጹ ታችኛው ክፍል ላይ "ፈጣን ጥቆማ" የሚል ሳጥን ያገኛሉ። እዚያ ላይ መረጃዎን ጽፈው መላክ ይችላሉ። ይህ በቀጥታ ለፖሊስ ይደርሳል።'
        : 'Find the "Quick Tip" box at the bottom of the home page. Write your message and send it directly to the police.'
    },
    {
      title: isAm ? 'ስልክ ቁጥሮች' : 'Emergency Contacts',
      desc: isAm 
        ? 'የተለያዩ የፖሊስ ጣቢያዎችን ስልክ ቁጥር ለማግኘት በመነሻ ገጹ ላይ "ስልክ ቁጥር" የሚለውን ይጫኑ።'
        : 'Click "Phone Number" on the home page to access the directory of all police stations in the zone.'
    },
    {
      title: isAm ? 'QR ኮድ' : 'QR Scanner',
      desc: isAm 
        ? 'የፖሊስ መታወቂያዎችን ወይም ኦፊሴላዊ ሰነዶችን ለማረጋገጥ "ሰካን ማድረጊያ" የሚለውን ቁልፍ ይጠቀሙ።'
        : 'Use the "Scan QR" button to verify police IDs or official documents provided by the department.'
    }
  ];

  const officerSteps = [
    {
      title: isAm ? 'መግቢያ (Login)' : 'Officer Login',
      desc: isAm 
        ? '"ግባ" የሚለውን በመጫን በGoogle አካውንትዎ ወይም በኢሜይልዎ ይግቡ። አስተዳዳሪዎች ብቻ ሁሉንም መረጃ ማየት ይችላሉ።'
        : 'Click "Login" and sign in with your Google account or email. Admins have full access to all system features.'
    },
    {
      title: isAm ? 'ዳሽቦርድ (Dashboard)' : 'Dashboard Overview',
      desc: isAm 
        ? 'አጠቃላይ የወንጀልና የትራፊክ አደጋዎችን ሁኔታ በግራፍና በቁጥር ማየት ይችላሉ። ይህ ለውሳኔ አሰጣጥ ይረዳል።'
        : 'View real-time statistics and trends of incidents across the zone through interactive charts and summaries.'
    },
    {
      title: isAm ? 'ክስተቶችና ተግባራት' : 'Incidents & Assignments',
      desc: isAm 
        ? 'አዳዲስ ክስተቶችን ለመመዝገብና ለኦፊሰሮች ስራ ለመመደብ "ወንጀል" እና "ተግባራት" የሚሉትን ክፍሎች ይጠቀሙ።'
        : 'Use the "Crime" and "Assignments" tabs to record new incidents and assign tasks to specific officers.'
    },
    {
      title: isAm ? 'ሪፖርቶች (Reports)' : 'Official Reports',
      desc: isAm 
        ? 'ዝርዝር የፖሊስ ሪፖርቶችን ለማዘጋጀት፣ ለማስቀመጥና ለማተም "ሪፖርቶች" የሚለውን ክፍል ይጠቀሙ።'
        : 'Create, store, and manage detailed official police reports in the "Reports" section for record-keeping.'
    }
  ];

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-block p-3 bg-brand-accent/10 rounded-2xl mb-4">
          <BookOpen className="text-brand-accent" size={40} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          {isAm ? 'የአጠቃቀም መመሪያ' : 'Application User Manual'}
        </h1>
        <p className="text-brand-text-secondary max-w-2xl mx-auto">
          {isAm 
            ? 'ይህ መመሪያ ለዜጎችና ለፖሊስ አባላት አፑን እንዴት መጠቀም እንዳለባቸው በዝርዝር ያስረዳል።'
            : 'This manual provides detailed instructions for both citizens and police officers on how to use the application.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Citizen Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8 border-emerald-500/20"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <User className="text-emerald-500" size={28} />
            </div>
            <h2 className="text-2xl font-bold">{isAm ? 'ለተጠቃሚዎች (ለዜጎች)' : 'For Citizens'}</h2>
          </div>

          <div className="space-y-8">
            {citizenSteps.map((step, i) => (
              <div key={i} className="relative pl-8 border-l-2 border-emerald-500/20">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-brand-card" />
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-brand-text-secondary leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Officer Section */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8 border-brand-accent/20"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-brand-accent/10 rounded-xl">
              <Shield className="text-brand-accent" size={28} />
            </div>
            <h2 className="text-2xl font-bold">{isAm ? 'ለፖሊስ አባላት' : 'For Police Officers'}</h2>
          </div>

          <div className="space-y-8">
            {officerSteps.map((step, i) => (
              <div key={i} className="relative pl-8 border-l-2 border-brand-accent/20">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-brand-accent border-4 border-brand-card" />
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-brand-text-secondary leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Smartphone, title: isAm ? 'ሞባይል ተስማሚ' : 'Mobile Friendly', desc: isAm ? 'በማንኛውም ስልክ ላይ ይሰራል' : 'Works on any smartphone' },
          { icon: Lock, title: isAm ? 'ደህንነቱ የተጠበቀ' : 'Secure Data', desc: isAm ? 'መረጃዎ በጥንቃቄ ይጠበቃል' : 'Your data is encrypted' },
          { icon: Globe, title: isAm ? 'ሁለት ቋንቋ' : 'Bilingual', desc: isAm ? 'አማርኛና እንግሊዝኛ' : 'Amharic & English' },
        ].map((item, i) => (
          <div key={i} className="glass-card p-6 text-center">
            <div className="w-12 h-12 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <item.icon className="text-brand-accent" size={24} />
            </div>
            <h4 className="font-bold mb-2">{item.title}</h4>
            <p className="text-sm text-brand-text-secondary">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
