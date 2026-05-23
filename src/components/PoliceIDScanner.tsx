import React, { useEffect, useState, useRef } from 'react';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { X, Shield, User, BadgeCheck, AlertCircle, RefreshCw, Camera as CameraIcon, FileSearch } from 'lucide-react';
import { Language, translations } from '../lib/translations';
import { Officer } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { analyzeImage } from '../services/geminiService';

interface PoliceIDScannerProps {
  lang: Language;
  onClose: () => void;
  officers: Officer[];
}

export function PoliceIDScanner({ lang, onClose, officers }: PoliceIDScannerProps) {
  const t = translations[lang];
  const [resultText, setResultText] = useState<string>(lang === 'am' ? 'የQR ኮድ ይጠበቃል...' : 'Waiting for QR code...');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'analyzing' | 'success' | 'error'>('idle');
  const [foundOfficer, setFoundOfficer] = useState<Officer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNative] = useState(Capacitor.isNativePlatform());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startScanner = async () => {
    setErrorMessage(null);
    setFoundOfficer(null);
    
    if (!isNative) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const { camera } = await BarcodeScanner.checkPermissions();
      if (camera !== 'granted') {
        const { camera: newStatus } = await BarcodeScanner.requestPermissions();
        if (newStatus !== 'granted') {
          setErrorMessage(lang === 'am' ? 'የካሜራ ፍቃድ አልተሰጠም።' : 'Camera permission not granted.');
          setStatus('error');
          return;
        }
      }

      setStatus('scanning');
      document.querySelector('body')?.classList.add('barcode-scanner-active');
      document.querySelector('html')?.classList.add('barcode-scanner-active');

      await new Promise(resolve => setTimeout(resolve, 100));

      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128]
      });

      if (barcodes.length > 0) {
        const decodedText = barcodes[0].displayValue;
        handleScanData(decodedText);
      }
      
      stopScanner();
    } catch (err) {
      console.error("Scanner error:", err);
      setErrorMessage(lang === 'am' ? 'ስካነር ስህተት! እባክዎ እንደገና ይሞክሩ።' : 'Scanner error! Please try again.');
      setStatus('error');
      stopScanner();
    }
  };

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('analyzing');
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        const prompt = lang === 'am' 
          ? "በዚህ ፖሊስ መታወቂያ ላይ ያለውን መረጃ አንብብ። በተለይ ስም፣ የደረጃ ስም እና የስራ ቁጥር (Badge Number) ካለ ጻፍ። ዋናውን መረጃ ብቻ መልስ።"
          : "Read the information on this Police ID card. Extract name, rank, and badge number. Return only the extracted text.";
        
        const extractedText = await analyzeImage(base64, prompt);
        
        if (extractedText) {
          handleScanData(extractedText);
        } else {
          setStatus('error');
          setErrorMessage(lang === 'am' ? 'መታወቂያውን ማንበብ አልተቻለም። እባክዎ ጥራት ያለው ፎቶ ያንሱ።' : 'Could not read ID. Please take a clearer photo.');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setStatus('error');
      setErrorMessage(lang === 'am' ? 'ስህተት ተከስቷል።' : 'Error occurred.');
    }
  };

  const handleScanData = (data: string) => {
    setResultText(data);
    const decodedText = data.toLowerCase();
    
    const officer = officers.find(o => 
      o.id.toLowerCase() === decodedText || 
      o.badgeNumber.toLowerCase() === decodedText || 
      decodedText.includes(o.badgeNumber.toLowerCase()) ||
      decodedText.includes(o.id.toLowerCase()) ||
      decodedText.includes(o.name.toLowerCase())
    );

    if (officer) {
      setFoundOfficer(officer);
      setStatus('success');
    } else {
      setFoundOfficer(null);
      setStatus('error');
      setErrorMessage(lang === 'am' ? 'ኦፊሰሩ በሲስተሙ ውስጥ አልተገኘም' : 'Officer not found in system');
    }
  };

  const stopScanner = () => {
    document.querySelector('body')?.classList.remove('barcode-scanner-active');
    document.querySelector('html')?.classList.remove('barcode-scanner-active');
    if (status === 'scanning') setStatus('idle');
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-[200] ${status === 'scanning' ? 'bg-transparent' : 'bg-brand-bg/95 backdrop-blur-md'} flex flex-col`}>
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileCapture}
      />

      {status !== 'scanning' && (
        <div className="bg-brand-card p-4 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-accent/10 rounded-lg">
              <Shield className="text-brand-accent" size={24} />
            </div>
            <h2 className="text-xl font-bold">{lang === 'am' ? 'የመታወቂያ ማረጋገጫ' : 'ID Verification'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-accent/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {status === 'scanning' ? (
            <div className="relative flex flex-col items-center">
              <div className="w-64 h-64 border-2 border-brand-accent rounded-3xl animate-pulse relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-accent -mt-1 -ml-1 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-accent -mt-1 -mr-1 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-accent -mb-1 -ml-1 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-accent -mb-1 -mr-1 rounded-br-xl"></div>
              </div>
              <button 
                onClick={stopScanner}
                className="mt-12 bg-white/10 text-white border border-white/20 px-8 py-3 rounded-full backdrop-blur-md"
              >
                {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
              </button>
            </div>
          ) : status === 'analyzing' ? (
            <div className="text-center space-y-4">
              <RefreshCw className="animate-spin text-brand-accent mx-auto" size={48} />
              <p className="text-lg font-medium">{lang === 'am' ? 'መታወቂያው በ AI በመተንተን ላይ ነው...' : 'AI Analyzing ID...'}</p>
            </div>
          ) : status === 'success' && foundOfficer ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-6"
            >
              <div className="glass-card p-8 border-emerald-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield size={120} className="text-emerald-500" />
                </div>
                
                <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                  <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/30">
                    <User size={48} className="text-emerald-500" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-white">{foundOfficer.name}</h3>
                    <p className="text-emerald-400 font-bold uppercase tracking-widest">
                      {(t.ranks as any)[foundOfficer.rank] || foundOfficer.rank}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-brand-bg/50 p-3 rounded-xl border border-brand-border">
                      <p className="text-[10px] text-brand-text-secondary uppercase mb-1">{t.badgeNumber || 'Badge'}</p>
                      <p className="font-bold">{foundOfficer.badgeNumber}</p>
                    </div>
                    <div className="bg-brand-bg/50 p-3 rounded-xl border border-brand-border">
                      <p className="text-[10px] text-brand-text-secondary uppercase mb-1">{t.status || 'Status'}</p>
                      <div className="flex items-center justify-center gap-1">
                        <BadgeCheck size={14} className="text-emerald-400" />
                        <p className="font-bold text-emerald-400">{foundOfficer.status}</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-brand-bg/50 p-4 rounded-xl border border-brand-border text-left">
                    <p className="text-[10px] text-brand-text-secondary uppercase mb-1">{t.station || 'Station'}</p>
                    <p className="font-medium text-white">{foundOfficer.station}</p>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="btn-primary w-full py-4 text-brand-bg font-bold">
                {lang === 'am' ? 'ጨርስ' : 'Finish'}
              </button>
            </motion.div>
          ) : status === 'error' ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 w-full max-w-sm"
            >
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-rose-500/30">
                <AlertCircle size={40} className="text-rose-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{lang === 'am' ? 'ማረጋገጥ አልተቻለም' : 'Verification Failed'}</h3>
                <p className="text-brand-text-secondary">{errorMessage}</p>
              </div>
              <div className="bg-brand-card p-3 rounded-xl border border-brand-border font-mono text-[10px] break-all opacity-50">
                {resultText}
              </div>
              <button onClick={startScanner} className="btn-primary w-full py-4 font-bold">
                {lang === 'am' ? 'እንደገና ሞክር' : 'Try Again'}
              </button>
            </motion.div>
          ) : (
            <div className="text-center space-y-8">
              <div className="w-32 h-32 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto border-2 border-brand-accent/20">
                <FileSearch size={48} className="text-brand-accent" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black">{lang === 'am' ? 'የመታወቂያ QR ማረጋገጫ' : 'ID & QR Verification'}</h3>
                <p className="text-brand-text-secondary max-w-sm mx-auto font-medium">
                  {lang === 'am' 
                    ? 'የመታወቂያውን ምስል በማንሳት ወይም QR ኮዱን ስካን በማድረግ የባለሙያውን ትክክለኛነት ያረጋግጡ።' 
                    : 'Verify officer identity by scanning their ID card image or QR code using AI technology.'}
                </p>
              </div>
              <button 
                onClick={startScanner} 
                className="btn-primary w-full py-5 text-lg shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-3"
              >
                <CameraIcon size={24} />
                {lang === 'am' ? 'ካሜራ ክፈት' : 'Open Camera'}
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
