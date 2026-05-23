import React, { useEffect, useState, useRef } from 'react';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Camera as CameraIcon, X, CheckCircle, AlertCircle, RefreshCw, Send, FileSearch, QrCode } from 'lucide-react';
import { Language, translations } from '../lib/translations';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { analyzeImage } from '../services/geminiService';

interface ScannerProps {
  lang: Language;
  onClose: () => void;
}

const TELEGRAM_BOT_TOKEN = "7611590740:AAEx9u-P07Y3o4mG5_E_nK4T-q8Pz5mE8Yk";
const TELEGRAM_CHAT_ID = "1452664718";

export function Scanner({ lang, onClose }: ScannerProps) {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'analyzing' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isNative] = useState(Capacitor.isNativePlatform());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  const startScanner = async () => {
    if (!isNative) {
      // For web, we trigger the file input (camera)
      fileInputRef.current?.click();
      return;
    }

    try {
      const { camera } = await BarcodeScanner.checkPermissions();
      if (camera !== 'granted') {
        const { camera: newStatus } = await BarcodeScanner.requestPermissions();
        if (newStatus !== 'granted') {
          setStatus('error');
          setErrorMessage(lang === 'am' ? 'የካሜራ ፍቃድ አልተሰጠም።' : 'Camera permission not granted.');
          return;
        }
      }

      setStatus('scanning');
      document.querySelector('body')?.classList.add('barcode-scanner-active');
      document.querySelector('html')?.classList.add('barcode-scanner-active');

      await new Promise(resolve => setTimeout(resolve, 100));

      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128, BarcodeFormat.Ean13]
      });

      stopScanner();

      if (barcodes.length > 0) {
        const decodedText = barcodes[0].displayValue;
        setScannedData(decodedText);
        handleScanSuccess(decodedText);
      }
    } catch (err) {
      console.error("Scanner error:", err);
      setStatus('error');
      setErrorMessage(lang === 'am' ? 'ስካነር ስህተት! እባክዎ እንደገና ይሞክሩ።' : 'Scanner error! Please try again.');
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
        
        // Use Gemini to analyze the image
        const prompt = lang === 'am' 
          ? "በዚህ ፎቶ ላይ ያለውን መረጃ (መታወቂያ ወይም QR ኮድ) አንብብ። ዋናውን መረጃ ብቻ በአጭሩ ጽፈህ መልስ።"
          : "Analyze this image and extract any information from an ID card or QR code. Return only the extracted text clearly.";
        
        const extractedText = await analyzeImage(base64, prompt);
        
        if (extractedText) {
          setScannedData(extractedText);
          handleScanSuccess(extractedText);
        } else {
          setStatus('error');
          setErrorMessage(lang === 'am' ? 'መረጃውን ማንበብ አልተቻለም። እባክዎ ጥራት ያለው ፎቶ ያንሱ።' : 'Could not read information. Please take a clearer photo.');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setStatus('error');
      setErrorMessage(lang === 'am' ? 'ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።' : 'Error occurred. Please try again.');
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

  const handleScanSuccess = async (data: string) => {
    setStatus('sending');
    
    try {
      if (auth.currentUser) {
        await addDoc(collection(db, 'police_scans'), {
          data: data,
          officerId: auth.currentUser.uid,
          officerName: auth.currentUser.displayName || 'Officer',
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Firestore error:", error);
    }

    const officerName = auth.currentUser?.displayName || 'Unknown Officer';
    const message = `🚨 አዲስ የስካን መረጃ 🚨\n\n📌 መረጃ: ${data}\n👤 መርማሪ: ${officerName}`;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
      });

      const result = await response.json();
      if (result.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(lang === 'am' ? 'ወደ ቴሌግራም መላክ አልተቻለም ❌' : 'Failed to send to Telegram ❌');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(lang === 'am' ? 'የኢንተርኔት ግንኙነት ችግር አጋጥሟል ❌' : 'Internet connection error ❌');
    }
  };

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
              <CameraIcon className="text-brand-accent" size={24} />
            </div>
            <h2 className="text-xl font-bold">{lang === 'am' ? 'የፖሊስ ዲጂታል ስካነር' : 'Police Digital Scanner'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-accent/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6">
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
        ) : status === 'analyzing' || status === 'sending' ? (
          <div className="text-center space-y-4">
            <RefreshCw className="animate-spin text-brand-accent mx-auto" size={48} />
            <p className="text-lg font-medium">
              {status === 'analyzing' 
                ? (lang === 'am' ? 'መረጃው በ AI በመተንተን ላይ ነው...' : 'AI Analyzing Data...')
                : (lang === 'am' ? 'በመላክ ላይ...' : 'Sending Data...')}
            </p>
          </div>
        ) : status === 'success' ? (
          <div className="text-center space-y-6 max-w-sm">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/30">
              <CheckCircle size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-emerald-500">{lang === 'am' ? 'በተሳካ ሁኔታ ተልኳል!' : 'Sent Successfully!'}</h3>
            <div className="bg-brand-card p-4 rounded-xl border border-brand-border break-all font-mono text-xs max-h-40 overflow-y-auto">
              {scannedData}
            </div>
            <button onClick={onClose} className="btn-primary w-full py-4 text-brand-bg font-bold">
              {lang === 'am' ? 'ጨርስ' : 'Finish'}
            </button>
          </div>
        ) : status === 'error' ? (
          <div className="text-center space-y-6 max-w-sm">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-rose-500/30">
              <AlertCircle size={40} className="text-rose-500" />
            </div>
            <h3 className="text-xl font-bold">{lang === 'am' ? 'ስህተት አጋጥሟል' : 'Error Occurred'}</h3>
            <p className="text-brand-text-secondary">{errorMessage}</p>
            <button onClick={() => { setStatus('idle'); setErrorMessage(''); }} className="btn-primary w-full py-4 uppercase tracking-widest font-bold">
              {lang === 'am' ? 'እንደገና ሞክር' : 'Try Again'}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-8 max-w-md">
            <div className="flex justify-center gap-6">
              <div className="w-24 h-24 bg-brand-accent/10 rounded-2xl flex items-center justify-center border-2 border-brand-accent/20">
                <FileSearch size={40} className="text-brand-accent" />
              </div>
              <div className="w-24 h-24 bg-blue-500/10 rounded-2xl flex items-center justify-center border-2 border-blue-500/20">
                <QrCode size={40} className="text-blue-400" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black mb-3">{lang === 'am' ? 'ሁለገብ ስካነር' : 'Universal Scanner'}</h3>
              <p className="text-brand-text-secondary leading-relaxed font-medium">
                {lang === 'am' 
                  ? 'መታወቂያ ካርዶችን ወይም QR ኮዶችን ስካን ያድርጉ። ስርአቱ በ AI በመታገዝ መረጃውን በቅፅበት ያነባል።'
                  : 'Scan ID cards or QR codes. The system uses AI to extract and transmit data in real-time to the command center.'}
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
      </div>
    </div>
  );
}
